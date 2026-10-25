import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('rounded-[1.5rem] bg-paper p-5 ring-2 ring-line shadow-[0_6px_0_var(--color-line)]', className)}
      {...props}
    />
  );
}
