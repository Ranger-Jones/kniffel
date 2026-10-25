import { emptySheet, filledCount, isComplete, scoreCategory, totalScore } from './scoring';
import { CATEGORIES, isCategory, type Category, type ScoreSheet } from './types';

export const MAX_PLAYERS = 6;
export const ROLLS_PER_TURN = 3;

export const TURN_SECONDS_OPTIONS = [null, 30, 60, 90, 120] as const;
export type TurnSeconds = (typeof TURN_SECONDS_OPTIONS)[number];
export interface GameSettings { chat: boolean; turnSeconds: TurnSeconds }
export const DEFAULT_SETTINGS: GameSettings = { chat: true, turnSeconds: null };

export type GameStatus = 'lobby' | 'playing' | 'finished';
export interface PlayerSlot { id: string; left: boolean }
export interface GameState {
  status: GameStatus;
  hostId: string;
  players: PlayerSlot[];
  currentSeat: number;
  dice: (number | null)[];
  held: boolean[];
  rollsLeft: number;
  scores: Record<string, ScoreSheet>;
  /** Vom Host aus der Lobby entfernte Spieler – dürfen nicht erneut beitreten. */
  banned?: string[];
  /** Fehlt in Spielständen von vor v2 → Standardwerte. */
  settings?: GameSettings;
  /** Beginn des aktuellen Zugs (ISO) – Grundlage für das Zeitlimit. */
  turnStartedAt?: string | null;
}
export type GameAction =
  | { type: 'join' }
  | { type: 'leave' }
  | { type: 'start' }
  | { type: 'roll' }
  | { type: 'setHold'; index: number; held: boolean }
  | { type: 'score'; category: Category }
  | { type: 'skipTurn' }
  | { type: 'removePlayer'; playerId: string }
  | { type: 'updateSettings'; settings: Partial<GameSettings> }
  | { type: 'timeout' };
export type RollDie = () => number;
export type EngineResult = { ok: true; state: GameState } | { ok: false; error: string };

const ok = (state: GameState): EngineResult => ({ ok: true, state });
const fail = (error: string): EngineResult => ({ ok: false, error });

function freshTurn(now: number | null = null) {
  return {
    dice: [null, null, null, null, null],
    held: [false, false, false, false, false],
    rollsLeft: ROLLS_PER_TURN,
    turnStartedAt: now === null ? null : new Date(now).toISOString(),
  };
}

export function getSettings(state: GameState): GameSettings {
  return { ...DEFAULT_SETTINGS, ...state.settings };
}

/** Zeitpunkt (ms), ab dem der aktuelle Zug als abgelaufen gilt – null ohne Limit. */
export function turnDeadline(state: GameState): number | null {
  const { turnSeconds } = getSettings(state);
  if (state.status !== 'playing' || !turnSeconds || !state.turnStartedAt) return null;
  return Date.parse(state.turnStartedAt) + turnSeconds * 1000;
}

/** Freies Feld mit den meisten Punkten; bei Gleichstand das erste in Zettel-Reihenfolge. */
export function bestCategory(sheet: ScoreSheet, dice: number[]): Category {
  let best: Category | null = null;
  let bestScore = -1;
  for (const c of CATEGORIES) {
    if (sheet[c] !== null) continue;
    const score = scoreCategory(c, dice);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  if (!best) throw new Error('Kein freies Feld');
  return best;
}

function validSettings(patch: Partial<GameSettings>): boolean {
  if ('chat' in patch && typeof patch.chat !== 'boolean') return false;
  if ('turnSeconds' in patch && !(TURN_SECONDS_OPTIONS as readonly unknown[]).includes(patch.turnSeconds)) return false;
  return Object.keys(patch).every((k) => k === 'chat' || k === 'turnSeconds');
}

export function createGameState(hostId: string): GameState {
  return createRematchState(hostId, [hostId]);
}

export function createRematchState(hostId: string, playerIds: string[], settings: GameSettings = DEFAULT_SETTINGS): GameState {
  return {
    status: 'lobby',
    hostId,
    players: playerIds.map((id) => ({ id, left: false })),
    currentSeat: 0,
    ...freshTurn(),
    scores: Object.fromEntries(playerIds.map((id) => [id, emptySheet()])),
    settings: { ...settings },
  };
}

export const activePlayers = (state: GameState) => state.players.filter((p) => !p.left);

export function currentPlayerId(state: GameState): string | null {
  return state.status === 'playing' ? (state.players[state.currentSeat]?.id ?? null) : null;
}

export function currentRound(state: GameState): number {
  const active = activePlayers(state);
  if (active.length === 0) return 1;
  return Math.min(13, 1 + Math.min(...active.map((p) => filledCount(state.scores[p.id]))));
}

export function placements(state: GameState): Record<string, number> {
  const totals = activePlayers(state).map((p) => ({ id: p.id, total: totalScore(state.scores[p.id]) }));
  return Object.fromEntries(totals.map((p) => [p.id, 1 + totals.filter((o) => o.total > p.total).length]));
}

/** Nächster aktiver Spieler mit offenem Zettel nach currentSeat; sonst Spielende. */
function advanceTurn(state: GameState, now: number): GameState {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const seat = (state.currentSeat + step) % n;
    const p = state.players[seat];
    if (!p.left && !isComplete(state.scores[p.id])) return { ...state, ...freshTurn(now), currentSeat: seat };
  }
  return { ...state, ...freshTurn(), status: 'finished' };
}

function nextActiveAfter(players: PlayerSlot[], seat: number): PlayerSlot | undefined {
  for (let step = 1; step <= players.length; step++) {
    const p = players[(seat + step) % players.length];
    if (!p.left) return p;
  }
  return undefined;
}

function withoutPlayer(state: GameState, playerId: string, now: number): GameState {
  if (state.status === 'lobby') {
    const players = state.players.filter((p) => p.id !== playerId);
    const scores = { ...state.scores };
    delete scores[playerId];
    const hostId = state.hostId === playerId ? (players[0]?.id ?? state.hostId) : state.hostId;
    return { ...state, players, scores, hostId, currentSeat: 0 };
  }
  const seat = state.players.findIndex((p) => p.id === playerId);
  const players = state.players.map((p) => (p.id === playerId ? { ...p, left: true } : p));
  let next: GameState = { ...state, players };
  if (players.every((p) => p.left)) return { ...next, ...freshTurn(), status: 'finished' };
  if (state.hostId === playerId) next.hostId = nextActiveAfter(players, seat)!.id;
  if (state.currentSeat === seat) next = advanceTurn(next, now);
  return next;
}

function requireTurn(state: GameState, actorId: string): string | null {
  if (state.status === 'lobby') return 'Das Spiel hat noch nicht begonnen.';
  if (currentPlayerId(state) !== actorId) return 'Du bist nicht am Zug.';
  return null;
}

export function applyAction(
  state: GameState, actorId: string, action: GameAction, rollDie: RollDie, now: number = Date.now(),
): EngineResult {
  if (state.status === 'finished') return fail('Das Spiel ist bereits beendet.');
  const isActiveMember = state.players.some((p) => p.id === actorId && !p.left);
  const isHost = state.hostId === actorId;

  switch (action.type) {
    case 'join': {
      if (state.players.some((p) => p.id === actorId)) return ok(state);
      if (state.status !== 'lobby') return fail('Das Spiel läuft bereits.');
      if (state.banned?.includes(actorId)) return fail('Der Host hat dich aus diesem Raum entfernt.');
      if (state.players.length >= MAX_PLAYERS) return fail('Der Raum ist voll.');
      return ok({
        ...state,
        players: [...state.players, { id: actorId, left: false }],
        scores: { ...state.scores, [actorId]: emptySheet() },
      });
    }
    case 'leave':
      if (!isActiveMember) return fail('Du bist nicht in diesem Spiel.');
      return ok(withoutPlayer(state, actorId, now));
    case 'removePlayer': {
      if (!isHost) return fail('Nur der Host kann Spieler entfernen.');
      if (action.playerId === actorId) return fail('Du kannst dich nicht selbst entfernen.');
      if (!state.players.some((p) => p.id === action.playerId && !p.left)) return fail('Spieler nicht gefunden.');
      const next = withoutPlayer(state, action.playerId, now);
      return ok(state.status === 'lobby' ? { ...next, banned: [...(state.banned ?? []), action.playerId] } : next);
    }
    case 'start':
      if (state.status !== 'lobby') return fail('Das Spiel läuft bereits.');
      if (!isHost) return fail('Nur der Host kann das Spiel starten.');
      return ok({ ...state, status: 'playing', currentSeat: 0, ...freshTurn(now) });
    case 'roll': {
      const err = requireTurn(state, actorId);
      if (err) return fail(err);
      if (state.rollsLeft <= 0) return fail('Keine Würfe mehr übrig.');
      const dice = state.dice.map((d, i) => (state.held[i] && d !== null ? d : rollDie()));
      return ok({ ...state, dice, rollsLeft: state.rollsLeft - 1 });
    }
    case 'setHold': {
      const err = requireTurn(state, actorId);
      if (err) return fail(err);
      if (state.rollsLeft === ROLLS_PER_TURN) return fail('Erst würfeln.');
      if (!Number.isInteger(action.index) || action.index < 0 || action.index > 4) return fail('Ungültiger Würfel.');
      if (state.rollsLeft === 0) return fail('Keine Würfe mehr übrig.');
      const held = state.held.map((h, i) => (i === action.index ? action.held : h));
      return ok({ ...state, held });
    }
    case 'score': {
      const err = requireTurn(state, actorId);
      if (err) return fail(err);
      if (state.rollsLeft === ROLLS_PER_TURN) return fail('Erst würfeln.');
      if (!isCategory(action.category)) return fail('Unbekanntes Feld.');
      const sheet = state.scores[actorId];
      if (sheet[action.category] !== null) return fail('Dieses Feld ist schon belegt.');
      const value = scoreCategory(action.category, state.dice as number[]);
      const scores = { ...state.scores, [actorId]: { ...sheet, [action.category]: value } };
      return ok(advanceTurn({ ...state, scores }, now));
    }
    case 'skipTurn': {
      if (state.status !== 'playing') return fail('Das Spiel hat noch nicht begonnen.');
      if (!isHost) return fail('Nur der Host kann Züge überspringen.');
      const targetId = currentPlayerId(state)!;
      if (targetId === actorId) return fail('Du kannst deinen eigenen Zug nicht überspringen.');
      const sheet = state.scores[targetId];
      const free = CATEGORIES.find((c) => sheet[c] === null)!;
      const scores = { ...state.scores, [targetId]: { ...sheet, [free]: 0 } };
      return ok(advanceTurn({ ...state, scores }, now));
    }
    case 'updateSettings': {
      if (!isHost) return fail('Nur der Host kann Einstellungen ändern.');
      if (state.status !== 'lobby') return fail('Einstellungen gehen nur in der Lobby.');
      if (!validSettings(action.settings)) return fail('Ungültige Einstellung.');
      return ok({ ...state, settings: { ...getSettings(state), ...action.settings } });
    }
    case 'timeout': {
      if (state.status !== 'playing') return fail('Das Spiel hat noch nicht begonnen.');
      if (!isActiveMember) return fail('Du bist nicht in diesem Spiel.');
      const deadline = turnDeadline(state);
      if (deadline === null) return fail('Kein Zeitlimit aktiv.');
      if (now < deadline) return fail('Die Zeit ist noch nicht abgelaufen.');
      const targetId = currentPlayerId(state)!;
      const dice = state.rollsLeft === ROLLS_PER_TURN ? state.dice.map(() => rollDie()) : (state.dice as number[]);
      const sheet = state.scores[targetId];
      const category = bestCategory(sheet, dice as number[]);
      const scores = { ...state.scores, [targetId]: { ...sheet, [category]: scoreCategory(category, dice as number[]) } };
      return ok(advanceTurn({ ...state, dice, scores }, now));
    }
  }
}
