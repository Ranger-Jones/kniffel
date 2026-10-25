import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY fehlen');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export type AdminClient = ReturnType<typeof createAdminClient>;
