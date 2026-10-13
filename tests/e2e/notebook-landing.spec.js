const { test, expect } = require('@playwright/test');
const API = 'https://little-kings-api.little-kings.workers.dev';

test('directory scales with cards, search and pagination; only a selected account has a login form', async ({ page, context }) => {
  const requests = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const players = Array.from({ length: 37 }, (_, index) => ({ playerId: `LK-${2000 + index}`, displayName: `合成選手${index}`, englishName: `Synthetic Player ${index}`, bilingual: false }));
  players[0].displayName = '<img src=x onerror=alert(1)> Synthetic name';
  await context.route(`${API}/api/**`, async route => {
    const path = new URL(route.request().url()).pathname; requests.push(path);
    if (path !== '/api/reflections/directory') throw new Error('Landing page requested protected data');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, players }) });
  });
  await page.goto('/feedback.html'); await expect(page.locator('.notebook-player-card')).toHaveCount(12);
  await expect(page.locator('.notebook-login')).toHaveCount(0);
  await page.locator('#notebook-more-players').click(); await expect(page.locator('.notebook-player-card')).toHaveCount(24);
  await page.locator('#notebook-player-search').fill('25 player synthetic');
  await expect(page.locator('.notebook-player-card')).toHaveCount(1);
  await page.locator('[data-notebook-player="LK-2025"]').click();
  await expect(page.locator('.notebook-login')).toHaveCount(1);
  await expect(page.locator('.notebook-login')).toHaveAttribute('data-player', 'LK-2025');
  await expect(page.locator('.notebook-login input[type=password]')).toBeFocused();
  await page.locator('.notebook-login input[type=password]').fill('synthetic-unsent-password');
  await page.locator('#notebook-player-search').fill('missing name');
  await expect(page.locator('.notebook-directory-empty')).toBeVisible();
  await expect(page.locator('.notebook-login input[type=password]')).toHaveValue('synthetic-unsent-password');
  await page.locator('#language-toggle').click();
  await expect(page.locator('.notebook-invitation')).toContainText('Setup is easy');
  await page.locator('#notebook-clear-search').click();
  await expect(page.locator('.notebook-player-card')).toHaveCount(12);
  await page.locator('#notebook-player-search').fill('ＬＫ－２０２５');
  await expect(page.locator('.notebook-player-card')).toHaveCount(1);
  await page.locator('#notebook-change-player').click();
  await expect(page.locator('.notebook-login')).toHaveCount(0);
  await page.locator('#notebook-player-search').fill('合成選手36'); await expect(page.locator('.notebook-player-card')).toHaveCount(1);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(await page.locator('.notebook-player-card').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  expect(requests).toEqual(['/api/reflections/directory']);
  expect(errors).toEqual([]);
});

test('direct player links keep the password visible on phones and failed portraits use the standard fallback', async ({ page, context }) => {
  const players = [{ playerId: 'LK-0080', displayName: '合成選手', englishName: 'Synthetic Player', bilingual: true }];
  await context.route(`${API}/api/**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, players }) }));
  await context.route('**/img/LK-0080.jpg', route => route.abort());
  for (const language of ['ja', 'en']) {
    await page.goto('/feedback.html?player=LK-0080'); await page.evaluate(language => localStorage.setItem('lk-language', language), language);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await page.reload();
      const password = page.locator('.notebook-login input[type=password]'); await expect(password).toBeVisible();
      expect(await password.evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThan(900);
      await expect(page.locator('#notebook-signin .notebook-player-portrait')).toHaveAttribute('src', 'img/NoProfilePic.jpg');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    }
  }
});

test('mock preview makes no API requests or private-session reads and never saves writing', async ({ page, context }) => {
  const apiRequests = [], errors = []; page.on('pageerror', error => errors.push(error.message));
  await context.route(`${API}/api/**`, route => { apiRequests.push(route.request().url()); return route.abort(); });
  await context.addInitScript(() => {
    localStorage.setItem('lk-private-reflection-session-uat', 'synthetic-private-token');
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) { if (key.includes('session')) throw new Error('Demo must not read sessions'); return original.call(this, key); };
  });
  await page.goto('/notebook-sample.html');
  await expect(page.locator('.notebook-demo-warning')).toContainText('保存されません');
  await expect(page.locator('.notebook-day textarea')).toHaveCount(0);
  await page.locator('#sample-day').selectOption('matches'); await expect(page.locator('.notebook-match')).toHaveCount(2);
  await page.locator('[data-sample-mode="write"]').click();
  const field = page.locator('[data-sample-field="match.a.en"]'), text = '\n\n' + 'Synthetic preview typing only.\n\n'.repeat(80);
  await field.fill(text);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => field.evaluate(element => element.clientHeight >= element.scrollHeight - 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
  await page.locator('#language-toggle').click(); await expect(field).toHaveValue(text);
  await page.locator('[data-sample-mode="read"]').click(); expect(await page.locator('[data-sample-read="match.a.en"]').textContent()).toBe(text);
  await expect(page.locator('.notebook-demo-warning')).toContainText('changes are not saved');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Synthetic preview typing');
  await page.locator('#sample-day').selectOption('rest'); await expect(page.locator('.notebook-day')).toContainText('Friday');
  await expect(page.locator('.notebook-day textarea')).toHaveCount(0);
  await page.locator('#sample-day').selectOption('matches'); await page.locator('#sample-reset').click();
  await expect(page.locator('[data-sample-read="match.a.en"]')).not.toContainText('Synthetic preview typing');
  await page.reload(); await expect(page.locator('.notebook-day')).not.toContainText('Synthetic preview typing');
  expect(apiRequests).toEqual([]); expect(errors).toEqual([]);
});
