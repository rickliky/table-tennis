const { test, expect } = require('@playwright/test');
const { paste } = require('../e2e/helpers/notebook');
const API = process.env.WORKER_BASE_URL || 'https://little-kings-api.little-kings.workers.dev';
const player = { playerId: 'LK-0080', displayName: '合成テスト選手', englishName: 'Synthetic Test Player', bilingual: true, enabled: true };
const rich = { format: 'lk-rich-v1', ops: [{ insert: '\n\n' }, { insert: 'Synthetic bold only', attributes: { bold: true } }, { insert: '\n' }, { insert: '合成の箇条書き' }, { insert: '\n', attributes: { list: 'bullet' } }, { insert: 'Synthetic numbered item', attributes: { italic: true } }, { insert: '\n', attributes: { list: 'ordered' } }] };

test.beforeAll(async ({ request, baseURL }) => {
  if (!process.env.EXPECTED_COMMIT) return;
  // Pages publishes asynchronously after the gh-pages push. Wait before any
  // rich-editor assertion, rather than relying on a later smoke file's wait.
  await expect.poll(async () => {
    const response = await request.get(new URL(`build-info.json?check=${Date.now()}`, baseURL).toString());
    return response.ok() ? (await response.json()).commit : '';
  }, { timeout: 60000, intervals: [1000, 2000, 3000] }).toBe(process.env.EXPECTED_COMMIT);
});

// Live static assets; ALL API responses, sessions, dates and writing intercepted.
// Never sign in to a real player/Admin account or fetch a real journal here.
for (const playerId of ['LK-0080', 'LK-0002']) for (const language of ['ja', 'en']) for (const width of [320, 390, 1440]) {
  test(`live rich notebooks use safe synthetic player/Admin data (${playerId}, ${language}, ${width}px)`, async ({ page, context }) => {
    const syntheticPlayer = { ...player, playerId };
    const errors = [], writes = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await context.addInitScript(language => localStorage.setItem('lk-language', language), language);
    const day = { revision: 1, fields: { 'daily.en': rich, 'coach.ja': '\n\n合成の従来メモ\n\n' } }, matchDay = { revision: 0, fields: {} };
    const matches = [
      { key: 'training:SYNTHETIC-1', source: 'training', opponentName: '現在の合成選手名', opponentEnglishName: 'Current Synthetic Opponent', score: '3-1', result: 'win' },
      { key: 'training:SYNTHETIC-2', source: 'training', opponentName: '合成の外部選手', opponentEnglishName: 'Synthetic External', score: '0-3', result: 'loss' },
      { key: 'training:SYNTHETIC-3', source: 'training', opponentName: '合成の未完了相手', score: '2-1', result: 'incomplete' }
    ];
    await context.route(`${API}/api/**`, async route => {
      const request = route.request(), url = new URL(request.url()); requests.push(url.pathname);
      const send = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...value }) });
      if (url.pathname === '/api/reflections/directory') return send({ players: [syntheticPlayer] });
      if (['/api/reflections/login', '/api/reflections/session'].includes(url.pathname)) return send({ player: syntheticPlayer, token: 'a'.repeat(64), expires: Date.now() + 86400000 });
      if (url.pathname === '/api/reflections/dates') return send({ dates: ['2026-10-10'] });
      if (url.pathname === '/api/reflections/day') {
        if (request.method() === 'GET' && url.searchParams.get('date') === '2026-10-12') return send({ date: '2026-10-12', document: { revision: 0, fields: {} }, matches: [] });
        if (request.method() === 'GET' && url.searchParams.get('date') === '2026-10-11') return send({ date: '2026-10-11', document: matchDay, matches });
        if (request.method() === 'POST') {
          const document = url.searchParams.get('date') === '2026-10-11' ? matchDay : day;
          const body = request.postDataJSON(); writes.push(body); Object.assign(document.fields, body.patch); document.revision++;
          return send({ revision: document.revision, updatedAt: new Date().toISOString() });
        }
        return send({ date: '2026-10-10', document: day, matches: [] });
      }
      if (url.pathname === '/api/reflections/logout') return send({});
      if (url.pathname === '/api/login') return send({ role: 'admin', token: `${Buffer.from(JSON.stringify({ role: 'admin', expires: Date.now() + 86400000 })).toString('base64')}.synthetic-signature` });
      if (url.pathname === '/api/session') return send({ role: 'admin' });
      if (url.pathname === '/api/admin-data') return send({ players: [], matches: [], rubbers: [] });
      if (url.pathname === '/api/pending') return send({ changes: [] });
      if (url.pathname === '/api/reflections/admin/players') return send({ players: [syntheticPlayer] });
      if (url.pathname === '/api/reflections/admin/dates') return send({ dates: ['2026-10-10'] });
      if (url.pathname === '/api/reflections/admin/day') return send({ player: syntheticPlayer, date: '2026-10-10', document: day, matches: [] });
      throw new Error(`Unexpected synthetic notebook request: ${url.pathname}`);
    });
    await page.goto('feedback.html?date=2026-10-10');
    await page.locator('[data-notebook-player]').click(); await page.locator('input[type=password]').fill('synthetic-password'); await page.locator('button[type=submit]').click();
    const field = page.locator('[data-field="daily.en"]'); await expect(field.locator('strong')).toHaveText('Synthetic bold only');
    await expect(page.locator('input[data-field="activity"]')).toHaveCount(0);
    await expect(page.locator('#notebook-coach h2')).toHaveText(language === 'en' ? 'Coach feedback' : 'コーチのアドバイス');
    await expect(page.locator('.notebook-field > span')).not.toContainText([language === 'en' ? '(manual)' : '（手入力）']);
    await expect(field.locator('li')).toHaveCount(2);
    await field.press('Control+End'); await paste(field, '<p><strong>Synthetic pasted ending</strong></p><ul><li>Synthetic pasted bullet</li></ul>');
    await page.locator('[data-mode="read"]').click();
    await expect(page.locator('[data-read-field="daily.en"] strong').filter({ hasText: 'Synthetic pasted ending' })).toHaveCount(1);
    await expect(page.locator('[data-read-field="daily.en"] ul li')).toHaveCount(2);
    expect(writes.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.reload(); await expect(field.locator('strong').filter({ hasText: 'Synthetic pasted ending' })).toHaveCount(1);
    const beforeTemplate = writes.length;
    await page.locator('#notebook-date').fill('2026-10-12'); await page.locator('#notebook-date').press('Tab');
    const headings = playerId === 'LK-0080' ? ['Things to Improve', 'What I Practised Today', 'What I Noticed or Learned Today'] : ['What I Did Well', 'Things to Improve'];
    await expect(field).toContainText('12 October 2026 (Monday)');
    await expect(field.locator('strong')).toHaveText(headings);
    await expect(field.locator('li[data-list="bullet"]')).toHaveCount(headings.length);
    await page.locator('[data-mode="read"]').click(); await expect(page.locator('[data-read-field="daily.en"]')).toHaveText(language === 'en' ? 'Not written' : '未記入');
    expect(writes.length).toBe(beforeTemplate);
    await page.locator('#notebook-date').fill('2026-10-11'); await page.locator('#notebook-date').press('Tab');
    await expect(page.locator('.notebook-result-label')).toHaveText(['勝ち / Win', '負け / Loss', '負け / Loss', '勝ち / Win']);
    await expect(page.locator('.notebook-match').first().locator('.notebook-match-side strong')).toHaveText(['合成テスト選手', '現在の合成選手名']);
    await expect(page.locator('.notebook-match').first().locator('.notebook-romanized-name')).toHaveText(['Synthetic Test Player', 'Current Synthetic Opponent']);
    await expect(page.locator('.notebook-match-incomplete')).toHaveText('未完了 / Incomplete — 勝敗は未確定 / no winner recorded');
    expect(await page.evaluate(() => Boolean(document.querySelector('#notebook-daily').compareDocumentPosition(document.querySelector('#notebook-matches')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await page.locator('[data-mode="write"]').click();
    const matchField = page.locator('[data-field="match.training:SYNTHETIC-1.en"]');
    await expect(matchField).toContainText('Match: Synthetic Test Player 3 - 1 Current Synthetic Opponent');
    await expect(matchField.locator('strong')).toHaveText(['What I Did Well:', 'Things to Improve:']);
    await expect(matchField.locator('li[data-list="bullet"]')).toHaveCount(2);
    expect(writes.length).toBe(beforeTemplate);
    await matchField.evaluate(element => { const editor = window.Quill.find(element.parentElement); editor.setSelection(editor.getText().indexOf('What I Did Well:') + 'What I Did Well:'.length + 1, 0); });
    await matchField.pressSequentially('Synthetic match focus'); await page.locator('[data-mode="read"]').click();
    await expect(page.locator('[data-read-field="match.training:SYNTHETIC-1.en"] li').first()).toHaveText('Synthetic match focus');
    expect(Object.keys(matchDay.fields)).toEqual(['match.training:SYNTHETIC-1.en']);
    await page.reload(); await expect(matchField.locator('li').first()).toHaveText('Synthetic match focus');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.goto('admin.html?tab=notebooks');
    await page.locator('select[name=role]').selectOption('admin'); await page.locator('input[type=password]').fill('synthetic-password'); await page.locator('button[type=submit]').click();
    await expect(page.locator('#admin-notebook-content strong').filter({ hasText: 'Synthetic pasted ending' })).toHaveCount(1);
    await expect(page.locator('#admin-notebook-content ul li')).toHaveCount(2);
    await expect(page.locator('#admin-notebook-content [contenteditable],#admin-notebook-content textarea')).toHaveCount(0);
    await expect(page.locator('#admin-notebook-content > article.notebook-entry').first().locator('h3')).toHaveText(language === 'en' ? 'Daily reflection' : '1日の振り返り');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    const beforePreview = requests.length;
    await page.goto('notebook-sample.html'); await expect(page.locator('[data-sample-read="coach.en"] ol li')).toHaveCount(2);
    await expect(page.locator('[data-sample-read="daily.en"] strong')).toHaveCount(3);
    await page.locator('#sample-day').selectOption('matches');
    expect(await page.evaluate(() => Boolean(document.querySelector('#sample-daily').compareDocumentPosition(document.querySelector('.notebook-matches')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(page.locator('[data-sample-read="match.b.en"]')).toContainText('Match: Sample Player 1 - 3 Sample Opponent B');
    await page.locator('#sample-day').selectOption('daily');
    await page.locator('[data-sample-mode="write"]').click();
    const preview = page.locator('[data-sample-field="daily.en"]'); await preview.fill(''); await paste(preview, '<p><strong>Synthetic preview</strong></p>');
    await page.locator('[data-sample-mode="read"]').click(); await expect(page.locator('[data-sample-read="daily.en"] strong')).toHaveText('Synthetic preview');
    expect(requests.length).toBe(beforePreview);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Synthetic preview');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(errors).toEqual([]);
  });
}
