import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getLeaderboard } from '@/server/profile-service';

export const metadata: Metadata = { title: 'Bestenliste' };
const MEDALS = ['🥇', '🥈', '🥉'];

export default async function LeaderboardPage() {
  const me = await requireUser();
  const rows = await getLeaderboard(createAdminClient());
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 pb-12">
      <h1 className="text-4xl font-extrabold">Bestenliste</h1>
      <Card className="overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-ink-soft">Noch keine beendeten Spiele. Das erste Spiel bringt dich auf Platz 1.</p>
        ) : (
          <table className="w-full min-w-[32rem] text-left">
            <thead>
              <tr className="text-sm text-ink-soft">
                <th scope="col" className="px-5 py-3 font-bold">Platz</th>
                <th scope="col" className="py-3 font-bold">Spieler</th>
                <th scope="col" className="py-3 text-right font-bold">Siege</th>
                <th scope="col" className="py-3 text-right font-bold">Spiele</th>
                <th scope="col" className="py-3 text-right font-bold">Bestwert</th>
                <th scope="col" className="px-5 py-3 text-right font-bold">Ø</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.user_id} className={cx('border-t border-line', r.user_id === me.id && 'bg-sun/15')}>
                  <td className="tabular px-5 py-3 font-display text-xl font-extrabold">{i < 3 ? MEDALS[i] : i + 1}</td>
                  <td className="py-3">
                    <Link href={`/profil/${r.username}`} className="flex items-center gap-3 font-bold hover:underline">
                      <Avatar profile={r} size="sm" />
                      {r.username}
                    </Link>
                  </td>
                  <td className="tabular py-3 text-right font-extrabold">{r.wins}</td>
                  <td className="tabular py-3 text-right">{r.games_played}</td>
                  <td className="tabular py-3 text-right">{r.best_score}</td>
                  <td className="tabular px-5 py-3 text-right">{r.avg_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  );
}
