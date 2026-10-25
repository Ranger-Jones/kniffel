'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { respondInviteAction } from '@/server/social-actions';

export function InviteListener({ me }: { me: string }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function show(inviteId: string) {
      const { data } = await supabase.from('game_invites')
        .select('id, status, games(code), from:profiles!game_invites_from_id_fkey(username)')
        .eq('id', inviteId).maybeSingle();
      const code = (data?.games as { code: string } | null)?.code;
      if (!data || data.status !== 'pending' || !code) return;
      router.refresh();
      if (pathRef.current === `/spiel/${code}`) return;
      const from = (data.from as { username: string } | null)?.username ?? 'Jemand';
      toast(`${from} lädt dich zu einem Spiel ein`, {
        id: `invite-${inviteId}`,
        duration: 30_000,
        action: {
          label: 'Mitspielen',
          onClick: async () => {
            const res = await respondInviteAction(inviteId, true);
            if (res.ok && res.data.code) router.push(`/spiel/${res.data.code}`);
            else if (!res.ok) toast.error(res.error);
          },
        },
        cancel: {
          label: 'Ablehnen',
          onClick: () => { void respondInviteAction(inviteId, false).then(() => router.refresh()); },
        },
      });
    }

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const ch = supabase.channel(`invites:${me}`);
      channel = ch;
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'game_invites', filter: `to_id=eq.${me}` },
        (payload) => {
          const row = payload.new as { id?: string; status?: string };
          if (row?.id && row.status === 'pending') void show(row.id);
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [me, router, supabase]);

  return null;
}
