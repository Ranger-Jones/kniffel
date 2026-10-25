export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!AVATAR_TYPES.includes(file.type) || file.size > AVATAR_MAX_BYTES) {
    return 'Bitte ein JPG, PNG oder WebP bis 2 MB wählen.';
  }
  return null;
}

/** Schneidet mittig quadratisch zu und skaliert auf size×size (WebP). */
export async function cropToSquareWebp(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas nicht verfügbar');
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht umgewandelt werden'))), 'image/webp', 0.9));
}
