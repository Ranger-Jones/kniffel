'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
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
      className="m-auto w-[min(92vw,26rem)] rounded-[1.5rem] bg-paper p-0 text-ink ring-2 ring-line shadow-[0_8px_0_var(--color-line)] backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
