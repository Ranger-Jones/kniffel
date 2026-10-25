import { describe, expect, test } from 'vitest';
import { createGateToken, isCorrectGateAnswer, verifyGateToken } from './gate';

describe('Zugangsfrage', () => {
  test.each(['Paul', 'paul', '  PAUL ', 'pAuL'])('akzeptiert %j', (answer) => {
    expect(isCorrectGateAnswer(answer)).toBe(true);
  });
  test.each(['', 'Pau', 'Paula', 'Peter', 'paul paul', null, undefined, 42])('lehnt %j ab', (answer) => {
    expect(isCorrectGateAnswer(answer)).toBe(false);
  });
});

describe('Freischalt-Cookie', () => {
  test('eigenes Token ist gültig', async () => {
    const token = await createGateToken('geheim-1');
    expect(await verifyGateToken(token, 'geheim-1')).toBe(true);
  });
  test('Token mit anderem Schlüssel, manipuliert oder leer ist ungültig', async () => {
    const token = await createGateToken('geheim-1');
    expect(await verifyGateToken(token, 'geheim-2')).toBe(false);
    expect(await verifyGateToken(`${token.slice(0, -1)}x`, 'geheim-1')).toBe(false);
    expect(await verifyGateToken('', 'geheim-1')).toBe(false);
    expect(await verifyGateToken(undefined, 'geheim-1')).toBe(false);
  });
  test('ohne Schlüssel ist nichts gültig', async () => {
    const token = await createGateToken('geheim-1');
    expect(await verifyGateToken(token, '')).toBe(false);
  });
});
