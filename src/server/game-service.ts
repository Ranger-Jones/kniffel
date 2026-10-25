import { randomInt } from 'node:crypto';
import {
  applyAction, createGameState, createRematchState, getSettings, placements,
  type GameAction, type GameState,
} from '@/lib/kniffel/engine';
import { totalScore } from '@/lib/kniffel/scoring';
import type { AdminClient } from '@/lib/supabase/admin';
import { fail, ok, STALE, type ServiceResult } from './result';

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rollDie = () => randomInt(1, 7);

export interface GameRow { id: string; code: string; version: number; state: GameState; rematchGameId: string | null }

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

type Row = { id: string; code: string; version: number; state: unknown; rematch_game_id: string | null };
const toGame = (r: Row): GameRow => ({
  id: r.id, code: r.code, version: r.version, state: r.state as GameState, rematchGameId: r.rematch_game_id,
});
const COLUMNS = 'id, code, version, state, rematch_game_id';

export async function loadGame(admin: AdminClient, id: string): Promise<GameRow | null> {
  const { data, error } = await admin.from('games').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toGame(data) : null;
}

export async function loadGameByCode(admin: AdminClient, code: string): Promise<GameRow | null> {
  const { data, error } = await admin.from('games').select(COLUMNS).eq('code', normalizeCode(code)).maybeSingle();
  if (error) throw error;
  return data ? toGame(data) : null;
}

function playersPayload(state: GameState) {
  const places = state.status === 'finished' ? placements(state) : {};
  return state.players.map((p, seat) => ({
    userId: p.id, seat, left: p.left, scores: state.scores[p.id],
    total: totalScore(state.scores[p.id]), place: places[p.id] ?? null,
  }));
}

async function commit(admin: AdminClient, gameId: string, expectedVersion: number, state: GameState): Promise<number | 'conflict'> {
  const { data, error } = await admin.rpc('commit_game', {
    p_game_id: gameId, p_expected_version: expectedVersion,
    p_state: state as never, p_players: playersPayload(state) as never,
  });
  if (error) {
    if (error.message.includes('version_conflict')) return 'conflict';
    throw error;
  }
  return data;
}

export async function insertGame(admin: AdminClient, state: GameState): Promise<ServiceResult<{ id: string; code: string }>> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await admin.from('games')
      .insert({ code, host_id: state.hostId, status: 'lobby', state: state as never })
      .select('id').single();
    if (error) {
      if (error.code === '23505') continue;
      throw error;
    }
    try {
      const version = await commit(admin, data.id, 0, state);
      if (version === 'conflict') throw new Error('Neues Spiel wurde gleichzeitig verändert.');
    } catch (err) {
      // Kein halb angelegtes Spiel ohne Spieler zurücklassen.
      await admin.from('games').delete().eq('id', data.id);
      throw err;
    }
    return ok({ id: data.id, code });
  }
  return fail('Konnte keinen Raum-Code erzeugen. Bitte nochmal versuchen.');
}

export function createGame(admin: AdminClient, userId: string) {
  return insertGame(admin, createGameState(userId));
}

/**
 * Wer aus der Lobby entfernt wird, verliert seine game_players-Zeile und damit (RLS) alle weiteren
 * Spielstand-Updates. Deshalb bekommt er über den Spielkanal eine Nachricht; der Client prüft sie
 * durch Nachladen, bevor er reagiert (Broadcasts allein sind nicht vertrauenswürdig).
 */
async function notifyKicked(admin: AdminClient, gameId: string, userId: string) {
  const channel = admin.channel(`game:${gameId}`, { config: { private: true } });
  try {
    await channel.httpSend('kicked', { userId });
  } catch {
    // Nicht kritisch: spätestens beim nächsten Neuladen merkt der Spieler es.
  } finally {
    await admin.removeChannel(channel);
  }
}

/** Erwarteter Zug (Sitz + verbleibende Würfe): schützt Würfeln/Eintragen/Überspringen vor Doppelklicks,
 *  ohne dass ein zwischendurch gespeichertes Halten die Aktion ungültig macht. */
export interface TurnToken { seat: number; rollsLeft: number }
export type Expectation = number | TurnToken;

function matches(game: GameRow, expected: Expectation): boolean {
  if (typeof expected === 'number') return game.version === expected;
  return game.state.status === 'playing'
    && game.state.currentSeat === expected.seat && game.state.rollsLeft === expected.rollsLeft;
}

/**
 * Wendet eine Aktion an. Mit erwarteter Version bzw. Zug-Token (nicht-idempotente Aktionen) wird bei
 * Abweichung STALE geliefert. Versionskonflikte beim Speichern werden einmal wiederholt – außer bei
 * erwarteter Version; ein Zug-Token wird bei der Wiederholung erneut geprüft.
 */
export async function performAction(
  admin: AdminClient, userId: string, gameId: string, action: GameAction, expected?: Expectation,
): Promise<ServiceResult<{ version: number; state: GameState }>> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const game = await loadGame(admin, gameId);
    if (!game) return fail('Spiel nicht gefunden.');
    if (expected !== undefined && !matches(game, expected)) return fail(STALE);

    const res = applyAction(game.state, userId, action, rollDie);
    if (!res.ok) return fail(res.error);
    if (res.state === game.state) return ok({ version: game.version, state: game.state });

    // Ohne Spieler löscht commit_game das Spiel (atomar, mit Versionsprüfung).
    const version = await commit(admin, gameId, game.version, res.state);
    if (version !== 'conflict') {
      if (action.type === 'removePlayer') await notifyKicked(admin, gameId, action.playerId);
      return ok({ version, state: res.state });
    }
    if (typeof expected === 'number') return fail(STALE);
  }
  return fail('Gleichzeitige Aktion – bitte nochmal versuchen.');
}

export async function joinGame(admin: AdminClient, userId: string, code: string): Promise<ServiceResult<{ code: string }>> {
  const game = await loadGameByCode(admin, code);
  if (!game) return fail('Kein Spiel mit diesem Code gefunden.');
  const res = await performAction(admin, userId, game.id, { type: 'join' });
  return res.ok ? ok({ code: game.code }) : res;
}

export async function requestRematch(admin: AdminClient, userId: string, gameId: string): Promise<ServiceResult<{ code: string }>> {
  const game = await loadGame(admin, gameId);
  if (!game) return fail('Spiel nicht gefunden.');
  if (game.state.status !== 'finished') return fail('Das Spiel ist noch nicht beendet.');
  if (!game.state.players.some((p) => p.id === userId && !p.left)) return fail('Du warst nicht in diesem Spiel.');

  const existing = async (id: string | null) => (id ? loadGame(admin, id) : null);
  const already = await existing(game.rematchGameId);
  if (already) return ok({ code: already.code });

  const playerIds = game.state.players.filter((p) => !p.left).map((p) => p.id);
  const created = await insertGame(admin, createRematchState(userId, playerIds, getSettings(game.state)));
  if (!created.ok) return created;

  const { data } = await admin.from('games')
    .update({ rematch_game_id: created.data.id })
    .eq('id', gameId).is('rematch_game_id', null).select('id');
  if (data && data.length > 0) return ok({ code: created.data.code });

  // Jemand anderes war schneller: eigenes Spiel verwerfen, das andere nehmen.
  await admin.from('games').delete().eq('id', created.data.id);
  const winner = await existing((await loadGame(admin, gameId))?.rematchGameId ?? null);
  return winner ? ok({ code: winner.code }) : fail('Revanche konnte nicht erstellt werden.');
}
