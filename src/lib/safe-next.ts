/** Nur interne Pfade als Weiterleitungsziel erlauben (kein //host, keine Steuerzeichen oder Backslashes). */
export function safeNext(value: unknown): string {
  const s = typeof value === 'string' ? value : '';
  if (!s.startsWith('/') || /[\x00-\x1f\x7f\\]/.test(s)) return '/';
  const url = new URL(s, 'http://localhost');
  const result = url.pathname + url.search + url.hash;
  if (url.origin !== 'http://localhost' || result.startsWith('//')) return '/';
  return result;
}
