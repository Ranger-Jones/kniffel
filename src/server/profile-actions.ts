'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { renameUser, setAvatarUrl } from './profile-service';
import { fail } from './result';

export async function renameAction(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const username = String(form.get('username') ?? '');
  const res = await renameUser(createAdminClient(), user.id, username);
  if (!res.ok) return { error: res.error };
  revalidatePath('/', 'layout');
  redirect(`/profil/${username.trim()}`);
}

export async function setAvatarAction(url: string) {
  const user = await requireUser();
  if (typeof url !== 'string') return fail('Ungültige Bild-URL.');
  const res = await setAvatarUrl(createAdminClient(), user.id, url);
  revalidatePath('/', 'layout');
  return res;
}
