export const UPPER_CATEGORIES = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'] as const;
export const LOWER_CATEGORIES = [
  'threeKind', 'fourKind', 'fullHouse', 'smallStraight', 'largeStraight', 'kniffel', 'chance',
] as const;
export const CATEGORIES = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES] as const;

export type Category = (typeof CATEGORIES)[number];
export type ScoreSheet = Record<Category, number | null>;

export const UPPER_BONUS = 35;
export const UPPER_BONUS_THRESHOLD = 63;

export const CATEGORY_LABELS: Record<Category, string> = {
  ones: 'Einser', twos: 'Zweier', threes: 'Dreier', fours: 'Vierer', fives: 'Fünfer', sixes: 'Sechser',
  threeKind: 'Dreierpasch', fourKind: 'Viererpasch', fullHouse: 'Full House',
  smallStraight: 'Kleine Straße', largeStraight: 'Große Straße', kniffel: 'Kniffel', chance: 'Chance',
};

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
