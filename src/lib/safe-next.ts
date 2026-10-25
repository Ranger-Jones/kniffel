/** Nur interne Pfade als Weiterleitungsziel erlauben (kein //host, keine Steuerzeichen oder Backslashes). */
export function safeNext(value: unknown): string {
  const s = typeof value === 'string' ? value : '';
  // eslint-disable-next-line no-control-regex
  if (!s.startsWith('/') || /[\x00-\x1f\x7f\\]/.test(s)) return '/';
  const url = new URL(s, 'http://localhost');
  if (url.origin !== 'http://localhost') return '/';
  return url.pathname + url.search + url.hash;
}
