import { expect, test } from 'vitest';
import { safeNext } from './safe-next';

test.each([
  ['/freunde', '/freunde'],
  ['/spiel/ABCDEF?x=1', '/spiel/ABCDEF?x=1'],
  ['//evil.example', '/'],
  ['/\\evil.example', '/'],
  ['https://evil.example', '/'],
  ['/\t/evil.example', '/'],
  ['/\n/evil.example', '/'],
  ['/a\\b', '/'],
  [undefined, '/'],
  [null, '/'],
])('safeNext(%j) = %j', (input, expected) => {
  expect(safeNext(input)).toBe(expected);
});
