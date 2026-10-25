import { cx } from '@/lib/cx';
import type { PlayerStats } from '@/server/profile-service';

const TILES = [
  { key: 'games', label: 'Spiele', color: '#3d8bff' },
  { key: 'wins', label: 'Siege', color: '#19c99a' },
  { key: 'rate', label: 'Siegquote', color: '#8b5cf6' },
  { key: 'best', label: 'Bestwert', color: '#ffb020' },
  { key: 'avg', label: 'Ø Punkte', color: '#f062b0' },
  { key: 'kniffel', label: 'Kniffel', color: '#ff5a5f' },
] as const;

export function StatsGrid({ stats, compact = false }: { stats: PlayerStats; compact?: boolean }) {
  const values: Record<(typeof TILES)[number]['key'], string> = {
    games: String(stats.games_played),
    wins: String(stats.wins),
    rate: stats.games_played ? `${Math.round((stats.wins / stats.games_played) * 100)} %` : '–',
    best: stats.games_played ? String(stats.best_score) : '–',
    avg: stats.games_played ? String(stats.avg_score) : '–',
    kniffel: String(stats.kniffel_count),
  };
  return (
    <dl className={cx('grid gap-3', compact ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3')}>
      {TILES.map((t) => (
        <div
          key={t.key}
          className="flex flex-col-reverse rounded-[1.25rem] bg-paper px-4 py-3 ring-2 ring-line"
          style={{ boxShadow: `inset 0 -5px 0 ${t.color}` }}
        >
          <dt className="text-sm font-bold text-ink-soft">{t.label}</dt>
          <dd data-testid={`stat-${t.key}`} className={cx('tabular font-display font-extrabold', compact ? 'text-2xl' : 'text-4xl')}>
            {values[t.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
