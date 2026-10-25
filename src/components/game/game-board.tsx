'use client';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { UseGame } from '@/hooks/use-game';
import { currentPlayerId } from '@/lib/kniffel/engine';
import { seatColor } from '@/lib/player-colors';
import { DiceTray } from './dice-tray';
import { OfflineControls } from './offline-controls';
import { PlayerBar } from './player-bar';
import { Scorecard } from './scorecard';
import { TurnTimer } from './turn-timer';

type Props = Pick<UseGame, 'profiles' | 'online' | 'offlineSince' | 'dispatch'> & {
  game: NonNullable<UseGame['game']>;
  me: string;
  emojiBar?: ReactNode;
  chatCard?: ReactNode;
  chatButton?: ReactNode;
};

export function GameBoard({ game, profiles, online, offlineSince, dispatch, me, emojiBar, chatCard, chatButton }: Props) {
  const router = useRouter();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const { state } = game;
  const activeId = currentPlayerId(state);
  const activeSeat = state.players.findIndex((p) => p.id === activeId);
  const activeName = profiles[activeId ?? '']?.username ?? '…';

  async function leave() {
    setConfirmLeave(false);
    if (await dispatch({ type: 'leave' })) router.push('/');
  }

  return (
    <main className="mx-auto grid w-full content-start max-w-6xl flex-1 gap-4 px-4 pb-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-6">
      <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
        <PlayerBar state={state} profiles={profiles} online={online} me={me} />
        <OfflineControls state={state} me={me} name={activeName} online={online} offlineSince={offlineSince} dispatch={dispatch} />
      </div>
      <div className="flex flex-col gap-3 lg:col-start-1 lg:row-span-3 lg:row-start-1">
        <Scorecard state={state} profiles={profiles} me={me} onScore={(category) => dispatch({ type: 'score', category }, { turn: true })} />
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setConfirmLeave(true)}>Spiel verlassen</Button>
      </div>
      <div className="sticky bottom-3 z-20 flex flex-col gap-3 lg:top-4 lg:bottom-auto lg:col-start-2 lg:row-start-2">
        <DiceTray
          timer={<TurnTimer state={state} dispatch={dispatch} canReport={state.players.some((p) => p.id === me && !p.left)} />}
          state={state}
          isMyTurn={activeId === me}
          color={seatColor(activeSeat)}
          activeName={activeName}
          onRoll={() => dispatch({ type: 'roll' }, { turn: true })}
          onHold={(index, held) => dispatch({ type: 'setHold', index, held })}
        />
        <div className="flex items-center gap-2">
          {chatButton && <div className="lg:hidden">{chatButton}</div>}
          <div className="min-w-0 flex-1">{emojiBar}</div>
        </div>
      </div>
      {chatCard && <div className="hidden lg:col-start-2 lg:row-start-3 lg:block">{chatCard}</div>}
      <Modal open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Spiel verlassen?">
        <p className="text-ink-soft">Du kannst danach nicht wieder einsteigen und dein Ergebnis zählt nicht.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmLeave(false)}>Weiterspielen</Button>
          <Button variant="danger" onClick={leave}>Verlassen</Button>
        </div>
      </Modal>
    </main>
  );
}
