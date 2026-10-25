import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export function Input({
  label, error, className, id, ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-bold text-ink-soft">{label}</label>}
      <input
        id={inputId}
        aria-invalid={!!error || undefined}
        className={cx(
          'h-12 rounded-2xl bg-mist/60 px-4 text-base text-ink ring-2 ring-inset ring-line outline-none',
          'placeholder:text-ink-soft/60 focus:bg-paper focus:ring-sky',
          error && 'ring-tomato',
          className,
        )}
        {...props}
      />
      {error && <p className="text-sm font-semibold text-tomato">{error}</p>}
    </div>
  );
}
