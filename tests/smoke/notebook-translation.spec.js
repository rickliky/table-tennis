const { test, expect } = require('@playwright/test');
const { expectWriting } = require('../e2e/helpers/notebook');
const API = process.env.WORKER_BASE_URL || 'https://little-kings-api.little-kings.workers.dev';

test.beforeAll(async ({ request, baseURL }) => {
  if (!process.env.EXPECTED_COMMIT) return;
  await expect.poll(async () => {
    const response = await request.get(new URL(`build-info.json?check=${Date.now()}`, baseURL).toString());
    return response.ok() ? (await response.json()).commit : '';
  }, { timeout: 60000, intervals: [1000, 2000, 3000] }).toBe(process.env.EXPECTED_COMMIT);
});

// Static UAT assets only: every player session and journal is intercepted and
// fictional. Neither the real Worker nor ChatGPT receives notebook content.
for (const language of ['ja', 'en']) test(`live UAT translation preparation is disabled and demo-only (${language})`, async ({ page, context, baseURL }) => {
  const base = new URL(baseURL);
  test.skip(!/\/uat\/?$/i.test(base.pathname) && !['localhost', '127.0.0.1'].includes(base.hostname), 'Translation preparation is UAT-only.');
  const requests = [], external = [], errors = [], player = { playerId: 'LK-0080', displayName: '合成選手', englishName: 'Synthetic Player', bilingual: true };
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 900 });
  await context.addInitScript(language => localStorage.setItem('lk-language', language), language);
  await context.route(/^https:\/\/(?:api\.openai\.com|chatgpt\.com)\//, route => { external.push(route.request().url()); return route.abort(); });
  await context.route(`${API}/api/**`, route => {
    const request = route.request(), url = new URL(request.url()); requests.push({ path: url.pathname, method: request.method() });
    const respond = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...value }) });
    if (url.pathname === '/api/reflections/directory') return respond({ players: [player] });
    if (url.pathname === '/api/reflections/login') return respond({ player, token: 'synthetic-token', expires: Date.now() + 86400000 });
    if (url.pathname === '/api/reflections/dates') return respond({ dates: [] });
    if (url.pathname === '/api/reflections/day' && request.method() === 'GET') return respond({ date: '2026-10-10', document: { revision: 0, fields: {} }, matches: [] });
    throw new Error(`Unexpected request: ${url.pathname} ${request.method()}`);
  });
  await page.goto('feedback.html?player=LK-0080&date=2026-10-10');
  await page.locator('input[type=password]').fill('synthetic-password'); await page.locator('button[type=submit]').click();
  await expect(page.locator('.notebook-translation-unavailable')).toHaveCount(2);
  await expect(page.locator('.notebook-translation-unavailable').first()).toBeDisabled();
  await expect(page.locator('#notebook-translation-availability')).toContainText(language === 'en' ? 'No writing is sent for translation' : '翻訳のために文章が送信されることはありません');
  await page.locator('.notebook-translation-unavailable').first().evaluate(button => { button.disabled = false; button.click(); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  const requestCount = requests.length;
  await page.goto('notebook-sample.html');
  await page.locator('#sample-day').selectOption('matches'); await page.locator('[data-sample-mode="write"]').click();
  const target = page.locator('[data-sample-field="daily.ja"]'), control = page.locator('[data-demo-translation="daily.ja"]');
  await target.fill('Synthetic destination'); await control.locator('[data-demo-preview]').click();
  await expectWriting(target, 'Synthetic destination');
  await expect(control.locator('[data-demo-review]')).toContainText('ポイントの間に、基本姿勢を意識しました。');
  await control.locator('[data-demo-apply]').click(); await expectWriting(target, 'ポイントの間に、基本姿勢を意識しました。');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  expect(requests).toHaveLength(requestCount); expect(external).toEqual([]); expect(errors).toEqual([]);
});
