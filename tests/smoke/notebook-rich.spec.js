const { test, expect } = require('@playwright/test');
const { paste } = require('../e2e/helpers/notebook');
const API = process.env.WORKER_BASE_URL || 'https://little-kings-api.little-kings.workers.dev';
const player = { playerId: 'LK-0080', displayName: '合成テスト選手', englishName: 'Synthetic Test Player', bilingual: true, enabled: true };
const rich = { format: 'lk-rich-v1', ops: [{ insert: '\n\n' }, { insert: 'Synthetic bold only', attributes: { bold: true } }, { insert: '\n' }, { insert: '合成の箇条書き' }, { insert: '\n', attributes: { list: 'bullet' } }, { insert: 'Synthetic numbered item', attributes: { italic: true } }, { insert: '\n', attributes: { list: 'ordered' } }] };

// Live static assets; ALL API responses, sessions, dates and writing intercepted.
// Never sign in to a real player/Admin account or fetch a real journal here.
for (const language of ['ja', 'en']) for (const width of [320, 390, 1440]) {
  test(`live rich notebooks use safe synthetic player/Admin data (${language}, ${width}px)`, async ({ page, context }) => {
    const errors = [], writes = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await context.addInitScript(language => localStorage.setItem('lk-language', language), language);
    const day = { revision: 1, fields: { 'daily.en': rich, 'coach.ja': '\n\n合成の従来メモ\n\n' } };
    await context.route(`${API}/api/**`, async route => {
      const request = route.request(), url = new URL(request.url()); requests.push(url.pathname);
      const send = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...value }) });
      if (url.pathname === '/api/reflections/directory') return send({ players: [player] });
      if (['/api/reflections/login', '/api/reflections/session'].includes(url.pathname)) return send({ player, token: 'a'.repeat(64), expires: Date.now() + 86400000 });
      if (url.pathname === '/api/reflections/dates') return send({ dates: ['2026-10-10'] });
      if (url.pathname === '/api/reflections/day') {
        if (request.method() === 'POST') {
          const body = request.postDataJSON(); writes.push(body); Object.assign(day.fields, body.patch); day.revision++;
          return send({ revision: day.revision, updatedAt: new Date().toISOString() });
        }
        return send({ date: '2026-10-10', document: day, matches: [] });
      }
      if (url.pathname === '/api/reflections/logout') return send({});
      if (url.pathname === '/api/login') return send({ role: 'admin', token: `${Buffer.from(JSON.stringify({ role: 'admin', expires: Date.now() + 86400000 })).toString('base64')}.synthetic-signature` });
      if (url.pathname === '/api/session') return send({ role: 'admin' });
      if (url.pathname === '/api/admin-data') return send({ players: [], matches: [], rubbers: [] });
      if (url.pathname === '/api/pending') return send({ changes: [] });
      if (url.pathname === '/api/reflections/admin/players') return send({ players: [player] });
      if (url.pathname === '/api/reflections/admin/dates') return send({ dates: ['2026-10-10'] });
      if (url.pathname === '/api/reflections/admin/day') return send({ player, date: '2026-10-10', document: day, matches: [] });
      throw new Error(`Unexpected synthetic notebook request: ${url.pathname}`);
    });
    await page.goto('feedback.html?date=2026-10-10');
    await page.locator('[data-notebook-player]').click(); await page.locator('input[type=password]').fill('synthetic-password'); await page.locator('button[type=submit]').click();
    const field = page.locator('[data-field="daily.en"]'); await expect(field.locator('strong')).toHaveText('Synthetic bold only');
    await expect(field.locator('li')).toHaveCount(2);
    await field.press('Control+End'); await paste(field, '<p><strong>Synthetic pasted ending</strong></p><ul><li>Synthetic pasted bullet</li></ul>');
    await page.locator('[data-mode="read"]').click();
    await expect(page.locator('[data-read-field="daily.en"] strong').filter({ hasText: 'Synthetic pasted ending' })).toHaveCount(1);
    await expect(page.locator('[data-read-field="daily.en"] ul li')).toHaveCount(2);
    expect(writes.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.goto('admin.html?tab=notebooks');
    await page.locator('select[name=role]').selectOption('admin'); await page.locator('input[type=password]').fill('synthetic-password'); await page.locator('button[type=submit]').click();
    await expect(page.locator('#admin-notebook-content strong').filter({ hasText: 'Synthetic pasted ending' })).toHaveCount(1);
    await expect(page.locator('#admin-notebook-content ul li')).toHaveCount(2);
    await expect(page.locator('#admin-notebook-content [contenteditable],#admin-notebook-content textarea')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    const beforePreview = requests.length;
    await page.goto('notebook-sample.html'); await expect(page.locator('[data-sample-read="coach.en"] ol li')).toHaveCount(2);
    await page.locator('[data-sample-mode="write"]').click();
    const preview = page.locator('[data-sample-field="daily.en"]'); await preview.fill(''); await paste(preview, '<p><strong>Synthetic preview</strong></p>');
    await page.locator('[data-sample-mode="read"]').click(); await expect(page.locator('[data-sample-read="daily.en"] strong')).toHaveText('Synthetic preview');
    expect(requests.length).toBe(beforePreview);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Synthetic preview');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(errors).toEqual([]);
  });
}
