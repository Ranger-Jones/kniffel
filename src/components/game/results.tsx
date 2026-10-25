'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { UseGame } from '@/hooks/use-game';
import { placements } from '@/lib/kniffel/engine';
import { totalScore } from '@/lib/kniffel/scoring';
import { fireConfetti } from '@/lib/confetti';
import { cx } from '@/lib/cx';
import { seatColor } from '@/lib/player-colors';
import { rematchAction } from '@/server/game-actions';

const MEDALS = ['🥇', '🥈', '🥉'];
const STEP_HEIGHT = ['h-32', 'h-24', 'h-16'];

type Props = { game: NonNullable<UseGame['game']>; profiles: UseGame['profiles']; me: string };

export function Results({ game, profiles, me }: Props) {
  const router = useRouter();
  const { state } = game;
  const places = placements(state);
  const ranked = state.players
    .map((p, seat) => ({ ...p, seat, total: totalScore(state.scores[p.id]), place: places[p.id] ?? null }))
    .sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || b.total - a.total);
  const amActive = state.players.some((p) => p.id === me && !p.left);
  const iWon = places[me] === 1;
  const [pending, setPending] = useState(false);
  const following = useRef(false);

  useEffect(() => {
    if (iWon) fireConfetti('win');
  }, [iWon]);

  async function startRematch() {
    if (following.current) return;
    following.current = true;
    setPending(true);
    const res = await rematchAction(game.id);
    if (res.ok) {
      router.push(`/spiel/${res.data.code}`);
    } else {
      following.current = false;
      setPending(false);
      toast.error(res.error);
    }
  }

  // Jemand anderes hat Revanche gestartet → automatisch mitgehen.
  useEffect(() => {
    if (!game.rematchGameId || !amActive || following.current) return;
    following.current = true;
    rematchAction(game.id).then((res) => {
      if (!res.ok) return;
      toast('Revanche! Ab in die Lobby.');
      router.push(`/spiel/${res.data.code}`);
    });
  }, [game.rematchGameId, game.id, amActive, router]);

  const podium = [2, 1, 3].map((place) => ({ place, players: ranked.filter((p) => p.place === place) }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-12">
      <h1 className="text-center text-5xl font-extrabold">Spiel beendet!</h1>

      <div className="flex items-end justify-center gap-3" aria-label="Podest">
        {podium.map(({ place, players }) => players.length > 0 && (
          <div key={place} className="flex min-w-24 flex-1 flex-col items-center gap-2 sm:max-w-44">
            <div className="flex -space-x-3">
              {players.map((p) => <Avatar key={p.id} profile={profiles[p.id]} size={place === 1 ? 'lg' : 'md'} ring={seatColor(p.seat)} />)}
            </div>
            <p className="max-w-full truncate text-center font-bold">
              {players.map((p) => (p.id === me ? 'Du' : profiles[p.id]?.username ?? '…')).join(' & ')}
            </p>
            <p className="tabular font-display text-2xl font-extrabold">{players[0].total}</p>
            <div
              className={cx('flex w-full items-start justify-center rounded-t-2xl pt-2 text-3xl', STEP_HEIGHT[place - 1])}
              style={{ backgroundColor: seatColor(players[0].seat) }}
            >
              {MEDALS[place - 1]}
            </div>
          </div>
        ))}
      </div>

      <Card className="p-0">
        <ol>
          {ranked.map((p) => (
            <li
              key={p.id}
              className={cx('flex items-center gap-3 border-t border-line px-5 py-3 first:border-t-0', p.id === me && 'bg-sun/15', p.left && 'opacity-50')}
            >
              <span className="tabular w-6 text-center font-display text-xl font-extrabold text-ink-soft">{p.place ?? '–'}</span>
              <Avatar profile={profiles[p.id]} size="sm" ring={seatColor(p.seat)} />
              <span className="flex-1 truncate font-bold">{p.id === me ? 'Du' : profiles[p.id]?.username ?? '…'}{p.left && ' (ausgestiegen)'}</span>
              <span className="tabular font-display text-xl font-extrabold">{p.total}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        {amActive && <Button size="lg" onClick={startRematch} disabled={pending}>Revanche</Button>}
        <Link href="/" className={buttonClass('secondary', 'lg')}>Zur Startseite</Link>
      </div>
    </main>
  );
}
