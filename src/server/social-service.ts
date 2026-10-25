import { MAX_PLAYERS } from '@/lib/kniffel/engine';
import type { AdminClient } from '@/lib/supabase/admin';
import { joinGame, loadGame } from './game-service';
import { fail, ok, type ServiceResult } from './result';

export interface ProfileLite { id: string; username: string; avatar_url: string | null }
export interface FriendEntry { friendshipId: string; profile: ProfileLite }
export interface FriendLists { friends: FriendEntry[]; incoming: FriendEntry[]; outgoing: FriendEntry[] }
export interface PendingInvite { id: string; gameCode: string; from: ProfileLite; createdAt: string }

const PROFILE_COLS = 'id, username, avatar_url';

export async function searchProfiles(admin: AdminClient, userId: string, query: string): Promise<ProfileLite[]> {
  const q = query.trim().replace(/[^A-Za-z0-9_]/g, '');
  if (q.length < 2) return [];
  const { data, error } = await admin.from('profiles').select(PROFILE_COLS)
    .ilike('username', `${q.replace(/_/g, '\\_')}%`).neq('id', userId).order('username').limit(10);
  if (error) throw error;
  return data;
}

async function findFriendship(admin: AdminClient, x: string, y: string) {
  const { data, error } = await admin.from('friendships').select('*')
    .or(`and(requester_id.eq.${x},addressee_id.eq.${y}),and(requester_id.eq.${y},addressee_id.eq.${x})`)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function sendFriendRequest(
  admin: AdminClient, userId: string, username: string,
): Promise<ServiceResult<{ status: 'pending' | 'accepted' }>> {
  const { data: target } = await admin.from('profiles').select('id').eq('username', username.trim()).maybeSingle();
  if (!target) return fail('Benutzer nicht gefunden.');
  if (target.id === userId) return fail('Das bist du selbst.');
  const existing = await findFriendship(admin, userId, target.id);
  if (existing?.status === 'accepted') return fail('Ihr seid schon befreundet.');
  if (existing?.requester_id === userId) return fail('Anfrage bereits gesendet.');
  if (existing) {
    await admin.from('friendships').update({ status: 'accepted' }).eq('id', existing.id);
    return ok({ status: 'accepted' as const });
  }
  const { error } = await admin.from('friendships').insert({ requester_id: userId, addressee_id: target.id });
  if (error) throw error;
  return ok({ status: 'pending' as const });
}

export async function respondFriendRequest(
  admin: AdminClient, userId: string, friendshipId: string, accept: boolean,
): Promise<ServiceResult> {
  const { data: f } = await admin.from('friendships').select('*').eq('id', friendshipId).maybeSingle();
  if (!f || f.addressee_id !== userId || f.status !== 'pending') return fail('Anfrage nicht gefunden.');
  const { error } = accept
    ? await admin.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    : await admin.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
  return ok(undefined);
}

export async function removeFriend(admin: AdminClient, userId: string, friendshipId: string): Promise<ServiceResult> {
  const { data: f } = await admin.from('friendships').select('*').eq('id', friendshipId).maybeSingle();
  if (!f || (f.requester_id !== userId && f.addressee_id !== userId)) return fail('Freundschaft nicht gefunden.');
  await admin.from('friendships').delete().eq('id', friendshipId);
  return ok(undefined);
}

export async function listFriends(admin: AdminClient, userId: string): Promise<FriendLists> {
  const { data, error } = await admin.from('friendships')
    .select(`id, status, requester_id, addressee_id,
      requester:profiles!friendships_requester_id_fkey(${PROFILE_COLS}),
      addressee:profiles!friendships_addressee_id_fkey(${PROFILE_COLS})`)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
  const lists: FriendLists = { friends: [], incoming: [], outgoing: [] };
  for (const f of data) {
    const mine = f.requester_id === userId;
    const entry = { friendshipId: f.id, profile: (mine ? f.addressee : f.requester) as ProfileLite };
    if (f.status === 'accepted') lists.friends.push(entry);
    else (mine ? lists.outgoing : lists.incoming).push(entry);
  }
  const byName = (x: FriendEntry, y: FriendEntry) => x.profile.username.localeCompare(y.profile.username);
  lists.friends.sort(byName);
  lists.incoming.sort(byName);
  lists.outgoing.sort(byName);
  return lists;
}

export async function inviteToGame(admin: AdminClient, userId: string, gameId: string, friendId: string): Promise<ServiceResult> {
  const game = await loadGame(admin, gameId);
  if (!game) return fail('Spiel nicht gefunden.');
  if (game.state.status !== 'lobby') return fail('Das Spiel läuft bereits.');
  if (!game.state.players.some((p) => p.id === userId)) return fail('Du bist nicht in diesem Spiel.');
  if (game.state.players.some((p) => p.id === friendId)) return fail('Ist schon im Spiel.');
  if (game.state.players.length >= MAX_PLAYERS) return fail('Der Raum ist voll.');
  const f = await findFriendship(admin, userId, friendId);
  if (f?.status !== 'accepted') return fail('Ihr seid nicht befreundet.');
  const { error } = await admin.from('game_invites').upsert(
    { game_id: gameId, from_id: userId, to_id: friendId, status: 'pending', created_at: new Date().toISOString() },
    { onConflict: 'game_id,to_id' },
  );
  if (error) throw error;
  return ok(undefined);
}

export async function respondInvite(
  admin: AdminClient, userId: string, inviteId: string, accept: boolean,
): Promise<ServiceResult<{ code: string | null }>> {
  const { data: inv } = await admin.from('game_invites')
    .select('id, to_id, status, games(code)').eq('id', inviteId).maybeSingle();
  if (!inv || inv.to_id !== userId || inv.status !== 'pending') return fail('Einladung nicht gefunden.');
  if (!accept) {
    await admin.from('game_invites').update({ status: 'declined' }).eq('id', inviteId);
    return ok({ code: null });
  }
  const code = (inv.games as { code: string } | null)?.code;
  if (!code) return fail('Das Spiel existiert nicht mehr.');
  const joined = await joinGame(admin, userId, code);
  if (!joined.ok) return joined;
  await admin.from('game_invites').update({ status: 'accepted' }).eq('id', inviteId);
  return ok({ code });
}

export async function listPendingInvites(admin: AdminClient, userId: string): Promise<PendingInvite[]> {
  const { data, error } = await admin.from('game_invites')
    .select(`id, created_at, games!inner(code, status), from:profiles!game_invites_from_id_fkey(${PROFILE_COLS})`)
    .eq('to_id', userId).eq('status', 'pending').eq('games.status', 'lobby')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((i) => ({
    id: i.id,
    createdAt: i.created_at,
    gameCode: (i.games as { code: string }).code,
    from: i.from as ProfileLite,
  }));
}
