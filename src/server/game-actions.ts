'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { GameAction } from '@/lib/kniffel/engine';
import { CATEGORIES } from '@/lib/kniffel/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { createGame, joinGame, performAction, requestRematch, type Expectation } from './game-service';
import { fail } from './result';
import { inviteToGame } from './social-service';

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('leave') }),
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('roll') }),
  z.object({ type: z.literal('setHold'), index: z.number().int().min(0).max(4), held: z.boolean() }),
  z.object({ type: z.literal('score'), category: z.enum(CATEGORIES) }),
  z.object({ type: z.literal('skipTurn') }),
  z.object({ type: z.literal('removePlayer'), playerId: z.uuid() }),
]);
const uuid = z.uuid();
const expectationSchema = z.union([
  z.number().int().min(0),
  z.object({ seat: z.number().int().min(0).max(5), rollsLeft: z.number().int().min(0).max(3) }),
]).optional();

export async function createGameAction() {
  const user = await requireUser();
  const res = await createGame(createAdminClient(), user.id);
  if (!res.ok) throw new Error(res.error);
  redirect(`/spiel/${res.data.code}`);
}

export async function joinGameAction(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const res = await joinGame(createAdminClient(), user.id, String(form.get('code') ?? ''));
  if (!res.ok) return { error: res.error };
  redirect(`/spiel/${res.data.code}`);
}

export async function gameAction(gameId: string, action: GameAction, expected?: Expectation) {
  const user = await requireUser();
  const parsed = actionSchema.safeParse(action);
  const exp = expectationSchema.safeParse(expected);
  if (!parsed.success || !exp.success || !uuid.safeParse(gameId).success) return fail('Ungültige Aktion.');
  return performAction(createAdminClient(), user.id, gameId, parsed.data, exp.data);
}

export async function rematchAction(gameId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(gameId).success) return fail('Ungültige Aktion.');
  return requestRematch(createAdminClient(), user.id, gameId);
}

export async function inviteAction(gameId: string, friendId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(gameId).success || !uuid.safeParse(friendId).success) return fail('Ungültige Aktion.');
  return inviteToGame(createAdminClient(), user.id, gameId, friendId);
}
