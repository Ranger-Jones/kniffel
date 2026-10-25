'use client';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Card } from '@/components/ui/card';
import type { UseChat } from '@/hooks/use-chat';
import { useLocalFlag } from '@/hooks/use-local-flag';
import { cx } from '@/lib/cx';
import type { ProfileLite } from '@/server/social-service';

const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const MAX = 300;

interface BoxProps { chat: UseChat; profiles: Record<string, ProfileLite>; me: string; seatColors: Record<string, string>; autoFocus?: boolean }

export function ChatBox({ chat, profiles, me, seatColors, autoFocus }: BoxProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const atBottom = useRef(true);
  const [missed, setMissed] = useState(0);
  const lastMine = chat.messages.at(-1)?.user_id === me;

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    if (atBottom.current || lastMine) {
      el.scrollTo({ top: el.scrollHeight });
    } else {
      // Beim Zurücklesen nicht wegspringen – stattdessen Hinweis anzeigen.
      const t = setTimeout(() => setMissed((n) => n + 1), 0);
      return () => clearTimeout(t);
    }
  }, [chat.messages.length, lastMine]);

  function onScroll() {
    const el = list.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom.current && missed) setMissed(0);
  }

  function jumpDown() {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
    setMissed(0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      if (await chat.send(body)) setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ol ref={list} onScroll={onScroll} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3" aria-live="polite">
        {chat.messages.length === 0 && <li className="m-auto text-sm text-ink-soft">Noch keine Nachrichten. Sag Hallo!</li>}
        {chat.messages.map((m) => {
          const mine = m.user_id === me;
          return (
            <li key={m.id} className={cx('flex items-end gap-2', mine && 'flex-row-reverse')}>
              <Avatar profile={profiles[m.user_id]} size="xs" ring={seatColors[m.user_id]} />
              <div className={cx('max-w-[78%] rounded-2xl px-3 py-2', mine ? 'rounded-br-md bg-sky text-white' : 'rounded-bl-md bg-mist')}>
                {!mine && <p className="text-xs font-bold text-ink-soft">{profiles[m.user_id]?.username ?? '…'}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cx('text-right text-[10px]', mine ? 'text-white/70' : 'text-ink-soft')}>{timeFmt.format(new Date(m.created_at))}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {missed > 0 && (
        <button
          type="button"
          onClick={jumpDown}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-sky px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_rgb(0_0_0/0.15)]"
        >
          Neue Nachrichten ↓
        </button>
      )}
      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX))}
          placeholder="Nachricht schreiben"
          aria-label="Nachricht schreiben"
          maxLength={MAX}
          autoFocus={autoFocus}
          className="h-11 min-w-0 flex-1 rounded-2xl bg-mist/60 px-4 ring-2 ring-inset ring-line outline-none focus:bg-paper focus:ring-sky"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="h-11 shrink-0 rounded-2xl bg-sun px-4 font-display font-bold text-ink disabled:opacity-45"
        >
          Senden
        </button>
      </form>
    </div>
  );
}

/**
 * Zählt Nachrichten anderer, die live eingegangen sind, während der Chat nicht sichtbar war.
 * Der beim Laden geholte Verlauf gilt als gelesen (sonst zählt jedes Neuladen alles erneut).
 */
function useUnread(chat: UseChat, me: string, visible: boolean) {
  const others = chat.messages.filter((m) => m.user_id !== me).length;
  const [seen, setSeen] = useState<number | null>(null);
  if (chat.loaded && seen === null) setSeen(others);
  if (visible && seen !== null && seen !== others) setSeen(others);
  return seen === null ? 0 : Math.max(0, others - seen);
}

type CardProps = BoxProps;

/** Einklappbare Chat-Karte (Lobby, Ergebnis, Desktop im Spiel). */
export function ChatCard(props: CardProps & { className?: string }) {
  const [collapsed, setCollapsed] = useLocalFlag('kniffel:chat-collapsed');
  const unread = useUnread(props.chat, props.me, !collapsed);
  return (
    <Card className={cx('flex flex-col p-0', props.className)}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        className="flex min-h-12 items-center justify-between gap-2 px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-xl font-extrabold">
          💬 Chat
          {unread > 0 && <span className="rounded-full bg-tomato px-2 text-sm text-white">{unread}</span>}
        </span>
        <span className="text-sm font-bold text-ink-soft">{collapsed ? 'Öffnen' : 'Einklappen'}</span>
      </button>
      {!collapsed && (
        <div className="h-80 border-t border-line">
          <ChatBox {...props} />
        </div>
      )}
    </Card>
  );
}

/** Handy im Spiel: Button mit Zähler, der den Chat als Leiste von unten öffnet. */
export function ChatSheetButton(props: BoxProps) {
  const [open, setOpen] = useState(false);
  const unread = useUnread(props.chat, props.me, open);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `Chat öffnen, ${unread} neue Nachrichten` : 'Chat öffnen'}
        className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-paper text-2xl ring-2 ring-line"
      >
        💬
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-tomato px-1 text-xs font-bold text-white">{unread}</span>
        )}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Chat">
        {open && <ChatBox {...props} autoFocus />}
      </BottomSheet>
    </>
  );
}
