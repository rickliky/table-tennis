const { test, expect } = require('@playwright/test');
const { header, sample, mockImport, openImport, preview } = require('../e2e/helpers/training-import');

test.beforeAll(async ({ request, baseURL }) => {
  if (!process.env.EXPECTED_COMMIT) return;
  await expect.poll(async () => {
    const response = await request.get(new URL(`build-info.json?check=${Date.now()}`, baseURL).toString());
    return response.ok() ? (await response.json()).commit : '';
  }, { timeout: 60000, intervals: [1000, 2000, 3000] }).toBe(process.env.EXPECTED_COMMIT);
});

for (const language of ['ja', 'en']) for (const width of [320, 1440]) test(`live training import ignores reference columns (${language}, ${width}px)`, async ({ page, context }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  const { writes } = await mockImport(context, language); await openImport(page, 'admin.html?tab=import');
  const canonicalHash = await preview(page, `${header}\n2026-10-03,LK-0093,3,LK-0001,1,Open,Best of 5`);
  expect(await preview(page, sample)).toBe(canonicalHash);
  await expect(page.locator('.admin-import-preview tbody tr')).toHaveClass('valid');
  await expect(page.locator('.admin-import-preview tbody')).toContainText('登録選手A');
  await expect(page.locator('.admin-import-mapping select')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  expect(writes).toEqual([]); expect(errors).toEqual([]);
});
