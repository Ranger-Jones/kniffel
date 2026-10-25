import Link from 'next/link';
import { PlayActions } from '@/components/dashboard/play-actions';
import { buttonClass } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/supabase/server';

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-4xl font-extrabold">Hey {user.username}!</h1>
        <PlayActions />
      </main>
    );
  }
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-6 px-4 py-16">
      <h1 className="max-w-xl text-5xl font-extrabold leading-[1.05] sm:text-6xl">Kniffel mit deinen Freunden. Online und live.</h1>
      <div className="flex flex-wrap gap-3">
        <Link href="/registrieren" className={buttonClass('primary', 'lg')}>Account erstellen</Link>
        <Link href="/login" className={buttonClass('secondary', 'lg')}>Einloggen</Link>
      </div>
    </main>
  );
}
