'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { GameSettingsPanel } from './game-settings';
import type { UseGame } from '@/hooks/use-game';
import { getSettings, MAX_PLAYERS } from '@/lib/kniffel/engine';
import { seatColor } from '@/lib/player-colors';
import { inviteAction } from '@/server/game-actions';
import type { ProfileLite } from '@/server/social-service';

type Props = Pick<UseGame, 'profiles' | 'online' | 'dispatch'> & {
  game: NonNullable<UseGame['game']>;
  me: string;
  friends: ProfileLite[];
  chatSlot?: ReactNode;
};

export function Lobby({ game, profiles, online, dispatch, me, friends, chatSlot }: Props) {
  const router = useRouter();
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const { state } = game;
  const isHost = state.hostId === me;
  const inGame = new Set(state.players.map((p) => p.id));
  const invitable = friends.filter((f) => !inGame.has(f.id));

  async function copyLink() {
    await navigator.clipboard.writeText(`${location.origin}/spiel/${game.code}`);
    toast.success('Link kopiert. Schick ihn deinen Freunden.');
  }

  async function invite(friend: ProfileLite) {
    const res = await inviteAction(game.id, friend.id);
    if (res.ok) {
      setInvited((s) => new Set(s).add(friend.id));
      toast.success(`Einladung an ${friend.username} gesendet`);
    } else toast.error(res.error);
  }

  async function start() {
    setBusy(true);
    await dispatch({ type: 'start' }, { versioned: true });
    setBusy(false);
  }

  async function leave() {
    if (await dispatch({ type: 'leave' })) router.push('/');
  }

  return (
    <main className="mx-auto grid w-full content-start max-w-5xl flex-1 gap-5 px-4 pb-12 lg:grid-cols-[1.4fr_1fr]">
      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold">Lobby</h1>
            <p className="mt-1 text-ink-soft">Mit diesem Code kommen deine Freunde rein.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={copyLink}>Link kopieren</Button>
        </div>

        <div className="flex gap-1.5 sm:gap-2" aria-label={`Raum-Code ${game.code.split('').join(' ')}`}>
          {game.code.split('').map((ch, i) => (
            <span
              key={i}
              aria-hidden
              className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-mist font-display text-3xl font-extrabold sm:h-16 sm:text-4xl"
              style={{ boxShadow: `inset 0 -5px 0 ${seatColor(i)}`, rotate: `${i % 2 ? 2 : -2}deg` }}
            >
              {ch}
            </span>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: MAX_PLAYERS }, (_, seat) => {
            const p = state.players[seat];
            if (!p) {
              return (
                <li key={`free-${seat}`} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-line p-3 text-ink-soft/70">
                  <span className="size-12 rounded-full border-2 border-dashed border-line" />
                  <span className="font-semibold">frei</span>
                </li>
              );
            }
            const profile = profiles[p.id];
            return (
              <li key={p.id} className="relative flex items-center gap-3 rounded-2xl bg-mist/70 p-3">
                <span className="relative">
                  <Avatar profile={profile} ring={seatColor(seat)} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-paper ${online.has(p.id) ? 'bg-mint' : 'bg-line'}`}
                    title={online.has(p.id) ? 'online' : 'offline'}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{profile?.username ?? '…'}</span>
                  <span className="text-xs text-ink-soft">{p.id === state.hostId ? '👑 Host' : p.id === me ? 'Du' : 'Spieler'}</span>
                </span>
                {isHost && p.id !== me && (
                  <button
                    type="button"
                    aria-label={`${profile?.username ?? 'Spieler'} entfernen`}
                    onClick={() => setRemoving(p.id)}
                    className="absolute right-2 top-2 rounded-full px-1.5 text-lg leading-none text-ink-soft hover:bg-paper hover:text-tomato"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          {isHost ? (
            <Button size="lg" onClick={start} disabled={busy}>Spiel starten</Button>
          ) : (
            <p className="font-semibold text-ink-soft">Warte auf den Host …</p>
          )}
          <Button variant="ghost" onClick={leave}>Lobby verlassen</Button>
        </div>
      </Card>

      <Modal open={removing !== null} onClose={() => setRemoving(null)} title={`${profiles[removing ?? '']?.username ?? 'Spieler'} entfernen?`}>
        <p className="text-ink-soft">Wer entfernt wird, kann diesem Raum nicht wieder beitreten.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>Abbrechen</Button>
          <Button
            variant="danger"
            onClick={async () => {
              const id = removing;
              setRemoving(null);
              if (id) await dispatch({ type: 'removePlayer', playerId: id }, { versioned: true });
            }}
          >
            Entfernen
          </Button>
        </div>
      </Modal>

      <div className="flex flex-col gap-5">
      <Card className="p-6">
        <GameSettingsPanel
          settings={getSettings(state)}
          isHost={isHost}
          onChange={(patch) => dispatch({ type: 'updateSettings', settings: patch }, { versioned: true })}
        />
      </Card>
      {chatSlot}
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-2xl font-extrabold">Freunde einladen</h2>
        {friends.length === 0 ? (
          <p className="text-ink-soft">
            Du hast noch keine Freunde hinzugefügt. <Link href="/freunde" className="font-bold text-sky hover:underline">Freunde finden</Link>
          </p>
        ) : invitable.length === 0 ? (
          <p className="text-ink-soft">Alle deine Freunde sind schon da.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invitable.map((f) => (
              <li key={f.id} className="flex items-center gap-3">
                <Avatar profile={f} size="sm" />
                <span className="flex-1 truncate font-semibold">{f.username}</span>
                <Button size="sm" variant="secondary" disabled={invited.has(f.id) || state.players.length >= MAX_PLAYERS} onClick={() => invite(f)}>
                  {invited.has(f.id) ? 'Eingeladen' : 'Einladen'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>
    </main>
  );
}
