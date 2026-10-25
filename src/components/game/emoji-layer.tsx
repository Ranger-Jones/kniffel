'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { EmojiEvent } from '@/hooks/use-game';
import type { ProfileLite } from '@/server/social-service';

function seededX(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return 8 + (h % 84);
}

export function EmojiLayer({ emojis, profiles, me }: { emojis: EmojiEvent[]; profiles: Record<string, ProfileLite>; me: string }) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState<Set<string>>(new Set());
  const visible = emojis.filter((e) => !done.has(e.id));

  useEffect(() => {
    if (visible.length === 0) return;
    const t = setTimeout(() => setDone((d) => new Set([...d, ...visible.map((e) => e.id)])), 2600);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <AnimatePresence>
        {visible.map((e) => (
          <motion.div
            key={e.id}
            className="absolute bottom-24 flex flex-col items-center"
            style={{ left: `${seededX(e.id)}%` }}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={reduce ? { opacity: [0, 1, 1, 0] } : { y: -420, opacity: [0, 1, 1, 0], scale: 1.2, rotate: [0, -10, 10, -6, 0] }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
          >
            <span className="text-5xl drop-shadow">{e.emoji}</span>
            <span className="mt-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-bold text-white">
              {e.from === me ? 'Du' : profiles[e.from]?.username ?? ''}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
