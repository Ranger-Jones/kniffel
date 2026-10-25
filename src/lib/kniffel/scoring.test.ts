import { describe, expect, test } from 'vitest';
import {
  emptySheet, filledCount, isComplete, lowerSum, scoreCategory, totalScore, upperBonus, upperSum,
} from './scoring';
import { CATEGORIES, type ScoreSheet } from './types';

describe('scoreCategory', () => {
  test.each([
    ['ones', [1, 1, 2, 3, 1], 3],
    ['twos', [2, 2, 2, 5, 6], 6],
    ['threes', [1, 2, 4, 5, 6], 0],
    ['sixes', [6, 6, 6, 6, 1], 24],
    ['threeKind', [3, 3, 3, 2, 1], 12],
    ['threeKind', [3, 3, 2, 2, 1], 0],
    ['threeKind', [4, 4, 4, 4, 4], 20],
    ['fourKind', [5, 5, 5, 5, 2], 22],
    ['fourKind', [5, 5, 5, 2, 2], 0],
    ['fullHouse', [2, 2, 3, 3, 3], 25],
    ['fullHouse', [3, 3, 3, 3, 3], 0],
    ['fullHouse', [2, 2, 3, 3, 4], 0],
    ['smallStraight', [1, 2, 3, 4, 6], 30],
    ['smallStraight', [3, 4, 5, 6, 6], 30],
    ['smallStraight', [2, 3, 3, 4, 5], 30],
    ['smallStraight', [1, 2, 3, 5, 6], 0],
    ['largeStraight', [2, 3, 4, 5, 6], 40],
    ['largeStraight', [1, 2, 3, 4, 5], 40],
    ['largeStraight', [1, 2, 3, 4, 6], 0],
    ['smallStraight', [2, 3, 4, 5, 6], 30],
    ['kniffel', [6, 6, 6, 6, 6], 50],
    ['kniffel', [6, 6, 6, 6, 5], 0],
    ['chance', [1, 2, 3, 4, 6], 16],
  ] as const)('%s %j = %i', (category, dice, expected) => {
    expect(scoreCategory(category, dice)).toBe(expected);
  });

  test('wirft bei ungültigen Würfeln', () => {
    expect(() => scoreCategory('chance', [1, 2, 3, 4])).toThrow();
    expect(() => scoreCategory('chance', [0, 2, 3, 4, 5])).toThrow();
    expect(() => scoreCategory('chance', [7, 2, 3, 4, 5])).toThrow();
    expect(() => scoreCategory('chance', [1.5, 2, 3, 4, 5])).toThrow();
  });
});

function sheet(values: Partial<ScoreSheet>): ScoreSheet {
  return { ...emptySheet(), ...values };
}

describe('Summen', () => {
  test('leerer Zettel', () => {
    const s = emptySheet();
    expect(CATEGORIES.every((c) => s[c] === null)).toBe(true);
    expect(totalScore(s)).toBe(0);
    expect(isComplete(s)).toBe(false);
    expect(filledCount(s)).toBe(0);
  });

  test('Bonus genau ab 63', () => {
    const s62 = sheet({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 17 });
    expect(upperSum(s62)).toBe(62);
    expect(upperBonus(s62)).toBe(0);
    const s63 = sheet({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
    expect(upperBonus(s63)).toBe(35);
    expect(totalScore(s63)).toBe(63 + 35);
  });

  test('Gesamt mit unterem Teil, 0-Einträge zählen als gefüllt', () => {
    const s = sheet({ ones: 0, kniffel: 50, chance: 20 });
    expect(lowerSum(s)).toBe(70);
    expect(totalScore(s)).toBe(70);
    expect(filledCount(s)).toBe(3);
  });

  test('voller Zettel ist komplett', () => {
    const s = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as ScoreSheet;
    expect(isComplete(s)).toBe(true);
  });
});
