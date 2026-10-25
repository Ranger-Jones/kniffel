'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useOnlineUsers } from '@/components/app-shell/online-presence';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { cx } from '@/lib/cx';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import {
  removeFriendAction, respondFriendRequestAction, searchAction, sendFriendRequestAction,
} from '@/server/social-actions';
import type { FriendEntry, FriendLists, ProfileLite } from '@/server/social-service';

function Row({ profile, online, children }: { profile: ProfileLite; online?: boolean; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="relative">
        <Avatar profile={profile} size="sm" />
        {online !== undefined && (
          <span className={cx('absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-paper', online ? 'bg-mint' : 'bg-line')} />
        )}
      </span>
      <Link href={`/profil/${profile.username}`} className="min-w-0 flex-1 truncate font-bold hover:underline">{profile.username}</Link>
      <span className="flex shrink-0 gap-2">{children}</span>
    </li>
  );
}

export function FriendsClient({ me, lists }: { me: string; lists: FriendLists }) {
  const router = useRouter();
  const online = useOnlineUsers();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [removing, setRemoving] = useState<FriendEntry | null>(null);
  const known = new Set([...lists.friends, ...lists.incoming, ...lists.outgoing].map((f) => f.profile.id));

  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(async () => setResults(q.length >= 2 ? await searchAction(q) : []), q.length >= 2 ? 250 : 0);
    return () => clearTimeout(t);
  }, [query]);

  // Live: Anfragen und Annahmen anderer sofort anzeigen.
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const refresh = () => router.refresh();
      channel = supabase.channel(`friends:${me}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${me}` }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${me}` }, refresh)
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [me, router, supabase]);

  async function request(username: string) {
    const res = await sendFriendRequestAction(username);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.data.status === 'accepted' ? `Ihr seid jetzt Freunde! 🎉` : `Anfrage an ${username} gesendet`);
    setQuery('');
    router.refresh();
  }

  async function respond(entry: FriendEntry, accept: boolean) {
    const res = await respondFriendRequestAction(entry.friendshipId, accept);
    if (!res.ok) return toast.error(res.error);
    if (accept) toast.success(`Du und ${entry.profile.username} seid jetzt Freunde`);
    router.refresh();
  }

  async function remove(entry: FriendEntry) {
    setRemoving(null);
    const res = await removeFriendAction(entry.friendshipId);
    if (!res.ok) return toast.error(res.error);
    router.refresh();
  }

  const friendsSorted = [...lists.friends].sort((a, b) => Number(online.has(b.profile.id)) - Number(online.has(a.profile.id)));

  return (
    <main className="mx-auto grid w-full content-start max-w-5xl flex-1 grid-cols-[minmax(0,1fr)] gap-5 px-4 pb-12 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-extrabold">Freunde</h1>
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold">Freunde finden</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Benutzername suchen"
            aria-label="Benutzername suchen"
            className="h-12 rounded-2xl bg-mist/60 px-4 ring-2 ring-inset ring-line outline-none placeholder:text-ink-soft/60 focus:bg-paper focus:ring-sky"
          />
          {query.trim().length >= 2 && (
            results.length === 0 ? (
              <p className="text-sm text-ink-soft">Niemand mit diesem Namen gefunden.</p>
            ) : (
              <ul className="divide-y divide-line">
                {results.map((p) => (
                  <Row key={p.id} profile={p}>
                    {known.has(p.id)
                      ? <span className="text-sm font-semibold text-ink-soft">schon verbunden</span>
                      : <Button size="sm" onClick={() => request(p.username)}>Anfrage senden</Button>}
                  </Row>
                ))}
              </ul>
            )
          )}
        </Card>

        {(lists.incoming.length > 0 || lists.outgoing.length > 0) && (
          <Card className="flex flex-col gap-2">
            <h2 className="text-xl font-extrabold">Anfragen</h2>
            <ul className="divide-y divide-line">
              {lists.incoming.map((f) => (
                <Row key={f.friendshipId} profile={f.profile}>
                  <Button size="sm" onClick={() => respond(f, true)}>Annehmen</Button>
                  <Button size="sm" variant="ghost" onClick={() => respond(f, false)}>Ablehnen</Button>
                </Row>
              ))}
              {lists.outgoing.map((f) => (
                <Row key={f.friendshipId} profile={f.profile}>
                  <span className="self-center text-sm font-semibold text-ink-soft">ausstehend</span>
                  <Button size="sm" variant="ghost" onClick={() => remove(f)}>Zurückziehen</Button>
                </Row>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Card className="flex flex-col gap-2 lg:mt-14">
        <h2 className="text-xl font-extrabold">Deine Freunde</h2>
        {friendsSorted.length === 0 ? (
          <p className="text-ink-soft">Noch niemand hier. Such oben nach dem Benutzernamen deiner Freunde.</p>
        ) : (
          <ul className="divide-y divide-line">
            {friendsSorted.map((f) => (
              <Row key={f.friendshipId} profile={f.profile} online={online.has(f.profile.id)}>
                <Button size="sm" variant="ghost" onClick={() => setRemoving(f)}>Entfernen</Button>
              </Row>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={removing !== null} onClose={() => setRemoving(null)} title="Freund entfernen?">
        <p className="text-ink-soft">{removing?.profile.username} verschwindet aus deiner Freundesliste.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>Abbrechen</Button>
          <Button variant="danger" onClick={() => removing && remove(removing)}>Entfernen</Button>
        </div>
      </Modal>
    </main>
  );
}
