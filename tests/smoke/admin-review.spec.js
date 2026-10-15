const { test, expect } = require('@playwright/test');
const { mockReview, openReview, reviewBounds } = require('../e2e/helpers/admin-review');

test.beforeAll(async ({ request, baseURL }) => {
  if (!process.env.EXPECTED_COMMIT) return;
  await expect.poll(async () => {
    const response = await request.get(new URL(`build-info.json?check=${Date.now()}`, baseURL).toString());
    return response.ok() ? (await response.json()).commit : '';
  }, { timeout: 60000, intervals: [1000, 2000, 3000] }).toBe(process.env.EXPECTED_COMMIT);
});

for (const language of ['ja','en']) test(`live review evidence and approval buttons fit an iPhone-width screen (${language})`, async ({ page, context }) => {
  const { writes }=await mockReview(context,language); const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await openReview(page,'admin.html?tab=manage');
  for (const width of [320,390,1440]) { await page.setViewportSize({width,height:900});await reviewBounds(page,width); }
  await page.locator('.admin-sub-tab').nth(1).click();await expect(page.locator('.admin-history-card')).toHaveCount(1);
  await page.setViewportSize({width:390,height:900});await reviewBounds(page,390);
  expect(writes).toEqual([]);expect(errors).toEqual([]);
});
