import { getSettings } from '@/lib/kniffel/engine';
import type { AdminClient } from '@/lib/supabase/admin';
import { loadGame } from './game-service';
import { fail, ok, type ServiceResult } from './result';

export const CHAT_MAX = 300;

export async function sendChatMessage(admin: AdminClient, userId: string, gameId: string, body: unknown): Promise<ServiceResult> {
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) return fail('Die Nachricht ist leer.');
  if (text.length > CHAT_MAX) return fail(`Maximal ${CHAT_MAX} Zeichen.`);
  const game = await loadGame(admin, gameId);
  if (!game || !game.state.players.some((p) => p.id === userId && !p.left)) return fail('Du bist nicht in diesem Spiel.');
  if (!getSettings(game.state).chat) return fail('Der Chat ist in diesem Spiel aus.');

  // Das Limit (1 Nachricht/Sekunde) erzwingt ein Datenbank-Trigger mit Sperre.
  const { error } = await admin.from('game_messages').insert({ game_id: gameId, user_id: userId, body: text });
  if (error?.message.includes('chat_rate_limit')) return fail('Nicht so schnell – kurz warten.');
  if (error) throw error;
  return ok(undefined);
}
