'use client';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';

const OnlineContext = createContext<Set<string>>(new Set());

export function OnlinePresenceProvider({ me, children }: { me: string; children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [online, setOnline] = useState<Set<string>>(() => new Set([me]));

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const ch = supabase.channel('online', { config: { private: true, presence: { key: me } } });
      channel = ch;
      ch.on('presence', { event: 'sync' }, () => setOnline(new Set([me, ...Object.keys(ch.presenceState())])))
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') await ch.track({});
        });
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [me, supabase]);

  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

export function useOnlineUsers() {
  return useContext(OnlineContext);
}
