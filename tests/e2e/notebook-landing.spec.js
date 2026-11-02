const { test, expect } = require('@playwright/test');
const { expectWriting, paste } = require('./helpers/notebook');
const API = 'https://little-kings-api.little-kings.workers.dev';

test('synthetic preview controller and OpenAI adapter work together without a live provider', async ({ page, context }) => {
  const { requestOpenAITranslation } = await import('../../worker/src/openai-translation.js');
  const calls = [], blocked = [];
  await context.route(`${API}/api/**`, route => { blocked.push(route.request().url()); return route.abort(); });
  await context.route(/^https:\/\/(?:api\.openai\.com|chatgpt\.com)\//, route => { blocked.push(route.request().url()); return route.abort(); });
  await context.route('**/api-test/translate', async route => {
    const body = route.request().postDataJSON(); calls.push(body);
    const value = await requestOpenAITranslation(body, { apiKey: 'synthetic-key', model: 'synthetic-model', transport: async (url, init) => {
      expect(url).toBe('https://api.openai.com/v1/responses');
      expect(JSON.parse(init.body).store).toBe(false);
      return Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '合成の翻訳' }] }] });
    } });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, value }) });
  });
  await page.goto('/notebook-sample.html');
  const result = await page.evaluate(async () => {
    const fields = { source: 'Synthetic source', target: 'Existing synthetic target' }, writes = [];
    const session = window.LKNotebookTranslation.create({
      read: key => fields[key], context: () => 'synthetic-day',
      request: async ({ text, direction }, { signal }) => (await (await fetch('/api-test/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, direction }), signal })).json()).value,
      apply: (key, value) => { fields[key] = value; writes.push(key); }
    });
    const preview = await session.preview({ sourceKey: 'source', targetKey: 'target', direction: 'en-ja' });
    const before = { ...fields }, writesBefore = [...writes];
    const applied = session.accept();
    let aborted = false;
    const delayed = window.LKNotebookTranslation.create({
      read: key => fields[key], context: () => 'synthetic-day',
      request: (input, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('Synthetic cancellation')); }, { once: true })),
      apply: () => { throw new Error('Cancelled preview must never apply'); }
    });
    const cancelledPreview = delayed.preview({ sourceKey: 'source', targetKey: 'target', direction: 'en-ja' });
    delayed.cancel();
    const richFields = { source: { format: 'lk-rich-v1', ops: [{ insert: 'Synthetic heading', attributes: { bold: true } }, { insert: '\n' }, { insert: 'Synthetic bullet' }, { insert: '\n', attributes: { list: 'bullet' } }] }, target: 'Existing rich target' };
    const richSession = window.LKNotebookTranslation.create({
      read: key => richFields[key], context: () => 'synthetic-day', request: async () => '見出し\n合成の箇条書き', apply: (key, value) => { richFields[key] = value; }
    });
    const formattedPreview = await richSession.preview({ sourceKey: 'source', targetKey: 'target', direction: 'en-ja' });
    const formattedBefore = richFields.target, formattedApplied = richSession.accept();
    return { preview, before, writesBefore, applied, after: fields, writes, aborted, cancelled: await cancelledPreview, formattedPreview, formattedBefore, formattedApplied, formattedAfter: richFields.target };
  });
  expect(calls).toEqual([{ text: 'Synthetic source', direction: 'en-ja' }]);
  expect(result.preview).toEqual({ status: 'ready', value: '合成の翻訳' });
  expect(result.before).toEqual({ source: 'Synthetic source', target: 'Existing synthetic target' }); expect(result.writesBefore).toEqual([]);
  expect(result.applied).toEqual({ status: 'applied' }); expect(result.after).toEqual({ source: 'Synthetic source', target: '合成の翻訳' }); expect(result.writes).toEqual(['target']);
  expect(result.aborted).toBe(true); expect(result.cancelled).toEqual({ status: 'cancelled' });
  expect(result.formattedPreview).toEqual({ status: 'ready', value: { format: 'lk-rich-v1', ops: [{ insert: '見出し', attributes: { bold: true } }, { insert: '\n' }, { insert: '合成の箇条書き' }, { insert: '\n', attributes: { list: 'bullet' } }] } });
  expect(result.formattedBefore).toBe('Existing rich target'); expect(result.formattedApplied).toEqual({ status: 'applied' }); expect(result.formattedAfter).toEqual(result.formattedPreview.value);
  expect(blocked).toEqual([]); expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Synthetic source');
});

test('fictional translation preview never sends text and requires an unchanged source and explicit confirmation', async ({ page, context }) => {
  const requests = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(() => localStorage.setItem('lk-language', 'en'));
  await context.route(`${API}/api/**`, route => { requests.push(route.request().url()); return route.abort(); });
  await context.route(/^https:\/\/(?:api\.openai\.com|chatgpt\.com)\//, route => { requests.push(route.request().url()); return route.abort(); });
  await page.goto('/notebook-sample.html');
  await expect(page.locator('.notebook-translation-notice')).toContainText('not AI translation');
  await page.locator('#sample-day').selectOption('matches'); await page.locator('[data-sample-mode="write"]').click();
  const source = page.locator('[data-sample-field="daily.en"]'), target = page.locator('[data-sample-field="daily.ja"]');
  const control = page.locator('[data-demo-translation="daily.ja"]'), button = control.locator('[data-demo-preview]');
  const sourceText = 'I tried to remember my ready position between points.';
  await target.fill('Existing fictional target');
  await button.click();
  await expect(control.locator('[data-demo-review]')).toContainText('not a translation of your typing');
  await expect(control.locator('[data-demo-review]')).toContainText('ポイントの間に、基本姿勢を意識しました。');
  await expectWriting(source, sourceText); await expectWriting(target, 'Existing fictional target');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    const boxes = await control.locator('[data-demo-review], button').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => ({ left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right })));
    expect(boxes.every(box => box.left >= 0 && box.right <= width)).toBe(true);
  }
  await control.locator('[data-demo-cancel]').click(); await expectWriting(target, 'Existing fictional target');
  await button.click(); await page.locator('#language-toggle').click();
  await expect(page.locator('[data-demo-translation="daily.ja"] [data-demo-review]')).toBeHidden();
  await expectWriting(target, 'Existing fictional target'); await page.locator('#language-toggle').click();
  await button.click(); await source.fill('Changed fictional source');
  await expect(control.locator('[data-demo-apply]')).toBeDisabled();
  await expect(control.locator('[data-demo-stale]')).toContainText('source or destination changed');
  await control.locator('[data-demo-apply]').evaluate(node => { node.disabled = false; node.click(); });
  await expectWriting(target, 'Existing fictional target');
  await control.locator('[data-demo-cancel]').click(); await button.click();
  await expect(control.locator('[data-demo-message]')).toContainText('requires the original sample text');
  await source.fill(sourceText); await button.click();
  await target.fill('Changed fictional destination');
  await expect(control.locator('[data-demo-apply]')).toBeDisabled();
  await control.locator('[data-demo-cancel]').click(); await button.click();
  await control.locator('[data-demo-apply]').click();
  await expectWriting(source, sourceText); await expectWriting(target, 'ポイントの間に、基本姿勢を意識しました。');
  await expect(control.locator('[data-demo-message]')).toContainText('Nothing was sent or saved');
  await page.locator('[data-sample-host="daily.ja"] [data-rich-action="undo"]').click();
  await expectWriting(target, 'Changed fictional destination');
  await page.locator('[data-sample-host="daily.ja"] [data-rich-action="redo"]').click();
  await expectWriting(target, 'ポイントの間に、基本姿勢を意識しました。');
  await page.locator('[data-sample-mode="read"]').click(); await expect(page.locator('[data-sample-read="daily.ja"]')).toHaveText('ポイントの間に、基本姿勢を意識しました。');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Changed fictional destination');
  await page.reload(); await expect(page.locator('[data-sample-read="daily.ja"]')).not.toContainText('Changed fictional destination');
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('fictional coach translation preserves formatted example and is labelled in Japanese and English', async ({ page, context }) => {
  const requests = [];
  await context.route(`${API}/api/**`, route => { requests.push(route.request().url()); return route.abort(); });
  await page.goto('/notebook-sample.html'); await page.locator('[data-sample-mode="write"]').click();
  const source = page.locator('[data-sample-field="coach.ja"]'), target = page.locator('[data-sample-field="coach.en"]');
  const control = page.locator('[data-demo-translation="coach.en"]');
  await expect(control.locator('[data-demo-preview]')).toContainText('デモ');
  const original = await source.innerHTML(); await target.fill('Fictional earlier English text');
  await control.locator('[data-demo-preview]').click();
  await expect(control.locator('[data-demo-review] strong')).toHaveText('Ready position');
  await expect(control.locator('[data-demo-review] ol li')).toHaveCount(2);
  await control.locator('[data-demo-apply]').click();
  await expect(source).toHaveJSProperty('innerHTML', original);
  await expect(target.locator('strong')).toHaveText('Ready position'); await expect(target.locator('li')).toHaveCount(2);
  await page.locator('#language-toggle').click(); await expect(page.locator('[data-demo-preview="coach.en"]')).toContainText('Demo: preview English');
  await page.locator('[data-sample-mode="read"]').click();
  await expect(page.locator('[data-sample-read="coach.en"] strong')).toHaveText('Ready position');
  await expect(page.locator('[data-sample-read="coach.en"] ol li')).toHaveCount(2);
  expect(requests).toEqual([]);
});

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

test('fictional preview demonstrates formatting; supported pasted lists survive mode/language changes without persistence', async ({ page, context }) => {
  const requests = [];
  await context.route(`${API}/api/**`, route => { requests.push(route.request().url()); return route.abort(); });
  await page.goto('/notebook-sample.html');
  await expect(page.locator('[data-sample-read="coach.en"] strong')).toHaveText('Ready position');
  await expect(page.locator('[data-sample-read="coach.en"] ol li')).toHaveCount(2);
  await page.locator('[data-sample-mode="write"]').click();
  const field = page.locator('[data-sample-field="daily.en"]');
  await field.fill(''); await paste(field, '<p><strong>Synthetic formatted preview</strong></p><ul><li>Preview bullet</li></ul>');
  await page.locator('#language-toggle').click(); await expect(field.locator('strong')).toHaveText('Synthetic formatted preview');
  await page.locator('[data-sample-mode="read"]').click();
  await expect(page.locator('[data-sample-read="daily.en"] ul li').filter({ hasText: 'Preview bullet' })).toHaveCount(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Preview bullet');
  await page.reload(); await expect(page.locator('.notebook-day')).not.toContainText('Preview bullet');
  expect(requests).toEqual([]);
});

test('preview match names and win/loss labels stay bilingual in either interface language', async ({ page }) => {
  await page.goto('/notebook-sample.html'); await page.locator('#sample-day').selectOption('matches');
  for (const language of ['ja', 'en']) {
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('.notebook-match-side strong')).toHaveText(['サンプル選手', 'サンプル対戦相手A', 'サンプル選手', 'サンプル対戦相手B']);
    await expect(page.locator('.notebook-romanized-name')).toHaveText(['Sample Player', 'Sample Opponent A', 'Sample Player', 'Sample Opponent B']);
    await expect(page.locator('.notebook-result-label')).toHaveText(['勝ち / Win', '負け / Loss', '負け / Loss', '勝ち / Win']);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    }
    if (language === 'ja') await page.locator('#language-toggle').click();
  }
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
  await page.locator('#language-toggle').click(); await expectWriting(field, text);
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
