import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const run = Date.now().toString(36);

async function unlock(page: Page) {
  await page.goto('/zugang');
  // Schon freigeschaltet → /zugang leitet (nach dem Streamen) weiter; sonst erscheint das Formular.
  await page.waitForFunction(() => !location.pathname.startsWith('/zugang') || !!document.querySelector('input[name="answer"]'));
  if (!new URL(page.url()).pathname.startsWith('/zugang')) return;
  await page.getByLabel('Wie heißt mein Lieblings PWC Mitarbeiter?').fill('Paul');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function register(page: Page, name: string) {
  await unlock(page);
  await page.goto('/registrieren');
  await page.getByLabel('Benutzername').fill(name);
  await page.getByLabel('E-Mail').fill(`${name}@test.local`);
  await page.getByLabel('Passwort').fill('passwort123');
  await page.getByRole('button', { name: 'Account erstellen' }).click();
  await expect(page.getByRole('heading', { name: `Hey ${name}!` })).toBeVisible();
}

async function scoreFirstFreeField(page: Page) {
  await page.getByTestId('score-option').first().click();
  const strike = page.getByRole('button', { name: 'Streichen' });
  if (await strike.isVisible().catch(() => false)) await strike.click();
}

test('ohne richtige Antwort auf die Zugangsfrage ist nichts erreichbar', async ({ page }) => {
  for (const path of ['/', '/login', '/registrieren', '/spiel/ABCDEF']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/zugang/);
  }
  await page.goto('/spiel/ABCDEF');
  await page.getByLabel('Wie heißt mein Lieblings PWC Mitarbeiter?').fill('Peter');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByText('Leider falsch.')).toBeVisible();
  await page.getByLabel('Wie heißt mein Lieblings PWC Mitarbeiter?').fill(' paul ');
  await page.getByRole('button', { name: 'Weiter' }).click();
  // Weiter zur ursprünglich aufgerufenen Seite (ohne Login → Login-Seite mit next).
  await expect(page).toHaveURL(/\/login\?next=%2Fspiel%2FABCDEF/);
  await page.goto('/registrieren');
  await expect(page.getByRole('button', { name: 'Account erstellen' })).toBeVisible();
});

test('Server Actions lassen sich nicht an der Zugangsfrage vorbei aufrufen', async ({ request }) => {
  const manifest = JSON.parse(readFileSync('.next/server/server-reference-manifest.json', 'utf8'));
  const signUpId = Object.entries(manifest.node as Record<string, { exportedName?: string }>)
    .find(([, v]) => v.exportedName === 'signUp')![0];
  const res = await request.post('/zugang', {
    headers: { 'Next-Action': signUpId, Accept: 'text/x-component' },
    multipart: { '0': '[{},"$K1"]', '1_email': 'keine-mail', '1_password': 'x', '1_username': 'ab', '1_next': '/' },
  });
  const body = await res.text();
  expect(body).toContain('Bitte zuerst die Zugangsfrage beantworten.');
  expect(body).not.toContain('Bitte eine gültige E-Mail eingeben.');
});

test('zwei Freunde spielen ein komplettes Spiel', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const nameA = `ali_${run}`;
  const nameB = `bob_${run}`;
  await register(a, nameA);
  await register(b, nameB);

  // Freundschaft
  await a.goto('/freunde');
  await b.goto('/freunde');
  await a.getByPlaceholder('Benutzername suchen').fill(nameB);
  await a.getByRole('button', { name: 'Anfrage senden' }).click();
  await b.getByRole('button', { name: 'Annehmen' }).click();
  await expect(a.locator('li', { hasText: nameB }).getByRole('button', { name: 'Entfernen' })).toBeVisible();

  // Spiel + Einladung
  await b.goto('/');
  await a.goto('/');
  await a.getByRole('button', { name: 'Neues Spiel' }).click();
  await expect(a).toHaveURL(/\/spiel\/[A-Z0-9]{6}$/);
  await a.getByRole('button', { name: 'Einladen' }).click();
  await b.getByRole('button', { name: 'Mitspielen' }).first().click();
  await expect(b).toHaveURL(a.url());
  await expect(a.getByRole('listitem').filter({ hasText: nameB }).filter({ hasText: 'Spieler' })).toBeVisible();

  await a.getByRole('button', { name: 'Spiel starten' }).click();

  for (let turn = 0; turn < 26; turn++) {
    const current = turn % 2 === 0 ? a : b;
    const other = turn % 2 === 0 ? b : a;
    await expect(current.getByTestId('turn-indicator')).toHaveText(/Du bist dran/);
    await current.getByTestId('roll-button').click();
    await expect(current.getByTestId('die-0')).toHaveAttribute('data-value', /[1-6]/);
    if (turn === 7) {
      // Neu laden mitten im Zug: Würfel und gehaltene Würfel bleiben erhalten.
      await current.getByTestId('die-1').click();
      await expect(current.getByTestId('die-1')).toHaveAttribute('aria-pressed', 'true');
      await current.waitForTimeout(500);
      const before = await Promise.all([0, 1, 2, 3, 4].map((i) => current.getByTestId(`die-${i}`).getAttribute('data-value')));
      await current.reload();
      // Beim Streamen liegt der Inhalt kurz zusätzlich im versteckten React-Zwischenspeicher – nur sichtbare Würfel prüfen.
      const die = (i: number) => current.getByTestId(`die-${i}`).filter({ visible: true });
      for (let i = 0; i < 5; i++) await expect(die(i)).toHaveAttribute('data-value', before[i]!);
      await expect(die(1)).toHaveAttribute('aria-pressed', 'true');
    }
    await scoreFirstFreeField(current);
    if (turn < 25) await expect(other.getByTestId('turn-indicator')).toHaveText(/Du bist dran/);
  }

  await expect(a.getByRole('heading', { name: 'Spiel beendet!' })).toBeVisible();
  await expect(b.getByRole('heading', { name: 'Spiel beendet!' })).toBeVisible();

  // Revanche: beide landen in derselben neuen Lobby.
  const oldUrl = a.url();
  await a.getByRole('button', { name: 'Revanche' }).click();
  await expect(a).not.toHaveURL(oldUrl);
  await expect(a).toHaveURL(/\/spiel\/[A-Z0-9]{6}$/);
  await expect(b).toHaveURL(a.url());

  // Statistik
  await a.goto(`/profil/${nameA}`);
  await expect(a.getByTestId('stat-games')).toHaveText('1');
});

test('Chat, Emoji-Auswahl und Zeitlimit', async ({ browser }) => {
  test.setTimeout(180_000);
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const nameA = `cha_${run}`;
  const nameB = `chb_${run}`;
  await register(a, nameA);
  await register(b, nameB);

  await a.getByRole('button', { name: 'Neues Spiel' }).click();
  await expect(a).toHaveURL(/\/spiel\/[A-Z0-9]{6}$/);
  await b.goto(a.url());
  await expect(a.getByRole('listitem').filter({ hasText: nameB }).filter({ hasText: 'Spieler' })).toBeVisible();

  // Einstellungen: 30 s Zeitlimit, B sieht es
  await a.getByRole('radio', { name: '30 s' }).click();
  await expect(b.getByText('30 s')).toBeVisible();

  // Chat in der Lobby
  await a.getByLabel('Nachricht schreiben').fill('Hallo aus der Lobby');
  await a.getByRole('button', { name: 'Senden', exact: true }).click();
  await expect(b.getByText('Hallo aus der Lobby')).toBeVisible();

  await a.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(a.getByTestId('turn-indicator')).toHaveText(/Du bist dran/);
  await expect(a.getByRole('timer')).toBeVisible();

  // Neu laden mit laufendem Countdown: keine Hydration-Fehler.
  const consoleErrors: string[] = [];
  a.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  a.on('pageerror', (e) => consoleErrors.push(e.message));
  await a.reload();
  await expect(a.getByRole('timer')).toBeVisible();
  await a.waitForTimeout(1500);
  expect(consoleErrors.filter((t) => /hydrat|#418|#423|#425/i.test(t))).toEqual([]);

  // Emoji aus der großen Auswahl kommt beim anderen an
  await a.getByRole('button', { name: 'Mehr Reaktionen' }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'Reaktion 🐐 senden' }).click();
  await expect(b.locator('.pointer-events-none.fixed').getByText('🐐')).toBeVisible();

  // A spielt normal, B lässt die Zeit ablaufen → automatisch eingetragen, A wieder dran
  await a.getByTestId('roll-button').click();
  await scoreFirstFreeField(a);
  await expect(b.getByTestId('turn-indicator')).toHaveText(/Du bist dran/);
  await expect(a.getByTestId('turn-indicator')).toHaveText(/Du bist dran/, { timeout: 45_000 });
  const [, idB] = await a.locator('[data-testid^="total-"]').evaluateAll(
    (els) => els.map((e) => e.getAttribute('data-testid')!.slice('total-'.length)),
  );
  const filledB = await a.locator(`[data-testid^="score-cell-${idB}-"]`).evaluateAll(
    (cells) => cells.filter((c) => c.textContent!.trim() !== '').length,
  );
  expect(filledB).toBe(1);
});

test('kein horizontaler Überlauf auf dem Handy (360 px)', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const name = (`ov_${run}xxxxxxxxxxxxxxxxxxxx`).slice(0, 20);
  async function noOverflow(label: string) {
    await page.waitForTimeout(400);
    const res = await page.evaluate(() => {
      const bad: string[] = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > window.innerWidth + 1 && !el.closest('.overflow-x-auto, .overflow-y-auto, [hidden], dialog:not([open])')) {
          bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
        }
      }
      return { scroll: document.documentElement.scrollWidth, width: window.innerWidth, bad: bad.slice(0, 3) };
    });
    expect({ label, ...res }).toEqual({ label, scroll: res.width, width: res.width, bad: [] });
  }
  await page.goto('/');
  await noOverflow('zugang');
  await unlock(page);
  await noOverflow('startseite');
  await page.goto('/login');
  await noOverflow('login');
  await register(page, name);
  await noOverflow('dashboard');
  for (const path of ['/freunde', '/bestenliste', `/profil/${name}`]) {
    await page.goto(path);
    await noOverflow(path);
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Neues Spiel' }).click();
  await expect(page).toHaveURL(/\/spiel\//);
  await noOverflow('lobby');
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await page.getByTestId('roll-button').click();
  await noOverflow('spiel');
});
