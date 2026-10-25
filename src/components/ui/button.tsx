import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-sun text-ink shadow-[0_4px_0_#c98200] active:shadow-[0_1px_0_#c98200]',
  secondary: 'bg-paper text-ink ring-2 ring-inset ring-line shadow-[0_4px_0_var(--color-line)] active:shadow-[0_1px_0_var(--color-line)]',
  ghost: 'bg-transparent text-ink-soft hover:bg-paper/70',
  danger: 'bg-tomato text-white shadow-[0_4px_0_#c7353a] active:shadow-[0_1px_0_#c7353a]',
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl',
  md: 'h-11 px-5 text-base rounded-2xl',
  lg: 'h-14 px-7 text-lg rounded-[1.25rem]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cx(
    'inline-flex select-none items-center justify-center gap-2 font-display font-bold transition-[transform,box-shadow] duration-100',
    'active:translate-y-[3px] disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant], SIZES[size], extra,
  );
}

export function Button({
  variant = 'primary', size = 'md', className, type = 'button', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
