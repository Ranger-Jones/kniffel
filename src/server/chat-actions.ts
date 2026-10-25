'use server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { sendChatMessage } from './chat-service';
import { fail } from './result';

export async function sendChatAction(gameId: string, body: string) {
  const user = await requireUser();
  if (!z.uuid().safeParse(gameId).success || typeof body !== 'string') return fail('Ungültige Nachricht.');
  return sendChatMessage(createAdminClient(), user.id, gameId, body);
}
