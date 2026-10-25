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
    // Schmales geschütztes Leerzeichen: "100 %" bricht nie um.
    rate: stats.games_played ? `${Math.round((stats.wins / stats.games_played) * 100)}\u202F%` : '–',
    best: stats.games_played ? String(stats.best_score) : '–',
    avg: stats.games_played ? String(stats.avg_score) : '–',
    kniffel: String(stats.kniffel_count),
  };
  return (
    <dl className={cx('grid gap-3', compact ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3')}>
      {TILES.map((t) => (
        <div
          key={t.key}
          className={cx('flex min-w-0 flex-col-reverse rounded-[1.25rem] bg-paper ring-2 ring-line', compact ? 'px-3 py-2.5' : 'px-4 py-3')}
          style={{ boxShadow: `inset 0 -5px 0 ${t.color}` }}
        >
          <dt className="truncate text-xs font-bold text-ink-soft sm:text-sm">{t.label}</dt>
          <dd
            data-testid={`stat-${t.key}`}
            className={cx('tabular whitespace-nowrap font-display font-extrabold leading-tight', compact ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl')}
          >
            {values[t.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
