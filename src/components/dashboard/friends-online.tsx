'use client';
import Link from 'next/link';
import { useOnlineUsers } from '@/components/app-shell/online-presence';
import { Avatar } from '@/components/ui/avatar';
import type { ProfileLite } from '@/server/social-service';

export function FriendsOnline({ friends }: { friends: ProfileLite[] }) {
  const online = useOnlineUsers();
  const here = friends.filter((f) => online.has(f.id));
  if (friends.length === 0) {
    return <p className="text-ink-soft">Noch keine Freunde. <Link href="/freunde" className="font-bold text-sky hover:underline">Freunde finden</Link></p>;
  }
  if (here.length === 0) return <p className="text-ink-soft">Gerade ist keiner deiner Freunde online.</p>;
  return (
    <ul className="flex flex-wrap gap-3">
      {here.map((f) => (
        <li key={f.id}>
          <Link href={`/profil/${f.username}`} className="flex items-center gap-2 rounded-full bg-mist py-1 pl-1 pr-3 font-bold hover:bg-line">
            <span className="relative">
              <Avatar profile={f} size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-mint ring-2 ring-paper" />
            </span>
            {f.username}
          </Link>
        </li>
      ))}
    </ul>
  );
}
