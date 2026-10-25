import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { isGateOpen } from '@/lib/gate-server';
import { createAdminClient } from './admin';
import type { Database } from './database.types';

export async function createServerSupabase() {
  const store = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // In Server Components nicht schreibbar – der Proxy erneuert die Session.
          }
        },
      },
    },
  );
}

export const getCurrentUser = cache(async () => {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await createAdminClient()
    .from('profiles').select('id, username, avatar_url').eq('id', user.id).maybeSingle();
  return data;
});

export async function requireUser() {
  if (!(await isGateOpen())) redirect('/zugang');
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
