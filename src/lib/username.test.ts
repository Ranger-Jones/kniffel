import { expect, test } from 'vitest';
import { parseUsernameParam } from './username';

test.each([
  ['max_1', 'max_1'],
  ['Max%5F1', 'Max_1'],
  ['%25', null],
  ['%', null],
  ['%E0%A4%A', null],
  ['a b', null],
  ['ab', null],
  ['x'.repeat(21), null],
])('parseUsernameParam(%j) = %j', (raw, expected) => {
  expect(parseUsernameParam(raw)).toBe(expected);
});
