import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, test } from 'vitest';
import { createGame, joinGame, loadGame, performAction } from '@/server/game-service';
import { admin, createTestUser } from './helpers';

function subscribeStatus(client: SupabaseClient, topic: string): Promise<string> {
  return new Promise((resolve) => {
    const channel = client.channel(topic, { config: { private: true } });
    const timer = setTimeout(() => resolve('TIMEOUT'), 8000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') {
        clearTimeout(timer);
        client.removeChannel(channel);
        resolve(status);
      }
    });
  });
}

describe('private Spielkanäle', () => {
  test('nur Mitglieder dürfen den Spielkanal betreten', async () => {
    const a = await createTestUser('rtA');
    const stranger = await createTestUser('rtX');
    const game = await createGame(admin, a.id);
    if (!game.ok) throw new Error(game.error);
    await a.client.realtime.setAuth();
    await stranger.client.realtime.setAuth();
    expect(await subscribeStatus(a.client, `game:${game.data.id}`)).toBe('SUBSCRIBED');
    expect(await subscribeStatus(stranger.client, `game:${game.data.id}`)).toBe('CHANNEL_ERROR');
  });

  test('wer das Spiel verlassen hat, kommt nicht mehr in den Kanal', async () => {
    const a = await createTestUser('rtL');
    const b = await createTestUser('rtM');
    const game = await createGame(admin, a.id);
    if (!game.ok) throw new Error(game.error);
    await joinGame(admin, b.id, game.data.code);
    await performAction(admin, a.id, game.data.id, { type: 'start' }, (await loadGame(admin, game.data.id))!.version);
    await performAction(admin, b.id, game.data.id, { type: 'leave' });
    await b.client.realtime.setAuth();
    expect(await subscribeStatus(b.client, `game:${game.data.id}`)).toBe('CHANNEL_ERROR');
  });
});
