import { DieMark } from './logo';

/** Sofort sichtbarer Ladezustand bei Seitenwechseln (loading.tsx). */
export function PageLoading({ cards = 3, label = 'Lädt …' }: { cards?: number; label?: string }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pb-12" aria-busy="true">
      <div role="status" className="flex items-center gap-3">
        <DieMark className="size-10 motion-safe:animate-[die-roll_0.9s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
        <span className="font-display text-lg font-extrabold text-ink-soft sm:text-2xl">{label}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="h-36 rounded-[1.5rem] bg-paper/70 ring-2 ring-line motion-safe:animate-pulse" />
        ))}
      </div>
    </main>
  );
}
