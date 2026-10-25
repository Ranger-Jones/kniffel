'use client';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { renameAction } from '@/server/profile-actions';

export function RenameForm({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(renameAction, {});
  if (!open) {
    return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Benutzername ändern</Button>;
  }
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-2">
      <Input label="Neuer Benutzername" name="username" defaultValue={current} required minLength={3} maxLength={20} error={state.error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>Speichern</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Abbrechen</Button>
      </div>
    </form>
  );
}
