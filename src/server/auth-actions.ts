'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { safeNext } from '@/lib/safe-next';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { isUsernameTaken, USERNAME_RE } from './profile-service';

export type AuthState = { error?: string; email?: string; username?: string };

const signUpSchema = z.object({
  email: z.email('Bitte eine gültige E-Mail eingeben.'),
  password: z.string().min(8, 'Passwort: mindestens 8 Zeichen.'),
  username: z.string().trim().regex(USERNAME_RE, 'Benutzername: 3–20 Zeichen, nur Buchstaben, Zahlen und _.'),
});

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const kept = { email: String(form.get('email') ?? ''), username: String(form.get('username') ?? '') };
  const parsed = signUpSchema.safeParse({
    email: form.get('email'), password: form.get('password'), username: form.get('username'),
  });
  if (!parsed.success) return { ...kept, error: parsed.error.issues[0].message };
  const { email, password, username } = parsed.data;
  if (await isUsernameTaken(createAdminClient(), username)) return { ...kept, error: 'Benutzername ist schon vergeben.' };
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { ...kept, error: 'Diese E-Mail ist schon registriert.' };
    return { ...kept, error: 'Registrierung fehlgeschlagen. Bitte nochmal versuchen.' };
  }
  redirect(safeNext(form.get('next')));
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get('email') ?? ''), password: String(form.get('password') ?? ''),
  });
  if (error) return { email: String(form.get('email') ?? ''), error: 'E-Mail oder Passwort falsch.' };
  redirect(safeNext(form.get('next')));
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/');
}
