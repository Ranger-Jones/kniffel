# Anleitung: Kniffel online stellen

Das dauert etwa 20 Minuten. Du brauchst Accounts bei **GitHub**, **Supabase** und **Vercel**. Alle drei sind kostenlos, und für Supabase und Vercel kannst du dich direkt mit GitHub anmelden.

## 1. Code zu GitHub hochladen ✅

Erledigt: Der Code liegt in [github.com/Ranger-Jones/kniffel](https://github.com/Ranger-Jones/kniffel) (Branch `main`). Spätere Änderungen lädst du mit `git push` hoch.

## 2. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) einloggen und **New project** wählen.
2. Name: `kniffel`, Region: **Frankfurt (eu-central-1)**.
3. Ein **Datenbank-Passwort** vergeben und notieren (brauchst du gleich).
4. Warten, bis das Projekt bereit ist (1–2 Minuten).
5. Die **Project Reference** steht in der Adresszeile: `supabase.com/dashboard/project/<ref>`.

## 3. Datenbank einrichten

Im Projektordner:

```bash
pnpm exec supabase login
```

```bash
pnpm exec supabase link --project-ref <ref>
```

(fragt nach dem Datenbank-Passwort)

```bash
pnpm exec supabase db push
```

Das legt alle Tabellen, Zugriffsregeln, Statistiken, Realtime-Regeln und den Speicher für Profilbilder an.

## 4. Login-Einstellungen in Supabase

Im Supabase-Dashboard unter **Authentication**:

1. **Sign In / Providers → Email:** **Confirm email** ausschalten und speichern. Sonst müssten alle eine Bestätigungsmail anklicken, und der kostenlose Mailversand ist stark begrenzt.
2. **URL Configuration:** Die **Site URL** trägst du nach Schritt 6 ein (deine Vercel-Adresse, z. B. `https://kniffel-xyz.vercel.app`).

## 5. Schlüssel kopieren

Im Supabase-Dashboard oben auf **Connect** klicken oder **Project Settings → API Keys** öffnen. Du brauchst:

| Wert | Wo | Wird zu |
|---|---|---|
| Project URL | `https://<ref>.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key | beginnt mit `sb_publishable_` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key | beginnt mit `sb_secret_` (ggf. „Reveal“) | `SUPABASE_SECRET_KEY` |

⚠️ Den **Secret key** nie öffentlich teilen und nie in den Code schreiben. Er gehört nur in Vercel.

## 6. Auf Vercel veröffentlichen

1. Auf [vercel.com](https://vercel.com) mit GitHub einloggen und **Add New → Project** wählen.
2. Das Repo `kniffel` importieren. Das Framework (Next.js) wird automatisch erkannt.
3. Unter **Environment Variables** die drei Werte aus Schritt 5 eintragen.
4. **Deploy** klicken. Nach ca. 1–2 Minuten bekommst du deine Adresse, z. B. `https://kniffel-xyz.vercel.app`.
5. Diese Adresse in Supabase als **Site URL** eintragen (Schritt 4.2).

## 7. Ausprobieren

1. Auf deiner Vercel-Adresse einen Account erstellen.
2. Den Link an deine Freunde schicken. Sie registrieren sich auch.
3. Unter **Freunde** euch gegenseitig hinzufügen.
4. **Neues Spiel**, Freunde einladen (oder Link/Code teilen), dann **Spiel starten**. 🎲

## Gut zu wissen

- **Pausiertes Projekt:** Kostenlose Supabase-Projekte schlafen nach 7 Tagen ohne Nutzung ein. Im Supabase-Dashboard dann auf **Restore project** klicken. Nach ein paar Minuten läuft alles wieder, und die Daten bleiben erhalten.
- **Passwort vergessen:** Es gibt keine „Passwort vergessen“-Mail. Im Supabase-Dashboard unter **Authentication → Users** den Nutzer anklicken und ein neues Passwort setzen (oder den Nutzer löschen, dann kann er sich neu registrieren).
- **Updates:** Änderungen am Code einfach pushen (`git push`), dann deployt Vercel automatisch. Neue Datenbank-Migrationen danach mit `pnpm exec supabase db push` hochladen.
- **Lokal weiterentwickeln:** siehe [README.md](README.md) (Docker Desktop muss laufen).
- **Realtime-Einstellungen:** Nichts ändern. Insbesondere **„Allow public access“** unter Realtime → Settings eingeschaltet lassen, sonst kommen Einladungen nicht mehr live an.
- **Kosten:** Für eine Freundesrunde reichen die Free-Tarife von Supabase und Vercel locker.
