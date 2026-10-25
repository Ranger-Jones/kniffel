'use client';
import { useEffect, useRef, useState } from 'react';
import type { UseGame } from '@/hooks/use-game';
import { cx } from '@/lib/cx';
import { getSettings, turnDeadline, type GameState } from '@/lib/kniffel/engine';

/** Puffer nach Ablauf, damit Uhrabweichungen zwischen Gerät und Server keine Fehlmeldung auslösen. */
const REPORT_DELAY_MS = 1500;
const RETRY_MS = 2000;
const MAX_ATTEMPTS = 5;

interface Props { state: GameState; dispatch: UseGame['dispatch']; canReport: boolean }

export function TurnTimer({ state, dispatch, canReport }: Props) {
  const deadline = turnDeadline(state);
  const total = (getSettings(state).turnSeconds ?? 0) * 1000;
  const [now, setNow] = useState(() => Date.now());
  const reported = useRef<{ key: string; attempts: number; last: number }>({ key: '', attempts: 0, last: 0 });
  const key = `${state.currentSeat}-${state.rollsLeft}-${state.turnStartedAt}`;

  useEffect(() => {
    if (deadline === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline]);

  useEffect(() => {
    if (deadline === null || !canReport || now < deadline + REPORT_DELAY_MS) return;
    const r = reported.current;
    if (r.key !== key) reported.current = { key, attempts: 0, last: 0 };
    const cur = reported.current;
    if (cur.attempts >= MAX_ATTEMPTS || now - cur.last < RETRY_MS) return;
    cur.attempts += 1;
    cur.last = now;
    void dispatch({ type: 'timeout' }, { turn: true, silent: true });
  }, [now, deadline, canReport, key, dispatch]);

  if (deadline === null) return null;
  const left = Math.max(0, deadline - now);
  const seconds = Math.ceil(left / 1000);
  const urgent = seconds <= 10;
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={`Noch ${seconds} Sekunden für diesen Zug`}>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/15">
        <div
          className={cx('h-full rounded-full transition-[width] duration-300 ease-linear', urgent ? 'bg-tomato motion-safe:animate-pulse' : 'bg-sun')}
          style={{ width: `${total ? (left / total) * 100 : 0}%` }}
        />
      </div>
      <span className={cx('tabular w-12 text-right font-display text-lg font-extrabold', urgent ? 'text-tomato' : 'text-white')}>
        {seconds}s
      </span>
    </div>
  );
}
