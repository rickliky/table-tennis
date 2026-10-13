const { test, expect } = require('@playwright/test');
const API = 'https://little-kings-api.little-kings.workers.dev';
const players = [
  { playerId: 'LK-0080', displayName: '選手A', englishName: 'Player A', bilingual: true },
  { playerId: 'LK-0002', displayName: '選手B', englishName: 'Player B', bilingual: true },
  { playerId: 'LK-0003', displayName: '選手C', englishName: 'Player C', bilingual: false }
];
async function mock(context) {
  const requests = [], documents = new Map(), tokens = new Map();
  const state = { failSave: false, expire: false, delay: 0 };
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
      if (!body) return respond(200, { ok: true, date, document: current, matches: date === '2026-10-11' ? [
        { key: 'training:M-001', source: 'training', opponentName: '<img src=x onerror=alert(1)> Opponent', score: '3-1', result: 'win', eventName: 'Club training' },
        { key: 'tournament:TM-001', source: 'tournament', opponentName: 'Tournament opponent', score: '1-2', result: 'incomplete', eventName: 'Tournament' }
      ] : [] });
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
  expect(documents.get('LK-0080|2026-10-11').fields['match.training:M-001.en']).toBe('First paragraph.\n\nNext focus.');
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
  await expect(page.locator('[data-field="match.training:M-001.en"]')).toHaveValue('First paragraph.\n\nNext focus.');
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
  await expect(page.locator('[data-field="daily.en"]')).toHaveValue('Synthetic Thursday note before the rest day.');
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
  await expect(page.locator('[data-field="daily.en"]')).toHaveValue('Synthetic historical Friday note.');
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
  await expect(page.locator('[data-field="coach.ja"]')).toHaveValue('Unsynced synthetic note');
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
  await page.reload(); await expect(page.locator('[data-field="coach.ja"]')).toHaveValue('Unsaved in second tab');
});

test('future accounts are Japanese-only and selecting another player requires their password', async ({ page, context }) => {
  const { requests } = await mock(context); await login(page, 'LK-0003');
  await expect(page.locator('[data-field$=".en"]')).toHaveCount(0);
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
  await expect(page.locator('[data-field="coach.ja"]')).toHaveValue('Synthetic frozen-page note');
});

test('all writing is expanded and text areas fit long content on load, typing, resizing and language changes', async ({ page, context }) => {
  const { documents } = await mock(context);
  const longText = '\n\n' + Array.from({ length: 35 }, (_, index) => `${index + 1}. Synthetic table-tennis reflection with numbered coaching advice and next focus.`).join('\n\n');
  documents.set('LK-0080|2026-10-11', { revision: 1, fields: { 'daily.en': longText, 'coach.ja': longText, 'match.training:M-001.en': longText } });
  await page.setViewportSize({ width: 390, height: 900 }); await login(page);
  await expect(page.locator('.notebook-day details')).toHaveCount(0);
  await expect(page.locator('.notebook-directory details:not([open])')).toHaveCount(0);
  const field = page.locator('[data-field="match.training:M-001.en"]');
  await expect(field).toHaveValue(longText);
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
  await page.reload(); await expect(field).toHaveValue(longText + '\n\nMore synthetic writing.'); await expect.poll(fits).toBe(true);
  await field.fill('Short note'); await expect.poll(() => field.evaluate(element => element.clientHeight)).toBeLessThan(200);
  await expect(page.locator('#notebook-status')).toContainText('Saved');
  await page.locator('.notebook-jump a[href="#notebook-coach"]').click();
  await expect.poll(() => page.evaluate(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect(), status = document.querySelector('.notebook-savebar').getBoundingClientRect(), coach = document.querySelector('#notebook-coach').getBoundingClientRect();
    return status.top >= header.bottom - 1 && coach.top >= status.bottom - 1 && Boolean(document.elementFromPoint(40, header.bottom / 2)?.closest('.site-header'));
  })).toBe(true);
});
