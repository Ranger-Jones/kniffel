import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { joinGame, loadGameByCode } from '@/server/game-service';
import { getQuickEmojis } from '@/server/profile-service';
import { listFriends } from '@/server/social-service';
import { GameClient } from './game-client';
import { JoinError } from './join-error';

export const metadata: Metadata = { title: 'Spiel' };

export default async function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser();
  const admin = createAdminClient();
  let game = await loadGameByCode(admin, code);
  if (!game) notFound();
  if (!game.state.players.some((p) => p.id === user.id)) {
    const joined = await joinGame(admin, user.id, code);
    if (!joined.ok) return <JoinError message={joined.error} />;
    game = await loadGameByCode(admin, code);
    if (!game) notFound();
  }
  const ids = game.state.players.map((p) => p.id);
  const { data: profiles } = await admin.from('profiles').select('id, username, avatar_url').in('id', ids);
  const friends = (await listFriends(admin, user.id)).friends.map((f) => f.profile);
  const quickEmojis = await getQuickEmojis(admin, user.id);
  return (
    <GameClient
      key={game.id}
      initial={game}
      initialProfiles={Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))}
      me={user.id}
      friends={friends}
      quickEmojis={quickEmojis}
    />
  );
}
