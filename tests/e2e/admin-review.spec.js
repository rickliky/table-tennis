const { test, expect } = require('@playwright/test');
const { mockReview, openReview, reviewBounds, longValue, batchId } = require('./helpers/admin-review');

for (const role of ['admin', 'approver']) for (const language of ['en', 'ja']) test(`review details and controls fit phones/tablets/desktop (${role}, ${language})`, async ({ page, context }) => {
  const { writes } = await mockReview(context, language, role); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await openReview(page);
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await reviewBounds(page, width);
  }
  await expect(page.locator('.admin-pending-meta').first()).toContainText(batchId);
  await expect(page.locator('.admin-pending-table').first()).toContainText(longValue);
  await page.setViewportSize({ width: 390, height: 900 });
  const firstTable=page.locator('.admin-pending-table').first();
  await expect(firstTable.locator('th').nth(1)).toHaveText(language==='en'?'Before':'変更前');
  await expect(firstTable.locator('tbody tr').first().locator('td').nth(2)).toHaveAttribute('data-label',language==='en'?'After':'変更後');
  for (const selector of ['.admin-pending-deleted','.admin-pending-detail']) await expect(page.locator(`${selector} tbody tr`).first().locator('td').nth(1)).toHaveAttribute('data-label',language==='en'?'Value':'値');
  expect(await firstTable.locator('tbody tr').first().evaluate(element=>getComputedStyle(element).display)).toBe('grid');
  await page.locator('.admin-sub-tab').nth(1).click(); await expect(page.locator('.admin-history-card')).toHaveCount(1);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await reviewBounds(page, width);
  }
  expect(await page.locator('.admin-pending-table').evaluate(element=>getComputedStyle(element).display)).toBe('table');
  expect(writes).toEqual([]); expect(errors).toEqual([]);
});

test('mobile batch and individual actions retain confirmation and exact payloads; long errors stay readable', async ({ page, context }) => {
  const { writes } = await mockReview(context); await page.setViewportSize({ width: 390, height: 900 }); await openReview(page);
  page.once('dialog', dialog => dialog.dismiss()); await page.locator('.admin-batch-review button').first().click(); expect(writes).toEqual([]);
  page.once('dialog', dialog => dialog.accept()); await page.locator('.admin-batch-review button').first().click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toEqual({ path: '/api/approve-batch', body: { batchId, decision: 'accept' } });
  await expect(page.locator('.admin-batch-review .admin-pending-action-status')).toContainText('Synthetic retryable error');
  await expect(page.locator('.admin-batch-review button').first()).toBeEnabled(); await reviewBounds(page, 390);
  const firstCard = page.locator('.admin-pending-card').first();
  page.once('dialog', dialog => dialog.accept()); await firstCard.locator('.admin-pending-actions .danger').click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toEqual({ path: '/api/approve', body: { changeId: 'CHANGE-SYNTHETIC-SESSION', decision: 'reject' } });
  await expect(firstCard.locator('.admin-pending-action-status')).toContainText('Synthetic retryable error'); await reviewBounds(page, 390);
});
