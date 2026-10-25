import { describe, expect, test } from 'vitest';
import { CATEGORIES } from '@/lib/kniffel/types';
import { createGame, joinGame, loadGame, performAction, requestRematch } from '@/server/game-service';
import { admin, createTestUser } from './helpers';

async function setup(n: number) {
  const users = await Promise.all(Array.from({ length: n }, (_, i) => createTestUser(`gs${i}`)));
  const created = await createGame(admin, users[0].id);
  if (!created.ok) throw new Error(created.error);
  for (const u of users.slice(1)) {
    const j = await joinGame(admin, u.id, created.data.code.toLowerCase());
    if (!j.ok) throw new Error(j.error);
  }
  return { users, gameId: created.data.id, code: created.data.code };
}
async function version(gameId: string) { return (await loadGame(admin, gameId))!.version; }

describe('game-service', () => {
  test('Erstellen und Beitreten (Code case-insensitiv), Mitglieder in game_players', async () => {
    const { gameId, users } = await setup(2);
    const { data } = await admin.from('game_players').select('user_id, seat').eq('game_id', gameId).order('seat');
    expect(data?.map((r) => r.user_id)).toEqual(users.map((u) => u.id));
  });
  test('unbekannter Code', async () => {
    const u = await createTestUser('nocode');
    const res = await joinGame(admin, u.id, 'ZZZZZZ');
    expect(res).toEqual({ ok: false, error: 'Kein Spiel mit diesem Code gefunden.' });
  });
  test('voller Raum / laufendes Spiel', async () => {
    const { users, gameId, code } = await setup(6);
    const extra = await createTestUser('extra');
    expect(await joinGame(admin, extra.id, code)).toMatchObject({ ok: false, error: 'Der Raum ist voll.' });
    await performAction(admin, users[0].id, gameId, { type: 'start' }, await version(gameId));
    await performAction(admin, users[1].id, gameId, { type: 'leave' });
    expect(await joinGame(admin, extra.id, code)).toMatchObject({ ok: false, error: 'Das Spiel läuft bereits.' });
  });
  test('veraltete Version → STALE; paralleles Würfeln wirkt nur einmal', async () => {
    const { users, gameId } = await setup(1);
    await performAction(admin, users[0].id, gameId, { type: 'start' }, await version(gameId));
    const v = await version(gameId);
    const results = await Promise.all([
      performAction(admin, users[0].id, gameId, { type: 'roll' }, v),
      performAction(admin, users[0].id, gameId, { type: 'roll' }, v),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ error: 'STALE' });
    expect((await loadGame(admin, gameId))!.state.rollsLeft).toBe(2);
  });
  test('Halten und direkt danach Würfeln: Wurf zählt (Zug-Token statt Version)', async () => {
    const { users, gameId } = await setup(1);
    await performAction(admin, users[0].id, gameId, { type: 'start' }, await version(gameId));
    const first = await performAction(admin, users[0].id, gameId, { type: 'roll' }, { seat: 0, rollsLeft: 3 });
    expect(first.ok).toBe(true);
    // Client kennt noch den Stand nach dem ersten Wurf, hält einen Würfel und würfelt sofort.
    const token = { seat: 0, rollsLeft: 2 };
    expect((await performAction(admin, users[0].id, gameId, { type: 'setHold', index: 0, held: true })).ok).toBe(true);
    const second = await performAction(admin, users[0].id, gameId, { type: 'roll' }, token);
    expect(second.ok).toBe(true);
    // Doppelklick mit demselben Token wirkt nicht noch einmal.
    expect(await performAction(admin, users[0].id, gameId, { type: 'roll' }, token)).toMatchObject({ ok: false, error: 'STALE' });
    expect((await loadGame(admin, gameId))!.state.rollsLeft).toBe(1);
  });
  test('paralleles Würfeln mit gleichem Zug-Token wirkt nur einmal', async () => {
    const { users, gameId } = await setup(1);
    await performAction(admin, users[0].id, gameId, { type: 'start' }, await version(gameId));
    const token = { seat: 0, rollsLeft: 3 };
    const results = await Promise.all([
      performAction(admin, users[0].id, gameId, { type: 'roll' }, token),
      performAction(admin, users[0].id, gameId, { type: 'roll' }, token),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await loadGame(admin, gameId))!.state.rollsLeft).toBe(2);
  });
  test('letzter Spieler verlässt Lobby → Spiel gelöscht', async () => {
    const { users, gameId } = await setup(1);
    expect((await performAction(admin, users[0].id, gameId, { type: 'leave' })).ok).toBe(true);
    expect(await loadGame(admin, gameId)).toBeNull();
  });
  test('Host verlässt Lobby → Host wechselt in DB', async () => {
    const { users, gameId } = await setup(2);
    await performAction(admin, users[0].id, gameId, { type: 'leave' });
    const { data } = await admin.from('games').select('host_id').eq('id', gameId).single();
    expect(data?.host_id).toBe(users[1].id);
  });
  test('komplettes Spiel schreibt Endstände, Statistik und Revanche ist idempotent', async () => {
    const { users, gameId } = await setup(2);
    await performAction(admin, users[0].id, gameId, { type: 'start' }, await version(gameId));
    for (let round = 0; round < 13; round++) {
      for (const u of users) {
        let r = await performAction(admin, u.id, gameId, { type: 'roll' }, await version(gameId));
        expect(r.ok).toBe(true);
        r = await performAction(admin, u.id, gameId, { type: 'score', category: CATEGORIES[round] }, await version(gameId));
        expect(r.ok).toBe(true);
      }
    }
    const game = await loadGame(admin, gameId);
    expect(game!.state.status).toBe('finished');
    const { data: rows } = await admin.from('game_players').select('total, place').eq('game_id', gameId);
    expect(rows!.every((r) => r.total !== null && r.place !== null)).toBe(true);
    const { data: stats } = await admin.from('player_stats').select('games_played').eq('user_id', users[0].id).single();
    expect(stats?.games_played).toBe(1);

    const [r1, r2] = await Promise.all([requestRematch(admin, users[0].id, gameId), requestRematch(admin, users[1].id, gameId)]);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r1.data.code).toBe(r2.data.code);
    const after = await loadGame(admin, gameId);
    const rematch = await loadGame(admin, after!.rematchGameId!);
    expect(rematch!.state.players.map((p) => p.id)).toEqual(users.map((u) => u.id));
  });
});
