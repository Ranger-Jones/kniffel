import { emptySheet, filledCount, isComplete, scoreCategory, totalScore } from './scoring';
import { CATEGORIES, isCategory, type Category, type ScoreSheet } from './types';

export const MAX_PLAYERS = 6;
export const ROLLS_PER_TURN = 3;

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
}
export type GameAction =
  | { type: 'join' }
  | { type: 'leave' }
  | { type: 'start' }
  | { type: 'roll' }
  | { type: 'setHold'; index: number; held: boolean }
  | { type: 'score'; category: Category }
  | { type: 'skipTurn' }
  | { type: 'removePlayer'; playerId: string };
export type RollDie = () => number;
export type EngineResult = { ok: true; state: GameState } | { ok: false; error: string };

const ok = (state: GameState): EngineResult => ({ ok: true, state });
const fail = (error: string): EngineResult => ({ ok: false, error });

function freshTurn() {
  return {
    dice: [null, null, null, null, null],
    held: [false, false, false, false, false],
    rollsLeft: ROLLS_PER_TURN,
  };
}

export function createGameState(hostId: string): GameState {
  return createRematchState(hostId, [hostId]);
}

export function createRematchState(hostId: string, playerIds: string[]): GameState {
  return {
    status: 'lobby',
    hostId,
    players: playerIds.map((id) => ({ id, left: false })),
    currentSeat: 0,
    ...freshTurn(),
    scores: Object.fromEntries(playerIds.map((id) => [id, emptySheet()])),
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
function advanceTurn(state: GameState): GameState {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const seat = (state.currentSeat + step) % n;
    const p = state.players[seat];
    if (!p.left && !isComplete(state.scores[p.id])) return { ...state, ...freshTurn(), currentSeat: seat };
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

function withoutPlayer(state: GameState, playerId: string): GameState {
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
  if (state.currentSeat === seat) next = advanceTurn(next);
  return next;
}

function requireTurn(state: GameState, actorId: string): string | null {
  if (state.status === 'lobby') return 'Das Spiel hat noch nicht begonnen.';
  if (currentPlayerId(state) !== actorId) return 'Du bist nicht am Zug.';
  return null;
}

export function applyAction(state: GameState, actorId: string, action: GameAction, rollDie: RollDie): EngineResult {
  if (state.status === 'finished') return fail('Das Spiel ist bereits beendet.');
  const isActiveMember = state.players.some((p) => p.id === actorId && !p.left);
  const isHost = state.hostId === actorId;

  switch (action.type) {
    case 'join': {
      if (state.status !== 'lobby') return fail('Das Spiel läuft bereits.');
      if (state.players.some((p) => p.id === actorId)) return ok(state);
      if (state.players.length >= MAX_PLAYERS) return fail('Der Raum ist voll.');
      return ok({
        ...state,
        players: [...state.players, { id: actorId, left: false }],
        scores: { ...state.scores, [actorId]: emptySheet() },
      });
    }
    case 'leave':
      if (!isActiveMember) return fail('Du bist nicht in diesem Spiel.');
      return ok(withoutPlayer(state, actorId));
    case 'removePlayer': {
      if (!isHost) return fail('Nur der Host kann Spieler entfernen.');
      if (action.playerId === actorId) return fail('Du kannst dich nicht selbst entfernen.');
      if (!state.players.some((p) => p.id === action.playerId && !p.left)) return fail('Spieler nicht gefunden.');
      return ok(withoutPlayer(state, action.playerId));
    }
    case 'start':
      if (state.status !== 'lobby') return fail('Das Spiel läuft bereits.');
      if (!isHost) return fail('Nur der Host kann das Spiel starten.');
      return ok({ ...state, status: 'playing', currentSeat: 0, ...freshTurn() });
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
      return ok(advanceTurn({ ...state, scores }));
    }
    case 'skipTurn': {
      if (state.status !== 'playing') return fail('Das Spiel hat noch nicht begonnen.');
      if (!isHost) return fail('Nur der Host kann Züge überspringen.');
      const targetId = currentPlayerId(state)!;
      if (targetId === actorId) return fail('Du kannst deinen eigenen Zug nicht überspringen.');
      const sheet = state.scores[targetId];
      const free = CATEGORIES.find((c) => sheet[c] === null)!;
      const scores = { ...state.scores, [targetId]: { ...sheet, [free]: 0 } };
      return ok(advanceTurn({ ...state, scores }));
    }
  }
}
