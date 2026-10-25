'use client';
import { EMOJIS } from '@/lib/emojis';

export function EmojiBar({ onSend }: { onSend: (emoji: string) => void }) {
  return (
    <div role="group" aria-label="Reaktion senden" className="flex justify-between gap-1 rounded-full bg-paper p-1.5 ring-2 ring-line">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onSend(e)}
          className="flex size-11 items-center justify-center rounded-full text-2xl transition-transform hover:scale-110 hover:bg-mist active:scale-90"
          aria-label={`${e} senden`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
