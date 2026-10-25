'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cx } from '@/lib/cx';
import { EMOJI_CATALOG, QUICK_EMOJI_COUNT } from '@/lib/emojis';
import { setQuickEmojisAction } from '@/server/profile-actions';

interface Props {
  quick: string[];
  onQuickChange: (emojis: string[]) => void;
  onSend: (emoji: string) => void;
}

export function EmojiBar({ quick, onQuickChange, onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<string[]>(quick);
  const [saving, setSaving] = useState(false);

  function close() {
    setOpen(false);
    setEditing(false);
  }

  function startEditing() {
    setPicked(quick);
    setEditing(true);
  }

  function togglePick(e: string) {
    setPicked((p) => (p.includes(e) ? p.filter((x) => x !== e) : p.length < QUICK_EMOJI_COUNT ? [...p, e] : p));
  }

  async function save() {
    setSaving(true);
    let res: Awaited<ReturnType<typeof setQuickEmojisAction>>;
    try {
      res = await setQuickEmojisAction(picked);
    } catch {
      return toast.error('Speichern hat nicht geklappt. Bitte nochmal versuchen.');
    } finally {
      setSaving(false);
    }
    if (!res.ok) return toast.error(res.error);
    onQuickChange(picked);
    toast.success('Schnellwahl gespeichert');
    setEditing(false);
  }

  return (
    <>
      <div role="group" aria-label="Reaktion senden" className="flex items-center rounded-full bg-paper p-1 ring-2 ring-line">
        {quick.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onSend(e)}
            className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-full text-xl transition-transform hover:bg-mist active:scale-90 sm:text-2xl"
            aria-label={`Reaktion ${e} senden`}
          >
            {e}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-full font-display text-2xl font-extrabold text-ink-soft hover:bg-mist"
          aria-label="Mehr Reaktionen"
        >
          +
        </button>
      </div>

      <Modal open={open} onClose={close} title={editing ? 'Schnellwahl anpassen' : 'Reaktionen'}>
        {editing && <p className="-mt-2 text-sm text-ink-soft">Wähle genau {QUICK_EMOJI_COUNT} Emojis für deine Leiste ({picked.length}/{QUICK_EMOJI_COUNT}).</p>}
        <div className="grid max-h-[50dvh] grid-cols-6 gap-1 overflow-y-auto">
          {EMOJI_CATALOG.map((e) => {
            const selected = editing && picked.includes(e);
            return (
              <button
                key={e}
                type="button"
                aria-pressed={editing ? selected : undefined}
                aria-label={editing ? `${e} ${selected ? 'abwählen' : 'auswählen'}` : `Reaktion ${e} senden`}
                onClick={() => {
                  if (editing) togglePick(e);
                  else {
                    onSend(e);
                    close();
                  }
                }}
                className={cx(
                  'flex aspect-square min-h-11 items-center justify-center rounded-xl text-2xl transition-colors hover:bg-mist',
                  selected && 'bg-sun/30 ring-2 ring-sun',
                )}
              >
                {e}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
              <Button onClick={save} disabled={picked.length !== QUICK_EMOJI_COUNT || saving}>Speichern</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={startEditing}>Schnellwahl anpassen</Button>
          )}
        </div>
      </Modal>
    </>
  );
}
