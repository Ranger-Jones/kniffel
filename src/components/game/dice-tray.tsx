'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ROLLS_PER_TURN, type GameState } from '@/lib/kniffel/engine';
import { cx } from '@/lib/cx';
import { Die } from './die';

interface Props {
  state: GameState;
  isMyTurn: boolean;
  color: string;
  activeName: string;
  onRoll: () => Promise<unknown>;
  onHold: (index: number, held: boolean) => Promise<unknown>;
}

export function DiceTray({ state, isMyTurn, color, activeName, onRoll, onHold }: Props) {
  const [pending, setPending] = useState(false);
  // Laufende eigene Halte-Anfragen: solange welche unterwegs sind, gilt die lokale Auswahl,
  // damit Zwischenstände vom Server die Würfel nicht flackern lassen.
  const [holdsInFlight, setHoldsInFlight] = useState(0);
  // Abgeleiteter Zustand aus vorherigen Props (React-Muster ohne Effect):
  // neuer Wurf im selben Zug → nicht gehaltene Würfel drehen; Server-Halten übernehmen.
  const [track, setTrack] = useState({
    seat: state.currentSeat, rollsLeft: state.rollsLeft, heldSrc: state.held, held: state.held,
    spins: [0, 0, 0, 0, 0], stale: false,
  });
  const serverChanged = track.seat !== state.currentSeat || track.rollsLeft !== state.rollsLeft || track.heldSrc !== state.held;
  if (serverChanged || (track.stale && holdsInFlight === 0)) {
    const rolled = state.currentSeat === track.seat && state.rollsLeft < track.rollsLeft;
    const newTurn = state.currentSeat !== track.seat || state.rollsLeft !== track.rollsLeft;
    const keepLocal = holdsInFlight > 0 && !newTurn;
    setTrack({
      seat: state.currentSeat,
      rollsLeft: state.rollsLeft,
      heldSrc: state.held,
      held: keepLocal ? track.held : state.held,
      spins: rolled ? track.spins.map((n, i) => (state.held[i] ? n : n + 1)) : track.spins,
      stale: keepLocal,
    });
  }
  const { held, spins } = track;

  const hasRolled = state.rollsLeft < ROLLS_PER_TURN;
  const canHold = isMyTurn && hasRolled && state.rollsLeft > 0;

  async function roll() {
    setPending(true);
    navigator.vibrate?.(15);
    await onRoll();
    setPending(false);
  }

  async function toggle(i: number) {
    const next = held.map((h, j) => (j === i ? !h : h));
    setTrack((t) => ({ ...t, held: next }));
    setHoldsInFlight((n) => n + 1);
    try {
      await onHold(i, next[i]);
    } finally {
      setHoldsInFlight((n) => n - 1);
    }
  }

  return (
    <section
      aria-label="Würfel"
      className="rounded-[1.75rem] bg-tray p-4 text-white shadow-[0_6px_0_var(--color-tray-deep)] [--die:3.25rem] sm:[--die:3.75rem] sm:p-5"
    >
      <div className="flex min-h-[calc(var(--die)+1.5rem)] items-center justify-between gap-2 pt-3">
        {state.dice.map((value, i) => (
          <Die
            key={i}
            index={i}
            value={value}
            held={held[i]}
            spins={spins[i]}
            color={color}
            disabled={!canHold}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        {isMyTurn ? (
          <p className="text-sm text-white/70">
            {!hasRolled ? 'Du bist dran. Würfel los!' : state.rollsLeft > 0 ? 'Tipp Würfel an, um sie zu halten.' : 'Trag jetzt ein Feld ein.'}
          </p>
        ) : (
          <p className="text-sm text-white/70">{activeName} würfelt …</p>
        )}
        {isMyTurn && (
          <Button
            data-testid="roll-button"
            size="lg"
            onClick={roll}
            disabled={pending || state.rollsLeft === 0}
            className="shrink-0"
            aria-label={`Würfeln, noch ${state.rollsLeft} ${state.rollsLeft === 1 ? 'Wurf' : 'Würfe'}`}
          >
            Würfeln
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: ROLLS_PER_TURN }, (_, i) => (
                <span key={i} className={cx('size-2 rounded-full', i < state.rollsLeft ? 'bg-ink' : 'bg-ink/20')} />
              ))}
            </span>
          </Button>
        )}
      </div>
    </section>
  );
}
