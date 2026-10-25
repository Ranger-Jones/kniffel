'use client';
import { cx } from '@/lib/cx';
import { TURN_SECONDS_OPTIONS, type GameSettings, type TurnSeconds } from '@/lib/kniffel/engine';

export function turnSecondsLabel(v: TurnSeconds) {
  if (v === null) return 'Aus';
  return v === 120 ? '2 Min' : `${v} s`;
}

interface Props {
  settings: GameSettings;
  isHost: boolean;
  onChange: (patch: Partial<GameSettings>) => void;
}

export function GameSettingsPanel({ settings, isHost, onChange }: Props) {
  return (
    <section className="flex flex-col gap-4" aria-label="Einstellungen">
      <h2 className="text-2xl font-extrabold">Einstellungen</h2>
      <div className="flex items-center justify-between gap-3">
        <span id="chat-label" className="font-bold">Chat im Spiel</span>
        {isHost ? (
          <button
            type="button"
            role="switch"
            aria-checked={settings.chat}
            aria-labelledby="chat-label"
            onClick={() => onChange({ chat: !settings.chat })}
            className={cx('relative h-8 w-14 shrink-0 rounded-full transition-colors', settings.chat ? 'bg-mint' : 'bg-line')}
          >
            <span className={cx('absolute top-1 size-6 rounded-full bg-white shadow transition-all', settings.chat ? 'left-7' : 'left-1')} />
          </button>
        ) : (
          <span className="font-semibold text-ink-soft">{settings.chat ? 'An' : 'Aus'}</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span id="timer-label" className="font-bold">Zeit pro Zug</span>
        {isHost ? (
          <div role="radiogroup" aria-labelledby="timer-label" className="grid grid-cols-5 gap-1 rounded-2xl bg-mist p-1">
            {TURN_SECONDS_OPTIONS.map((v) => (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={settings.turnSeconds === v}
                onClick={() => onChange({ turnSeconds: v })}
                className={cx(
                  'min-h-11 rounded-xl px-1 text-sm font-bold transition-colors',
                  settings.turnSeconds === v ? 'bg-paper text-ink shadow-[0_2px_0_var(--color-line)]' : 'text-ink-soft hover:text-ink',
                )}
              >
                {turnSecondsLabel(v)}
              </button>
            ))}
          </div>
        ) : (
          <span className="font-semibold text-ink-soft">{turnSecondsLabel(settings.turnSeconds)}</span>
        )}
        {settings.turnSeconds !== null && (
          <p className="text-sm text-ink-soft">Läuft die Zeit ab, wird automatisch das beste freie Feld eingetragen.</p>
        )}
      </div>
    </section>
  );
}
