'use server';
import { cookies } from 'next/headers';
import { createGateToken, GATE_COOKIE, GATE_MAX_AGE, isCorrectGateAnswer } from '@/lib/gate';
import { safeNext } from '@/lib/safe-next';

export type GateState = { error?: string; next?: string };

export async function unlockAction(_: GateState, form: FormData): Promise<GateState> {
  if (!isCorrectGateAnswer(form.get('answer'))) return { error: 'Leider falsch.' };
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return { error: 'Die Seite ist noch nicht fertig eingerichtet.' };
  (await cookies()).set(GATE_COOKIE, await createGateToken(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: GATE_MAX_AGE,
    path: '/',
  });
  // Ganzer Seitenwechsel im Client, damit Proxy-Weiterleitungen (z. B. zum Login) greifen.
  return { next: safeNext(form.get('next')) };
}
