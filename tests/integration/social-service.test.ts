import { describe, expect, test } from 'vitest';
import { createGame, loadGame } from '@/server/game-service';
import { getStatsByUsername, isUsernameTaken, renameUser, setAvatarUrl } from '@/server/profile-service';
import {
  inviteToGame, listFriends, listPendingInvites, removeFriend, respondFriendRequest, respondInvite,
  searchProfiles, sendFriendRequest,
} from '@/server/social-service';
import { admin, createTestUser } from './helpers';

async function befriend() {
  const a = await createTestUser('frA');
  const b = await createTestUser('frB');
  const req = await sendFriendRequest(admin, a.id, b.username.toUpperCase());
  expect(req).toEqual({ ok: true, data: { status: 'pending' } });
  const incoming = (await listFriends(admin, b.id)).incoming;
  expect(incoming).toHaveLength(1);
  expect((await respondFriendRequest(admin, b.id, incoming[0].friendshipId, true)).ok).toBe(true);
  return { a, b };
}

describe('Freunde', () => {
  test('Anfrage → annehmen → beide sehen Freund', async () => {
    const { a, b } = await befriend();
    expect((await listFriends(admin, a.id)).friends.map((f) => f.profile.id)).toEqual([b.id]);
    expect((await listFriends(admin, b.id)).friends.map((f) => f.profile.id)).toEqual([a.id]);
  });
  test('doppelte Anfrage, sich selbst, Gegenanfrage nimmt an', async () => {
    const a = await createTestUser('frC');
    const b = await createTestUser('frD');
    expect(await sendFriendRequest(admin, a.id, a.username)).toMatchObject({ ok: false, error: 'Das bist du selbst.' });
    await sendFriendRequest(admin, a.id, b.username);
    expect(await sendFriendRequest(admin, a.id, b.username)).toMatchObject({ ok: false, error: 'Anfrage bereits gesendet.' });
    expect(await sendFriendRequest(admin, b.id, a.username)).toEqual({ ok: true, data: { status: 'accepted' } });
    expect(await sendFriendRequest(admin, a.id, 'gibtsnicht_xyz')).toMatchObject({ ok: false, error: 'Benutzer nicht gefunden.' });
  });
  test('nur Empfänger darf annehmen; entfernen', async () => {
    const a = await createTestUser('frE');
    const b = await createTestUser('frF');
    await sendFriendRequest(admin, a.id, b.username);
    const id = (await listFriends(admin, a.id)).outgoing[0].friendshipId;
    expect((await respondFriendRequest(admin, a.id, id, true)).ok).toBe(false);
    expect((await removeFriend(admin, a.id, id)).ok).toBe(true);
    expect((await listFriends(admin, b.id)).incoming).toHaveLength(0);
  });
  test('Suche per Präfix ohne sich selbst', async () => {
    const a = await createTestUser('srch');
    const other = await createTestUser('srch');
    expect((await searchProfiles(admin, a.id, a.username)).some((p) => p.id === a.id)).toBe(false);
    expect((await searchProfiles(admin, a.id, other.username)).map((p) => p.id)).toEqual([other.id]);
  });
});

describe('Einladungen', () => {
  test('nur Freunde einladen; annehmen tritt bei', async () => {
    const { a, b } = await befriend();
    const stranger = await createTestUser('strg');
    const game = await createGame(admin, a.id);
    if (!game.ok) throw new Error();
    expect(await inviteToGame(admin, a.id, game.data.id, stranger.id)).toMatchObject({ ok: false, error: 'Ihr seid nicht befreundet.' });
    expect((await inviteToGame(admin, a.id, game.data.id, b.id)).ok).toBe(true);
    const asInvitee = await b.client.from('game_invites').select('id, games(code)').eq('to_id', b.id).single();
    expect((asInvitee.data?.games as { code: string } | null)?.code).toBe(game.data.code);
    const invites = await listPendingInvites(admin, b.id);
    expect(invites).toHaveLength(1);
    expect(invites[0].gameCode).toBe(game.data.code);
    const res = await respondInvite(admin, b.id, invites[0].id, true);
    expect(res).toEqual({ ok: true, data: { code: game.data.code } });
    expect((await loadGame(admin, game.data.id))!.state.players.map((p) => p.id)).toContain(b.id);
    expect(await listPendingInvites(admin, b.id)).toHaveLength(0);
  });
});

describe('Profil', () => {
  test('Umbenennen prüft Format und Vergabe', async () => {
    const a = await createTestUser('ren');
    const b = await createTestUser('ren');
    expect(await renameUser(admin, a.id, 'x')).toMatchObject({ ok: false });
    expect(await renameUser(admin, a.id, b.username.toUpperCase())).toMatchObject({ ok: false, error: 'Benutzername ist schon vergeben.' });
    expect((await renameUser(admin, a.id, `${a.username}x`.slice(0, 20))).ok).toBe(true);
    expect(await isUsernameTaken(admin, b.username.toLowerCase())).toBe(true);
  });
  test('Avatar-URL nur aus eigenem Ordner', async () => {
    const a = await createTestUser('avu');
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`;
    expect((await setAvatarUrl(admin, a.id, `${base}${a.id}/a.webp`)).ok).toBe(true);
    expect((await setAvatarUrl(admin, a.id, `${base}someone-else/a.webp`)).ok).toBe(false);
    expect((await setAvatarUrl(admin, a.id, 'https://evil.example/a.webp')).ok).toBe(false);
    expect((await setAvatarUrl(admin, a.id, `${base}${a.id}/%2e%2e/other/a.webp`)).ok).toBe(false);
    expect((await setAvatarUrl(admin, a.id, `${base}${a.id}/a.webp?x=1`)).ok).toBe(false);
  });
  test('Statistik für neuen Spieler ist 0', async () => {
    const a = await createTestUser('sta');
    expect(await getStatsByUsername(admin, a.username)).toMatchObject({ games_played: 0, wins: 0 });
  });
});
