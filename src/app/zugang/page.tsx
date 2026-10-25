import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GATE_COOKIE, verifyGateToken } from '@/lib/gate';
import { safeNext } from '@/lib/safe-next';
import { GateForm } from './gate-form';

export const metadata: Metadata = { title: 'Zugang' };

export default async function GatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const token = (await cookies()).get(GATE_COOKIE)?.value;
  if (await verifyGateToken(token, process.env.SUPABASE_SECRET_KEY)) redirect(next);
  return <GateForm next={next} />;
}
