import { describe, expect, test } from 'vitest';
import { createGameState } from '@/lib/kniffel/engine';
import { admin, createTestUser } from './helpers';

describe('profiles', () => {
  test('Trigger legt Profil an', async () => {
    const u = await createTestUser('trig');
    const { data } = await admin.from('profiles').select('username').eq('id', u.id).single();
    expect(data?.username).toBe(u.username);
  });
  test('Benutzername ohne Groß/Klein-Unterschied eindeutig', async () => {
    const u = await createTestUser('Case');
    const { error } = await admin.auth.admin.createUser({
      email: `other_${u.email}`, password: 'passwort123', email_confirm: true,
      user_metadata: { username: u.username.toUpperCase() },
    });
    expect(error).not.toBeNull();
  });
  test('ungültiger Benutzername wird abgelehnt', async () => {
    const { error } = await admin.auth.admin.createUser({
      email: `bad_${Date.now()}@test.local`, password: 'passwort123', email_confirm: true,
      user_metadata: { username: 'a b' },
    });
    expect(error).not.toBeNull();
  });
});

describe('games RLS & commit_game', () => {
  async function insertGame(hostId: string, code: string) {
    const state = createGameState(hostId);
    const { data, error } = await admin.from('games')
      .insert({ code, host_id: hostId, status: 'lobby', state: state as never }).select('id').single();
    if (error) throw error;
    const players = [{ userId: hostId, seat: 0, left: false, scores: state.scores[hostId], total: 0, place: null }];
    const v = await admin.rpc('commit_game', { p_game_id: data.id, p_expected_version: 0, p_state: state as never, p_players: players as never });
    if (v.error) throw v.error;
    return data.id;
  }
  const code = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  test('Nicht-Mitglied sieht Lobby nicht, Mitglied schon', async () => {
    const a = await createTestUser('rlsA');
    const b = await createTestUser('rlsB');
    const id = await insertGame(a.id, code());
    expect((await a.client.from('games').select('id').eq('id', id)).data).toHaveLength(1);
    expect((await b.client.from('games').select('id').eq('id', id)).data).toHaveLength(0);
  });
  test('Clients können nicht schreiben und commit_game nicht aufrufen', async () => {
    const a = await createTestUser('rlsW');
    const id = await insertGame(a.id, code());
    await a.client.from('games').update({ status: 'finished' }).eq('id', id);
    const { data } = await admin.from('games').select('status').eq('id', id).single();
    expect(data?.status).toBe('lobby');
    const rpc = await a.client.rpc('commit_game', { p_game_id: id, p_expected_version: 1, p_state: {} as never, p_players: [] as never });
    expect(rpc.error).not.toBeNull();
  });
  test('commit_game ohne Spieler löscht das Spiel – aber nur bei passender Version', async () => {
    const a = await createTestUser('del');
    const id = await insertGame(a.id, code());
    const empty = { ...createGameState(a.id), players: [], scores: {} };
    const stale = await admin.rpc('commit_game', { p_game_id: id, p_expected_version: 0, p_state: empty as never, p_players: [] as never });
    expect(stale.error?.message).toMatch(/version_conflict/);
    expect((await admin.from('games').select('id').eq('id', id)).data).toHaveLength(1);
    const res = await admin.rpc('commit_game', { p_game_id: id, p_expected_version: 1, p_state: empty as never, p_players: [] as never });
    expect(res.error).toBeNull();
    expect((await admin.from('games').select('id').eq('id', id)).data).toHaveLength(0);
  });
  test('commit_game lehnt falsche Version ab', async () => {
    const a = await createTestUser('ver');
    const id = await insertGame(a.id, code());
    const res = await admin.rpc('commit_game', { p_game_id: id, p_expected_version: 0, p_state: createGameState(a.id) as never, p_players: [] as never });
    expect(res.error?.message).toMatch(/version_conflict/);
  });
});

describe('storage', () => {
  test('Upload nur in eigenen Ordner', async () => {
    const a = await createTestUser('stA');
    const b = await createTestUser('stB');
    const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    expect((await a.client.storage.from('avatars').upload(`${a.id}/x.jpg`, file)).error).toBeNull();
    expect((await a.client.storage.from('avatars').upload(`${b.id}/x.jpg`, file)).error).not.toBeNull();
  });
});
