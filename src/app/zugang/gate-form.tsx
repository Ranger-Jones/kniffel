'use client';
import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GATE_QUESTION } from '@/lib/gate';
import { unlockAction } from '@/server/gate-actions';

export function GateForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(unlockAction, {});
  useEffect(() => {
    if (state.next) window.location.assign(state.next);
  }, [state.next]);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-7">
        <h1 className="mb-1 text-3xl font-extrabold">Kurze Frage vorab</h1>
        <p className="mb-6 text-ink-soft">Nur wer die Antwort kennt, kommt rein.</p>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <Input label={GATE_QUESTION} name="answer" autoComplete="off" autoCapitalize="words" required autoFocus />
          {state.error && <p role="alert" className="rounded-xl bg-tomato/10 px-3 py-2 text-sm font-semibold text-tomato">{state.error}</p>}
          <Button type="submit" size="lg" disabled={pending || !!state.next} className="mt-2 w-full">Weiter</Button>
        </form>
      </Card>
    </main>
  );
}
