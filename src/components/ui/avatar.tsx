/* eslint-disable @next/next/no-img-element */
import { cx } from '@/lib/cx';
import { nameColor } from '@/lib/player-colors';

export interface AvatarProfile { username: string; avatar_url: string | null }

const SIZES = { xs: 'size-7 text-xs', sm: 'size-9 text-sm', md: 'size-12 text-base', lg: 'size-20 text-2xl', xl: 'size-28 text-4xl' };

export function Avatar({
  profile, size = 'md', ring, className,
}: { profile: AvatarProfile | undefined; size?: keyof typeof SIZES; ring?: string; className?: string }) {
  const name = profile?.username ?? '?';
  const color = ring ?? nameColor(name);
  return (
    <span
      className={cx('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-extrabold text-white', SIZES[size], className)}
      style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${ring ?? 'transparent'}` }}
      title={name}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{name.slice(0, 2).toUpperCase()}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
