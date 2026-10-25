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
  const [kickNotice, setKickNotice] = useState(false);
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
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // Private Kanäle brauchen das Access-Token, bevor abonniert wird.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const ch = supabase.channel(`game:${initial.id}`, { config: { private: true, presence: { key: me } } });
      channel = ch;
      channelRef.current = ch;
      ch
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${initial.id}` },
          (payload) => apply(toSnapshot(payload.new as Row)))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'games', filter: `id=eq.${initial.id}` },
          () => setGame(null))
        .on('broadcast', { event: 'emoji' }, ({ payload }) => {
          const e = payload as Partial<EmojiEvent> | null;
          const isPlayer = gameRef.current?.state.players.some((p) => p.id === e?.from && !p.left);
          if (!e || typeof e.id !== 'string' || !isAllowedEmoji(e.emoji) || !isPlayer) return;
          setEmojis((list) => [...list.slice(-15), { id: e.id!, emoji: e.emoji!, from: e.from! }]);
        })
        .on('broadcast', { event: 'kicked' }, ({ payload }) => {
          if ((payload as { userId?: string } | null)?.userId !== me) return;
          // Nur als Hinweis nutzen und per Nachladen prüfen – Broadcasts können von Mitspielern stammen.
          setKickNotice(true);
          void refetch();
        })
        .on('presence', { event: 'sync' }, () => {
          const ids = new Set(Object.keys(ch.presenceState()));
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
            await ch.track({ at: Date.now() });
            await refetch();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnected(false);
          }
        });
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [apply, initial.id, me, refetch, supabase]);

  /**
   * versioned: Aktion gilt nur für genau diesen Spielstand (Start, Entfernen).
   * turn: Aktion gilt nur für diesen Zug/Wurf (Würfeln, Eintragen, Überspringen) – gegen Doppelklicks,
   *       ohne dass ein gerade gespeichertes Halten sie verwirft.
   */
  const dispatch = useCallback(async (action: GameAction, opts: { versioned?: boolean; turn?: boolean } = {}) => {
    const cur = gameRef.current;
    if (!cur) return false;
    const expected = opts.turn
      ? { seat: cur.state.currentSeat, rollsLeft: cur.state.rollsLeft }
      : opts.versioned ? cur.version : undefined;
    const res = await gameAction(cur.id, action, expected);
    if (res.ok) {
      apply({ ...cur, version: res.data.version, state: res.data.state });
      return true;
    }
    // Veralteter Stand (z. B. verpasstes Realtime-Update): still nachladen, damit der nächste Klick klappt.
    if (res.error === STALE) await refetch();
    else toast.error(res.error);
    return false;
  }, [apply, refetch]);

  const sendEmoji = useCallback((emoji: string) => {
    if (Date.now() - lastEmoji.current < 1000) return;
    lastEmoji.current = Date.now();
    const payload: EmojiEvent = { id: crypto.randomUUID(), emoji, from: me };
    setEmojis((e) => [...e.slice(-15), payload]);
    channelRef.current?.send({ type: 'broadcast', event: 'emoji', payload });
  }, [me]);

  return { game, profiles, online, offlineSince, connected, emojis, kickNotice, sendEmoji, dispatch };
}

export type UseGame = ReturnType<typeof useGame>;
