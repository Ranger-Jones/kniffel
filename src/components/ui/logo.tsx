import { cx } from '@/lib/cx';

export function DieMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="3" y="3" width="34" height="34" rx="9" fill="var(--color-tomato)" />
      <rect x="3" y="3" width="34" height="30" rx="9" fill="#ff7a7e" />
      {[[12, 12], [28, 12], [20, 18], [12, 24], [28, 24]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" fill="#fff" />
      ))}
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-ink', className)}>
      <DieMark className="size-8 -rotate-12" />
      Kniffel
    </span>
  );
}
