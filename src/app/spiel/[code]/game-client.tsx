'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ConnectionBanner } from '@/components/game/connection-banner';
import { EmojiBar } from '@/components/game/emoji-bar';
import { EmojiLayer } from '@/components/game/emoji-layer';
import { GameBoard } from '@/components/game/game-board';
import { Lobby } from '@/components/game/lobby';
import { Results } from '@/components/game/results';
import { useGame, type GameSnapshot } from '@/hooks/use-game';
import { fireConfetti } from '@/lib/confetti';
import type { GameState } from '@/lib/kniffel/engine';
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

  // Kniffel-Jubel: Feld "kniffel" wechselt bei irgendwem von leer auf 50.
  const prevState = useRef<GameState | null>(game?.state ?? null);
  useEffect(() => {
    const prev = prevState.current;
    prevState.current = game?.state ?? null;
    if (!prev || !game) return;
    for (const p of game.state.players) {
      if (prev.scores[p.id]?.kniffel === null && game.state.scores[p.id]?.kniffel === 50) {
        fireConfetti('kniffel');
        toast.success(`🎲 KNIFFEL von ${p.id === me ? 'dir' : g.profiles[p.id]?.username ?? '…'}!`);
      }
    }
  }, [game, g.profiles, me]);

  if (!game || removed) return null;

  return (
    <>
      <ConnectionBanner connected={g.connected} />
      {game.state.status === 'lobby' && (
        <Lobby game={game} profiles={g.profiles} online={g.online} dispatch={g.dispatch} me={me} friends={friends} />
      )}
      {game.state.status === 'playing' && (
        <GameBoard
          game={game} profiles={g.profiles} online={g.online} offlineSince={g.offlineSince} dispatch={g.dispatch} me={me}
          emojiBar={<EmojiBar onSend={g.sendEmoji} />}
        />
      )}
      {game.state.status === 'finished' && <Results game={game} profiles={g.profiles} me={me} />}
      <EmojiLayer emojis={g.emojis} profiles={g.profiles} me={me} />
    </>
  );
}
