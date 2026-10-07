const { test, expect } = require('@playwright/test');

const WORKER_BASE = process.env.WORKER_BASE_URL || 'https://little-kings-api.little-kings.workers.dev';

test('deployed UAT exposes only authenticated data boundaries', async ({ page, request, baseURL }) => {
  const expectedCommit = process.env.EXPECTED_COMMIT;
  if (expectedCommit) {
    await expect.poll(async () => {
      const response = await request.get(`${baseURL}build-info.json?check=${Date.now()}`);
      if (!response.ok()) return '';
      return (await response.json()).commit;
    }, { timeout: 60_000, intervals: [1_000, 2_000, 3_000] }).toBe(expectedCommit);
  }

  for (const endpoint of ['/api/public-data', '/api/admin-data', '/api/pending']) {
    const response = await request.get(`${WORKER_BASE}${endpoint}?environment=uat`);
    expect(response.status(), `${endpoint} must reject anonymous UAT access`).toBe(401);
  }

  const apiRequests = [];
  page.on('request', req => { if (req.url().startsWith(WORKER_BASE)) apiRequests.push(req.url()); });
  const protectedRoutes = ['', 'player.html?id=LK-0001', 'insights.html', 'tournament.html', 'feedback.html', 'player-profile-supplements.html'];
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
});
