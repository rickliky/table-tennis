const { test, expect } = require('@playwright/test');
const { header, sample, mockImport, openImport, preview } = require('./helpers/training-import');

for (const language of ['en', 'ja']) test(`missing source explains disabled submit and filling it enables the reviewed batch (${language})`, async ({ page, context }) => {
  const { writes } = await mockImport(context, language); await openImport(page);
  const source = page.locator('[name="importSource"]'), submit = page.locator('.admin-import-form > button'), status = page.locator('.admin-import-submit-status');
  await source.fill(''); const hash = await preview(page, sample);
  await expect(submit).toBeDisabled();
  await expect(status).toContainText(language === 'en' ? 'Enter a Source name' : '出典名を入力');
  await expect(page.locator('.admin-import-preview > p')).not.toContainText(language === 'en' ? 'Ready for grouped approval.' : '一括承認申請できます。');
  await source.fill('   '); await expect(submit).toBeDisabled();
  await source.fill('Synthetic notebook'); await expect(submit).toBeEnabled();
  await page.locator('[name="importVenue"]').fill('Synthetic venue'); await page.locator('[name="importNote"]').fill('Synthetic note');
  await expect(submit).toBeEnabled(); await expect(page.locator('.admin-import-preview > header small')).toHaveText(hash);
  page.on('dialog', dialog => dialog.accept()); await submit.click();
  await expect.poll(() => writes.length).toBe(3);
  expect(writes[0].after).toMatchObject({ sourceName: 'Synthetic notebook', note: 'Synthetic note' });
  expect(writes[1].after).toMatchObject({ source: 'Synthetic notebook', venue: 'Synthetic venue' });
});

test('CSV and session edits invalidate review with guidance; invalid metadata cannot enable submit', async ({ page, context }) => {
  const { writes } = await mockImport(context); await openImport(page); await preview(page, sample);
  const submit = page.locator('.admin-import-form > button'), status = page.locator('.admin-import-submit-status');
  await page.locator('[name="importText"]').fill(sample.replace(',3,', ',2,'));
  await expect(submit).toBeDisabled(); await expect(status).toContainText('Click Preview import again');
  await page.locator('[name="importSource"]').fill('Updated source'); await expect(submit).toBeDisabled();
  await preview(page, sample); await expect(submit).toBeEnabled();
  await page.locator('[name="importSessionId"]').fill('bad!'); await preview(page, sample);
  await expect(submit).toBeDisabled(); await expect(status).toContainText('invalid session details');
  await page.locator('[name="importSessionId"]').fill('LKS-20261003'); await preview(page, sample); await expect(submit).toBeEnabled();
  await page.locator('[name="importMatchFormat"]').selectOption('Best of 3');
  await expect(submit).toBeDisabled(); await expect(status).toContainText('Click Preview import again');
  await preview(page, sample); await expect(submit).toBeEnabled();
  await page.locator('[name="importDate"]').fill('2026-10-04'); await page.locator('[name="importDate"]').press('Tab');
  await expect(submit).toBeDisabled(); await preview(page, sample);
  await expect(page.locator('.admin-import-preview tbody')).toContainText('Row date differs'); await expect(submit).toBeDisabled();
  expect(writes).toEqual([]);
});

test('edits during asynchronous hashing cannot restore an obsolete preview or enable submit', async ({ page, context }) => {
  await mockImport(context);
  await context.addInitScript(() => {
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = async (...args) => { window.hashStarted = true; await new Promise(resolve => { window.releaseHash = resolve; }); return digest(...args); };
  });
  await openImport(page); await page.locator('[name="importText"]').fill(sample);
  await page.locator('.admin-import-input-actions .primary').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.hashStarted))).toBe(true);
  await page.locator('[name="importText"]').fill(sample.replace('LK-0093', 'LK-9999'));
  await page.evaluate(() => window.releaseHash());
  await expect(page.locator('.admin-import-submit-status')).toContainText('Click Preview import again');
  await expect(page.locator('.admin-import-form > button')).toBeDisabled();
  await expect(page.locator('.admin-import-preview > header small')).toHaveCount(0);
});

test('duplicate batch stays blocked and partial pending batch retains resume guidance after source edits', async ({ page, context }) => {
  const { data, pending, writes } = await mockImport(context); await openImport(page);
  await preview(page, sample);
  page.on('dialog', dialog => dialog.accept()); await page.locator('.admin-import-form > button').click();
  await expect.poll(() => writes.length).toBe(3);
  pending.push({ ...writes[0], status: 'pending' }); await openImport(page); await preview(page, sample);
  await page.locator('[name="importSource"]').fill('Updated source');
  await expect(page.locator('.admin-import-form > button')).toBeEnabled();
  await expect(page.locator('.admin-import-preview > p')).toContainText('safely resume');
  data.importBatches.push(writes[0].after); await openImport(page); await preview(page, sample);
  await page.locator('[name="importSource"]').fill('Another source');
  await expect(page.locator('.admin-import-form > button')).toBeDisabled();
  await expect(page.locator('.admin-import-submit-status')).toContainText('already approved');
});

test('submit locks reviewed controls while requests are pending and restores them on failure', async ({ page, context }) => {
  await mockImport(context); await openImport(page); await preview(page, sample);
  let release; const paused = new Promise(resolve => { release = resolve; }); let started = false;
  await page.route('**/api/change*', async route => { started = true; await paused; await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Synthetic failure' }) }); });
  page.on('dialog', dialog => dialog.accept()); await page.locator('.admin-import-form > button').click();
  await expect.poll(() => started).toBe(true);
  await expect(page.locator('[name="importSource"]')).toBeDisabled(); await expect(page.locator('[name="importText"]')).toBeDisabled();
  await expect(page.locator('.admin-import-input-actions .primary')).toBeDisabled();
  release(); await expect(page.locator('.admin-import-submit-status')).toContainText('Import stopped');
  await expect(page.locator('[name="importSource"]')).toBeEnabled(); await expect(page.locator('.admin-import-form > button')).toBeEnabled();
});

test('pasted ID CSV ignores reference names and submits system snapshots with normalized date/format', async ({ page, context }) => {
  const { writes } = await mockImport(context); await openImport(page);
  const hash = await preview(page, sample);
  await expect(page.locator('.admin-import-preview tbody tr')).toHaveClass('valid');
  await expect(page.locator('.admin-import-preview tbody')).toContainText('登録選手A');
  await expect(page.locator('.admin-import-preview tbody')).toContainText('登録選手B');
  await expect(page.locator('.admin-import-mapping select')).toHaveCount(0);
  await expect(page.locator('.admin-import-form > button')).toBeEnabled();
  page.on('dialog', dialog => dialog.accept()); await page.locator('.admin-import-form > button').click();
  await expect.poll(() => writes.length).toBe(3);
  expect(writes.map(write => write.entityType)).toEqual(['importBatch', 'session', 'match']);
  const match = writes[2].after;
  expect(match).toMatchObject({ matchDate: '2026-10-03', sessionId: 'LKS-20261003', matchFormat: 'Best of 5', player1Id: 'LK-0093', player2Id: 'LK-0001', player1Name: '登録選手A', player2Name: '登録選手B', player1Sets: 3, player2Sets: 1, score: '3-1', winnerId: 'LK-0093', importBatchId: hash });
  expect(writes.every(write => write.batchId === `BATCH-${hash}`)).toBe(true);
  expect(JSON.stringify(writes)).not.toContain('岡田'); expect(JSON.stringify(writes)).not.toContain('三田村');
});

test('CSV/TSV header order and absent/incorrect reference names do not change the resolved batch', async ({ page, context }) => {
  const { writes } = await mockImport(context); await openImport(page);
  const canonicalHash = await preview(page, `${header}\n2026-10-03,LK-0093,3,LK-0001,1,Open,Best of 5`);
  expect(await preview(page, sample)).toBe(canonicalHash);
  expect(await preview(page, 'player1Name\tplayer2Name\tplayer2\tplayer1\tmatchDate\tplayer1Sets\tplayer2Sets\tdivision\tmatchFormat\nWrong reference A\tWrong reference B\tLK-0001\tLK-0093\t10/03/2026\t3\t1\tOpen\t"Best of 5"')).toBe(canonicalHash);
  expect(await preview(page, `${header},player1Name,player2Name\n10/3/2026,LK-0093,3,LK-0001,1,Open,'Best of 5',,`)).toBe(canonicalHash);
  await expect(page.locator('.admin-import-preview tbody tr')).toHaveClass('valid');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const boxes = await page.locator('.admin-import-input,.admin-import-preview,[name="importText"]').evaluateAll(elements => elements.map(element => ({ left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right })));
    expect(boxes.every(box => box.left >= 0 && box.right <= width)).toBe(true);
  }
  expect(writes).toEqual([]);
});

test('reference columns never supply missing player fields or fix unknown/blank IDs', async ({ page, context }) => {
  await mockImport(context); await openImport(page);
  await preview(page, `${header},player1Name,player2Name\n2026-10-03,LK-9999,3,LK-0001,1,Open,Best of 5,登録選手A,登録選手B`);
  await expect(page.locator('.admin-import-preview tbody')).toContainText('unresolved');
  await expect(page.locator('.admin-import-form > button')).toBeDisabled();
  await preview(page, `${header},player1Name,player2Name\n2026-10-03,,3,LK-0001,1,Open,Best of 5,登録選手A,登録選手B`);
  await expect(page.locator('.admin-import-form > button')).toBeDisabled();
  await page.locator('[name="importText"]').fill('matchDate,player1Name,player1Sets,player2Name,player2Sets\n2026-10-03,登録選手A,3,登録選手B,1');
  await page.locator('.admin-import-input-actions .primary').click();
  await expect(page.locator('.admin-import-preview')).toContainText('Required headers');
});

test('invalid slash dates, session mismatch, scores and unsupported quoted formats stay blocked', async ({ page, context }) => {
  await mockImport(context); await openImport(page);
  for (const [date, score, format, message] of [
    ['2/30/2026', '3', "'Best of 5'", 'Invalid date'], ['13/3/2026', '3', 'Best of 5', 'Invalid date'],
    ['10/4/2026', '3', 'Best of 5', 'Row date differs'], ['10/3/2026', '-1', 'Best of 5', 'Invalid set score'],
    ['10/3/2026', '3', "'Unknown format'", 'Unsupported match format']
  ]) {
    await preview(page, `${header}\n${date},LK-0093,${score},LK-0001,1,Open,${format}`);
    await expect(page.locator('.admin-import-preview tbody')).toContainText(message);
    await expect(page.locator('.admin-import-form > button')).toBeDisabled();
  }
});

test('legacy name input, file upload, quoted references, template download and duplicate rules still work', async ({ page, context }) => {
  const { data, writes } = await mockImport(context); await openImport(page);
  await preview(page, `${header}\n2026-10-03,登録選手A,3,登録選手B,1,Open,Best of 5`);
  await expect(page.locator('.admin-import-preview tbody tr')).toHaveClass('valid');
  await page.locator('input[type="file"]').setInputFiles({ name: 'synthetic.csv', mimeType: 'text/csv', buffer: Buffer.from(`${header},player1Name,player2Name\n10/3/2026,LK-0093,3,LK-0001,1,Open,'Best of 5',"Reference, with comma","<img src=x onerror=alert(1)>"`) });
  await expect(page.locator('.admin-import-preview tbody tr')).toHaveClass('valid');
  await expect(page.locator('.admin-import-preview img')).toHaveCount(0);
  const downloaded = page.waitForEvent('download'); await page.locator('.admin-import-input-actions button').nth(1).click();
  const download = await downloaded; expect(download.suggestedFilename()).toBe('little-kings-training-match-import.csv');
  const stream = await download.createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString('utf8').trim()).toBe(sample);
  // Reload to consume the changed synthetic approved dataset, never write a real record.
  data.matches.push({ matchId: 'SYNTHETIC', matchDate: '2026-10-03', event: 'Club Training', player1Id: 'LK-0093', player2Id: 'LK-0001', player1Sets: 3, player2Sets: 1 });
  page.on('dialog', dialog => dialog.accept()); await openImport(page);
  await preview(page, sample); await expect(page.locator('.admin-import-preview tbody')).toContainText('Exact duplicate already exists');
  await expect(page.locator('.admin-import-form > button')).toBeDisabled(); expect(writes).toEqual([]);
});
