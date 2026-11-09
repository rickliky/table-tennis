const { test, expect } = require('@playwright/test');
const API = process.env.WORKER_BASE_URL || 'https://little-kings-api.little-kings.workers.dev';
const player = { playerId:'LK-0080', displayName:'架空の選手', englishName:'Fictional Player', bilingual:true };
const notes = 'English Back-Translation\nNext time I will practise a calm receive.\nJapanese Translation（日本語訳）\n次は落ち着いたレシーブを練習します。';

test.beforeAll(async ({ request, baseURL }) => {
  if (!process.env.EXPECTED_COMMIT) return;
  await expect.poll(async () => {
    const response = await request.get(new URL(`build-info.json?check=${Date.now()}`, baseURL).toString());
    return response.ok() ? (await response.json()).commit : '';
  }, { timeout:60000, intervals:[1000,2000,3000] }).toBe(process.env.EXPECTED_COMMIT);
});

// All notebook traffic is intercepted. No real account or notebook is used.
for (const language of ['en', 'ja']) for (const width of [320, 1440]) {
  test(`live private opponent preparation uses only synthetic data (${language}, ${width}px)`, async ({ page, context, baseURL }) => {
    const errors = [], apiCalls = [], external = [], origin = new URL(baseURL).origin;
    const location = new URL(baseURL), environment = location.pathname.split('/').includes('uat') || ['localhost', '127.0.0.1'].includes(location.hostname) ? 'uat' : 'prod';
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height:900 });
    await context.addInitScript(({ language, environment }) => { localStorage.setItem('lk-language', language); localStorage.setItem(`lk-private-reflection-session-${environment}`, 'synthetic-owner-token'); }, { language, environment });
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === origin) return route.continue();
      if (url.origin !== new URL(API).origin || !url.pathname.startsWith('/api/')) { external.push(req.url()); return route.abort(); }
      apiCalls.push({ path:url.pathname, method:req.method(), environment:url.searchParams.get('environment') });
      const send = body => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, ...body }) });
      if (url.pathname === '/api/reflections/session') return send({ player });
      if (url.pathname === '/api/reflections/dates') return send({ dates:['2026-10-11'] });
      if (url.pathname === '/api/reflections/day') return send({ date:'2026-10-11', document:{ revision:1, fields:{ 'match.training:SYNTHETIC-1.en':notes, 'daily.en':'UNRELATED_PRIVATE_NOTE' } }, matches:[{ key:'training:SYNTHETIC-1', source:'training', opponentId:'LK-0002', opponentName:'架空の相手', opponentEnglishName:'Fictional Opponent', score:'2-1', result:'incomplete' }] });
      return route.fulfill({ status:404, contentType:'application/json', body:'{"ok":false}' });
    });
    await page.goto('opponent-prep.html?player=LK-0080&opponent=LK-0002&date=2026-10-11');
    expect(apiCalls).toEqual([]);
    await page.locator('#prep-open').click();
    await expect(page.locator('.opponent-prep-card')).toHaveCount(1);
    await expect(page.locator('.opponent-prep-focus')).toContainText(language === 'en' ? 'Next time I will practise a calm receive.' : '次は落ち着いたレシーブを練習します。');
    await expect(page.locator('.opponent-prep-card')).toContainText(language === 'en' ? 'Incomplete' : '未完了');
    await expect(page.locator('body')).not.toContainText('UNRELATED_PRIVATE_NOTE');
    expect(apiCalls.map(call => call.path)).toEqual(['/api/reflections/session','/api/reflections/dates','/api/reflections/day']);
    expect(apiCalls.every(call => call.method === 'GET' && call.environment === environment)).toBe(true);
    expect(external).toEqual([]); expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.locator('#prep-hide').click(); await expect(page.locator('.opponent-prep-card')).toHaveCount(0);
  });
}
