'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signIn, signUp, type AuthState } from '@/server/auth-actions';

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === 'login' ? signIn : signUp, {});
  const nextQuery = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-7">
        <h1 className="mb-1 text-3xl font-extrabold">{mode === 'login' ? 'Willkommen zurück' : 'Account erstellen'}</h1>
        <p className="mb-6 text-ink-soft">
          {mode === 'login' ? 'Log dich ein und würfel los.' : 'Ein Name, eine E-Mail, ein Passwort. Fertig.'}
        </p>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          {mode === 'register' && (
            <Input label="Benutzername" name="username" defaultValue={state.username} key={`u-${state.username}`} autoComplete="username" required minLength={3} maxLength={20} />
          )}
          <Input label="E-Mail" name="email" type="email" defaultValue={state.email} key={`e-${state.email}`} autoComplete="email" required />
          <Input
            label="Passwort" name="password" type="password" required minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {state.error && <p role="alert" className="rounded-xl bg-tomato/10 px-3 py-2 text-sm font-semibold text-tomato">{state.error}</p>}
          <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
            {mode === 'login' ? 'Einloggen' : 'Account erstellen'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-soft">
          {mode === 'login' ? 'Noch keinen Account? ' : 'Schon dabei? '}
          <Link className="font-bold text-sky underline-offset-4 hover:underline" href={`${mode === 'login' ? '/registrieren' : '/login'}${nextQuery}`}>
            {mode === 'login' ? 'Registrieren' : 'Einloggen'}
          </Link>
        </p>
      </Card>
    </main>
  );
}
