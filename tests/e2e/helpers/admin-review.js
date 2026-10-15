const { expect } = require('@playwright/test');
const API = 'https://little-kings-api.little-kings.workers.dev';
const batchId = 'BATCH-IMP-0123456789ABCDEF';
const longValue = 'Synthetic-notebook-reference-'.repeat(7);
const session = { sessionId: 'LKS-20261015', sessionDate: '2026-10-15', venue: longValue, sessionType: 'Club Training', matchFormat: 'Best of 5', source: 'Training matches 2026-10-15', coachNote: longValue, createdAt: '2026-10-15T01:23:45.678Z', updatedAt: '2026-10-15T01:23:45.678Z' };
const change = (id, entityType, after, extra = {}) => ({ changeId: id, entityType, targetId: after.sessionId || after.importBatchId || after.matchId, action: 'create', status: 'pending', after, before: null, createdBy: 'synthetic-admin', createdAt: session.createdAt, summary: longValue, batchId, diff: Object.entries(after).map(([field, value]) => ({ field, before: '', after: value })), ...extra });

async function mockReview(context, language = 'en', role = 'approver') {
  const writes = [], requests = [];
  const changes = [
    change('CHANGE-SYNTHETIC-SESSION', 'session', session),
    change('CHANGE-SYNTHETIC-IMPORT', 'importBatch', { importBatchId: batchId.slice(6), sourceName: longValue, inputHash: 'a'.repeat(64), matchIds: Array.from({ length: 12 }, (_, i) => `LKM-20261015-IABCDEF-${String(i + 1).padStart(3, '0')}`) }),
    change('CHANGE-SYNTHETIC-MATCH', 'match', { matchId: 'LKM-20261015-IABCDEF-001', player1Name: 'Synthetic player A', player2Name: 'Synthetic player B', player1Sets: 3, player2Sets: 1 }, { action: 'update', diff: [{ field: 'player1Name', before: longValue, after: 'Synthetic player A' }, { field: 'player1Sets', before: 2, after: 3 }] }),
    change('CHANGE-SYNTHETIC-DELETE', 'club', {}, { action: 'delete', targetId: 'CLUB-SYNTHETIC', batchId: '', before: { clubId: 'CLUB-SYNTHETIC', name: longValue }, after: null, diff: [] }),
    change('CHANGE-SYNTHETIC-DETAIL', 'player', { playerId: 'LK-0001', displayName: longValue }, { targetId: 'LK-0001', batchId: '', diff: [] }),
    change('CHANGE-SYNTHETIC-HISTORY', 'session', session, { status: 'accepted', reviewedBy: 'synthetic-approver', reviewedAt: session.createdAt })
  ];
  const data = { ok: true, clubs: [], players: [], matches: [], externalOpponents: [], tournaments: [], tournamentMatches: [], tournamentProgress: [], rubbers: [], sessions: [], importBatches: [] };
  const token = `${Buffer.from(JSON.stringify({ role, expires: Date.now() + 86400000 })).toString('base64')}.synthetic-signature`;
  await context.addInitScript(({ language, token }) => { localStorage.setItem('lk-language', language); localStorage.setItem('lk-admin-session', token); }, { language, token });
  await context.route('http://127.0.0.1:4173/uat/**', async route => {
    const response = await route.fetch({ url: route.request().url().replace('/uat/', '/') }); await route.fulfill({ response });
  });
  await context.route(`${API}/api/**`, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    requests.push({ path, method: request.method() }); expect(request.headers().authorization).toBe(`Bearer ${token}`);
    const send = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (path === '/api/session') return send({ ok: true, role });
    if (path === '/api/admin-data') return send(data);
    if (path === '/api/pending') return send({ ok: true, changes });
    if (['/api/approve', '/api/approve-batch'].includes(path)) {
      writes.push({ path, body: request.postDataJSON() });
      return send({ ok: false, error: `Synthetic retryable error: ${longValue}` }, 503);
    }
    throw new Error(`Unexpected synthetic review request: ${path}`);
  });
  return { writes, requests, changes };
}

async function openReview(page, url = '/uat/admin.html?tab=manage') {
  await page.goto(url); await expect(page.locator('.admin-pending-card')).toHaveCount(5);
}

async function reviewBounds(page, width) {
  const boxes = await page.locator('.admin-pending-panel,.admin-batch-review,.admin-batch-review article,.admin-pending-card,.admin-pending-table,.admin-pending-table td,.admin-pending-meta,.admin-pending-card-header,.admin-pending-actions,.admin-pending-action-status,.admin-pending-panel .admin-button,.admin-history-card,.admin-history-controls,.admin-history-controls > *,.admin-history-corrective').evaluateAll(elements => elements.map(element => ({ element: element.className || element.tagName, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, overflow: element.scrollWidth - element.clientWidth })));
  expect(boxes.filter(box => box.left < -1 || box.right > width + 1 || box.overflow > 1)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  const buttons = await page.locator('.admin-pending-actions button,.admin-pending-bulk-actions button,.admin-batch-review button').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
  expect(buttons.every(height => height >= 44)).toBe(true);
}

module.exports = { mockReview, openReview, reviewBounds, longValue, batchId };
