'use client';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';

const OnlineContext = createContext<Set<string>>(new Set());

/**
 * Jeder Nutzer meldet sich in seinem eigenen privaten Kanal "online:<id>" an;
 * Freunde hören dort zu (Datenbankregel erlaubt nur angenommene Freunde).
 */
export function OnlinePresenceProvider({ me, friendIds, children }: { me: string; friendIds: string[]; children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [onlineFriends, setOnlineFriends] = useState<Set<string>>(new Set());
  const friendKey = [...friendIds].sort().join(',');

  useEffect(() => {
    let cancelled = false;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const own = supabase.channel(`online:${me}`, { config: { private: true, presence: { key: me } } });
      channels.push(own);
      own.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await own.track({});
      });
      for (const id of friendKey ? friendKey.split(',') : []) {
        const ch = supabase.channel(`online:${id}`, { config: { private: true } });
        channels.push(ch);
        ch.on('presence', { event: 'sync' }, () => {
          const here = Object.keys(ch.presenceState()).includes(id);
          setOnlineFriends((prev) => {
            if (prev.has(id) === here) return prev;
            const next = new Set(prev);
            if (here) next.add(id); else next.delete(id);
            return next;
          });
        }).subscribe();
      }
    })();
    return () => {
      cancelled = true;
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [me, friendKey, supabase]);

  const online = useMemo(() => new Set([me, ...onlineFriends]), [me, onlineFriends]);
  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

export function useOnlineUsers() {
  return useContext(OnlineContext);
}
