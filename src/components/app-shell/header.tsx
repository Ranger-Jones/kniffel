import Link from 'next/link';
import { cookies } from 'next/headers';
import { Avatar } from '@/components/ui/avatar';
import { Logo } from '@/components/ui/logo';
import { GATE_COOKIE, verifyGateToken } from '@/lib/gate';
import { getCurrentUser } from '@/lib/supabase/server';
import { signOut } from '@/server/auth-actions';

const navLink = 'flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 font-bold text-ink-soft hover:bg-paper hover:text-ink sm:px-3';

export async function Header() {
  const user = await getCurrentUser();
  const unlocked = await verifyGateToken((await cookies()).get(GATE_COOKIE)?.value, process.env.SUPABASE_SECRET_KEY);
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:py-4">
      <Link href="/" aria-label="Startseite" className="shrink-0"><Logo /></Link>
      {user ? (
        <nav className="flex min-w-0 items-center gap-0.5 sm:gap-2">
          <Link href="/freunde" className={navLink}>
            <span aria-hidden className="sm:hidden">👥</span>
            <span className="sr-only sm:not-sr-only">Freunde</span>
          </Link>
          <Link href="/bestenliste" className={navLink}>
            <span aria-hidden className="sm:hidden">🏆</span>
            <span className="sr-only sm:not-sr-only">Bestenliste</span>
          </Link>
          <Link href={`/profil/${user.username}`} className="ml-1 flex size-11 items-center justify-center rounded-full" aria-label="Dein Profil">
            <Avatar profile={user} size="sm" />
          </Link>
          <form action={signOut} className="hidden sm:block">
            <button type="submit" className={navLink + ' text-sm'}>Abmelden</button>
          </form>
        </nav>
      ) : unlocked && (
        <nav className="flex items-center gap-2">
          <Link href="/login" className={navLink}>Einloggen</Link>
        </nav>
      )}
    </header>
  );
}
