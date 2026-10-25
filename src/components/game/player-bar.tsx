import { Avatar } from '@/components/ui/avatar';
import { currentPlayerId, currentRound, type GameState } from '@/lib/kniffel/engine';
import { totalScore } from '@/lib/kniffel/scoring';
import { cx } from '@/lib/cx';
import { seatColor } from '@/lib/player-colors';
import type { ProfileLite } from '@/server/social-service';

interface Props { state: GameState; profiles: Record<string, ProfileLite>; online: Set<string>; me: string }

export function PlayerBar({ state, profiles, online, me }: Props) {
  const activeId = currentPlayerId(state);
  const activeName = activeId === me ? null : profiles[activeId ?? '']?.username ?? '…';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h1 data-testid="turn-indicator" className="min-w-0 break-words text-2xl font-extrabold sm:text-4xl" aria-live="polite">
          {activeName === null ? 'Du bist dran!' : `${activeName} ist dran`}
        </h1>
        <p className="tabular shrink-0 text-sm font-bold text-ink-soft sm:text-base">Runde {currentRound(state)}/13</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {state.players.map((p, seat) => {
          const active = p.id === activeId;
          return (
            <li
              key={p.id}
              className={cx(
                'flex min-w-0 items-center gap-2 rounded-full bg-paper py-1 pl-1 pr-3 ring-2 transition-all',
                active ? 'ring-[var(--c)] shadow-[0_3px_0_var(--c)]' : 'ring-line',
                p.left && 'opacity-40',
              )}
              style={{ '--c': seatColor(seat) } as React.CSSProperties}
            >
              <span className="relative">
                <Avatar profile={profiles[p.id]} size="sm" ring={seatColor(seat)} />
                {!p.left && (
                  <span className={cx('absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-paper', online.has(p.id) ? 'bg-mint' : 'bg-line')} />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold" title={profiles[p.id]?.username}>
                {p.id === me ? 'Du' : profiles[p.id]?.username ?? '…'}
              </span>
              <span className="tabular shrink-0 text-sm font-extrabold text-ink-soft">{p.left ? 'raus' : totalScore(state.scores[p.id])}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
