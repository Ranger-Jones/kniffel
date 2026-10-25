'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { isAllowedEmoji } from '@/lib/emojis';
import type { GameAction, GameState } from '@/lib/kniffel/engine';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { gameAction } from '@/server/game-actions';
import { STALE } from '@/server/result';
import type { ProfileLite } from '@/server/social-service';

export interface GameSnapshot { id: string; code: string; version: number; state: GameState; rematchGameId: string | null }
export interface EmojiEvent { id: string; emoji: string; from: string }

type Row = { id: string; code: string; version: number; state: unknown; rematch_game_id: string | null };
const toSnapshot = (r: Row): GameSnapshot => ({
  id: r.id, code: r.code, version: r.version, state: r.state as GameState, rematchGameId: r.rematch_game_id,
});

export function useGame(initial: GameSnapshot, initialProfiles: Record<string, ProfileLite>, me: string) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [game, setGame] = useState<GameSnapshot | null>(initial);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [online, setOnline] = useState<Set<string>>(() => new Set([me]));
  const [offlineSince, setOfflineSince] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(true);
  const [emojis, setEmojis] = useState<EmojiEvent[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const gameRef = useRef(game);
  const lastEmoji = useRef(0);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const apply = useCallback((next: GameSnapshot) => {
    setGame((cur) => (!cur || next.version > cur.version || next.rematchGameId !== cur.rematchGameId ? next : cur));
  }, []);

  const refetch = useCallback(async () => {
    const { data } = await supabase.from('games')
      .select('id, code, version, state, rematch_game_id').eq('id', initial.id).maybeSingle();
    if (data) apply(toSnapshot(data));
    else setGame(null);
  }, [apply, initial.id, supabase]);

  // Profile neu beigetretener Spieler nachladen.
  const playerIds = game?.state.players.map((p) => p.id).join(',') ?? '';
  useEffect(() => {
    const missing = playerIds.split(',').filter((id) => id && !profiles[id]);
    if (missing.length === 0) return;
    supabase.from('profiles').select('id, username, avatar_url').in('id', missing).then(({ data }) => {
      if (data) setProfiles((p) => ({ ...p, ...Object.fromEntries(data.map((x) => [x.id, x])) }));
    });
  }, [playerIds, profiles, supabase]);

  useEffect(() => {
    const channel = supabase.channel(`game:${initial.id}`, { config: { private: true, presence: { key: me } } });
    channelRef.current = channel;
    supabase.realtime.setAuth();
    channel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${initial.id}` },
        (payload) => apply(toSnapshot(payload.new as Row)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'games', filter: `id=eq.${initial.id}` },
        () => setGame(null))
      .on('broadcast', { event: 'emoji' }, ({ payload }) => {
        const e = payload as Partial<EmojiEvent> | null;
        const isPlayer = gameRef.current?.state.players.some((p) => p.id === e?.from);
        if (!e || typeof e.id !== 'string' || !isAllowedEmoji(e.emoji) || !isPlayer) return;
        setEmojis((list) => [...list.slice(-15), { id: e.id!, emoji: e.emoji!, from: e.from! }]);
      })
      .on('presence', { event: 'sync' }, () => {
        const ids = new Set(Object.keys(channel.presenceState()));
        ids.add(me);
        setOnline(ids);
        setOfflineSince((prev) => {
          const now = Date.now();
          const next: Record<string, number> = {};
          for (const p of gameRef.current?.state.players ?? []) {
            if (!ids.has(p.id)) next[p.id] = prev[p.id] ?? now;
          }
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          await channel.track({ at: Date.now() });
          await refetch();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnected(false);
        }
      });
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [apply, initial.id, me, refetch, supabase]);

  const dispatch = useCallback(async (action: GameAction, opts: { versioned?: boolean } = {}) => {
    const cur = gameRef.current;
    if (!cur) return false;
    const res = await gameAction(cur.id, action, opts.versioned ? cur.version : undefined);
    if (res.ok) {
      apply({ ...cur, version: res.data.version, state: res.data.state });
      return true;
    }
    if (res.error !== STALE) toast.error(res.error);
    return false;
  }, [apply]);

  const sendEmoji = useCallback((emoji: string) => {
    if (Date.now() - lastEmoji.current < 1000) return;
    lastEmoji.current = Date.now();
    const payload: EmojiEvent = { id: crypto.randomUUID(), emoji, from: me };
    setEmojis((e) => [...e.slice(-15), payload]);
    channelRef.current?.send({ type: 'broadcast', event: 'emoji', payload });
  }, [me]);

  return { game, profiles, online, offlineSince, connected, emojis, sendEmoji, dispatch };
}

export type UseGame = ReturnType<typeof useGame>;
