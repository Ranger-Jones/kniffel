'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { fail } from './result';
import {
  removeFriend, respondFriendRequest, respondInvite, searchProfiles, sendFriendRequest,
} from './social-service';

const uuid = z.uuid();
const name = z.string().trim().min(1).max(40);

export async function searchAction(query: string) {
  const user = await requireUser();
  const q = name.safeParse(query);
  if (!q.success) return [];
  return searchProfiles(createAdminClient(), user.id, q.data);
}

export async function sendFriendRequestAction(username: string) {
  const user = await requireUser();
  const q = name.safeParse(username);
  if (!q.success) return fail('Benutzer nicht gefunden.');
  const res = await sendFriendRequest(createAdminClient(), user.id, q.data);
  revalidatePath('/freunde');
  return res;
}

export async function respondFriendRequestAction(friendshipId: string, accept: boolean) {
  const user = await requireUser();
  if (!uuid.safeParse(friendshipId).success) return fail('Anfrage nicht gefunden.');
  const res = await respondFriendRequest(createAdminClient(), user.id, friendshipId, accept === true);
  revalidatePath('/freunde');
  return res;
}

export async function removeFriendAction(friendshipId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(friendshipId).success) return fail('Freundschaft nicht gefunden.');
  const res = await removeFriend(createAdminClient(), user.id, friendshipId);
  revalidatePath('/freunde');
  return res;
}

export async function respondInviteAction(inviteId: string, accept: boolean) {
  const user = await requireUser();
  if (!uuid.safeParse(inviteId).success) return fail('Einladung nicht gefunden.');
  const res = await respondInvite(createAdminClient(), user.id, inviteId, accept === true);
  revalidatePath('/');
  return res;
}
