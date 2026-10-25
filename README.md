# Kniffel

Online-Kniffel für Freunde: Accounts, Live-Räume für 1–6 Spieler, Freundesliste mit Online-Status, Einladungen, Emoji-Reaktionen, Revanche, Statistiken, Spielverlauf und Bestenliste.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres, Realtime, Storage) · Vitest · Playwright

Wie du das Spiel online stellst, steht in **[ANLEITUNG.md](ANLEITUNG.md)**.

## Lokal entwickeln

Voraussetzungen: Node 24, pnpm, Docker Desktop (läuft).

```bash
pnpm install
pnpm db:start      # Supabase lokal starten (Docker)
pnpm env:local     # schreibt .env.local mit den lokalen Schlüsseln
pnpm dev           # http://localhost:3000
```

Supabase Studio (lokale Datenbank ansehen): http://127.0.0.1:54323

## Tests

```bash
pnpm test              # Unit-Tests: Wertung + Spiel-Engine
pnpm test:integration  # gegen lokales Supabase: Zugriffsregeln, Services, Realtime-Kanäle
pnpm test:e2e          # Playwright: zwei Spieler spielen ein komplettes Spiel
pnpm lint && pnpm typecheck
```

## Aufbau

```
src/lib/kniffel/      Regeln & Spiel-Engine (reines TypeScript, voll getestet)
src/server/*-service  Spiel-, Freundes- und Profil-Logik (Service-Role, prüft jede Aktion)
src/server/*-actions  Server Actions (dünne Hülle: Login prüfen, Eingaben validieren)
src/hooks/use-game    Live-Spielzustand, Presence, Emojis
src/components/       UI (Würfel, Spielzettel, Lobby, Ergebnis …)
src/app/              Seiten
supabase/migrations/  Schema, Row Level Security, commit_game, Statistik-Views, Storage, Realtime-Regeln
```

**Fairness:** Clients lesen den Spielstand nur. Jede Aktion läuft als Server Action, gewürfelt wird auf dem Server (`crypto.randomInt`), gespeichert wird atomar mit Versionsprüfung, damit ein Doppelklick nur einmal zählt.

Design und Plan: `docs/superpowers/specs/` und `docs/superpowers/plans/`.
