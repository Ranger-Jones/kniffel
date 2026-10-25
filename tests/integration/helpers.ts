import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

export const admin = createAdminClient();

let counter = 0;
export async function createTestUser(prefix = 'u') {
  const username = `${prefix}_${Date.now().toString(36)}${counter++}`.slice(0, 20);
  const email = `${username}@test.local`.toLowerCase();
  const password = 'passwort123';
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { username },
  });
  if (error) throw error;
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, email, password, username, client };
}
