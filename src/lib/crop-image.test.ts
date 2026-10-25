import { expect, test } from 'vitest';
import { validateAvatarFile } from './crop-image';

test.each([
  [{ type: 'image/jpeg', size: 1000 }, null],
  [{ type: 'image/webp', size: 2 * 1024 * 1024 }, null],
  [{ type: 'image/gif', size: 1000 }, 'Bitte ein JPG, PNG oder WebP bis 2 MB wählen.'],
  [{ type: 'image/png', size: 2 * 1024 * 1024 + 1 }, 'Bitte ein JPG, PNG oder WebP bis 2 MB wählen.'],
])('validateAvatarFile(%j)', (file, expected) => {
  expect(validateAvatarFile(file)).toBe(expected);
});
