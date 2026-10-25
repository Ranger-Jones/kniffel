import { expect, test, type Page } from '@playwright/test';

const run = Date.now().toString(36);

async function unlock(page: Page) {
  await page.goto('/zugang');
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
      for (let i = 0; i < 5; i++) await expect(current.getByTestId(`die-${i}`)).toHaveAttribute('data-value', before[i]!);
      await expect(current.getByTestId('die-1')).toHaveAttribute('aria-pressed', 'true');
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
