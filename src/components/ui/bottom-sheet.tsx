'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-label={title}
      className="mx-0 mt-auto mb-0 h-[78dvh] max-h-none w-full max-w-none rounded-t-[1.75rem] bg-paper p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-full text-2xl text-ink-soft hover:bg-mist" aria-label="Schließen">×</button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </dialog>
  );
}
