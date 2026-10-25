import Link from 'next/link';
import { FriendsOnline } from '@/components/dashboard/friends-online';
import { InviteList } from '@/components/dashboard/invite-list';
import { PlayActions } from '@/components/dashboard/play-actions';
import { HeroDice } from '@/components/landing/hero-dice';
import { StatsGrid } from '@/components/stats-grid';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/supabase/server';
import { getStatsByUsername, listActiveGames } from '@/server/profile-service';
import { listFriends, listPendingInvites } from '@/server/social-service';

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const admin = createAdminClient();
  const [invites, active, friends, stats] = await Promise.all([
    listPendingInvites(admin, user.id),
    listActiveGames(admin, user.id),
    listFriends(admin, user.id),
    getStatsByUsername(admin, user.username),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pb-12">
      <h1 className="break-words text-4xl font-extrabold sm:text-5xl">Hey {user.username}!</h1>

      {invites.length > 0 && (
        <Card className="flex flex-col gap-3 ring-sun shadow-[0_6px_0_#ffd27a]">
          <h2 className="text-xl font-extrabold">Einladungen</h2>
          <InviteList invites={invites} />
        </Card>
      )}

      {active.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold">Laufende Spiele</h2>
          <ul className="flex flex-wrap gap-2">
            {active.map((g) => (
              <li key={g.code}>
                <Link href={`/spiel/${g.code}`} className={buttonClass('secondary', 'sm')}>
                  {g.code} · {g.status === 'lobby' ? 'Lobby' : 'läuft'} · {g.playerCount} {g.playerCount === 1 ? 'Spieler' : 'Spieler'}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PlayActions />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold">Freunde online</h2>
          <FriendsOnline friends={friends.friends.map((f) => f.profile)} />
        </Card>
        {stats && (
          <Card className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-extrabold">Deine Bilanz</h2>
              <Link href={`/profil/${user.username}`} className="text-sm font-bold text-sky hover:underline">Zum Profil</Link>
            </div>
            <StatsGrid stats={stats} compact />
          </Card>
        )}
      </div>
    </main>
  );
}

function Landing() {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-10 px-4 py-10 lg:grid-cols-2">
      <div className="flex flex-col items-start gap-6">
        <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-7xl">Kniffel mit deinen Freunden.</h1>
        <p className="max-w-md text-lg text-ink-soft">
          Raum eröffnen, Link schicken, losspielen. Alle sehen jeden Wurf live – egal ob am Handy oder am Laptop.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/registrieren" className={buttonClass('primary', 'lg')}>Account erstellen</Link>
          <Link href="/login" className={buttonClass('secondary', 'lg')}>Einloggen</Link>
        </div>
      </div>
      <HeroDice />
    </main>
  );
}
