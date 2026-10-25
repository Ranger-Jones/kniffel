/** Nur interne Pfade als Weiterleitungsziel erlauben (kein //host, kein /\host). */
export function safeNext(value: unknown): string {
  const s = typeof value === 'string' ? value : '';
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : '/';
}
