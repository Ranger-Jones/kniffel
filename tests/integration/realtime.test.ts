import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, test } from 'vitest';
import { createGame, joinGame, loadGame, performAction } from '@/server/game-service';
import { listFriends, respondFriendRequest, sendFriendRequest } from '@/server/social-service';
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

describe('Online-Kanäle pro Nutzer', () => {
  test('nur der Nutzer selbst und angenommene Freunde dürfen online:<id> lesen', async () => {
    const owner = await createTestUser('onO');
    const friend = await createTestUser('onF');
    const stranger = await createTestUser('onS');
    await sendFriendRequest(admin, owner.id, friend.username);
    const req = (await listFriends(admin, friend.id)).incoming[0];
    await respondFriendRequest(admin, friend.id, req.friendshipId, true);
    for (const u of [owner, friend, stranger]) await u.client.realtime.setAuth();
    expect(await subscribeStatus(owner.client, `online:${owner.id}`)).toBe('SUBSCRIBED');
    expect(await subscribeStatus(friend.client, `online:${owner.id}`)).toBe('SUBSCRIBED');
    expect(await subscribeStatus(stranger.client, `online:${owner.id}`)).toBe('CHANNEL_ERROR');
    expect(await subscribeStatus(stranger.client, 'online')).toBe('CHANNEL_ERROR');
  });
});

describe('Entfernen aus der Lobby', () => {
  test('der entfernte Spieler bekommt eine kicked-Nachricht im Spielkanal', async () => {
    const host = await createTestUser('kcH');
    const kicked = await createTestUser('kcB');
    const game = await createGame(admin, host.id);
    if (!game.ok) throw new Error(game.error);
    await joinGame(admin, kicked.id, game.data.code);
    await kicked.client.realtime.setAuth();
    const received = new Promise<unknown>((resolve) => {
      const timer = setTimeout(() => resolve('TIMEOUT'), 8000);
      kicked.client.channel(`game:${game.data.id}`, { config: { private: true } })
        .on('broadcast', { event: 'kicked' }, ({ payload }) => { clearTimeout(timer); resolve(payload); })
        .subscribe(async (status) => {
          if (status !== 'SUBSCRIBED') return;
          const v = (await loadGame(admin, game.data.id))!.version;
          await performAction(admin, host.id, game.data.id, { type: 'removePlayer', playerId: kicked.id }, v);
        });
    });
    expect(await received).toEqual({ userId: kicked.id });
  });
});
