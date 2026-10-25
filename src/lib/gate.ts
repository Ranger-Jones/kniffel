/** Zugangsfrage vor der ganzen Seite – ein Türsteher gegen Fremde, kein echter Schutz. */
export const GATE_QUESTION = 'Wie heißt mein Lieblings PWC Mitarbeiter?';
export const GATE_COOKIE = 'kniffel_zugang';
export const GATE_PATH = '/zugang';
export const GATE_MAX_AGE = 60 * 60 * 24 * 365;

const ANSWER = 'paul';
const PAYLOAD = 'kniffel-zugang-v1';

export function isCorrectGateAnswer(input: unknown): boolean {
  return typeof input === 'string' && input.trim().toLowerCase() === ANSWER;
}

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Signiertes Freischalt-Token (Schlüssel: SUPABASE_SECRET_KEY). */
export async function createGateToken(secret: string): Promise<string> {
  return `v1.${await hmac(secret, PAYLOAD)}`;
}

export async function verifyGateToken(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret) return false;
  const expected = await createGateToken(secret);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
