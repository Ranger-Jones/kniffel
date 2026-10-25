# Kniffel v2 – Mobile, Ladezustände, Emojis, Chat, Zeitlimit

Datum: 2026-10-25 · baut auf `2026-10-25-kniffel-design.md` auf.

## Ziel

Das Spiel fühlt sich auf dem Handy rund an, Seitenwechsel geben sofort Rückmeldung, Reaktionen sind persönlicher, Runden können optional per Chat begleitet und per Zeitlimit getaktet werden.

## Vom Nutzer festgelegt

- Komplett auf Mobile optimieren; „Deine Bilanz“-Werte (z. B. „100 %“) einzeilig; Teilnehmerliste im Spiel nie abgeschnitten.
- Ladeanimation, wenn ein Seitenwechsel nicht sofort fertig ist.
- Emojis: größere Auswahl, Schnellwahl (6) anpassbar, **im Account gespeichert**.
- Chat optional, **Host schaltet pro Spiel an/aus** (Lobby); jeder kann ihn für sich einklappen.
- Zeitlimit pro Zug: **Aus, 30 s, 60 s, 90 s, 2 Min** (Host, Lobby). Bei Ablauf: **bestes Feld automatisch** – noch nicht gewürfelt → einmal würfeln, dann freies Feld mit den meisten Punkten (Gleichstand: erstes in Reihenfolge Einser → Chance).

## Annahmen

- Standard: Chat an, Zeitlimit aus. Revanche übernimmt beide Einstellungen.
- Einstellungen nur in der Lobby änderbar.
- Chat in Lobby, Spiel und Ergebnis; Nachrichten 1–300 Zeichen, max. 1 pro Sekunde pro Spieler; nur aktive Mitspieler schreiben; beim Ausschalten bleiben Nachrichten gespeichert, werden aber nicht angezeigt.
- Der Ablauf eines Zuges wird von irgendeinem aktiven Mitspieler-Client gemeldet; der Server prüft mit eigener Uhr. Sind alle offline, passiert nichts (Host-Funktionen „Überspringen/Entfernen“ bleiben).
- Emoji-Katalog: 60 handverlesene Emojis; Standard-Schnellwahl = bisherige 6 (🎉 😂 😱 🔥 👏 😭).
- „Abmelden“ auf dem Handy über die eigene Profilseite (Kopfzeile: Freunde, Bestenliste, Avatar).

## Design

**Engine (`src/lib/kniffel/engine.ts`)**
- `GameState.settings: { chat: boolean; turnSeconds: TurnSeconds }` mit `TurnSeconds = null | 30 | 60 | 90 | 120`; `GameState.turnStartedAt: string | null` (ISO). Alte Spielstände ohne Felder → Standardwerte (`getSettings`).
- `applyAction(state, actor, action, rollDie, now = Date.now())`: jeder Zugbeginn (Start, Zugwechsel) setzt `turnStartedAt`.
- Neue Aktionen: `updateSettings` (nur Host, nur Lobby, validiert), `timeout` (aktives Mitglied, Zeitlimit aktiv, `now ≥ turnStartedAt + turnSeconds`; sonst Fehler „Die Zeit ist noch nicht abgelaufen.“).
- `createRematchState(hostId, ids, settings)` übernimmt Einstellungen.

**Datenbank (neue Migration)**
- `game_messages(id, game_id → games, user_id → profiles, body text check 1–300, created_at)`, RLS lesen: `is_game_member(game_id)`; Schreiben nur Service-Role; in `supabase_realtime`.
- `profiles.quick_emojis text[]` (null = Standard).

**Services / Actions**
- `chat-service`: `sendChatMessage` (Mitglied aktiv, Chat an, Länge, Rate-Limit), Lesen im Client via RLS (letzte 100).
- `profile-service.setQuickEmojis` (genau 6, eindeutig, aus Katalog).
- `gameAction` akzeptiert `updateSettings` (Version) und `timeout` (Zug-Token).

**UI**
- Lobby: Abschnitt „Einstellungen“ (Host: Schalter + Segmentauswahl; andere: Anzeige).
- Spiel: Countdown-Ring/Balken am Würfelteller; bei Ablauf+1,5 s meldet der Client `timeout` (still, ohne Fehler-Toast, mit Wiederholung).
- Chat: Desktop Karte rechts; Handy 💬-Button mit Ungelesen-Zähler öffnet Sheet; live per `postgres_changes` INSERT.
- Emoji-Leiste: 6 Favoriten + „+“ → Auswahl (Tipp sendet) mit Modus „Schnellwahl anpassen“ (6 wählen, speichern).
- Mobile: Kopfzeile kompakt, Spielerliste als umbrechendes Raster, Statistik-Kacheln `nowrap` + kleinere Werte, Tippflächen ≥ 44 px, kein horizontales Überlaufen bei 360/390 px.
- Ladezustände: `loading.tsx` (rollender Würfel + Platzhalter) für alle Routen; Pending-Zustände an Formular-Buttons.

## Tests

Engine: Einstellungen, Zugbeginn-Zeitstempel, Timeout (gewürfelt / nicht gewürfelt / Gleichstand / zu früh / ohne Limit), Revanche übernimmt Einstellungen. Integration: Chat-RLS, Chat aus, Länge, Rate-Limit, Schnellwahl-Validierung. E2E: Chat-Nachricht kommt an, Zeitlimit greift automatisch, Emoji-Auswahl; Mobile-Overflow-Skript für alle Seiten.

## Betrieb

Neue Migration wird mit `supabase db push` auf das verknüpfte Projekt übertragen (rein additiv), danach Push → Vercel-Deploy.
