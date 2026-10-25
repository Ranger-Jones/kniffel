import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/safe-next';
import { AuthForm } from '@/components/auth/auth-form';
import { getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Registrieren' };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return <AuthForm mode="register" next={next} />;
}
