# Kniffel Online – Design-Spec

Datum: 2026-10-25

## Ziel

Ein Online-Kniffel-Spiel im Browser, das der Nutzer mit seinen Freunden spielt. Jeder hat einen Account, Spiele laufen in Echtzeit in Räumen (1–6 Spieler), Statistiken, Spielverlauf, Bestenliste und Freundesliste werden dauerhaft gespeichert. Die Optik ist bunt und verspielt, aber aufgeräumt, und funktioniert auf Handy und Desktop. Gehostet auf Vercel (App) und Supabase (Auth, DB, Realtime, Storage), jeweils im Free Tier.

**Erfolgskriterien**
- Zwei bis sechs Leute können sich registrieren, einen Raum per Link/Code oder Einladung betreten und ein komplettes Spiel bis zum Ergebnis spielen.
- Kein Spieler kann Würfel oder Punkte über den Browser manipulieren.
- Neu laden / kurzer Verbindungsabbruch verliert nichts.
- Statistiken, Verlauf und Bestenliste stimmen nach jedem beendeten Spiel.

## Vom Nutzer festgelegt

- Accounts mit E-Mail + Passwort, **keine** E-Mail-Bestätigung
- Hosting: Vercel + Supabase
- Klassische Kniffel-Regeln (kein Extra-Kniffel-Bonus, keine Joker-Regel)
- Extras: Würfel-Animationen, Emoji-Reaktionen, Reconnect, Revanche-Button
- Gespeichert: Profil mit Statistiken, Spielverlauf, Bestenliste, Freundesliste
- 1–6 Spieler pro Spiel
- Avatar per Bild-Upload
- Stil: bunt & verspielt
- Kein Zeitlimit; Host kann Züge offline gegangener Spieler überspringen bzw. Spieler entfernen

## Annahmen (vom Assistenten getroffen)

- UI-Sprache Deutsch.
- Nur ein (helles, buntes) Theme, kein Dark Mode.
- Login nur über E-Mail (nicht Benutzername).
- Ein laufendes Spiel kann man nicht nachträglich betreten; nur die Lobby.
- Gleichstand: gleiche Punktzahl = gleicher Platz; Platz 1 zählt für alle Betroffenen als Sieg.
- Der „Überspringen“-Timer (30 s offline) wird im Client des Hosts über Presence gemessen; der Server prüft nur, dass der Aufrufer Host ist. Für eine Freundesrunde ausreichend.

## Architektur

| Teil | Technik |
|---|---|
| App | Next.js (App Router), TypeScript, Tailwind CSS v4, gehostet auf Vercel |
| Auth | Supabase Auth (E-Mail/Passwort), Session per `@supabase/ssr` Cookies |
| DB | Supabase Postgres mit Row Level Security |
| Live | Supabase Realtime: `postgres_changes` (Spielzustand, Einladungen), Broadcast (Emojis), Presence (online) |
| Dateien | Supabase Storage, Bucket `avatars` (öffentlich lesbar, max. 2 MB, nur Bilder) |
| Animation | `motion` (Würfel, Übergänge), `canvas-confetti` (Kniffel, Spielende) |

### Vertrauensmodell

- Clients **lesen** Spieldaten direkt aus Supabase (RLS: nur Spiele, in denen man Mitglied ist).
- Clients **schreiben nie** Spieldaten. Alle Spielaktionen laufen als Next.js Server Actions:
  1. Nutzer aus der Session ermitteln (`supabase.auth.getUser()`).
  2. Aktuellen Spielzustand laden.
  3. Aktion über die reine Spiel-Engine anwenden (prüft: ist dran, Zug erlaubt).
  4. Ergebnis über die Postgres-Funktion `commit_game` atomar speichern, mit optimistischer Sperre (`expected_version`). Nicht-idempotente Aktionen (Würfeln, Eintragen, Überspringen, Entfernen, Starten) schickt der Client mit seiner bekannten Version; weicht sie ab, wird die Aktion verworfen (schützt vor Doppelklicks). Idempotente Aktionen (Beitreten, Verlassen, Halten) werden bei Konflikt einmal wiederholt.
- Würfeln mit `crypto.randomInt(1, 7)` auf dem Server.
- Der Service-Role-Key existiert nur serverseitig (Env-Variable ohne `NEXT_PUBLIC_`).

### Einheiten

1. **`src/lib/kniffel/`** – reine Logik, keine Abhängigkeiten
   - `scoring.ts`: Punkte pro Feld für 5 Würfel, Oben-Summe, Bonus, Gesamt.
   - `engine.ts`: Spielzustand als Datentyp + `applyAction(state, actorId, action, rng)` → neuer Zustand oder Fehler. Aktionen: `join`, `leave`, `start`, `roll`, `setHold` (idempotent: Index + gehalten ja/nein), `score`, `skipTurn`, `removePlayer`. Berechnet Spielende und Platzierungen.
   - Komplett durch Vitest abgedeckt.
2. **`src/lib/supabase/`** – Clients (Browser, Server mit Cookies, Service-Role), generierte DB-Typen.
3. **`src/server/`** – Server Actions: Auth, Profil/Avatar, Freunde, Einladungen, Spiel (erstellen, beitreten, Aktionen, Revanche). Dünne Schicht: laden → Engine → `commit_game`.
4. **`src/components/`** – UI-Bausteine (Würfel, Spielzettel, Avatar, Spielerleiste, Emoji-Leiste, Buttons, Karten, Toasts).
5. **`src/app/`** – Seiten.
6. **`supabase/`** – `config.toml` (lokal), Migrationen (Schema, RLS, Funktionen, Views, Storage-Policies, Realtime-Publication).

## Datenmodell

```
profiles        id (= auth.users.id) PK, username citext unique (3–20, [A-Za-z0-9_]),
                avatar_url text null, created_at
friendships     id PK, requester_id → profiles, addressee_id → profiles,
                status ('pending'|'accepted'), created_at; unique(least,greatest) Paar
games           id uuid PK, code text unique (6 Zeichen, ohne 0/O/1/I),
                host_id → profiles, status ('lobby'|'playing'|'finished'),
                state jsonb (siehe Engine), version int, rematch_game_id → games null,
                created_at, started_at, finished_at
game_players    game_id → games, user_id → profiles, seat int, left_game boolean,
                scores jsonb, total int null, place int null, PK(game_id,user_id)
game_invites    id PK, game_id → games, from_id, to_id → profiles,
                status ('pending'|'accepted'|'declined'), created_at
```

**`games.state`** (Quelle der Wahrheit während des Spiels):
```
{ status, hostId, players: [{ id, left }], currentSeat, dice: [5 Zahlen|null], held: [5 bool],
  rollsLeft (0–3), scores: { [userId]: { [feld]: number|null } } }
```

**`commit_game(p_game_id, p_expected_version, p_status, p_host_id, p_state, p_players jsonb)`** – `security definer`, nur für `service_role` ausführbar. Aktualisiert `games` nur wenn `version = p_expected_version` (sonst Fehler), erhöht `version`, setzt `started_at`/`finished_at` beim Statuswechsel und upsertet `game_players` (seat, left, scores, total, place) in derselben Transaktion.

**Views**
- `player_stats`: pro Profil aus beendeten Spielen (`left_game = false`): Spiele, Siege (`place = 1`), Bestwert, Durchschnitt (gerundet), Anzahl Kniffel (Feld `kniffel = 50`).
- `leaderboard`: `player_stats` mit ≥ 1 Spiel, sortiert nach Siegen, dann Bestwert.

**RLS (Kurzfassung)**
- `profiles`: lesen für eingeloggte; ändern nur eigene Zeile (`username`, `avatar_url`). Insert per Trigger bei Registrierung aus `raw_user_meta_data.username`.
- `friendships`: lesen/löschen, wenn beteiligt; anlegen als `requester`; Status ändern nur als `addressee`.
- `games`, `game_players`: lesen, wenn Mitglied (Helper `is_game_member(game_id)`, `security definer`). Kein Schreiben für Clients.
- `game_invites`: lesen, wenn `from` oder `to`; Status ändern nur als `to`. Anlegen über Server Action.
- Storage `avatars`: lesen öffentlich; schreiben/löschen nur im Ordner `<user_id>/`.
- Realtime-Publication: `games`, `game_players`, `game_invites`, `friendships`.

## Spielregeln (klassisch)

| Feld | Wertung |
|---|---|
| Einer … Sechser | Summe der Würfel mit der Augenzahl |
| Bonus | 35, wenn Einer–Sechser ≥ 63 |
| Dreierpasch | Summe aller Würfel, wenn ≥ 3 gleiche, sonst 0 |
| Viererpasch | Summe aller Würfel, wenn ≥ 4 gleiche, sonst 0 |
| Full House | 25 bei genau 3 gleichen + 2 gleichen (anderer Wert); fünf gleiche zählen nicht |
| Kleine Straße | 30 bei 4 aufeinanderfolgenden Augenzahlen |
| Große Straße | 40 bei 5 aufeinanderfolgenden |
| Kniffel | 50 bei 5 gleichen |
| Chance | Summe aller Würfel |

- Pro Zug bis zu 3 Würfe; vor dem Eintragen muss mindestens einmal gewürfelt werden. Gehaltene Würfel werden nicht neu gewürfelt. Halten erst nach dem ersten Wurf möglich.
- Jedes Feld genau einmal; 0 eintragen („streichen“) ist erlaubt.
- Spielende, wenn alle nicht entfernten Spieler 13 Felder gefüllt haben.

## Abläufe

**Registrierung/Login** – E-Mail, Passwort (≥ 8 Zeichen), Benutzername. Fehler auf Deutsch („Benutzername vergeben“ usw.). Nach Login → Dashboard.

**Spiel erstellen / beitreten** – „Neues Spiel“ legt Spiel in `lobby` an, Ersteller = Host, Weiterleitung auf `/spiel/[code]`. Beitreten per Link oder Code-Eingabe: nur in `lobby` und < 6 Spieler; bereits Mitglied → einfach anzeigen. Lobby verlassen: Spieler entfernt; verlässt der Host, wird der nächste Spieler Host; letzter Spieler → Spiel gelöscht.

**Einladen** – In der Lobby können alle Mitglieder Freunde einladen. Der Eingeladene sieht die Einladung live (Dashboard + Toast überall) und kann annehmen (→ beitreten) oder ablehnen.

**Spielen** – Host startet (≥ 1 Spieler). Wer dran ist, sieht „Würfeln“ (mit verbleibenden Würfen) und kann Würfel antippen zum Halten. Der Spielzettel zeigt für alle Spieler die Werte; für den aktiven Spieler eine Vorschau der möglichen Punkte in freien Feldern. Antippen eines freien Feldes trägt ein (bei 0 Punkten mit Rückfrage „Feld streichen?“). Alle anderen sehen Würfe und Halten live.

**Offline / Reconnect** – Presence pro Spiel zeigt, wer online ist. Neu laden lädt einfach den Zustand. Ist der aktive Spieler ≥ 30 s offline, sieht der Host „Zug überspringen“ (trägt 0 im ersten freien Feld der Reihenfolge Einer → Chance ein) und „Spieler entfernen“ (Spieler wird `left`, zählt nicht für Platzierung und Statistik). Jeder Spieler kann ein laufendes Spiel selbst verlassen (= entfernt). Wird der Host entfernt, wird der nächste aktive Spieler Host. Bleibt kein aktiver Spieler übrig, wird das Spiel beendet.

**Ende & Revanche** – Ergebnis mit Podest, Konfetti, Endständen. „Revanche“ (alle aktiven Spieler können klicken): erzeugt ein neues Spiel in `lobby` mit allen aktiven Spielern, Klicker = Host, setzt `rematch_game_id`. Ist schon eine Revanche vorhanden, wird diese genutzt. Alle Clients im alten Spiel sehen die Änderung und werden weitergeleitet.

**Emojis** – Feste Auswahl 🎉 😂 😱 🔥 👏 😭 als Broadcast im Spielkanal; schweben mit Absendername über dem Bildschirm. Client-seitig max. 1 pro Sekunde.

**Freunde** – Suche nach Benutzername (Präfix), Anfrage senden, annehmen/ablehnen, entfernen. Online-Status der Freunde über einen globalen Presence-Kanal `online`.

**Profil** – Eigenes Profil: Avatar hochladen (JPG/PNG/WebP, ≤ 2 MB, client-seitig auf 256×256 zugeschnitten), Benutzername ändern. Jedes Profil: Statistiken + letzte 20 beendete Spiele mit Endständen aller Mitspieler.

## Seiten

| Route | Inhalt |
|---|---|
| `/` | ausgeloggt: Landing mit Login/Registrieren; eingeloggt: Dashboard (Neues Spiel, Code beitreten, Einladungen, Freunde online, eigene Kurzstatistik, laufende Spiele) |
| `/login`, `/registrieren` | Formulare |
| `/spiel/[code]` | Lobby → Spiel → Ergebnis |
| `/profil/[username]` | Profil, Statistik, Verlauf |
| `/freunde` | Freundesliste, Anfragen, Suche |
| `/bestenliste` | Rangliste |

Nicht eingeloggte Nutzer werden (per Middleware) außer für `/`, `/login`, `/registrieren` auf `/login?next=…` geleitet, damit Einladungslinks nach dem Login funktionieren.

## Optik

Bunt & verspielt, aber aufgeräumt: runde Schrift (Fredoka für Überschriften, Nunito für Text), kräftige Bonbonfarben auf hellem, leicht warmem Grund, große Radien, weiche farbige Schatten, Buttons mit leichtem „Press“-Effekt. Jeder Sitzplatz hat eine eigene Farbe. 3D-CSS-Würfel mit Roll-Animation (gehaltene Würfel angehoben, mit Ring). Konfetti bei Kniffel und Spielende. Mobile-first: auf dem Handy Würfel unten, Spielzettel scrollbar darüber; auf Desktop Spielzettel und Würfelbereich nebeneinander. `prefers-reduced-motion` wird respektiert.

## Fehlerbehandlung

- Server Actions geben `{ ok: true } | { ok: false, error: string }` mit deutscher Meldung zurück; UI zeigt Toast.
- Versionskonflikt: ein automatischer Wiederholversuch.
- Realtime-Verbindung weg: Hinweisleiste „Verbindung wird wiederhergestellt…“; nach Wiederverbindung kompletter Neuladevorgang des Zustands.
- Ungültige Codes / volle Räume / laufende Spiele: klare Meldung auf der Beitrittsseite.

## Tests

- **Vitest**: Wertung aller Felder inkl. Randfälle (Full House vs. Kniffel, Straßen mit Doppelten), Bonus, Engine-Abläufe (Zugreihenfolge, Würfe, Halten, unerlaubte Aktionen, Überspringen, Entfernen, Host-Wechsel, Spielende, Gleichstände).
- **Lokales Supabase** (`supabase start`, Docker): Migrationen laufen durch; Typen generiert.
- **Playwright E2E** gegen lokales Supabase: Registrierung zweier Nutzer, Freundschaft, Einladung, komplettes 2-Spieler-Spiel (13 Runden), Ergebnis, Statistik sichtbar, Revanche leitet beide weiter, Neuladen mitten im Spiel.

## Nicht enthalten (YAGNI)

Chat, Zuschauer, Turnier-Modus, Dark Mode, Passwort-vergessen-Mail (Free-Tier-Mailing zu knapp; Admin kann Passwort im Supabase-Dashboard zurücksetzen), Push-Benachrichtigungen, Zeitlimit.

## Betrieb (Aufgaben des Nutzers)

Supabase-Projekt anlegen, Migrationen pushen, E-Mail-Bestätigung ausschalten; GitHub-Repo anlegen, mit Vercel verbinden, Env-Variablen setzen. Hinweis: Supabase-Free-Projekte pausieren nach 7 Tagen Inaktivität.
