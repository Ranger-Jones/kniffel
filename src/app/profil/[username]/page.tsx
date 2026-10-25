import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StatsGrid } from '@/components/stats-grid';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import { parseUsernameParam } from '@/lib/username';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getHistory, getStatsByUsername } from '@/server/profile-service';
import { signOut } from '@/server/auth-actions';
import { AvatarUpload } from './avatar-upload';
import { RenameForm } from './rename-form';

const MEDALS = ['🥇', '🥈', '🥉'];
const dateFmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' });

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  return { title: parseUsernameParam((await params).username) ?? 'Profil' };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const username = parseUsernameParam((await params).username);
  const me = await requireUser();
  if (!username) notFound();
  const admin = createAdminClient();
  const stats = await getStatsByUsername(admin, username);
  if (!stats) notFound();
  const isMe = stats.user_id === me.id;
  const history = await getHistory(admin, stats.user_id);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 pb-12">
      <section className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {isMe ? <AvatarUpload me={me.id} profile={stats} /> : <Avatar profile={stats} size="xl" />}
        <div className="flex flex-col items-start gap-1">
          <h1 className="break-all text-4xl font-extrabold sm:text-5xl">{stats.username}</h1>
          {isMe && (
            <div className="flex flex-wrap items-center gap-1">
              <RenameForm current={stats.username} />
              <form action={signOut}>
                <button type="submit" className="min-h-9 rounded-xl px-3 text-sm font-bold text-ink-soft hover:bg-paper hover:text-tomato">Abmelden</button>
              </form>
            </div>
          )}
        </div>
      </section>

      <StatsGrid stats={stats} />

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold">Letzte Spiele</h2>
        {history.length === 0 ? (
          <Card><p className="text-ink-soft">{isMe ? 'Noch keine Spiele. Starte eins auf der Startseite.' : 'Noch keine beendeten Spiele.'}</p></Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {history.map((g) => (
              <li key={g.gameId}>
                <Card className="flex flex-col gap-2 p-4">
                  <p className="text-sm font-bold text-ink-soft">{dateFmt.format(new Date(g.finishedAt))}</p>
                  <ol className="flex flex-col gap-1">
                    {g.players.map((p) => (
                      <li
                        key={p.profile.id}
                        className={cx('flex items-center gap-2 rounded-xl px-2 py-1', p.profile.id === stats.user_id && 'bg-sun/20', p.left && 'opacity-50')}
                      >
                        <span className="w-6 text-center">{p.place && p.place <= 3 ? MEDALS[p.place - 1] : p.place ?? '–'}</span>
                        <Avatar profile={p.profile} size="xs" />
                        <span className="flex-1 truncate font-semibold">{p.profile.username}</span>
                        <span className="tabular font-display font-extrabold">{p.total}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
