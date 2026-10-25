'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ConnectionBanner } from '@/components/game/connection-banner';
import { Lobby } from '@/components/game/lobby';
import { useGame, type GameSnapshot } from '@/hooks/use-game';
import type { ProfileLite } from '@/server/social-service';

interface Props {
  initial: GameSnapshot;
  initialProfiles: Record<string, ProfileLite>;
  me: string;
  friends: ProfileLite[];
}

export function GameClient({ initial, initialProfiles, me, friends }: Props) {
  const router = useRouter();
  const g = useGame(initial, initialProfiles, me);
  const { game } = g;
  const amActive = !!game?.state.players.some((p) => p.id === me && !p.left);
  const removed = !!game && game.state.status !== 'finished' && !amActive;

  useEffect(() => {
    if (!game) {
      toast('Das Spiel wurde aufgelöst.');
      router.replace('/');
    } else if (removed) {
      toast('Du bist nicht mehr in diesem Spiel.');
      router.replace('/');
    }
  }, [game, removed, router]);

  if (!game || removed) return null;

  return (
    <>
      <ConnectionBanner connected={g.connected} />
      {game.state.status === 'lobby' && (
        <Lobby game={game} profiles={g.profiles} online={g.online} dispatch={g.dispatch} me={me} friends={friends} />
      )}
      {game.state.status === 'playing' && <main className="px-4">Spiel läuft …</main>}
      {game.state.status === 'finished' && <main className="px-4">Spiel beendet!</main>}
    </>
  );
}
