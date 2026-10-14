const { test, expect } = require('@playwright/test');
const API = 'https://little-kings-api.little-kings.workers.dev';
const tokenFor = role => `${Buffer.from(JSON.stringify({ role, expires: Date.now() + 86400000 })).toString('base64')}.synthetic-signature`;
const players = [{ playerId: 'LK-0080', displayName: '選手A', englishName: 'Player A', bilingual: true, enabled: true }, { playerId: 'LK-0002', displayName: '選手B', englishName: 'Player B', bilingual: true, enabled: false }];
async function mock(context) {
  const requests = [], state = { expired: false, fail: false, delay: 0, savedDates: ['2026-10-11', '2026-10-10'] };
  // Serve the same local source under the UAT path to exercise real environment gating.
  await context.route('http://127.0.0.1:4173/uat/**', async route => {
    const response = await route.fetch({ url: route.request().url().replace('/uat/', '/') }); await route.fulfill({ response });
  });
  await context.route(`${API}/api/**`, async route => {
    const request = route.request(), url = new URL(request.url());
    let role = ''; try { role = JSON.parse(Buffer.from((request.headers().authorization || '').replace(/^Bearer /, '').split('.')[0], 'base64')).role; } catch {}
    requests.push({ path: url.pathname, method: request.method(), role, environment: url.searchParams.get('environment'), date: url.searchParams.get('date') });
    const respond = (status, value) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname === '/api/login') { const body = request.postDataJSON(); return respond(200, { ok: true, role: body.role, token: tokenFor(body.role) }); }
    if (!role || state.expired) return respond(401, { ok: false });
    if (url.pathname === '/api/session') return respond(200, { ok: true, role });
    if (url.pathname === '/api/admin-data') return respond(200, { ok: true, players: [], matches: [], rubbers: [] });
    if (url.pathname === '/api/pending') return respond(200, { ok: true, changes: [] });
    if (url.pathname.startsWith('/api/reflections/admin/')) {
      if (role !== 'admin') return respond(403, { ok: false });
      if (state.fail) return respond(503, { ok: false });
      if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      if (url.pathname.endsWith('/players')) return respond(200, { ok: true, players });
      if (url.pathname.endsWith('/dates')) return respond(200, { ok: true, dates: url.searchParams.get('playerId') === 'LK-0080' ? state.savedDates : [] });
      if (url.pathname.endsWith('/day')) return respond(200, { ok: true, player: players[0], date: url.searchParams.get('date'), document: { revision: 2, fields: {
        'daily.en': 'Synthetic daily reflection\n\nSecond paragraph.', 'coach.ja': '1. 合成アドバイス\n2. 合成テスト',
        'match.training:M-1.en': '<img src=x onerror=alert(1)> Synthetic match note\n' + 'Long synthetic reflection. '.repeat(200), 'match.training:REMOVED.ja': 'Synthetic orphan note'
      } }, matches: [{ key: 'training:M-1', source: 'training', score: '3-1', result: 'win', opponentName: 'Opponent' }] });
    }
    return respond(404, { ok: false });
  });
  return { requests, state };
}
async function login(page, role = 'admin') {
  await page.goto('/uat/admin.html?tab=notebooks');
  await page.locator('select[name=role]').selectOption(role);
  await page.locator('input[type=password]').fill('synthetic-password'); await page.locator('button[type=submit]').click();
  await expect(page.locator('.admin-role-badge')).toContainText(role === 'admin' ? 'Admin' : 'Approver');
}

test('Admin navigates saved player notebooks read-only; mobile text stays complete and sign-out clears it', async ({ page, context }) => {
  const { requests } = await mock(context), errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/uat/admin.html?tab=notebooks'); await expect(page.locator('.admin-auth-screen')).toBeVisible();
  expect(requests.some(request => request.path.startsWith('/api/reflections/admin/'))).toBe(false);
  await page.evaluate(() => localStorage.setItem('lk-language', 'en')); await login(page);
  await expect(page.getByRole('button', { name: 'PLAYER NOTEBOOKS', exact: true })).toBeVisible();
  await expect(page.locator('#admin-notebook-content')).toContainText('Synthetic daily reflection');
  await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-10-11 (Sunday)');
  await expect(page.locator('#admin-notebook-date option[value="2026-10-10"]')).toHaveText('2026-10-10 (Saturday)');
  await expect(page.locator('#admin-notebook-content img')).toHaveCount(0);
  await expect(page.locator('#admin-notebook-content')).toContainText('Synthetic orphan note');
  await expect(page.locator('#admin-notebook-content textarea,#admin-notebook-content input')).toHaveCount(0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(await page.locator('#admin-notebook-player').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  await page.locator('#admin-notebook-older').click(); await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-10-10 (Saturday)');
  await page.locator('#admin-notebook-player').selectOption('LK-0002');
  await expect(page.locator('#admin-notebook-status')).toContainText('No saved notebook');
  await expect(page.locator('#admin-notebook-content')).toBeEmpty();
  expect(requests.filter(request => request.path.startsWith('/api/reflections/admin/')).every(request => request.method === 'GET' && request.role === 'admin' && request.environment === 'uat')).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Synthetic daily');
  await page.getByRole('button', { name: /SIGN OUT/ }).click(); await expect(page.locator('.admin-auth-screen')).toBeVisible();
  await expect(page.locator('.admin-notebooks')).toHaveCount(0); expect(errors).toEqual([]);
});

test('Admin month navigation and refresh retain context; latest resets the filter and removed dates fall back safely', async ({ page, context }) => {
  const { state, requests } = await mock(context);
  state.savedDates = ['2026-10-11', '2026-10-10', '2026-09-30', '2026-09-26'];
  await login(page); await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-10-11');
  await page.locator('#admin-notebook-month').selectOption('2026-09');
  await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-09-30');
  await expect(page.locator('#admin-notebook-date option')).toHaveCount(2);
  await page.locator('#admin-notebook-older').click(); await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-09-26');
  await expect(page.locator('#admin-notebook-older')).toBeDisabled();
  state.savedDates.unshift('2026-10-13');
  await page.locator('#admin-notebook-refresh').click(); await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-09-26');
  await expect(page.locator('#admin-notebook-month')).toHaveValue('2026-09');
  state.fail = true; await page.locator('#admin-notebook-refresh').click(); await expect(page.locator('#admin-notebook-status')).toContainText('読み込めません');
  state.fail = false; await page.locator('#admin-notebook-content button').click(); await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-09-26');
  await page.locator('#admin-notebook-latest').click(); await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-10-13');
  await expect(page.locator('#admin-notebook-month')).toHaveValue('');
  await page.locator('#admin-notebook-month').selectOption('2026-09');
  state.savedDates = ['2026-10-13', '2026-10-11'];
  await page.locator('#admin-notebook-refresh').click(); await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-10-13');
  await expect(page.locator('#admin-notebook-month')).toHaveValue('');
  state.fail = true;
  await page.locator('#admin-notebook-player').selectOption('LK-0002'); await expect(page.locator('#admin-notebook-status')).toContainText('読み込めません');
  await expect(page.locator('#admin-notebook-date option')).toHaveCount(1);
  await expect(page.locator('#admin-notebook-month option')).toHaveCount(1);
  state.fail = false; await page.locator('#admin-notebook-content button').click(); await expect(page.locator('#admin-notebook-status')).toContainText('まだありません');
  await expect(page.locator('#admin-notebook-content')).toBeEmpty(); await expect(page.locator('#admin-notebook-month')).toBeDisabled(); await expect(page.locator('#admin-notebook-latest')).toBeDisabled();
  expect(requests.filter(request => request.path.endsWith('/day')).every(request => request.date && request.method === 'GET')).toBe(true);
});

test('Approver cannot see notebooks; failed and expired requests clear private text', async ({ page, context }) => {
  const { requests, state } = await mock(context); await login(page, 'approver');
  await expect(page.getByRole('button', { name: /PLAYER NOTEBOOKS|選手ノート/ })).toHaveCount(0);
  expect(requests.some(request => request.path.startsWith('/api/reflections/admin/'))).toBe(false);
  await page.getByRole('button', { name: /SIGN OUT/ }).click(); await login(page);
  await expect(page.locator('#admin-notebook-content')).toContainText('Synthetic daily reflection');
  await expect(page.locator('.admin-notebook-day-title')).toContainText('2026-10-11 (日曜日)');
  await expect(page.locator('#admin-notebook-date option[value="2026-10-10"]')).toHaveText('2026-10-10 (土曜日)');
  state.fail = true; await page.locator('#admin-notebook-refresh').click();
  await expect(page.locator('#admin-notebook-status')).toContainText('読み込めません');
  await expect(page.locator('#admin-notebook-content')).not.toContainText('Synthetic daily reflection');
  state.fail = false; await page.locator('#admin-notebook-content button').click(); await expect(page.locator('#admin-notebook-content')).toContainText('Synthetic daily reflection');
  state.expired = true; await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.locator('.admin-notebooks')).not.toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('.admin-auth-screen')).toBeVisible(); await expect(page.locator('.admin-notebooks')).toHaveCount(0);
});

test('leaving notebooks aborts pending reads; browser storage sign-out clears the viewer', async ({ page, context }) => {
  const { state } = await mock(context); await login(page);
  await expect(page.locator('#admin-notebook-content')).toContainText('Synthetic daily reflection');
  state.delay = 500; await page.locator('#admin-notebook-refresh').click();
  await page.getByRole('button', { name: 'OVERVIEW / 概要', exact: true }).click();
  await expect(page.locator('.admin-notebooks')).toHaveCount(0);
  state.delay = 0; await page.getByRole('button', { name: '選手ノート', exact: true }).click();
  await expect(page.locator('#admin-notebook-content')).toContainText('Synthetic daily reflection');
  await page.evaluate(() => { const oldValue = localStorage.getItem('lk-admin-session'); localStorage.removeItem('lk-admin-session'); window.dispatchEvent(new StorageEvent('storage', { key: 'lk-admin-session', oldValue, newValue: null })); });
  await expect(page.locator('.admin-auth-screen')).toBeVisible();
});

test('production Admin can read notebooks; production Approver remains excluded', async ({ page, context }) => {
  const { requests } = await mock(context);
  await context.route('https://notebook-prod.test/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:4173${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await page.goto('https://notebook-prod.test/admin.html?tab=notebooks');
  await page.locator('select[name=role]').selectOption('admin');
  await page.locator('input[type=password]').fill('synthetic-password'); await page.locator('button[type=submit]').click();
  await expect(page.locator('#admin-notebook-content')).toContainText('Synthetic daily reflection');
  expect(requests.filter(request => request.path.startsWith('/api/reflections/admin/')).every(request => request.environment === 'prod' && request.method === 'GET')).toBe(true);
  await page.getByRole('button', { name: /SIGN OUT/ }).click();
  await page.locator('select[name=role]').selectOption('approver');
  await page.locator('input[type=password]').fill('synthetic-password'); await page.locator('button[type=submit]').click();
  await expect(page.locator('.admin-role-badge')).toContainText('Approver');
  await expect(page.getByRole('button', { name: /PLAYER NOTEBOOKS|選手ノート/ })).toHaveCount(0);
  await expect(page.locator('#admin-notebook-content')).toHaveCount(0);
});

test('Admin reads structured formatting safely alongside legacy strings and orphan notes', async ({ page, context }) => {
  const { requests } = await mock(context);
  await context.route(`${API}/api/reflections/admin/day**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, player: players[0], date: '2026-10-11', document: { revision: 1, fields: {
    'daily.en': { format: 'lk-rich-v1', ops: [{ insert: '<img src=x> Synthetic bold', attributes: { bold: true } }, { insert: '\n' }, { insert: 'Synthetic bullet' }, { insert: '\n', attributes: { list: 'bullet' } }] },
    'daily.ja': '\n\n合成の従来メモ\n\n',
    'match.training:REMOVED.en': { format: 'lk-rich-v1', ops: [{ insert: 'Synthetic orphan italic', attributes: { italic: true } }, { insert: '\n' }] }
  } }, matches: [] }) }));
  await login(page); await expect(page.locator('#admin-notebook-content strong')).toContainText('Synthetic bold');
  await expect(page.locator('#admin-notebook-content ul li')).toHaveText('Synthetic bullet');
  await expect(page.locator('#admin-notebook-content em')).toHaveText('Synthetic orphan italic');
  await expect(page.locator('#admin-notebook-content img,[contenteditable]')).toHaveCount(0);
  for (const width of [320, 390, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0); }
  expect(requests.filter(request => request.path.startsWith('/api/reflections/admin/')).every(request => request.method === 'GET')).toBe(true);
  await page.getByRole('button', { name: /SIGN OUT/ }).click(); await expect(page.locator('#admin-notebook-content')).toHaveCount(0);
});

test('Admin match evidence uses current bilingual names and explicit result labels with simplified headings', async ({ page, context }) => {
  await mock(context);
  await context.route(`${API}/api/reflections/admin/day**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, player: players[0], date: '2026-10-11', document: { revision: 1, fields: { 'match.training:M-1.en': 'Synthetic match reflection', 'match.training:M-2.ja': '合成の未完了振り返り' } }, matches: [
    { key: 'training:M-1', source: 'training', opponentName: '現在の合成対戦相手', opponentEnglishName: 'Current Synthetic Opponent', score: '1-3', result: 'loss' },
    { key: 'training:M-2', source: 'training', opponentName: '合成の未完了相手', score: '2-1', result: 'incomplete' }
  ] }) }));
  await page.goto('/uat/admin.html'); await page.evaluate(() => localStorage.setItem('lk-language', 'en')); await login(page);
  await expect(page.locator('#admin-notebook-content .notebook-result-label')).toHaveText(['Loser', 'Winner']);
  await expect(page.locator('#admin-notebook-content .is-winner')).toContainText('Current Synthetic Opponent');
  await expect(page.locator('#admin-notebook-content .notebook-match-incomplete')).toHaveText('Incomplete — no winner recorded');
  await expect(page.locator('#admin-notebook-content h3')).toContainText(['Coach feedback']);
  await expect(page.locator('#admin-notebook-content h4')).not.toContainText(['(manual)']);
  await expect(page.locator('#admin-notebook-content [contenteditable],#admin-notebook-content textarea')).toHaveCount(0);
});
