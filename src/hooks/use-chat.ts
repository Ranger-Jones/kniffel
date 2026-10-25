'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { sendChatAction } from '@/server/chat-actions';

export interface ChatMessage { id: string; user_id: string; body: string; created_at: string }

export function useChat(gameId: string, enabled: boolean) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const add = (m: ChatMessage) => setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m].slice(-200)));
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase.channel(`chat:${gameId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_messages', filter: `game_id=eq.${gameId}` },
          (payload) => add(payload.new as ChatMessage))
        .subscribe(async (status) => {
          if (status !== 'SUBSCRIBED') return;
          const { data } = await supabase.from('game_messages').select('id, user_id, body, created_at')
            .eq('game_id', gameId).order('created_at', { ascending: false }).limit(100);
          if (data && !cancelled) setMessages((list) => {
            const merged = new Map([...data.reverse(), ...list].map((m) => [m.id, m]));
            return [...merged.values()].sort((x, y) => x.created_at.localeCompare(y.created_at));
          });
        });
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [enabled, gameId, supabase]);

  const send = useCallback(async (body: string) => {
    const res = await sendChatAction(gameId, body);
    if (!res.ok) toast.error(res.error);
    return res.ok;
  }, [gameId]);

  return { enabled, messages, send };
}

export type UseChat = ReturnType<typeof useChat>;
