import {
  CATEGORIES, LOWER_CATEGORIES, UPPER_BONUS, UPPER_BONUS_THRESHOLD, UPPER_CATEGORIES,
  type Category, type ScoreSheet,
} from './types';

function assertDice(dice: readonly number[]): void {
  if (dice.length !== 5 || dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) {
    throw new Error(`Ungültige Würfel: ${JSON.stringify(dice)}`);
  }
}

function faceCounts(dice: readonly number[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  return counts;
}

function hasRun(counts: number[], length: number): boolean {
  let run = 0;
  for (let face = 1; face <= 6; face++) {
    run = counts[face] > 0 ? run + 1 : 0;
    if (run >= length) return true;
  }
  return false;
}

const sum = (dice: readonly number[]) => dice.reduce((a, b) => a + b, 0);

export function scoreCategory(category: Category, dice: readonly number[]): number {
  assertDice(dice);
  const counts = faceCounts(dice);
  const maxSame = Math.max(...counts);
  const upperIndex = (UPPER_CATEGORIES as readonly Category[]).indexOf(category);
  if (upperIndex >= 0) return counts[upperIndex + 1] * (upperIndex + 1);

  switch (category) {
    case 'threeKind': return maxSame >= 3 ? sum(dice) : 0;
    case 'fourKind': return maxSame >= 4 ? sum(dice) : 0;
    case 'fullHouse': return counts.includes(3) && counts.includes(2) ? 25 : 0;
    case 'smallStraight': return hasRun(counts, 4) ? 30 : 0;
    case 'largeStraight': return hasRun(counts, 5) ? 40 : 0;
    case 'kniffel': return maxSame === 5 ? 50 : 0;
    case 'chance': return sum(dice);
    default: throw new Error(`Unbekanntes Feld: ${category}`);
  }
}

export function emptySheet(): ScoreSheet {
  return Object.fromEntries(CATEGORIES.map((c) => [c, null])) as ScoreSheet;
}

const sumOf = (sheet: ScoreSheet, cats: readonly Category[]) =>
  cats.reduce((total, c) => total + (sheet[c] ?? 0), 0);

export const upperSum = (sheet: ScoreSheet) => sumOf(sheet, UPPER_CATEGORIES);
export const lowerSum = (sheet: ScoreSheet) => sumOf(sheet, LOWER_CATEGORIES);
export const upperBonus = (sheet: ScoreSheet) => (upperSum(sheet) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0);
export const totalScore = (sheet: ScoreSheet) => upperSum(sheet) + upperBonus(sheet) + lowerSum(sheet);
export const filledCount = (sheet: ScoreSheet) => CATEGORIES.filter((c) => sheet[c] !== null).length;
export const isComplete = (sheet: ScoreSheet) => filledCount(sheet) === CATEGORIES.length;
