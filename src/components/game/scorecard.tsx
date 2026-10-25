'use client';
import { Fragment, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ROLLS_PER_TURN, currentPlayerId, type GameState } from '@/lib/kniffel/engine';
import { scoreCategory, totalScore, upperBonus, upperSum } from '@/lib/kniffel/scoring';
import {
  CATEGORY_LABELS, LOWER_CATEGORIES, UPPER_BONUS, UPPER_BONUS_THRESHOLD, UPPER_CATEGORIES, type Category,
} from '@/lib/kniffel/types';
import { cx } from '@/lib/cx';
import { seatColor } from '@/lib/player-colors';
import type { ProfileLite } from '@/server/social-service';

const HINTS: Partial<Record<Category, string>> = {
  threeKind: 'Summe aller Würfel', fourKind: 'Summe aller Würfel', fullHouse: '25',
  smallStraight: '30', largeStraight: '40', kniffel: '50', chance: 'Summe aller Würfel',
};

interface Props {
  state: GameState;
  profiles: Record<string, ProfileLite>;
  me: string;
  onScore: (category: Category) => Promise<unknown>;
}

export function Scorecard({ state, profiles, me, onScore }: Props) {
  const [confirm, setConfirm] = useState<Category | null>(null);
  const [pending, setPending] = useState(false);
  const activeId = currentPlayerId(state);
  const canScore = activeId === me && state.rollsLeft < ROLLS_PER_TURN && !pending;
  const dice = state.dice as number[];

  async function choose(category: Category) {
    if (!canScore) return;
    if (scoreCategory(category, dice) === 0) {
      setConfirm(category);
      return;
    }
    await commit(category);
  }

  async function commit(category: Category) {
    setConfirm(null);
    setPending(true);
    await onScore(category);
    setPending(false);
  }

  function cell(playerId: string, category: Category, seat: number) {
    const value = state.scores[playerId]?.[category] ?? null;
    if (value !== null) {
      return (
        <td key={playerId} data-testid={`score-cell-${playerId}-${category}`} className="tabular border-l border-line px-1 text-center font-bold">
          {value === 0 ? <span className="text-ink-soft/50">–</span> : value}
        </td>
      );
    }
    if (playerId === me && canScore) {
      const preview = scoreCategory(category, dice);
      return (
        <td key={playerId} className="border-l border-line p-0.5">
          <button
            type="button"
            data-testid="score-option"
            data-category={category}
            onClick={() => choose(category)}
            aria-label={`${CATEGORY_LABELS[category]}: ${preview} Punkte eintragen`}
            className={cx(
              'tabular h-9 w-full rounded-lg border-2 border-dashed border-[var(--c)] font-extrabold transition-colors',
              'hover:border-solid hover:bg-[var(--c)] hover:text-white',
              preview === 0 ? 'text-ink-soft/60' : 'text-[var(--c)]',
            )}
            style={{ '--c': seatColor(seat) } as React.CSSProperties}
          >
            {preview}
          </button>
        </td>
      );
    }
    return <td key={playerId} data-testid={`score-cell-${playerId}-${category}`} className="border-l border-line" />;
  }

  const players = state.players.map((p, seat) => ({ ...p, seat }));
  const header = (
    <tr>
      <th scope="col" className="sticky left-0 z-10 bg-paper px-3 py-2 text-left text-sm font-bold text-ink-soft">Feld</th>
      {players.map((p) => (
        <th
          key={p.id}
          scope="col"
          className={cx('border-l border-line px-1 py-2', p.left && 'opacity-40')}
          style={p.id === activeId ? { backgroundColor: `color-mix(in srgb, ${seatColor(p.seat)} 14%, white)` } : undefined}
        >
          <span className="flex flex-col items-center gap-1">
            <Avatar profile={profiles[p.id]} size="sm" ring={seatColor(p.seat)} />
            <span className="max-w-16 truncate text-xs font-bold" title={profiles[p.id]?.username}>{p.id === me ? 'Du' : profiles[p.id]?.username ?? '…'}</span>
          </span>
        </th>
      ))}
    </tr>
  );

  const sumRow = (label: string, values: (id: string) => React.ReactNode, strong = false) => (
    <tr className={cx('bg-mist/70', strong && 'text-lg')}>
      <th scope="row" className={cx('sticky left-0 z-10 bg-[#f3f4ff] px-3 py-2 text-left', strong ? 'font-display font-extrabold' : 'text-sm font-bold text-ink-soft')}>
        {label}
      </th>
      {players.map((p) => (
        <td key={p.id} className={cx('tabular border-l border-line px-1 text-center', strong ? 'font-display font-extrabold' : 'font-bold text-ink-soft')}>
          {values(p.id)}
        </td>
      ))}
    </tr>
  );

  const rows = (cats: readonly Category[]) => cats.map((c) => (
    <tr key={c} className="border-t border-line">
      <th scope="row" className="sticky left-0 z-10 bg-paper px-3 py-1.5 text-left font-semibold">
        <span className="block leading-tight">{CATEGORY_LABELS[c]}</span>
        {HINTS[c] && <span className="block text-[11px] font-normal leading-tight text-ink-soft">{HINTS[c]}</span>}
      </th>
      {players.map((p) => cell(p.id, c, p.seat))}
    </tr>
  ));

  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-paper ring-2 ring-line shadow-[0_6px_0_var(--color-line)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-[15px]">
          <colgroup>
            <col className="w-36" />
            {players.map((p) => <col key={p.id} className="min-w-[3.75rem]" />)}
          </colgroup>
          <thead>{header}</thead>
          <tbody>
            {rows(UPPER_CATEGORIES)}
            {sumRow('Summe oben', (id) => upperSum(state.scores[id]))}
            {sumRow(`Bonus ab ${UPPER_BONUS_THRESHOLD}`, (id) => {
              const s = state.scores[id];
              return upperBonus(s) ? `+${UPPER_BONUS}` : <span className="text-xs">noch {UPPER_BONUS_THRESHOLD - upperSum(s)}</span>;
            })}
            {rows(LOWER_CATEGORIES)}
            {sumRow('Gesamt', (id) => <span data-testid={`total-${id}`}>{totalScore(state.scores[id])}</span>, true)}
          </tbody>
        </table>
      </div>
      <Modal open={confirm !== null} onClose={() => setConfirm(null)} title="Feld streichen?">
        {confirm && (
          <Fragment>
            <p className="text-ink-soft">{CATEGORY_LABELS[confirm]} bringt mit diesen Würfeln 0 Punkte. Trotzdem eintragen?</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Abbrechen</Button>
              <Button variant="danger" onClick={() => commit(confirm)}>Streichen</Button>
            </div>
          </Fragment>
        )}
      </Modal>
    </div>
  );
}
