'use client';
import { motion, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { cx } from '@/lib/cx';

/** Rotation des Würfelkörpers, damit die jeweilige Augenzahl nach vorne zeigt. */
const FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 }, 2: { x: -90, y: 0 }, 3: { x: 0, y: -90 },
  4: { x: 0, y: 90 }, 5: { x: 90, y: 0 }, 6: { x: 0, y: 180 },
};

/** Lage der Flächen am Würfel (gegenüberliegende Seiten ergeben 7). */
const FACE_TRANSFORM: Record<number, string> = {
  1: 'rotateY(0deg)', 6: 'rotateY(180deg)', 2: 'rotateX(90deg)',
  5: 'rotateX(-90deg)', 3: 'rotateY(90deg)', 4: 'rotateY(-90deg)',
};

/** Belegte Zellen im 3×3-Raster (1–9, zeilenweise). */
const PIPS: Record<number, number[]> = {
  1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 4, 7, 3, 6, 9],
};

const NAMES = ['', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs'];

function Face({ value, color }: { value: number; color: string }) {
  return (
    <span
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-[22%] p-[14%] [backface-visibility:hidden]"
      style={{
        transform: `${FACE_TRANSFORM[value]} translateZ(calc(var(--die) / 2))`,
        background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${color} 70%, white), ${color} 60%)`,
        boxShadow: `inset 0 -4px 0 color-mix(in srgb, ${color} 70%, black)`,
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {PIPS[value].includes(i + 1) && <span className="size-[78%] rounded-full bg-white shadow-[inset_0_2px_0_rgb(0_0_0/0.18)]" />}
        </span>
      ))}
    </span>
  );
}

interface DieProps {
  index: number;
  value: number | null;
  held: boolean;
  /** Erhöht sich bei jedem Wurf dieses Würfels – löst die Roll-Animation aus. */
  spins: number;
  color: string;
  disabled?: boolean;
  onToggle?: () => void;
}

export function Die({ index, value, held, spins, color, disabled, onToggle }: DieProps) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  useEffect(() => {
    if (spins === 0 || reduce || !scope.current) return;
    animate(scope.current, { y: [0, -30, 0] }, { duration: 0.5, ease: 'easeOut' });
  }, [spins, reduce, animate, scope]);
  const label = value ? `Würfel ${index + 1}: ${NAMES[value]}${held ? ', gehalten' : ''}` : `Würfel ${index + 1}: noch nicht gewürfelt`;

  if (value === null) {
    return (
      <span
        data-testid={`die-${index}`}
        aria-label={label}
        className="flex size-[var(--die)] items-center justify-center rounded-[22%] border-2 border-dashed border-white/25 font-display text-xl font-extrabold text-white/35"
      >
        ?
      </span>
    );
  }

  const face = FACE_ROTATION[value];
  const turns = spins * 720;
  return (
    <button
      type="button"
      data-testid={`die-${index}`}
      data-value={value}
      aria-label={label}
      aria-pressed={held}
      disabled={disabled}
      onClick={onToggle}
      className={cx(
        'relative size-[var(--die)] rounded-[22%] transition-transform duration-200 [perspective:600px]',
        held && '-translate-y-2.5',
        disabled ? 'cursor-default' : 'cursor-pointer',
      )}
    >
      <span ref={scope} className="absolute inset-0 [transform-style:preserve-3d]">
        <motion.span
          className="absolute inset-0 [transform-style:preserve-3d]"
          initial={spins > 0 && !reduce ? { rotateX: 0, rotateY: 0 } : false}
          animate={{ rotateX: face.x + turns, rotateY: face.y + turns }}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.2, 0.7, 0.3, 1] }}
        >
          {[1, 2, 3, 4, 5, 6].map((v) => <Face key={v} value={v} color={color} />)}
        </motion.span>
      </span>
      {held && (
        <span
          className="pointer-events-none absolute -inset-1.5 rounded-[26%] ring-[3px] ring-white"
          aria-hidden
        />
      )}
    </button>
  );
}
