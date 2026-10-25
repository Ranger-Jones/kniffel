import { describe, expect, test } from 'vitest';
import {
  applyAction, createGameState, createRematchState, currentPlayerId, currentRound, placements,
  type GameAction, type GameState,
} from './engine';
import { CATEGORIES } from './types';

const A = 'a', B = 'b', C = 'c';
const dieSeq = (...values: number[]) => { let i = 0; return () => values[i++ % values.length]; };
const six = () => 6;

function act(state: GameState, actor: string, action: GameAction, roll = six): GameState {
  const res = applyAction(state, actor, action, roll);
  if (!res.ok) throw new Error(res.error);
  return res.state;
}
function expectError(state: GameState, actor: string, action: GameAction, msg: RegExp) {
  const res = applyAction(state, actor, action, six);
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error).toMatch(msg);
}
function lobby(...ids: string[]) {
  let s = createGameState(ids[0]);
  for (const id of ids.slice(1)) s = act(s, id, { type: 'join' });
  return s;
}
const started = (...ids: string[]) => act(lobby(...ids), ids[0], { type: 'start' });

describe('Lobby', () => {
  test('Ersteller ist Host und einziger Spieler', () => {
    const s = createGameState(A);
    expect(s).toMatchObject({ status: 'lobby', hostId: A, players: [{ id: A, left: false }] });
    expect(s.scores[A].ones).toBeNull();
  });
  test('Beitritt bis 6 Spieler, dann voll', () => {
    const s = lobby('1', '2', '3', '4', '5', '6');
    expect(s.players).toHaveLength(6);
    expectError(s, '7', { type: 'join' }, /voll/);
  });
  test('erneuter Beitritt ist No-Op (gleiches Objekt)', () => {
    const s = lobby(A, B);
    const res = applyAction(s, B, { type: 'join' }, six);
    expect(res.ok && res.state).toBe(s);
  });
  test('Beitritt in laufendes Spiel verboten', () => {
    expectError(started(A), B, { type: 'join' }, /läuft bereits/);
  });
  test('nur Host startet', () => {
    expectError(lobby(A, B), B, { type: 'start' }, /Host/);
    expect(started(A, B)).toMatchObject({ status: 'playing', currentSeat: 0, rollsLeft: 3 });
  });
  test('Host verlässt Lobby → nächster wird Host, Spieler entfernt', () => {
    const s = act(lobby(A, B, C), A, { type: 'leave' });
    expect(s.players.map((p) => p.id)).toEqual([B, C]);
    expect(s.hostId).toBe(B);
    expect(s.scores[A]).toBeUndefined();
  });
  test('letzter Spieler verlässt Lobby → keine Spieler', () => {
    expect(act(lobby(A), A, { type: 'leave' }).players).toEqual([]);
  });
  test('Host kann in der Lobby Spieler entfernen, sich selbst nicht', () => {
    const s = act(lobby(A, B), A, { type: 'removePlayer', playerId: B });
    expect(s.players.map((p) => p.id)).toEqual([A]);
    expectError(lobby(A, B), A, { type: 'removePlayer', playerId: A }, /selbst/);
    expectError(lobby(A, B), B, { type: 'removePlayer', playerId: A }, /Host/);
  });
});

describe('Zug', () => {
  test('nur aktiver Spieler darf würfeln', () => {
    expectError(started(A, B), B, { type: 'roll' }, /nicht am Zug/);
    expectError(lobby(A), A, { type: 'roll' }, /noch nicht begonnen/);
  });
  test('Würfeln setzt 5 Würfel und verbraucht Würfe; max 3', () => {
    let s = act(started(A), A, { type: 'roll' }, dieSeq(1, 2, 3, 4, 5));
    expect(s.dice).toEqual([1, 2, 3, 4, 5]);
    expect(s.rollsLeft).toBe(2);
    s = act(s, A, { type: 'roll' });
    s = act(s, A, { type: 'roll' });
    expect(s.rollsLeft).toBe(0);
    expectError(s, A, { type: 'roll' }, /Keine Würfe/);
  });
  test('gehaltene Würfel bleiben', () => {
    let s = act(started(A), A, { type: 'roll' }, dieSeq(1, 2, 3, 4, 5));
    s = act(s, A, { type: 'setHold', index: 0, held: true });
    s = act(s, A, { type: 'setHold', index: 4, held: true });
    s = act(s, A, { type: 'roll' }, six);
    expect(s.dice).toEqual([1, 6, 6, 6, 5]);
    s = act(s, A, { type: 'setHold', index: 4, held: false });
    expect(s.held).toEqual([true, false, false, false, false]);
  });
  test('setHold ist idempotent', () => {
    let s = act(started(A), A, { type: 'roll' });
    s = act(s, A, { type: 'setHold', index: 2, held: true });
    s = act(s, A, { type: 'setHold', index: 2, held: true });
    expect(s.held[2]).toBe(true);
  });
  test('Halten vor erstem Wurf / ungültiger Index verboten', () => {
    expectError(started(A), A, { type: 'setHold', index: 0, held: true }, /Erst würfeln/);
    const s = act(started(A), A, { type: 'roll' });
    expectError(s, A, { type: 'setHold', index: 5, held: true }, /Würfel/);
  });
  test('Eintragen vor Wurf verboten', () => {
    expectError(started(A), A, { type: 'score', category: 'chance' }, /Erst würfeln/);
  });
  test('Eintragen wertet, wechselt Spieler, setzt Zug zurück', () => {
    let s = act(started(A, B), A, { type: 'roll' }, dieSeq(6, 6, 6, 6, 6));
    s = act(s, A, { type: 'score', category: 'kniffel' });
    expect(s.scores[A].kniffel).toBe(50);
    expect(currentPlayerId(s)).toBe(B);
    expect(s).toMatchObject({ rollsLeft: 3, dice: [null, null, null, null, null], held: [false, false, false, false, false] });
  });
  test('belegtes Feld verboten', () => {
    let s = act(started(A), A, { type: 'roll' });
    s = act(s, A, { type: 'score', category: 'chance' });
    s = act(s, A, { type: 'roll' });
    expectError(s, A, { type: 'score', category: 'chance' }, /schon belegt/);
  });
});

function playFullGame(ids: string[]): GameState {
  let s = started(...ids);
  for (let round = 0; round < 13; round++) {
    for (const id of ids) {
      expect(currentPlayerId(s)).toBe(id);
      s = act(s, id, { type: 'roll' }, six);
      s = act(s, id, { type: 'score', category: CATEGORIES[round] });
    }
  }
  return s;
}

describe('Spielende', () => {
  test('nach 13 Runden beendet', () => {
    const s = playFullGame([A, B]);
    expect(s.status).toBe('finished');
    expect(currentPlayerId(s)).toBeNull();
    expectError(s, A, { type: 'roll' }, /beendet/);
  });
  test('Runde zählt hoch', () => {
    let s = started(A, B);
    expect(currentRound(s)).toBe(1);
    s = act(act(s, A, { type: 'roll' }), A, { type: 'score', category: 'ones' });
    expect(currentRound(s)).toBe(1);
    s = act(act(s, B, { type: 'roll' }), B, { type: 'score', category: 'ones' });
    expect(currentRound(s)).toBe(2);
  });
  test('Gleichstand teilt Platz 1', () => {
    expect(placements(playFullGame([A, B]))).toEqual({ [A]: 1, [B]: 1 });
  });
  test('Platzierung nach Punkten, entfernte Spieler ausgenommen', () => {
    let s = started(A, B, C);
    s = act(s, A, { type: 'removePlayer', playerId: C });
    for (let round = 0; round < 13; round++) {
      s = act(s, A, { type: 'roll' }, six);
      s = act(s, A, { type: 'score', category: CATEGORIES[round] });
      s = act(s, B, { type: 'roll' }, () => 1);
      s = act(s, B, { type: 'score', category: CATEGORIES[round] });
    }
    expect(s.status).toBe('finished');
    expect(placements(s)).toEqual({ [A]: 1, [B]: 2 });
  });
});

describe('Offline & Verlassen', () => {
  test('Host überspringt Zug: 0 im ersten freien Feld', () => {
    let s = started(A, B);
    s = act(act(s, A, { type: 'roll' }), A, { type: 'score', category: 'ones' });
    s = act(s, A, { type: 'skipTurn' });
    expect(s.scores[B].ones).toBe(0);
    expect(currentPlayerId(s)).toBe(A);
  });
  test('nur Host überspringt, nicht den eigenen Zug', () => {
    let s = started(A, B);
    expectError(s, A, { type: 'skipTurn' }, /eigenen Zug/);
    s = act(act(s, A, { type: 'roll' }), A, { type: 'score', category: 'ones' });
    expectError(s, B, { type: 'skipTurn' }, /Host/);
  });
  test('aktiven Spieler entfernen → nächster ist dran', () => {
    let s = started(A, B, C);
    s = act(act(s, A, { type: 'roll' }), A, { type: 'score', category: 'ones' });
    s = act(s, A, { type: 'removePlayer', playerId: B });
    expect(s.players.find((p) => p.id === B)?.left).toBe(true);
    expect(currentPlayerId(s)).toBe(C);
  });
  test('Host verlässt laufendes Spiel → nächster aktiver wird Host', () => {
    const s = act(started(A, B, C), A, { type: 'leave' });
    expect(s.hostId).toBe(B);
    expect(currentPlayerId(s)).toBe(B);
    expect(s.status).toBe('playing');
  });
  test('letzter aktiver Spieler verlässt → Spiel beendet', () => {
    const s = act(started(A), A, { type: 'leave' });
    expect(s.status).toBe('finished');
  });
  test('entfernter Spieler kann nichts mehr', () => {
    const s = act(started(A, B), B, { type: 'leave' });
    expectError(s, B, { type: 'leave' }, /nicht in diesem Spiel/);
  });
});

test('Revanche-Zustand: gleiche Spieler, Host = Auslöser, leere Zettel', () => {
  const s = createRematchState(B, [A, B]);
  expect(s).toMatchObject({ status: 'lobby', hostId: B, players: [{ id: A, left: false }, { id: B, left: false }] });
  expect(s.scores[A].chance).toBeNull();
});
