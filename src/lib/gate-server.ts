import 'server-only';
import { cookies } from 'next/headers';
import { GATE_COOKIE, verifyGateToken } from './gate';

/**
 * Server Actions lassen sich per POST über jede Seite aufrufen – auch über das nicht gesperrte /zugang.
 * Deshalb prüfen Actions die Freischaltung selbst, nicht nur der Proxy.
 */
export async function isGateOpen(): Promise<boolean> {
  return verifyGateToken((await cookies()).get(GATE_COOKIE)?.value, process.env.SUPABASE_SECRET_KEY);
}
