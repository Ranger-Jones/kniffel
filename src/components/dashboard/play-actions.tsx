'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Card } from '@/components/ui/card';
import { createGameAction, joinGameAction } from '@/server/game-actions';

export function PlayActions() {
  const [state, join, pending] = useActionState(joinGameAction, {});
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <Card className="flex flex-col items-start gap-3 p-6">
        <h2 className="text-2xl font-extrabold">Neues Spiel</h2>
        <p className="text-ink-soft">Du eröffnest den Raum und lädst deine Freunde ein.</p>
        <form action={createGameAction} className="mt-auto">
          <SubmitButton size="lg" pendingLabel="Raum wird erstellt …">Neues Spiel</SubmitButton>
        </form>
      </Card>
      <Card className="flex flex-col items-start gap-3 p-6">
        <h2 className="text-2xl font-extrabold">Mit Code beitreten</h2>
        <p className="text-ink-soft">Jemand hat dir einen 6-stelligen Code geschickt?</p>
        <form action={join} className="mt-auto flex w-full gap-2">
          <input
            name="code" required maxLength={6} size={6} autoCapitalize="characters" autoComplete="off" spellCheck={false}
            placeholder="ABC234" aria-label="Raum-Code"
            className="h-14 min-w-0 flex-1 rounded-2xl bg-mist/60 px-4 font-display text-xl font-extrabold uppercase tracking-[0.12em] sm:text-2xl sm:tracking-[0.2em] ring-2 ring-inset ring-line outline-none placeholder:text-ink-soft/40 focus:bg-paper focus:ring-sky"
          />
          <Button type="submit" size="lg" variant="secondary" disabled={pending} className="shrink-0 px-4 sm:px-7">Beitreten</Button>
        </form>
        {state.error && <p role="alert" className="text-sm font-semibold text-tomato">{state.error}</p>}
      </Card>
    </div>
  );
}
