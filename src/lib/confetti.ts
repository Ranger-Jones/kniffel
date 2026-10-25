'use client';

const COLORS = ['#ff5a5f', '#3d8bff', '#19c99a', '#ffb020', '#8b5cf6', '#f062b0'];

export async function fireConfetti(kind: 'kniffel' | 'win') {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const confetti = (await import('canvas-confetti')).default;
  if (kind === 'kniffel') {
    confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, colors: COLORS });
    confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, colors: COLORS });
    return;
  }
  const end = Date.now() + 2500;
  (function frame() {
    confetti({ particleCount: 6, startVelocity: 25, spread: 360, ticks: 120, origin: { x: Math.random(), y: -0.05 }, colors: COLORS, gravity: 0.8 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
