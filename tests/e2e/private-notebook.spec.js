const { test, expect } = require('@playwright/test');
const { expectWriting, paste } = require('./helpers/notebook');
const Rich = require('../../notebook-rich-text');
const API = 'https://little-kings-api.little-kings.workers.dev';
const players = [
  { playerId: 'LK-0080', displayName: '選手A', englishName: 'Player A', bilingual: true },
  { playerId: 'LK-0002', displayName: '選手B', englishName: 'Player B', bilingual: true },
  { playerId: 'LK-0003', displayName: '選手C', englishName: 'Player C', bilingual: false }
];
async function mock(context) {
  const requests = [], documents = new Map(), tokens = new Map();
  const state = { failSave: false, expire: false, delay: 0, matchDate: '2026-10-11', matches: [
    { key: 'training:M-001', source: 'training', opponentName: '<img src=x onerror=alert(1)> Opponent', score: '3-1', result: 'win', eventName: 'Club training' },
    { key: 'tournament:TM-001', source: 'tournament', opponentName: 'Tournament opponent', score: '1-2', result: 'incomplete', eventName: 'Tournament' }
  ] };
  await context.route(`${API}/api/**`, async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, body = request.postData() ? request.postDataJSON() : null;
    const token = (request.headers().authorization || '').replace(/^Bearer /, ''), player = tokens.get(token);
    requests.push({ path, body, token });
    const respond = (status, value) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (path === '/api/reflections/directory') return respond(200, { ok: true, players });
    if (path === '/api/reflections/login') {
      if (body.password !== 'synthetic-only-password') return respond(401, { ok: false });
      const person = players.find(person => person.playerId === body.playerId), newToken = `private-${person.playerId}-${tokens.size}`;
      tokens.set(newToken, person); state.expire = false;
      return respond(200, { ok: true, player: person, token: newToken, expires: Date.now() + 56 * 86400000 });
    }
    if (!player || state.expire) return respond(401, { ok: false });
    if (path === '/api/reflections/session') return respond(200, { ok: true, player });
    if (path === '/api/reflections/logout') { tokens.delete(token); return respond(200, { ok: true }); }
    if (path === '/api/reflections/dates') return respond(200, { ok: true, dates: [...documents.keys()].filter(key => key.startsWith(player.playerId)).map(key => key.split('|')[1]).sort().reverse() });
    if (path === '/api/reflections/day') {
      const date = url.searchParams.get('date'), key = `${player.playerId}|${date}`;
      const current = documents.get(key) || { revision: 0, fields: {} };
      if (!body) return respond(200, { ok: true, date, document: current, matches: date === state.matchDate ? state.matches : [] });
      if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      if (state.failSave) return respond(503, { ok: false });
      if (current.revision !== body.revision) return respond(409, { ok: false, document: current });
      const next = { revision: current.revision + 1, fields: { ...current.fields, ...body.patch }, updatedAt: new Date().toISOString() };
      documents.set(key, next);
      return respond(200, { ok: true, revision: next.revision, updatedAt: next.updatedAt });
    }
    return respond(404, { ok: false });
  });
  return { requests, documents, state };
}
async function login(page, id = 'LK-0080', remember = true) {
  await page.goto(`/feedback.html?player=${id}&date=2026-10-11`);
  const form = page.locator(`.notebook-login[data-player="${id}"]`);
  await form.locator('input[type=password]').fill('synthetic-only-password');
  await form.locator('input[type=checkbox]').setChecked(remember);
  await form.locator('button[type=submit]').click();
  await expect(page.locator('#notebook-date')).toBeVisible();
}

test('private directory has no club gate/data request; player login restores for eight weeks and locks', async ({ page, context }) => {
  const { requests } = await mock(context), errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/feedback.html?player=LK-0080');
  await expect(page.locator('.notebook-directory')).toBeVisible();
  await expect(page.locator('#site-password-gate')).toHaveCount(0);
  expect(requests.map(request => request.path)).toEqual(['/api/reflections/directory']);
  const form = page.locator('.notebook-login[data-player="LK-0080"]');
  await form.locator('input[type=password]').fill('wrong'); await form.locator('button').click();
  await expect(form.locator('[role=status]')).not.toBeEmpty();
  await expect(page.locator('.notebook-day')).toHaveCount(0);
  await login(page);
  await expect(page.locator('#notebook-history-month')).toBeDisabled();
  await expect(page.locator('#notebook-latest')).toBeDisabled();
  await expect(page.locator('#notebook-history-empty')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toContain('lk-private-reflection-session-uat');
  requests.length = 0; await page.reload();
  await expect(page.locator('#notebook-date')).toBeVisible();
  expect(requests.some(request => request.path === '/api/reflections/session')).toBe(true);
  expect(requests.some(request => ['/api/public-data', '/api/admin-data', '/api/session'].includes(request.path))).toBe(false);
  await page.locator('#notebook-lock').click();
  await expect(page.locator('.notebook-directory')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('lk-private-reflection-session-uat'))).toBeNull();
  expect(errors).toEqual([]);
});

test('match/daily layout, manual bilingual coach block and autosave retain paragraphs without local drafts', async ({ page, context }) => {
  const { documents } = await mock(context); await login(page);
  await expect(page.locator('.notebook-matches > .notebook-match')).toHaveCount(2);
  await expect(page.locator('#notebook-coach')).toHaveCount(1); // one daily coach block
  await expect(page.locator('.notebook-match img')).toHaveCount(0); // escaped opponent
  await expect(page.locator('[data-field="match.training:M-001.en"]')).toBeVisible();
  await page.locator('[data-field="match.training:M-001.en"]').fill('First paragraph.\n\nNext focus.');
  await page.locator('[data-field="coach.ja"]').fill('1. 合成テスト\n2. 次の項目');
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  const savedMatch = documents.get('LK-0080|2026-10-11').fields['match.training:M-001.en'];
  expect(Rich.text(savedMatch)).toBe('First paragraph.\n\nNext focus.');
  expect(Rich.valid(savedMatch)).toBe(true); // Replacing a rich starter may retain its final bullet formatting.
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('First paragraph');
  await page.locator('#language-toggle').click();
  await expect(page.locator('[data-field="coach.en"]')).toBeVisible();
  await expect(page.locator('#feedback-app')).toContainText('Translation is manual');
  await page.locator('#notebook-date').fill('2026-10-10'); await page.locator('#notebook-date').press('Tab');
  await expect(page.locator('[data-field="daily.en"]')).toBeVisible();
  await page.locator('[data-field="daily.en"]').fill('Daily practice');
  await expect(page.locator('#notebook-status')).toContainText('Saved');
  await page.locator('#notebook-date').fill('2026-10-09'); await page.locator('#notebook-date').press('Tab');
  await expect(page.locator('.notebook-rest')).toContainText('Friday');
  await expect(page.locator('[data-field]')).toHaveCount(0); // no Friday writing prompt
  await page.locator('#notebook-date').fill('2026-10-11'); await page.locator('#notebook-date').press('Tab');
  await expectWriting(page.locator('[data-field="match.training:M-001.en"]'), 'First paragraph.\n\nNext focus.');
});

test('Friday is skipped in both directions; explicit rest dates have no inputs and saved Friday notes stay accessible', async ({ page, context }) => {
  const { documents, requests, state } = await mock(context);
  documents.set('LK-0080|2026-10-02', { revision: 1, fields: { 'daily.en': 'Synthetic historical Friday note.' } });
  await login(page);
  await expect(page.locator('#notebook-date-label')).toHaveText('2026-10-11 (日曜日)');
  await expect(page.locator('#notebook-history option[value="2026-10-02"]')).toHaveText('2026-10-02 (金曜日)');
  await page.locator('#notebook-date').fill('2026-10-08'); await page.locator('#notebook-date').press('Tab');
  await expect(page.locator('#notebook-date-label')).toHaveText('2026-10-08 (木曜日)');
  state.failSave = true;
  await page.locator('[data-field="daily.en"]').fill('Synthetic Thursday note before the rest day.');
  await expect(page.locator('#notebook-status')).toContainText('保存できません');
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-step="1"]').click();
  await expect(page.locator('#notebook-date')).toHaveValue('2026-10-08');
  state.failSave = false; await page.locator('#notebook-retry').click();
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  await page.locator('[data-step="1"]').click();
  await expect(page.locator('#notebook-date')).toHaveValue('2026-10-10');
  await page.locator('[data-step="-1"]').click();
  await expect(page.locator('#notebook-date')).toHaveValue('2026-10-08');
  await expectWriting(page.locator('[data-field="daily.en"]'), 'Synthetic Thursday note before the rest day.');
  await page.locator('#notebook-date').fill('2026-10-09'); await page.locator('#notebook-date').press('Tab');
  await expect(page.locator('.notebook-rest')).toContainText('お休み');
  await expect(page.locator('[data-field]')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.notebook-rest')).toBeVisible();
  await page.locator('#language-toggle').click();
  await expect(page.locator('#notebook-date-label')).toHaveText('2026-10-09 (Friday)');
  await expect(page.locator('.notebook-rest')).toContainText('no practice or reflection needed');
  expect(requests.filter(request => request.body?.patch).length).toBeGreaterThan(0);
  expect(documents.has('LK-0080|2026-10-09')).toBe(false);
  await page.locator('#notebook-history').selectOption('2026-10-02');
  await expectWriting(page.locator('[data-field="daily.en"]'), 'Synthetic historical Friday note.');
  await expect(page.locator('.notebook-schedule')).toContainText(['Date arrows skip Fridays.', 'previously saved note']);
  await expect(page.locator('#notebook-history option[value="2026-10-02"]')).toHaveText('2026-10-02 (Friday)');
  await page.locator('[data-step="1"]').click(); await expect(page.locator('#notebook-date')).toHaveValue('2026-10-03');
  await page.locator('#notebook-date').fill('2026-12-31'); await page.locator('#notebook-date').press('Tab');
  await expect(page.locator('#notebook-date-label')).toHaveText('2026-12-31 (Thursday)');
  await page.locator('[data-step="1"]').click(); await expect(page.locator('#notebook-date')).toHaveValue('2027-01-02');
  await page.locator('[data-step="-1"]').click(); await expect(page.locator('#notebook-date')).toHaveValue('2026-12-31');
});

test.describe('notebook calendar outside Japan', () => {
  test.use({ timezoneId: 'Pacific/Kiritimati' });
  test('default notebook date uses Tokyo time and selects Thursday on a Friday', async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('lk-language', 'en'));
    await page.clock.setFixedTime(new Date('2026-10-09T01:00:00Z'));
    await mock(context);
    await page.goto('/feedback.html?player=LK-0080');
    const form = page.locator('.notebook-login[data-player="LK-0080"]');
    await form.locator('input[type=password]').fill('synthetic-only-password'); await form.locator('button').click();
    await expect(page.locator('#notebook-date')).toHaveValue('2026-10-08');
    await expect(page.locator('#notebook-date-label')).toHaveText('2026-10-08 (Thursday)');
    await page.clock.setFixedTime(new Date('2026-10-09T23:00:00Z'));
    await page.goto('/feedback.html');
    await expect(page.locator('#notebook-date')).toHaveValue('2026-10-10');
    await expect(page.locator('#notebook-date-label')).toHaveText('2026-10-10 (Saturday)');
  });
});

test('failed autosave blocks date changes, retries, and reauthentication keeps unsynced writing', async ({ page, context }) => {
  const { state, documents } = await mock(context); await login(page);
  state.failSave = true;
  await page.locator('[data-field="coach.ja"]').fill('Unsynced synthetic note');
  await expect(page.locator('#notebook-status')).toContainText('保存できません');
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-step="-1"]').click();
  await expect(page.locator('#notebook-date')).toHaveValue('2026-10-11');
  state.failSave = false; state.expire = true;
  await page.locator('#notebook-retry').click();
  await expect(page.locator('#notebook-reauth input[type=password]')).toBeVisible();
  await expectWriting(page.locator('[data-field="coach.ja"]'), 'Unsynced synthetic note');
  await page.locator('#notebook-reauth input[type=password]').fill('synthetic-only-password');
  await page.locator('#notebook-reauth button').click();
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  expect(documents.get('LK-0080|2026-10-11').fields['coach.ja']).toBe('Unsynced synthetic note');
});

test('stale tabs retain both versions and require an explicit conflict choice', async ({ page, context }) => {
  await mock(context); await login(page);
  const other = await context.newPage(); await other.goto('/feedback.html?date=2026-10-11');
  await expect(other.locator('[data-field="coach.ja"]')).toBeVisible();
  await page.locator('[data-field="coach.ja"]').fill('Saved in first tab');
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  await other.locator('[data-field="coach.ja"]').fill('Unsaved in second tab');
  await expect(other.locator('#notebook-conflict')).toContainText('Saved in first tab');
  await expect(other.locator('#notebook-conflict')).toContainText('Unsaved in second tab');
  await other.locator('#notebook-use-mine').click();
  await expect(other.locator('#notebook-status')).toContainText('保存済み');
  await page.reload(); await expectWriting(page.locator('[data-field="coach.ja"]'), 'Unsaved in second tab');
});

test('future accounts are Japanese-only and selecting another player requires their password', async ({ page, context }) => {
  const { requests } = await mock(context); await login(page, 'LK-0003');
  await expect(page.locator('[data-field$=".en"]')).toHaveCount(0);
  await page.locator('[data-mode="read"]').click();
  await expect(page.locator('[data-read-field$=".en"]')).toHaveCount(0);
  await expect(page.locator('[data-read-field="coach.ja"]')).toHaveText('未記入');
  requests.length = 0; await page.goto('/feedback.html?player=LK-0002');
  await expect(page.locator('.notebook-login[data-player="LK-0002"]')).toBeVisible();
  expect(requests.some(request => request.path === '/api/reflections/day')).toBe(false);
});

test('in-flight edits serialize, and offline writing resumes without a plaintext recovery cache', async ({ page, context }) => {
  const { state, documents } = await mock(context); await login(page, 'LK-0080', false);
  state.delay = 500;
  await page.locator('[data-field="coach.ja"]').fill('Earlier synthetic text');
  await expect(page.locator('#notebook-status')).toContainText('保存中');
  await page.locator('[data-field="coach.ja"]').fill('Latest synthetic text');
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  expect(documents.get('LK-0080|2026-10-11').fields['coach.ja']).toBe('Latest synthetic text');
  expect(await page.evaluate(() => localStorage.getItem('lk-private-reflection-session-uat'))).toBeNull();
  await context.setOffline(true);
  await page.locator('[data-field="coach.ja"]').fill('Offline synthetic text');
  await expect(page.locator('#notebook-status')).toContainText('オフライン');
  await context.setOffline(false);
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  expect(documents.get('LK-0080|2026-10-11').fields['coach.ja']).toBe('Offline synthetic text');
  await page.reload();
  await expect(page.locator('.notebook-directory')).toBeVisible();
});

test('private login and notebook fit mobile and desktop in both languages', async ({ page, context }) => {
  await mock(context);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/feedback.html?player=LK-0080');
    await expect(page.locator('.notebook-directory')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(await page.locator('.notebook-login[data-player="LK-0080"] input[type=password]').evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThan(900);
    await login(page);
    for (let index = 0; index < 2; index++) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      expect(await page.locator('#notebook-lock').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      await page.locator('#language-toggle').click();
    }
    await page.locator('#notebook-lock').click();
    await expect(page.locator('.notebook-directory')).toBeVisible();
  }
});

test('a frozen-page return revalidates access before revealing notebook text', async ({ page, context }) => {
  const { state } = await mock(context); await login(page);
  await page.locator('[data-field="coach.ja"]').fill('Synthetic frozen-page note');
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.locator('#feedback-app')).not.toBeVisible();
  state.expire = true;
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('#notebook-reauth input[type=password]')).toBeVisible();
  await expect(page.locator('.notebook-day')).not.toBeVisible();
  await expect(page.locator('.notebook-dates')).not.toBeVisible();
  await page.locator('#notebook-reauth input[type=password]').fill('synthetic-only-password');
  await page.locator('#notebook-reauth button').click();
  await expectWriting(page.locator('[data-field="coach.ja"]'), 'Synthetic frozen-page note');
});

test('all writing is expanded and text areas fit long content on load, typing, resizing and language changes', async ({ page, context }) => {
  const { documents } = await mock(context);
  const longText = '\n\n' + Array.from({ length: 35 }, (_, index) => `${index + 1}. Synthetic table-tennis reflection with numbered coaching advice and next focus.`).join('\n\n');
  documents.set('LK-0080|2026-10-11', { revision: 1, fields: { 'daily.en': longText, 'coach.ja': longText, 'match.training:M-001.en': longText } });
  await page.setViewportSize({ width: 390, height: 900 }); await login(page);
  await expect(page.locator('.notebook-day details')).toHaveCount(0);
  await expect(page.locator('.notebook-directory details:not([open])')).toHaveCount(0);
  const field = page.locator('[data-field="match.training:M-001.en"]');
  await expectWriting(field, longText);
  const fits = () => field.evaluate(element => element.clientHeight >= element.scrollHeight - 1 && element.scrollTop === 0);
  await expect.poll(fits).toBe(true);
  await field.fill(longText + '\n\nMore synthetic writing.');
  await expect.poll(fits).toBe(true);
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  for (const width of [1440, 320, 390]) {
    await page.setViewportSize({ width, height: 900 }); await expect.poll(fits).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
  await page.locator('#language-toggle').click(); await expect.poll(fits).toBe(true);
  await expect(page.locator('.notebook-privacy')).toContainText('club administrators');
  await expect(page.locator('.notebook-privacy')).not.toContainText('Infrastructure operators');
  await page.reload(); await expectWriting(field, longText + '\n\nMore synthetic writing.'); await expect.poll(fits).toBe(true);
  await field.fill('Short note'); await expect.poll(() => field.evaluate(element => element.clientHeight)).toBeLessThan(200);
  await expect(page.locator('#notebook-status')).toContainText('Saved');
  await page.locator('.notebook-jump a[href="#notebook-coach"]').click();
  await expect.poll(() => page.evaluate(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect(), status = document.querySelector('.notebook-savebar').getBoundingClientRect(), coach = document.querySelector('#notebook-coach').getBoundingClientRect();
    return status.top >= header.bottom - 1 && coach.top >= status.bottom - 1 && Boolean(document.elementFromPoint(40, header.bottom / 2)?.closest('.site-header'));
  })).toBe(true);
});

test('Read mode preserves complete paragraphs, languages and orphan notes without editable controls or writes', async ({ page, context }) => {
  const { documents, requests } = await mock(context), errors = []; page.on('pageerror', error => errors.push(error.message));
  const text = '\n\nSynthetic reading paragraph.\n\n' + 'Long synthetic text without truncation. '.repeat(150);
  documents.set('LK-0080|2026-10-11', { revision: 2, fields: { activity: 'Synthetic training', 'daily.en': text, 'daily.ja': '合成の振り返り\n\n次の段落', 'coach.ja': '1. 合成のアドバイス\n2. 合成の項目', 'match.training:REMOVED.en': '<img src=x onerror=alert(1)> Synthetic orphan note' } });
  await login(page); await page.locator('[data-mode="read"]').click();
  await expect(page.locator('[data-mode="read"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.notebook-day textarea,.notebook-day input,.notebook-day [contenteditable]')).toHaveCount(0);
  await expect(page.locator('[data-read-field="daily.en"]')).toHaveText(text, { useInnerText: false });
  expect(await page.locator('[data-read-field="daily.en"]').textContent()).toBe(text);
  await expect(page.locator('[data-read-field="match.training:REMOVED.en"]')).toContainText('<img src=x');
  await expect(page.locator('.notebook-day img')).toHaveCount(0);
  await expect(page.locator('[data-read-field="coach.en"]')).toHaveText('未記入');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (let index = 0; index < 2; index++) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      await expect(page.locator('.notebook-day details')).toHaveCount(0);
      await page.locator('#language-toggle').click();
    }
  }
  await page.locator('#notebook-history').selectOption('2026-10-11');
  await expect(page.locator('[data-read-field="daily.en"]')).toContainText('Synthetic reading paragraph');
  await page.locator('[data-mode="write"]').click();
  await expectWriting(page.locator('[data-field="daily.en"]'), text);
  expect(requests.filter(request => request.body?.patch)).toHaveLength(0);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Synthetic reading paragraph');
  expect(errors).toEqual([]);
});

test('switching to Read waits for in-flight edits and blocks failures, expiry and conflicts without dropping writing', async ({ page, context }) => {
  const { state, documents } = await mock(context); await login(page);
  state.delay = 1000;
  await page.locator('[data-field="coach.ja"]').fill('First synthetic in-flight text');
  await expect(page.locator('#notebook-status')).toContainText('保存中');
  await page.locator('[data-field="coach.ja"]').fill('Latest synthetic in-flight text');
  await page.locator('[data-mode="read"]').click();
  await expect(page.locator('[data-mode="write"]')).toBeDisabled();
  await expect(page.locator('#notebook-date')).toBeDisabled();
  await expect(page.locator('[data-read-field="coach.ja"]')).toHaveText('Latest synthetic in-flight text');
  expect(documents.get('LK-0080|2026-10-11').fields['coach.ja']).toBe('Latest synthetic in-flight text');
  await page.locator('[data-mode="write"]').click(); state.delay = 0; state.failSave = true;
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-field="coach.ja"]').fill('Synthetic unsynced text');
  await page.locator('[data-mode="read"]').click();
  await expect(page.locator('[data-mode="write"]')).toHaveAttribute('aria-pressed', 'true');
  await expectWriting(page.locator('[data-field="coach.ja"]'), 'Synthetic unsynced text');
  await context.setOffline(true); await page.locator('[data-mode="read"]').click();
  await expect(page.locator('#notebook-status')).toContainText('オフライン');
  await expectWriting(page.locator('[data-field="coach.ja"]'), 'Synthetic unsynced text');
  state.failSave = false; state.expire = true;
  await context.setOffline(false);
  await expect(page.locator('#notebook-reauth input[type=password]')).toBeVisible();
  await expect(page.locator('.notebook-tools')).not.toBeVisible();
  await page.locator('#notebook-reauth input[type=password]').fill('synthetic-only-password'); await page.locator('#notebook-reauth button').click();
  await expectWriting(page.locator('[data-field="coach.ja"]'), 'Synthetic unsynced text');
  documents.set('LK-0080|2026-10-11', { revision: documents.get('LK-0080|2026-10-11').revision + 1, fields: { 'coach.ja': 'Newer synthetic server text' } });
  await page.locator('[data-field="coach.ja"]').fill('Conflicting synthetic local text');
  await page.locator('[data-mode="read"]').click();
  await expect(page.locator('#notebook-conflict')).toContainText('Newer synthetic server text');
  await expectWriting(page.locator('[data-field="coach.ja"]'), 'Conflicting synthetic local text');
  await expect(page.locator('[data-mode="write"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#notebook-use-mine').click(); await expect(page.locator('#notebook-status')).toContainText('保存済み');
  await page.locator('[data-mode="read"]').click(); await expect(page.locator('[data-read-field="coach.ja"]')).toHaveText('Conflicting synthetic local text');
});

test('month filtering never changes the open day; latest navigation is save-safe and new saved months appear immediately', async ({ page, context }) => {
  const { documents, state } = await mock(context);
  for (const date of ['2026-09-30', '2026-09-26', '2026-10-02']) documents.set(`LK-0080|${date}`, { revision: 1, fields: { 'daily.en': `Synthetic history for ${date}` } });
  await login(page);
  await page.locator('#notebook-history-month').selectOption('2026-09');
  await expect(page.locator('#notebook-history option')).toHaveCount(3);
  await expect(page.locator('#notebook-date')).toHaveValue('2026-10-11');
  await page.locator('#notebook-history').selectOption('2026-09-30');
  await expectWriting(page.locator('[data-field="daily.en"]'), 'Synthetic history for 2026-09-30');
  state.failSave = true; page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-field="daily.en"]').fill('Unsynced synthetic history edit');
  await page.locator('#notebook-latest').click();
  await expect(page.locator('#notebook-date')).toHaveValue('2026-09-30');
  await expect(page.locator('#notebook-history-month')).toHaveValue('2026-09');
  state.failSave = false; await page.locator('#notebook-retry').click(); await expect(page.locator('#notebook-status')).toContainText('保存済み');
  await page.locator('#notebook-latest').click();
  await expect(page.locator('#notebook-date')).toHaveValue('2026-10-02');
  await expect(page.locator('#notebook-history-month')).toHaveValue('');
  await page.locator('#notebook-date').fill('2027-01-02'); await page.locator('#notebook-date').press('Tab');
  await expectWriting(page.locator('[data-field="daily.en"]'), Rich.text(Rich.practiceTemplate('LK-0080', '2027-01-02')));
  await page.locator('[data-field="daily.en"]').fill('Synthetic new-month note'); await expect(page.locator('#notebook-status')).toContainText('保存済み');
  await expect(page.locator('#notebook-history-month option[value="2027-01"]')).toBeAttached();
  await expect(page.locator('#notebook-history')).toHaveValue('2027-01-02');
  await page.locator('[data-mode="read"]').click();
  await page.locator('#notebook-history-month').selectOption('2026-09'); await page.locator('#notebook-history').selectOption('2026-09-30');
  await expect(page.locator('[data-read-field="daily.en"]')).toHaveText('Unsynced synthetic history edit');
  await page.locator('#notebook-latest').click(); await expect(page.locator('#notebook-date')).toHaveValue('2027-01-02');
  await expect(page.locator('[data-read-field="daily.en"]')).toHaveText('Synthetic new-month note');
});

test('Read mode is cleared or hidden on cross-tab sign-out and frozen-page expiry', async ({ page, context }) => {
  const { documents, state } = await mock(context);
  documents.set('LK-0080|2026-10-11', { revision: 1, fields: { 'daily.en': 'Synthetic private reading text' } });
  await login(page); await page.locator('[data-mode="read"]').click();
  await expect(page.locator('[data-read-field="daily.en"]')).toHaveText('Synthetic private reading text');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.locator('#feedback-app')).not.toBeVisible(); state.expire = true;
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('.notebook-day')).not.toBeVisible(); await expect(page.locator('.notebook-tools')).not.toBeVisible();
  await page.locator('#notebook-reauth input[type=password]').fill('synthetic-only-password'); await page.locator('#notebook-reauth button').click();
  await expect(page.locator('[data-read-field="daily.en"]')).toBeVisible();
  await page.evaluate(() => { const key = 'lk-private-reflection-session-uat', oldValue = localStorage.getItem(key); localStorage.removeItem(key); window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue: null })); });
  await expect(page.locator('.notebook-directory')).toBeVisible(); await expect(page.locator('[data-read-field]')).toHaveCount(0);
});

test('restricted formatted paste round-trips safely through autosave, reload and Read without external resources', async ({ page, context }) => {
  const { documents, requests } = await mock(context), resources = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('https://clipboard-unsafe.test/**', route => { resources.push(route.request().url()); return route.abort(); });
  await login(page);
  const field = page.locator('[data-field="daily.en"]');
  const html = '<h2>Practice</h2><p><strong>Learned</strong> <em>today</em>.</p><p><br></p><ul>\n<li>First item</li>\n<li>Second item</li>\n</ul><ol><li>Next focus</li></ol><p><a href="https://clipboard-unsafe.test/link">Link text</a></p><img src="https://clipboard-unsafe.test/image" onerror="window.clipboardExecuted=true"><iframe src="https://clipboard-unsafe.test/frame"></iframe><script>window.clipboardExecuted=true</script>';
  await paste(field, html);
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  const saved = documents.get('LK-0080|2026-10-11').fields['daily.en'];
  expect(Rich.valid(saved)).toBe(true); expect(saved.format).toBe('lk-rich-v1');
  expect(JSON.stringify(saved)).not.toMatch(/https:|script|iframe|onerror|<h2>/);
  expect(Rich.text(saved)).toContain('First item\nSecond item');
  await page.reload(); await expect(field.locator('strong')).toHaveText('Learned'); await expect(field.locator('em')).toHaveText('today');
  await page.locator('[data-mode="read"]').click();
  const reading = page.locator('[data-read-field="daily.en"]');
  await expect(reading.locator('strong')).toHaveText('Learned'); await expect(reading.locator('em')).toHaveText('today');
  await expect(reading.locator('ul li')).toHaveCount(2); await expect(reading.locator('ol li')).toHaveText('Next focus');
  await expect(reading.locator('img,iframe,script,a,table,h2')).toHaveCount(0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
  expect(resources).toEqual([]); expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.clipboardExecuted)).toBeUndefined();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Next focus');
  expect(requests.filter(request => request.body?.patch).every(request => Object.keys(request.body.patch).length === 1)).toBe(true);
});

test('toolbar bold/italic/lists and undo/redo preserve legacy text; unchanged mode/language switches do not rewrite it', async ({ page, context }) => {
  const { documents, requests } = await mock(context), original = 'Synthetic practice\nNext focus';
  documents.set('LK-0080|2026-10-11', { revision: 4, fields: { 'daily.en': original, 'coach.ja': '\n\n合成のアドバイス\n\n' } });
  await login(page);
  await page.locator('#language-toggle').click(); await page.locator('[data-mode="read"]').click(); await page.locator('[data-mode="write"]').click();
  expect(requests.filter(request => request.body?.patch)).toHaveLength(0);
  expect(documents.get('LK-0080|2026-10-11').fields['coach.ja']).toBe('\n\n合成のアドバイス\n\n');
  const field = page.locator('[data-field="daily.en"]'), host = page.locator('[data-rich-field="daily.en"]');
  await field.evaluate(element => window.Quill.find(element.parentElement).setSelection(0, 9));
  await host.getByRole('button', { name: 'Bold', exact: true }).click(); await expect(field.locator('strong')).toHaveText('Synthetic');
  await host.getByRole('button', { name: 'Italic', exact: true }).click(); await expect(field.locator('em')).toHaveText('Synthetic');
  await host.getByRole('button', { name: 'Bullet list', exact: true }).click(); await expect(field.locator('li[data-list="bullet"]')).toHaveCount(1);
  await host.getByRole('button', { name: 'Numbered list', exact: true }).click(); await expect(field.locator('li[data-list="ordered"]')).toHaveCount(1);
  await host.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(field.locator('li[data-list="bullet"]')).toHaveCount(1);
  await host.getByRole('button', { name: 'Redo', exact: true }).click(); await expect(field.locator('li[data-list="ordered"]')).toHaveCount(1);
  await expect(page.locator('#notebook-status')).toContainText('Saved');
  expect(Rich.text(documents.get('LK-0080|2026-10-11').fields['daily.en'])).toBe(original);
  await expectWriting(field, original);
  for (const button of await host.locator('button').all()) expect(await button.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
});

test('formatted in-flight/offline/conflicting edits remain intact, and conflict choices display formatting', async ({ page, context }) => {
  const { documents, state } = await mock(context); await login(page);
  const field = page.locator('[data-field="coach.ja"]'); state.delay = 800;
  await paste(field, '<p><strong>合成の未同期文章</strong></p><ul><li>合成項目</li></ul>');
  await expect(page.locator('#notebook-status')).toContainText('保存中');
  await field.press('End'); await field.press('ArrowRight'); await field.press('A');
  await page.locator('[data-mode="read"]').click(); await expect(page.locator('[data-read-field="coach.ja"] strong')).toHaveText('合成の未同期文章');
  state.delay = 0; await page.locator('[data-mode="write"]').click();
  await context.setOffline(true); await paste(field, '<p><em>Offline synthetic formatting</em></p>');
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-mode="read"]').click(); await expect(page.locator('[data-mode="write"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(field.locator('em')).toContainText('Offline synthetic formatting');
  await context.setOffline(false); await expect(page.locator('#notebook-status')).toContainText('保存済み');
  const current = documents.get('LK-0080|2026-10-11');
  documents.set('LK-0080|2026-10-11', { revision: current.revision + 1, fields: { ...current.fields, 'coach.ja': { format: 'lk-rich-v1', ops: [{ insert: 'Synthetic server version', attributes: { bold: true } }, { insert: '\n' }] } } });
  await paste(field, '<p><em>Synthetic local version</em></p>');
  await page.locator('[data-mode="read"]').click(); await expect(page.locator('#notebook-conflict strong')).toContainText(['coach.ja', 'Synthetic server version']);
  await expect(page.locator('#notebook-conflict em').filter({ hasText: 'Synthetic local version' })).toHaveCount(1);
  await page.locator('#notebook-use-mine').click(); await expect(page.locator('#notebook-status')).toContainText('保存済み');
  await page.locator('[data-mode="read"]').click(); await expect(page.locator('[data-read-field="coach.ja"] em').filter({ hasText: 'Synthetic local version' })).toHaveCount(1);
});

test('plain/Markdown paste stays literal; excessive input preserves prior text and composition blocks navigation', async ({ page, context }) => {
  const { documents, requests } = await mock(context); await login(page);
  const field = page.locator('[data-field="daily.en"]');
  await paste(field, '', '\n\n**Literal Markdown**\n- literal list\n\n');
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  await expectWriting(field, '\n\n**Literal Markdown**\n- literal list\n\n');
  expect(typeof documents.get('LK-0080|2026-10-11').fields['daily.en']).toBe('string');
  await paste(field, '', 'x'.repeat(8001));
  await expect(page.locator('[data-rich-field="daily.en"] .notebook-editor-message')).toContainText('8,000');
  await expectWriting(field, '\n\n**Literal Markdown**\n- literal list\n\n');
  await paste(field, '<div>'.repeat(100) + 'Deep synthetic paste' + '</div>'.repeat(100));
  await expectWriting(field, '\n\n**Literal Markdown**\n- literal list\n\n');
  requests.length = 0; page.on('dialog', dialog => dialog.accept());
  await field.evaluate(element => element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
  await field.fill('日本語の合成入力');
  await page.locator('[data-mode="read"]').click(); await expect(page.locator('[data-mode="write"]')).toHaveAttribute('aria-pressed', 'true');
  expect(requests.filter(request => request.body?.patch)).toHaveLength(0);
  await field.evaluate(element => element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  expect(documents.get('LK-0080|2026-10-11').fields['daily.en']).toBe('日本語の合成入力');
});

test('cross-tab invalidation retains partially composed synthetic writing for same-player reauthentication', async ({ page, context }) => {
  const { documents } = await mock(context); await login(page);
  const field = page.locator('[data-field="coach.ja"]');
  await field.evaluate(element => element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
  await field.fill('合成の入力途中');
  await page.evaluate(() => {
    const key = 'lk-private-reflection-session-uat', token = localStorage.getItem(key);
    localStorage.removeItem(key); window.dispatchEvent(new StorageEvent('storage', { key, oldValue: token, newValue: null }));
  });
  await expect(page.locator('.notebook-day')).toBeHidden();
  await expect(page.locator('#notebook-reauth input[type=password]')).toBeVisible();
  await page.locator('#notebook-reauth input[type=password]').fill('synthetic-only-password'); await page.locator('#notebook-reauth button[type=submit]').click();
  await expectWriting(field, '合成の入力途中');
  await expect(page.locator('#notebook-status')).toContainText('保存済み');
  expect(documents.get('LK-0080|2026-10-11').fields['coach.ja']).toBe('合成の入力途中');
});

for (const id of ['LK-0080', 'LK-0002']) test(`match templates for ${id} follow daily reflection, stay unsaved until edited and preserve explicit clears`, async ({ page, context }) => {
  const { documents, requests, state } = await mock(context); await login(page, id);
  const first = page.locator('[data-field="match.training:M-001.en"]'), second = page.locator('[data-field="match.tournament:TM-001.en"]');
  const template = Rich.matchTemplate(players.find(player => player.playerId === id), state.matches[0]);
  const isDailyFirst = () => page.evaluate(() => Boolean(document.querySelector('#notebook-daily').compareDocumentPosition(document.querySelector('#notebook-matches')) & Node.DOCUMENT_POSITION_FOLLOWING));
  expect(await isDailyFirst()).toBe(true);
  await expectWriting(first, Rich.text(template)); await expect(first.locator('strong')).toHaveText(['What I Did Well:', 'Things to Improve:']);
  await expect(first.locator('li[data-list="bullet"]')).toHaveCount(2); await expect(first.locator('img')).toHaveCount(0);
  await expectWriting(second, Rich.text(Rich.matchTemplate(players.find(player => player.playerId === id), state.matches[1])));
  await expectWriting(page.locator('[data-field="daily.en"]'), ''); await expectWriting(page.locator('[data-field="match.training:M-001.ja"]'), '');
  await first.focus(); await page.locator('#notebook-date').focus(); await page.locator('#language-toggle').click();
  await expectWriting(first, Rich.text(template)); expect(await isDailyFirst()).toBe(true);
  await page.locator('[data-mode="read"]').click(); expect(await isDailyFirst()).toBe(true);
  await expect(page.locator('[data-read-field="match.training:M-001.en"]')).toHaveText('Not written');
  expect(requests.filter(request => request.body?.patch)).toHaveLength(0); expect(documents.has(`${id}|2026-10-11`)).toBe(false);
  await page.locator('[data-mode="write"]').click();
  await first.evaluate(element => { const editor = window.Quill.find(element.parentElement); editor.setSelection(editor.getText().indexOf('What I Did Well:') + 'What I Did Well:'.length + 1, 0); });
  await first.pressSequentially('Synthetic match focus'); await page.locator('[data-mode="read"]').click();
  await expect(page.locator('[data-read-field="match.training:M-001.en"] li').first()).toHaveText('Synthetic match focus');
  expect(Object.keys(documents.get(`${id}|2026-10-11`).fields)).toEqual(['match.training:M-001.en']);
  expect(Rich.valid(documents.get(`${id}|2026-10-11`).fields['match.training:M-001.en'])).toBe(true);
  await page.reload(); await expect(first.locator('li').first()).toHaveText('Synthetic match focus');
  await first.fill(''); await page.locator('[data-mode="read"]').click(); await page.reload(); await expectWriting(first, '');
  await expectWriting(second, Rich.text(Rich.matchTemplate(players.find(player => player.playerId === id), state.matches[1])));
});

test('daily-first layout applies to recorded matches on other weekdays and to the fictional preview', async ({ page, context }) => {
  const { requests, state } = await mock(context); await login(page);
  for (const date of ['2026-10-08', '2026-10-12']) {
    state.matchDate = date; await page.locator('#notebook-date').fill(date); await page.locator('#notebook-date').press('Tab');
    await expect(page.locator('.notebook-match')).toHaveCount(2);
    expect(await page.evaluate(() => Boolean(document.querySelector('#notebook-daily').compareDocumentPosition(document.querySelector('#notebook-matches')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  }
  expect(requests.filter(request => request.body?.patch)).toHaveLength(0);
  await page.goto('/notebook-sample.html'); await page.locator('#sample-day').selectOption('matches');
  expect(await page.evaluate(() => Boolean(document.querySelector('#sample-daily').compareDocumentPosition(document.querySelector('.notebook-matches')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(page.locator('[data-sample-read="match.b.en"]')).toContainText('Match: Sample Player 1 - 3 Sample Opponent B');
  await expect(page.locator('[data-sample-read="match.b.en"] strong')).toHaveText(['What I Did Well:', 'Things to Improve:']);
});

test('match templates preserve existing strings, rich notes, cleared fields and orphan notes, and exclude future accounts', async ({ page, context }) => {
  const { documents, requests } = await mock(context);
  const richNote = { format: 'lk-rich-v1', ops: [{ insert: 'Existing synthetic match note', attributes: { bold: true } }, { insert: '\n' }] };
  const fields = { 'daily.en': '\nExisting daily\n', 'match.training:M-001.en': '', 'match.training:M-001.ja': '合成の既存ノート', 'match.tournament:TM-001.en': richNote, 'match.training:ORPHAN.en': 'Preserved orphan' };
  documents.set('LK-0080|2026-10-11', { revision: 4, fields }); await login(page);
  await expectWriting(page.locator('[data-field="match.training:M-001.en"]'), '');
  await expect(page.locator('[data-field="match.tournament:TM-001.en"] strong')).toHaveText('Existing synthetic match note');
  await expectWriting(page.locator('[data-field="match.training:ORPHAN.en"]'), 'Preserved orphan');
  await page.locator('[data-mode="read"]').click(); await expect(page.locator('[data-read-field="daily.en"]')).toHaveText('Existing daily');
  expect(documents.get('LK-0080|2026-10-11')).toEqual({ revision: 4, fields });
  await page.locator('#notebook-lock').click(); await login(page, 'LK-0003');
  await expectWriting(page.locator('[data-field="match.training:M-001.ja"]'), ''); await expect(page.locator('.notebook-template-hint')).toHaveCount(0);
  expect(requests.filter(request => request.body?.patch)).toHaveLength(0);
});

for (const id of ['LK-0080', 'LK-0002']) test(`practice template for ${id} is unsaved until edited; labels and Activity input are simplified`, async ({ page, context }) => {
  const { documents, requests } = await mock(context); await login(page, id);
  const headings = id === 'LK-0080' ? ['Things to Improve', 'What I Practised Today', 'What I Noticed or Learned Today'] : ['What I Did Well', 'Things to Improve'];
  const field = page.locator('[data-field="daily.en"]');
  await expectWriting(field, ''); // Recorded match day never gets the practice template.
  await page.locator('#notebook-date').fill('2026-10-10'); await page.locator('#notebook-date').press('Tab');
  await expectWriting(field, Rich.text(Rich.practiceTemplate(id, '2026-10-10')));
  await expect(field).toContainText('10 October 2026 (Saturday)');
  await page.locator('#notebook-date').fill('2026-10-13'); await page.locator('#notebook-date').press('Tab');
  await expectWriting(field, Rich.text(Rich.practiceTemplate(id, '2026-10-13')));
  await expect(field).toContainText('13 October 2026 (Tuesday)');
  await expect(field.locator('strong')).toHaveText(headings);
  await expect(field.locator('li[data-list="bullet"]')).toHaveCount(headings.length);
  await expectWriting(page.locator('[data-field="daily.ja"]'), '');
  await expectWriting(page.locator('[data-field="coach.ja"]'), '');
  await expect(page.locator('input[data-field="activity"]')).toHaveCount(0);
  await expect(page.locator('#notebook-coach h2')).toHaveText('コーチのアドバイス');
  await expect(page.locator('.notebook-field > span')).not.toContainText(['（手入力）']);
  await field.focus(); await page.locator('#notebook-date').focus();
  await page.locator('#language-toggle').click();
  await expect(page.locator('#notebook-coach h2')).toHaveText('Coach feedback');
  await expect(page.locator('.notebook-field > span')).toContainText(['Japanese version', 'English version']);
  await expect(field).toContainText('13 October 2026 (Tuesday)');
  await expect(field.locator('strong')).toHaveText(headings);
  await page.locator('[data-mode="read"]').click(); await expect(page.locator('[data-read-field="daily.en"]')).toHaveText('Not written');
  expect(requests.filter(request => request.body?.patch)).toHaveLength(0);
  expect(documents.has(`${id}|2026-10-10`)).toBe(false);
  expect(documents.has(`${id}|2026-10-13`)).toBe(false);
  await page.locator('[data-mode="write"]').click();
  await field.evaluate(element => {
    const editor = window.Quill.find(element.parentElement);
    editor.setSelection(editor.getText().indexOf('\n', editor.getText().indexOf('\n\n') + 2) + 1, 0);
  });
  await field.pressSequentially('Synthetic focus');
  await page.locator('[data-mode="read"]').click();
  await expect(page.locator('[data-read-field="daily.en"] ul li').first()).toHaveText('Synthetic focus');
  expect(Rich.valid(documents.get(`${id}|2026-10-13`).fields['daily.en'])).toBe(true);
  expect(Rich.text(documents.get(`${id}|2026-10-13`).fields['daily.en'])).toContain('13 October 2026 (Tuesday)');
  expect(requests.filter(request => request.body?.patch).every(request => Object.keys(request.body.patch).join() === 'daily.en')).toBe(true);
  await page.reload(); await expect(field.locator('strong')).toHaveText(headings); await expect(field.locator('li').first()).toHaveText('Synthetic focus');
  await field.fill(''); await page.locator('[data-mode="read"]').click(); await page.reload();
  await expectWriting(field, ''); // An intentionally cleared/saved field stays cleared.
});

test('practice templates never replace existing plain/rich notes, Friday notes or other accounts', async ({ page, context }) => {
  const { documents } = await mock(context);
  documents.set('LK-0080|2026-10-10', { revision: 3, fields: { activity: 'Synthetic historical activity', 'daily.en': '\n\nExisting synthetic note\n\n' } });
  await login(page); await page.locator('#notebook-date').fill('2026-10-10'); await page.locator('#notebook-date').press('Tab');
  await expectWriting(page.locator('[data-field="daily.en"]'), '\n\nExisting synthetic note\n\n');
  await page.locator('[data-mode="read"]').click(); await expect(page.locator('[data-read-field="activity"]')).toHaveText('Synthetic historical activity');
  expect(documents.get('LK-0080|2026-10-10').revision).toBe(3);
  await page.locator('[data-mode="write"]').click();
  documents.set('LK-0080|2026-10-12', { revision: 1, fields: { 'daily.en': { format: 'lk-rich-v1', ops: [{ insert: 'Existing synthetic bold', attributes: { bold: true } }, { insert: '\n' }] } } });
  await page.locator('#notebook-date').fill('2026-10-12'); await page.locator('#notebook-date').press('Tab');
  await expect(page.locator('[data-field="daily.en"] strong')).toHaveText('Existing synthetic bold');
  documents.set('LK-0080|2026-10-09', { revision: 1, fields: { 'coach.ja': 'Synthetic preserved Friday advice' } });
  await page.locator('#notebook-date').fill('2026-10-09'); await page.locator('#notebook-date').press('Tab');
  await expectWriting(page.locator('[data-field="daily.en"]'), '');
  await page.locator('#notebook-lock').click(); await login(page, 'LK-0003');
  await page.locator('#notebook-date').fill('2026-10-10'); await page.locator('#notebook-date').press('Tab');
  await expectWriting(page.locator('[data-field="daily.ja"]'), ''); await expect(page.locator('.notebook-template-hint')).toHaveCount(0);
});

test('match evidence always shows both system names and bilingual results, never incomplete winners', async ({ page, context }) => {
  await mock(context);
  const matches = [
    { key: 'training:M-001', source: 'training', opponentId: 'LK-0003', opponentName: '現在の合成選手名', opponentEnglishName: 'Current Synthetic Opponent', score: '3-1', result: 'win' },
    { key: 'tournament:TM-001', source: 'tournament', opponentName: '<img src=x onerror=alert(1)>', opponentEnglishName: 'Current Synthetic External', score: '0-3', result: 'loss' },
    { key: 'training:M-002', source: 'training', opponentName: '合成の未完了対戦相手', score: '2-1', result: 'incomplete' }
  ];
  await context.route(`${API}/api/reflections/day**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, date: '2026-10-11', document: { revision: 0, fields: {} }, matches }) }));
  await login(page);
  const cards = page.locator('.notebook-match');
  await expect(cards.nth(0).locator('.is-winner')).toContainText('選手A'); await expect(cards.nth(0).locator('.is-loser')).toContainText('現在の合成選手名');
  await expect(cards.nth(0).locator('.notebook-romanized-name')).toHaveText(['Player A', 'Current Synthetic Opponent']);
  await expect(cards.nth(0).locator('.notebook-result-label')).toHaveText(['勝ち / Win', '負け / Loss']);
  await expect(cards.nth(1).locator('.notebook-result-label')).toHaveText(['負け / Loss', '勝ち / Win']);
  await expect(cards.nth(1).locator('img')).toHaveCount(0);
  await expect(cards.nth(2).locator('.notebook-result-label')).toHaveCount(0); await expect(cards.nth(2)).toContainText('勝敗は未確定');
  await expect(cards.nth(2)).toContainText('no winner recorded');
  await expect(cards.nth(2).locator('.notebook-romanized-name').last()).toHaveText('ローマ字名未登録 / Romanized name not recorded');
  await page.locator('#language-toggle').click();
  await expect(cards.nth(0).locator('.is-winner')).toContainText('Player A'); await expect(cards.nth(0).locator('.is-loser')).toContainText('Current Synthetic Opponent');
  await expect(cards.nth(0).locator('.notebook-match-side strong')).toHaveText(['選手A', '現在の合成選手名']);
  await expect(cards.nth(0).locator('.notebook-result-label')).toHaveText(['勝ち / Win', '負け / Loss']);
  await expect(cards.nth(1).locator('.is-winner')).toContainText('Current Synthetic External');
  await expect(cards.nth(2)).toContainText('未完了 / Incomplete — 勝敗は未確定 / no winner recorded');
  for (const width of [320, 390, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0); }
  await page.locator('[data-mode="read"]').click(); await expect(cards.nth(0).locator('.notebook-result-label')).toHaveText(['勝ち / Win', '負け / Loss']);
  await expect(cards.nth(0).locator('.notebook-match-side strong')).toHaveText(['選手A', '現在の合成選手名']);
  await expect(cards.nth(0).locator('.notebook-romanized-name')).toHaveText(['Player A', 'Current Synthetic Opponent']);
});
