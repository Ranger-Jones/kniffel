import type { AdminClient } from '@/lib/supabase/admin';
import { fail, ok, type ServiceResult } from './result';
import type { ProfileLite } from './social-service';

import { USERNAME_RE } from '@/lib/username';

export { USERNAME_RE };

export interface PlayerStats {
  user_id: string; username: string; avatar_url: string | null; games_played: number;
  wins: number; best_score: number; avg_score: number; kniffel_count: number;
}
export interface HistoryEntry {
  gameId: string;
  finishedAt: string;
  players: { profile: ProfileLite; total: number; place: number | null; left: boolean }[];
}

export async function isUsernameTaken(admin: AdminClient, username: string): Promise<boolean> {
  const { data } = await admin.from('profiles').select('id').eq('username', username.trim()).maybeSingle();
  return !!data;
}

export async function getStatsByUsername(admin: AdminClient, username: string): Promise<PlayerStats | null> {
  if (!USERNAME_RE.test(username)) return null;
  const { data, error } = await admin.from('player_stats').select('*').ilike('username', username.replace(/_/g, '\\_')).maybeSingle();
  if (error) throw error;
  return data as PlayerStats | null;
}

export async function getLeaderboard(admin: AdminClient, limit = 50): Promise<PlayerStats[]> {
  const { data, error } = await admin.from('leaderboard').select('*')
    .order('wins', { ascending: false }).order('best_score', { ascending: false }).limit(limit);
  if (error) throw error;
  return data as PlayerStats[];
}

export async function getHistory(admin: AdminClient, userId: string, limit = 20): Promise<HistoryEntry[]> {
  const { data: mine, error } = await admin.from('game_players')
    .select('game_id, games!inner(status, finished_at)')
    .eq('user_id', userId).eq('games.status', 'finished');
  if (error) throw error;
  const recent = mine
    .map((m) => ({ gameId: m.game_id, finishedAt: (m.games as { finished_at: string }).finished_at }))
    .sort((x, y) => y.finishedAt.localeCompare(x.finishedAt))
    .slice(0, limit);
  if (recent.length === 0) return [];
  const { data: rows, error: e2 } = await admin.from('game_players')
    .select('game_id, total, place, left_game, seat, profiles(id, username, avatar_url)')
    .in('game_id', recent.map((r) => r.gameId));
  if (e2) throw e2;
  return recent.map((g) => ({
    ...g,
    players: rows.filter((r) => r.game_id === g.gameId)
      .sort((x, y) => (x.place ?? 99) - (y.place ?? 99) || x.seat - y.seat)
      .map((r) => ({ profile: r.profiles as ProfileLite, total: r.total ?? 0, place: r.place, left: r.left_game })),
  }));
}

export async function renameUser(admin: AdminClient, userId: string, username: string): Promise<ServiceResult> {
  const name = username.trim();
  if (!USERNAME_RE.test(name)) return fail('Benutzername: 3–20 Zeichen, nur Buchstaben, Zahlen und _.');
  const { data: other } = await admin.from('profiles').select('id').eq('username', name).maybeSingle();
  if (other && other.id !== userId) return fail('Benutzername ist schon vergeben.');
  const { error } = await admin.from('profiles').update({ username: name }).eq('id', userId);
  if (error) return fail('Benutzername ist schon vergeben.');
  return ok(undefined);
}

/** Nur Objekte direkt im eigenen Avatar-Ordner, ohne Kodierungen, Query oder Fragment. */
function isOwnAvatarUrl(raw: string, userId: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  const prefix = `/storage/v1/object/public/avatars/${userId}/`;
  const file = url.pathname.slice(prefix.length);
  return url.origin === origin && !raw.includes('%') && !url.search && !url.hash
    && url.pathname.startsWith(prefix) && /^[A-Za-z0-9._-]+$/.test(file) && !file.startsWith('.');
}

/** Alte Profilbilder im eigenen Ordner aufräumen (Speicher im Free-Tarif ist knapp). */
async function removeOtherAvatars(admin: AdminClient, userId: string, keep: string) {
  const { data } = await admin.storage.from('avatars').list(userId, { limit: 100 });
  const old = (data ?? []).filter((f) => f.name !== keep).map((f) => `${userId}/${f.name}`);
  if (old.length > 0) await admin.storage.from('avatars').remove(old);
}

export async function setAvatarUrl(admin: AdminClient, userId: string, url: string): Promise<ServiceResult> {
  if (!isOwnAvatarUrl(url, userId)) return fail('Ungültige Bild-URL.');
  const { error } = await admin.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (error) throw error;
  await removeOtherAvatars(admin, userId, url.split('/').pop()!);
  return ok(undefined);
}

export async function listActiveGames(admin: AdminClient, userId: string) {
  const { data, error } = await admin.from('game_players')
    .select('left_game, games!inner(code, status, state)')
    .eq('user_id', userId).eq('left_game', false).in('games.status', ['lobby', 'playing']);
  if (error) throw error;
  return data.map((r) => {
    const g = r.games as unknown as { code: string; status: 'lobby' | 'playing'; state: { players: { left: boolean }[] } };
    return { code: g.code, status: g.status, playerCount: g.state.players.filter((p) => !p.left).length };
  });
}
