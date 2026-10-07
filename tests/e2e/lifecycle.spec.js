const { test, expect } = require('@playwright/test');

const API_BASE = 'https://little-kings-api.little-kings.workers.dev';
const future = () => Date.now() + 24 * 60 * 60 * 1000;
const tokenFor = role => `${Buffer.from(JSON.stringify({ role, expires: future() })).toString('base64')}.test-signature`;
const emptyData = players => ({
  ok: true,
  club: null,
  clubs: [],
  players,
  matches: [],
  externalOpponents: [],
  tournaments: [],
  tournamentMatches: [],
  tournamentProgress: [],
  rubbers: [],
  sessionFeedback: [],
  matchFeedback: [],
  sessions: [],
  importBatches: []
});

async function installApiMock(page) {
  const requests = [];
  await page.route(`${API_BASE}/api/**`, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const authorization = request.headers().authorization || '';
    let role = '';
    try { role = JSON.parse(Buffer.from(authorization.replace(/^Bearer\s+/i, '').split('.')[0], 'base64').toString()).role; } catch {}
    requests.push({ path, authorization, role });

    const respond = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/login') {
      const body = request.postDataJSON();
      if (body.password !== `${body.role}-password`) return respond(401, { ok: false, error: 'Invalid credentials' });
      return respond(200, { ok: true, role: body.role, token: tokenFor(body.role) });
    }
    if (path === '/api/session') {
      if (!authorization || authorization.includes('stale')) return respond(401, { ok: false, error: 'Invalid session' });
      return respond(200, { ok: true, role, expires: future() });
    }
    if (path === '/api/public-data') {
      if (!authorization) return respond(401, { ok: false, error: 'Authentication required' });
      return respond(200, emptyData([{ playerId: 'LK-0001', displayName: 'Active player', status: 'ST-001' }]));
    }
    if (path === '/api/admin-data') {
      if (!['admin', 'approver'].includes(role)) return respond(role ? 403 : 401, { ok: false, error: 'Admin or Approver role required' });
      return respond(200, emptyData([
        { playerId: 'LK-0001', displayName: 'Active player', status: 'ST-001' },
        { playerId: 'LK-0002', displayName: 'Inactive player', status: 'ST-002' }
      ]));
    }
    if (path === '/api/pending') {
      if (!['admin', 'approver'].includes(role)) return respond(role ? 403 : 401, { ok: false, error: 'Admin or Approver role required' });
      return respond(200, { ok: true, changes: [] });
    }
    return respond(404, { ok: false, error: 'Not found' });
  });
  return requests;
}

test('member data waits for login, uses bearer auth, and restores a validated session', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const requests = await installApiMock(page);

  await page.goto('/index.html');
  await expect(page.locator('#site-password-gate')).toBeVisible();
  expect(requests.some(request => request.path === '/api/public-data')).toBe(false);

  await page.locator('#site-password').fill('site-password');
  await page.locator('#site-password-form button[type=submit]').click();
  await expect(page.locator('#site-password-gate')).toHaveCount(0);
  await expect.poll(() => requests.filter(request => request.path === '/api/public-data').length).toBe(1);
  expect(requests.find(request => request.path === '/api/public-data').authorization).toMatch(/^Bearer /);

  requests.length = 0;
  await page.reload();
  await expect(page.locator('body')).not.toHaveClass(/access-locked/);
  await expect.poll(() => requests.filter(request => request.path === '/api/public-data').length).toBe(1);
  expect(requests.map(request => request.path).slice(0, 2)).toEqual(['/api/session', '/api/public-data']);
  expect(pageErrors).toEqual([]);
});

test('a stale member session returns to the gate without requesting data', async ({ page }) => {
  const requests = await installApiMock(page);
  await page.addInitScript(() => {
    localStorage.setItem('lk-site-session', 'stale.token');
    localStorage.setItem('lk-internal-access-until', String(Date.now() + 86_400_000));
  });
  await page.goto('/index.html');
  await expect(page.locator('#site-password-gate')).toBeVisible();
  expect(requests.map(request => request.path)).toEqual(['/api/session']);
  await expect(page.locator('body')).toHaveClass(/access-locked/);
});

test('every data-backed public route stays behind the gate and loads only with a validated session', async ({ page }) => {
  const routes = [
    '/index.html',
    '/player.html?id=LK-0001',
    '/insights.html',
    '/tournament.html',
    '/feedback.html',
    '/player-profile-supplements.html'
  ];
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(`${page.url()}: ${error.message}`));
  const requests = await installApiMock(page);

  await page.goto('/index.html');
  for (const route of routes) {
    await page.evaluate(() => localStorage.clear());
    requests.length = 0;
    await page.goto(route);
    await expect(page.locator('#site-password-gate')).toBeVisible();
    expect(requests.some(request => request.path === '/api/public-data'), `${route} requested data before login`).toBe(false);
  }

  await page.evaluate(token => {
    localStorage.setItem('lk-site-session', token);
    localStorage.setItem('lk-internal-access-until', String(Date.now() + 86_400_000));
  }, tokenFor('site'));
  for (const route of routes) {
    requests.length = 0;
    await page.goto(route);
    await expect(page.locator('body')).not.toHaveClass(/access-locked/);
    await expect.poll(() => requests.filter(request => request.path === '/api/public-data').length, { message: `${route} did not load authenticated data` }).toBe(1);
    expect(requests.find(request => request.path === '/api/public-data').authorization).toMatch(/^Bearer /);
  }
  expect(pageErrors).toEqual([]);
});

test('Admin can edit, Approver is review-only, and sign-out clears the session', async ({ page }) => {
  const requests = await installApiMock(page);
  await page.goto('/admin.html');
  await expect(page.locator('.admin-auth-screen h1')).toContainText('ログイン');

  await page.locator('input[type=password]').fill('admin-password');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('.admin-role-badge')).toContainText('Admin');
  await expect(page.locator('.admin-tab')).toHaveCount(8);
  expect(requests.find(request => request.path === '/api/admin-data').role).toBe('admin');

  await page.getByRole('button', { name: /SIGN OUT/ }).click();
  await expect(page.locator('.admin-auth-screen')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('lk-admin-session'))).toBeNull();

  await page.locator('select[name=role]').selectOption('approver');
  await page.locator('input[type=password]').fill('approver-password');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('.admin-role-badge')).toContainText('Approver');
  await expect(page.locator('.admin-tab')).toHaveCount(1);
  await expect(page.locator('.admin-tab')).toContainText('REVIEW');
  expect(requests.filter(request => request.path === '/api/pending').at(-1).role).toBe('approver');
});

test('member and maintenance gates fit supported viewports', async ({ page }) => {
  await installApiMock(page);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/index.html');
    await expect(page.locator('#site-password-gate')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(await page.locator('#site-password-form button[type=submit]').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);

    await page.goto('/admin.html');
    await expect(page.locator('.admin-auth-screen')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(await page.locator('button[type=submit]').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
});
