import { describe, expect, test } from 'vitest';
import { sendChatMessage } from '@/server/chat-service';
import { createGame, joinGame, loadGame, performAction } from '@/server/game-service';
import { admin, createTestUser } from './helpers';

async function lobbyWith(n: number) {
  const users = await Promise.all(Array.from({ length: n }, (_, i) => createTestUser(`ch${i}`)));
  const game = await createGame(admin, users[0].id);
  if (!game.ok) throw new Error(game.error);
  for (const u of users.slice(1)) await joinGame(admin, u.id, game.data.code);
  return { users, gameId: game.data.id };
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Chat', () => {
  test('Mitspieler schreiben und lesen, Fremde sehen nichts', async () => {
    const { users: [a, b], gameId } = await lobbyWith(2);
    const stranger = await createTestUser('chX');
    expect(await sendChatMessage(admin, a.id, gameId, '  Hallo zusammen!  ')).toEqual({ ok: true, data: undefined });
    const asB = await b.client.from('game_messages').select('body, user_id').eq('game_id', gameId);
    expect(asB.data).toEqual([{ body: 'Hallo zusammen!', user_id: a.id }]);
    const asStranger = await stranger.client.from('game_messages').select('id').eq('game_id', gameId);
    expect(asStranger.data).toEqual([]);
    expect(await sendChatMessage(admin, stranger.id, gameId, 'hi')).toMatchObject({ ok: false });
  });
  test('leere und zu lange Nachrichten werden abgelehnt', async () => {
    const { users: [a], gameId } = await lobbyWith(1);
    expect(await sendChatMessage(admin, a.id, gameId, '   ')).toMatchObject({ ok: false, error: 'Die Nachricht ist leer.' });
    expect(await sendChatMessage(admin, a.id, gameId, 'x'.repeat(301))).toMatchObject({ ok: false, error: 'Maximal 300 Zeichen.' });
    expect((await sendChatMessage(admin, a.id, gameId, 'x'.repeat(300))).ok).toBe(true);
  });
  test('höchstens eine Nachricht pro Sekunde', async () => {
    const { users: [a], gameId } = await lobbyWith(1);
    expect((await sendChatMessage(admin, a.id, gameId, 'eins')).ok).toBe(true);
    expect(await sendChatMessage(admin, a.id, gameId, 'zwei')).toMatchObject({ ok: false, error: 'Nicht so schnell – kurz warten.' });
    await wait(1100);
    expect((await sendChatMessage(admin, a.id, gameId, 'drei')).ok).toBe(true);
  });
  test('gleichzeitig abgeschickte Nachrichten umgehen das Limit nicht', async () => {
    const { users: [a], gameId } = await lobbyWith(1);
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => sendChatMessage(admin, a.id, gameId, `spam ${i}`)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const { data } = await admin.from('game_messages').select('id').eq('game_id', gameId);
    expect(data).toHaveLength(1);
  });
  test('ausgeschalteter Chat nimmt nichts an', async () => {
    const { users: [a], gameId } = await lobbyWith(1);
    const v = (await loadGame(admin, gameId))!.version;
    await performAction(admin, a.id, gameId, { type: 'updateSettings', settings: { chat: false } }, v);
    expect(await sendChatMessage(admin, a.id, gameId, 'hallo')).toMatchObject({ ok: false, error: 'Der Chat ist in diesem Spiel aus.' });
  });
  test('ausgestiegene Spieler schreiben nicht mehr', async () => {
    const { users: [a, b], gameId } = await lobbyWith(2);
    await performAction(admin, a.id, gameId, { type: 'start' }, (await loadGame(admin, gameId))!.version);
    await performAction(admin, b.id, gameId, { type: 'leave' });
    expect(await sendChatMessage(admin, b.id, gameId, 'tschüss')).toMatchObject({ ok: false });
  });
});
