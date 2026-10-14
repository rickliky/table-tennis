const { expect } = require('@playwright/test');
const API = 'https://little-kings-api.little-kings.workers.dev';
const header = 'matchDate,player1,player1Sets,player2,player2Sets,division,matchFormat';
const sample = `${header},player1Name,player2Name\n10/3/2026,LK-0093,3,LK-0001,1,Open,'Best of 5',岡田,三田村`;

async function mockImport(context, language = 'en') {
  const writes = [], requests = [], pending = [];
  await context.route('http://127.0.0.1:4173/uat/**', async route => {
    const response = await route.fetch({ url: route.request().url().replace('/uat/', '/') }); await route.fulfill({ response });
  });
  const data = { ok: true, clubs: [], matches: [], externalOpponents: [], tournaments: [], tournamentMatches: [], tournamentProgress: [], rubbers: [], sessions: [], importBatches: [], players: [
    { playerId: 'LK-0093', displayName: '登録選手A', englishName: 'Synthetic A', status: 'ST-001' },
    { playerId: 'LK-0001', displayName: '登録選手B', englishName: 'Synthetic B', status: 'ST-001' },
    { playerId: 'LK-0002', displayName: '別の登録選手', notebookName: 'LK-0093', status: 'ST-001' }
  ] };
  const token = `${Buffer.from(JSON.stringify({ role: 'admin', expires: Date.now() + 86400000 })).toString('base64')}.synthetic-signature`;
  await context.addInitScript(({ language, token }) => { localStorage.setItem('lk-language', language); localStorage.setItem('lk-admin-session', token); }, { language, token });
  await context.route(`${API}/api/**`, async route => {
    const request = route.request(), url = new URL(request.url()); requests.push(url.pathname);
    const send = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
    expect(request.headers().authorization).toBe(`Bearer ${token}`);
    if (url.pathname === '/api/session') return send({ ok: true, role: 'admin' });
    if (url.pathname === '/api/admin-data') return send(data);
    if (url.pathname === '/api/pending') return send({ ok: true, changes: pending });
    if (url.pathname === '/api/change') { writes.push(request.postDataJSON()); return send({ ok: true }); }
    throw new Error(`Unexpected synthetic import request: ${url.pathname}`);
  });
  return { writes, requests, data, pending };
}

async function openImport(page, url = '/uat/admin.html?tab=import') {
  await page.goto(url); await expect(page.locator('.admin-import-center')).toBeVisible();
  await page.locator('[name="importSource"]').fill('Synthetic input only');
  await page.locator('[name="importDate"]').fill('2026-10-03'); await page.locator('[name="importDate"]').press('Tab');
  await expect(page.locator('[name="importSessionId"]')).toHaveValue('LKS-20261003');
}

async function preview(page, input) {
  await page.locator('[name="importText"]').fill(input);
  await page.locator('.admin-import-input-actions .primary').click();
  await expect(page.locator('.admin-import-preview > header small')).toHaveText(/^IMP-/);
  return page.locator('.admin-import-preview > header small').textContent();
}

module.exports = { header, sample, mockImport, openImport, preview };
