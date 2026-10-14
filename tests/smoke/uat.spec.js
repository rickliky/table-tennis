const { test, expect } = require('@playwright/test');

const WORKER_BASE = process.env.WORKER_BASE_URL || 'https://little-kings-api.little-kings.workers.dev';

test('deployed site exposes only authenticated data boundaries', async ({ page, request, baseURL }) => {
  const environment = new URL(baseURL).pathname.split('/').includes('uat') ? 'uat' : 'prod';
  const expectedCommit = process.env.EXPECTED_COMMIT;
  if (expectedCommit) {
    await expect.poll(async () => {
      const response = await request.get(`${baseURL}build-info.json?check=${Date.now()}`);
      if (!response.ok()) return '';
      return (await response.json()).commit;
    }, { timeout: 60_000, intervals: [1_000, 2_000, 3_000] }).toBe(expectedCommit);
  }

  for (const endpoint of ['/api/public-data', '/api/admin-data', '/api/pending']) {
    const response = await request.get(`${WORKER_BASE}${endpoint}?environment=${environment}`);
    expect(response.status(), `${endpoint} must reject anonymous ${environment} access`).toBe(401);
  }

  const apiRequests = [];
  page.on('request', req => { if (req.url().startsWith(WORKER_BASE)) apiRequests.push(req.url()); });
  const protectedRoutes = ['', 'player.html?id=LK-0001', 'insights.html', 'tournament.html', 'player-profile-supplements.html'];
  for (const route of protectedRoutes) {
    if (page.url().startsWith(baseURL)) await page.evaluate(() => localStorage.clear());
    apiRequests.length = 0;
    await page.goto(new URL(route, baseURL).toString());
    await expect(page.locator('#site-password-gate')).toBeVisible();
    await page.waitForTimeout(100);
    expect(apiRequests.some(url => url.includes('/api/public-data')), `${route || 'home'} requested data before login`).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }

  await page.goto(new URL('admin.html', baseURL).toString());
  await expect(page.locator('.admin-auth-screen')).toBeVisible();
  await expect(page.locator('select[name=role] option')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

  const privateResponse = await request.get(`${WORKER_BASE}/api/reflections/day?environment=${environment}&date=2099-12-31`);
  expect(privateResponse.status()).toBe(401);
  for (const path of ['players', 'dates?playerId=LK-0080', 'day?playerId=LK-0080&date=2099-12-31']) {
    const url = new URL(`${WORKER_BASE}/api/reflections/admin/${path}`); url.searchParams.set('environment', environment);
    expect((await request.get(url.toString())).status()).toBe(401);
  }
  const prodResponse = await request.get(`${WORKER_BASE}/api/reflections/directory?environment=prod`);
  // Production rollout is a separately approved Worker switch, not a UAT deploy.
  expect([200, 404]).toContain(prodResponse.status());
  if (prodResponse.ok()) {
    expect((await request.get(`${WORKER_BASE}/api/reflections/day?environment=prod&date=2099-12-31`)).status()).toBe(401);
    expect((await request.get(`${WORKER_BASE}/api/reflections/admin/players?environment=prod`)).status()).toBe(401);
  }
  apiRequests.length = 0;
  await page.goto(new URL('feedback.html', baseURL).toString());
  await expect(page.locator('.notebook-directory')).toBeVisible();
  await expect(page.locator('#site-password-gate')).toHaveCount(0);
  expect(apiRequests.some(url => /\/api\/(public-data|admin-data|reflections\/day)/.test(url))).toBe(false);
  await expect(page.locator('a[href="notebook-sample.html"]').first()).toBeVisible();
  apiRequests.length = 0;
  await page.goto(new URL('notebook-sample.html', baseURL).toString());
  await expect(page.locator('.notebook-demo-warning')).toBeVisible();
  expect(apiRequests).toEqual([]);
});
