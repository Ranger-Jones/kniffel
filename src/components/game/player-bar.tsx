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
        <h1 data-testid="turn-indicator" className="text-3xl font-extrabold sm:text-4xl" aria-live="polite">
          {activeName === null ? 'Du bist dran!' : `${activeName} ist dran`}
        </h1>
        <p className="tabular shrink-0 font-bold text-ink-soft">Runde {currentRound(state)} von 13</p>
      </div>
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {state.players.map((p, seat) => {
          const active = p.id === activeId;
          return (
            <li
              key={p.id}
              className={cx(
                'flex shrink-0 items-center gap-2 rounded-full bg-paper py-1 pl-1 pr-3 ring-2 transition-all',
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
              <span className="max-w-24 truncate text-sm font-bold">{p.id === me ? 'Du' : profiles[p.id]?.username ?? '…'}</span>
              <span className="tabular text-sm font-extrabold text-ink-soft">{p.left ? 'raus' : totalScore(state.scores[p.id])}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
