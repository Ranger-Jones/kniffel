'use client';
import { useFormStatus } from 'react-dom';
import { Button } from './button';

/** Formular-Button, der während des Absendens gesperrt ist und den Ladezustand zeigt. */
export function SubmitButton({ children, pendingLabel, ...props }: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending}>
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
