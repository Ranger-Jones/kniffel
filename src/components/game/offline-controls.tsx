'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { UseGame } from '@/hooks/use-game';
import { currentPlayerId, type GameState } from '@/lib/kniffel/engine';

export const OFFLINE_SKIP_AFTER_MS = 30_000;

interface Props {
  state: GameState;
  me: string;
  name: string;
  online: Set<string>;
  offlineSince: Record<string, number>;
  dispatch: UseGame['dispatch'];
}

export function OfflineControls({ state, me, name, online, offlineSince, dispatch }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [confirmRemove, setConfirmRemove] = useState(false);
  const activeId = currentPlayerId(state);
  const relevant = state.hostId === me && !!activeId && activeId !== me && !online.has(activeId);

  useEffect(() => {
    if (!relevant) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [relevant]);

  if (!relevant) return null;
  const since = offlineSince[activeId] ?? now;
  if (now - since < OFFLINE_SKIP_AFTER_MS) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[1.25rem] bg-sun/25 p-4 ring-2 ring-sun">
      <p className="font-bold">{name} ist offline. Du kannst den Zug überspringen oder {name} aus dem Spiel nehmen.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => dispatch({ type: 'skipTurn' }, { versioned: true })}>Zug überspringen</Button>
        <Button size="sm" variant="secondary" onClick={() => setConfirmRemove(true)}>Aus dem Spiel entfernen</Button>
      </div>
      <Modal open={confirmRemove} onClose={() => setConfirmRemove(false)} title={`${name} entfernen?`}>
        <p className="text-ink-soft">{name} kann danach nicht mehr mitspielen und zählt nicht in der Wertung.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmRemove(false)}>Abbrechen</Button>
          <Button
            variant="danger"
            onClick={async () => {
              setConfirmRemove(false);
              await dispatch({ type: 'removePlayer', playerId: activeId }, { versioned: true });
            }}
          >
            Entfernen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
