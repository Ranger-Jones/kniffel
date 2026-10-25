'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { respondInviteAction } from '@/server/social-actions';
import type { PendingInvite } from '@/server/social-service';

export function InviteList({ invites }: { invites: PendingInvite[] }) {
  const router = useRouter();
  async function respond(id: string, accept: boolean) {
    const res = await respondInviteAction(id, accept);
    if (!res.ok) return toast.error(res.error);
    if (res.data.code) router.push(`/spiel/${res.data.code}`);
    else router.refresh();
  }
  return (
    <ul className="flex flex-col gap-2">
      {invites.map((i) => (
        <li key={i.id} className="flex items-center gap-3">
          <Avatar profile={i.from} size="sm" />
          <span className="min-w-0 flex-1 truncate"><b>{i.from.username}</b> lädt dich ein</span>
          <Button size="sm" onClick={() => respond(i.id, true)}>Mitspielen</Button>
          <Button size="sm" variant="ghost" onClick={() => respond(i.id, false)}>Ablehnen</Button>
        </li>
      ))}
    </ul>
  );
}
