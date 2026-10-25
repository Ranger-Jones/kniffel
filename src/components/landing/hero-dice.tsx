'use client';
import { useState } from 'react';
import { Die } from '@/components/game/die';
import { Button } from '@/components/ui/button';
import { scoreCategory } from '@/lib/kniffel/scoring';
import { CATEGORY_LABELS, LOWER_CATEGORIES } from '@/lib/kniffel/types';

const COLORS = ['#ff5a5f', '#3d8bff', '#19c99a', '#ffb020', '#8b5cf6'];
const START = [6, 6, 6, 6, 6];

function bestCombo(dice: number[]) {
  const order = ['kniffel', 'largeStraight', 'smallStraight', 'fullHouse', 'fourKind', 'threeKind'] as const;
  const hit = order.find((c) => scoreCategory(c, dice) > 0);
  return hit ? `${CATEGORY_LABELS[hit]} – ${scoreCategory(hit, dice)} Punkte` : `Chance – ${scoreCategory(LOWER_CATEGORIES[6], dice)} Punkte`;
}

export function HeroDice() {
  const [dice, setDice] = useState(START);
  const [spins, setSpins] = useState(0);
  function roll() {
    setDice(dice.map(() => 1 + Math.floor(Math.random() * 6)));
    setSpins((s) => s + 1);
  }
  return (
    <div className="flex flex-col gap-4 rounded-[2rem] bg-tray p-5 text-white shadow-[0_8px_0_var(--color-tray-deep)] [--die:3.4rem] sm:p-7 sm:[--die:4.5rem]">
      <div className="flex min-h-[calc(var(--die)+2rem)] items-center justify-between gap-2 pt-4">
        {dice.map((v, i) => <Die key={i} index={i} value={v} held={false} spins={spins} color={COLORS[i]} disabled />)}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-bold" aria-live="polite">{spins === 0 ? 'Kniffel! Fünf Sechser.' : bestCombo(dice)}</p>
        <Button onClick={roll} className="shrink-0">Probewurf</Button>
      </div>
    </div>
  );
}
