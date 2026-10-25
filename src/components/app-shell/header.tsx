import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Logo } from '@/components/ui/logo';
import { cookies } from 'next/headers';
import { GATE_COOKIE, verifyGateToken } from '@/lib/gate';
import { getCurrentUser } from '@/lib/supabase/server';
import { signOut } from '@/server/auth-actions';

export async function Header() {
  const user = await getCurrentUser();
  const unlocked = await verifyGateToken((await cookies()).get(GATE_COOKIE)?.value, process.env.SUPABASE_SECRET_KEY);
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
      <Link href="/" aria-label="Startseite"><Logo /></Link>
      {user ? (
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/freunde" className="rounded-xl px-3 py-2 font-bold text-ink-soft hover:bg-paper hover:text-ink">Freunde</Link>
          <Link href="/bestenliste" className="hidden rounded-xl px-3 py-2 font-bold text-ink-soft hover:bg-paper hover:text-ink sm:block">Bestenliste</Link>
          <Link href={`/profil/${user.username}`} className="ml-1 rounded-full" aria-label="Dein Profil">
            <Avatar profile={user} size="sm" />
          </Link>
          <form action={signOut}>
            <button type="submit" className="rounded-xl px-3 py-2 text-sm font-bold text-ink-soft hover:bg-paper hover:text-ink">Abmelden</button>
          </form>
        </nav>
      ) : unlocked && (
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-3 py-2 font-bold text-ink-soft hover:bg-paper hover:text-ink">Einloggen</Link>
        </nav>
      )}
    </header>
  );
}
