'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChatCard, ChatSheetButton } from '@/components/game/chat';
import { ConnectionBanner } from '@/components/game/connection-banner';
import { EmojiBar } from '@/components/game/emoji-bar';
import { EmojiLayer } from '@/components/game/emoji-layer';
import { GameBoard } from '@/components/game/game-board';
import { Lobby } from '@/components/game/lobby';
import { Results } from '@/components/game/results';
import { useChat } from '@/hooks/use-chat';
import { useGame, type GameSnapshot } from '@/hooks/use-game';
import { seatColor } from '@/lib/player-colors';
import { fireConfetti } from '@/lib/confetti';
import { getSettings, type GameState } from '@/lib/kniffel/engine';
import { CATEGORY_LABELS } from '@/lib/kniffel/types';
import type { ProfileLite } from '@/server/social-service';

interface Props {
  initial: GameSnapshot;
  initialProfiles: Record<string, ProfileLite>;
  me: string;
  friends: ProfileLite[];
  quickEmojis: string[];
}

export function GameClient({ initial, initialProfiles, me, friends, quickEmojis }: Props) {
  const [quick, setQuick] = useState(quickEmojis);
  const router = useRouter();
  const g = useGame(initial, initialProfiles, me);
  const { game } = g;
  const amActive = !!game?.state.players.some((p) => p.id === me && !p.left);
  const removed = !!game && game.state.status !== 'finished' && !amActive;
  const chatOn = !!game && getSettings(game.state).chat;
  const chat = useChat(initial.id, chatOn);

  useEffect(() => {
    if (!game) {
      toast(g.kickNotice ? 'Der Host hat dich aus dem Raum entfernt.' : 'Das Spiel wurde aufgelöst.');
      router.replace('/');
    } else if (removed) {
      toast(g.kickNotice ? 'Der Host hat dich aus dem Raum entfernt.' : 'Du bist nicht mehr in diesem Spiel.');
      router.replace('/');
    }
  }, [game, removed, router, g.kickNotice]);

  // Kniffel-Jubel: Feld "kniffel" wechselt bei irgendwem von leer auf 50.
  const prevState = useRef<GameState | null>(game?.state ?? null);
  useEffect(() => {
    const prev = prevState.current;
    prevState.current = game?.state ?? null;
    if (!prev || !game) return;
    const t = game.state.lastTimeout;
    if (t && t.at !== prev.lastTimeout?.at) {
      const who = t.playerId === me ? 'Deine' : `${g.profiles[t.playerId]?.username ?? '…'}s`;
      toast(`⏱ ${who} Zeit ist abgelaufen – ${CATEGORY_LABELS[t.category]}: ${t.points} Punkte`);
    }
    for (const p of game.state.players) {
      if (prev.scores[p.id]?.kniffel === null && game.state.scores[p.id]?.kniffel === 50) {
        fireConfetti('kniffel');
        toast.success(`🎲 KNIFFEL von ${p.id === me ? 'dir' : g.profiles[p.id]?.username ?? '…'}!`);
      }
    }
  }, [game, g.profiles, me]);

  if (!game || removed) return null;

  const seatColors = Object.fromEntries(game.state.players.map((p, i) => [p.id, seatColor(i)]));
  const chatProps = { chat, profiles: g.profiles, me, seatColors };
  const chatCard = chatOn ? <ChatCard {...chatProps} /> : null;

  return (
    <>
      <ConnectionBanner connected={g.connected} />
      {game.state.status === 'lobby' && (
        <Lobby game={game} profiles={g.profiles} online={g.online} dispatch={g.dispatch} me={me} friends={friends} chatSlot={chatCard} />
      )}
      {game.state.status === 'playing' && (
        <GameBoard
          game={game} profiles={g.profiles} online={g.online} offlineSince={g.offlineSince} dispatch={g.dispatch} me={me}
          emojiBar={<EmojiBar quick={quick} onQuickChange={setQuick} onSend={g.sendEmoji} />}
          chatCard={chatCard}
          chatButton={chatOn ? <ChatSheetButton {...chatProps} /> : null}
        />
      )}
      {game.state.status === 'finished' && <Results game={game} profiles={g.profiles} me={me} chatSlot={chatCard} />}
      <EmojiLayer emojis={g.emojis} profiles={g.profiles} me={me} />
    </>
  );
}
