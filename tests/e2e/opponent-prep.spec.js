const { test, expect } = require('@playwright/test');
const model = require('../../opponent-prep-model');
const Rich = require('../../notebook-rich-text');

const API = 'https://little-kings-api.little-kings.workers.dev';
const owner = { playerId:'LK-0080', displayName:'架空の選手', englishName:'Fictional Player', bilingual:true, status:'ST-001' };
const opponent = { playerId:'LK-0002', displayName:'架空の相手A', englishName:'Fictional Opponent A', status:'ST-001' };
const other = { playerId:'LK-0003', displayName:'架空の相手B', englishName:'Fictional Opponent B', status:'ST-001' };
const siteToken = `${Buffer.from(JSON.stringify({ role:'site', expires:Date.now() + 86400000 })).toString('base64')}.signature`;
const notes = `Original English\nORIGINAL_SHOULD_NOT_BE_USED\n\nEnglish Back-Translation\nI returned short serves carefully. Next time I will focus on moving my feet.\n\nJapanese Translation（日本語訳）\n短いサーブを丁寧に返しました。次は足を動かすことを意識します。\n\n## English Original\nOTHER_SECTION_SHOULD_NOT_APPEAR`;
const privateKey = 'lk-private-reflection-session-uat';
const richNote = Rich.fromDelta({ ops:[
  { insert:'English Back-Translation', attributes:{ bold:true } }, { insert:'\n' },
  { insert:'Next time I will practise a calm receive.\n' },
  { insert:'Serve placement', attributes:{ bold:true } }, { insert:'\n' },
  { insert:'I varied the serve.' }, { insert:'\n', attributes:{ list:'bullet' } },
  { insert:'Japanese Translation（日本語訳）', attributes:{ bold:true } }, { insert:'\n' },
  { insert:'次は落ち着いたレシーブを練習します。\n' },
  { insert:'English Original', attributes:{ bold:true } }, { insert:'\n' },
  { insert:'RICH_OTHER_SECTION_SHOULD_NOT_APPEAR\n' }
] });
const match = (id, date, player1Id, player2Id, a, b, winnerId = '') => ({ matchId:id, matchDate:date, event:'Club training', division:'Open', format:'Singles', player1Id, player2Id, player1Name:player1Id, player2Name:player2Id, player1Sets:a, player2Sets:b, winnerId });
const publicData = {
  ok:true, club:null, clubs:[], players:[owner, opponent, other], externalOpponents:[], tournaments:[], tournamentProgress:[], rubbers:[], sessions:[], importBatches:[], sessionFeedback:[], matchFeedback:[],
  matches:[match('M-1','2026-10-11',owner.playerId,opponent.playerId,3,1,owner.playerId), match('M-2','2026-10-12',opponent.playerId,owner.playerId,2,1), match('M-OTHER','2026-10-11',owner.playerId,other.playerId,2,1)],
  tournamentMatches:[{ tournamentMatchId:'TM-1', matchDate:'2026-10-13', player1Id:opponent.playerId, player2Id:owner.playerId, player1Sets:2, player2Sets:1, format:'Singles' }]
};
const day = (date, matches, fields) => ({ ok:true, date, document:{ revision:1, fields }, matches });
const documents = {
  '2026-10-11':day('2026-10-11', [
    { key:'training:M-1', source:'training', opponentId:opponent.playerId, opponentName:opponent.displayName, opponentEnglishName:opponent.englishName, score:'3-1', result:'win' },
    { key:'training:M-OTHER', source:'training', opponentId:other.playerId, opponentName:other.displayName, score:'2-1', result:'incomplete' }
  ], { 'match.training:M-1.en':notes, 'match.training:M-OTHER.en':'English Back-Translation\nOTHER_OPPONENT_SECRET', 'daily.en':'DAILY_SECRET', 'coach.en':'COACH_SECRET' }),
  '2026-10-12':day('2026-10-12', [{ key:'training:M-2', source:'training', opponentId:opponent.playerId, opponentName:opponent.displayName, opponentEnglishName:opponent.englishName, score:'1-2', result:'incomplete' }], { 'match.training:M-2.ja':richNote }),
  '2026-10-13':day('2026-10-13', [{ key:'tournament:TM-1', source:'tournament', opponentId:opponent.playerId, opponentName:opponent.displayName, opponentEnglishName:opponent.englishName, score:'1-2', result:'incomplete' }], { 'match.tournament:TM-1.en':'English Back-Translation\nNext time I will watch the ball.\nJapanese Translation（日本語訳）\n次はボールをよく見ます。' }),
  '2025-01-01':day('2025-01-01', [{ key:'training:M-OLD', source:'training', opponentId:other.playerId, opponentName:other.displayName, score:'1-2', result:'incomplete' }], { 'match.training:M-OLD.en':'English Back-Translation\nUNRELATED_SAVED_NOTE' })
};

async function mock(page, options = {}) {
  const state = { requests:[], expire:false, delayDay:null, mutateDay:null, dates:['2026-10-13','2026-10-12','2026-10-11','2025-01-01'], documents:structuredClone(documents), failDates:new Set(), errorStatus:new Map() };
  await page.addInitScript(({ siteToken, remembered, language }) => {
    localStorage.setItem('lk-site-session', siteToken); localStorage.setItem('lk-internal-access-until', String(Date.now() + 86400000)); localStorage.setItem('lk-language', language);
    if (remembered) localStorage.setItem('lk-private-reflection-session-uat', remembered);
  }, { siteToken, remembered:options.remembered || '', language:options.language || 'en' });
  // Profile charts and analytics are isolated test stubs; the private page must
  // never load either script or any other third-party JavaScript.
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType:'application/javascript', body:`class Chart { static defaults={layout:{}}; static instances=new Map(); static register() {} static getChart(id) { return this.instances.get(typeof id === 'string' ? id : id?.id); } constructor(canvas, config) { this.canvas=canvas; this.ctx={}; this.data=config.data; this.options=config.options || {}; this.options.plugins ||= {}; this.options.scales ||= {}; if(canvas) Chart.instances.set(canvas.id,this); } destroy(){ if(this.canvas) Chart.instances.delete(this.canvas.id); } resize(){} update(){} } window.Chart=Chart;` }));
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType:'application/javascript', body:'' }));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType:'text/css', body:'' }));
  await page.route(`${API}/api/**`, async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname, token = (req.headers().authorization || '').replace(/^Bearer /, '');
    state.requests.push({ path, date:url.searchParams.get('date'), environment:url.searchParams.get('environment'), token, method:req.method() });
    const send = (status, body) => route.fulfill({ status, contentType:'application/json', body:JSON.stringify(body) }).catch(() => {});
    if (path === '/api/session') return send(200, { ok:true, role:'site', expires:Date.now() + 86400000 });
    if (path === '/api/public-data') return send(200, publicData);
    if (path === '/api/reflections/login') {
      const body = req.postDataJSON();
      return body.playerId === owner.playerId && body.password === 'synthetic-password' ? send(200, { ok:true, player:owner, token:'private-owner' }) : send(401, { ok:false });
    }
    if (path === '/api/reflections/session') {
      if (state.expire || !['private-owner', 'private-other'].includes(token)) return send(401, { ok:false });
      return send(200, { ok:true, player:token === 'private-owner' ? owner : other });
    }
    if (state.expire || token !== 'private-owner') return send(401, { ok:false });
    if (path === '/api/reflections/dates') return send(200, { ok:true, dates:state.dates });
    if (path === '/api/reflections/day') {
      if (state.delayDay) await state.delayDay;
      const date = url.searchParams.get('date');
      if (state.errorStatus.has(date)) return route.fulfill({ status:state.errorStatus.get(date), contentType:'text/plain', body:'Unavailable' }).catch(() => {});
      if (state.failDates.has(date)) return send(503, { ok:false });
      const result = structuredClone(state.documents[date] || day(date, [], {}));
      if (state.mutateDay) state.mutateDay(result);
      return send(200, result);
    }
    return send(404, { ok:false });
  });
  return state;
}
const prepUrl = `/opponent-prep.html?player=${owner.playerId}&opponent=${opponent.playerId}&date=2026-10-13&date=2026-10-12&date=2026-10-11`;
async function login(page) {
  await page.locator('#prep-login input[name=password]').fill('synthetic-password');
  await page.locator('#prep-login button').click();
}

test('named translation sections retain nested headings and stop at explicit language boundaries', () => {
  expect(model.sections(notes, 'en')).toEqual(['I returned short serves carefully. Next time I will focus on moving my feet.']);
  expect(model.sections(notes, 'ja')).toEqual(['短いサーブを丁寧に返しました。次は足を動かすことを意識します。']);
  expect(model.sections('Unmarked original text', 'en')).toEqual([]);
  expect(model.sections('English Back-Translation\n\nJapanese Translation（日本語訳）\n本文', 'en')).toEqual([]);
  expect(model.sections('English Back-Translation: Next time I will watch.\n## English Original\nOTHER', 'en')).toEqual(['Next time I will watch.']);
  expect(model.sections('**2. English Back-Translation**\n## Things to Improve\nNext time I will practise.\nOther heading:\nKEEP_THIS\n## English Original\nNOT_THIS', 'en')).toEqual(['## Things to Improve\nNext time I will practise.\nOther heading:\nKEEP_THIS']);
  expect(model.takeaways('## Things to Improve\nNext time I will practise.', 'en')).toEqual(['Next time I will practise.']);
  expect(model.matchSections({ 'match.training:M-2.ja':richNote }, 'training:M-2', 'en', Rich.text).map(item => item.text)).toEqual(['Next time I will practise a calm receive.\nServe placement\nI varied the serve.']);
  expect(model.matchSections({ 'match.training:M-2.ja':richNote }, 'training:M-2', 'ja', Rich.text).map(item => item.text)).toEqual(['次は落ち着いたレシーブを練習します。']);
  expect(model.matchSections({ 'match.training:M-2.en':notes, 'match.training:M-2.ja':notes }, 'training:M-2', 'en', Rich.text)).toHaveLength(1);
  expect(model.matchSections({ 'daily.en':notes }, 'training:M-2', 'en', Rich.text)).toEqual([]);
  expect(model.validDate('2026-02-30')).toBe(false);
  expect(model.takeaways('One point. Next time I will practise my serve.', 'en')).toEqual(['One point.', 'Next time I will practise my serve.']);
  expect(model.nextFocus('One point. Next time I will practise my serve.', 'en')).toBe('Next time I will practise my serve.');
  expect(model.nextFocus('The ball was short.', 'en')).toBe('');
});

test('opponent selection links to a separate private page and only the owner can see matching notes', async ({ page }) => {
  const state = await mock(page), errors = [], prepNetwork = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/player.html?id=${owner.playerId}#opponents`);
  await expect(page.locator('#private-opponent-preparation')).toBeVisible();
  await expect(page.locator('#private-prep-opponent')).toHaveValue(opponent.playerId);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height:900 });
    const panel = await page.locator('#private-opponent-preparation').boundingBox();
    expect(panel.x).toBeGreaterThanOrEqual(0); expect(panel.x + panel.width).toBeLessThanOrEqual(width + 1);
    expect((await page.locator('#private-prep-opponent').boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect((await page.locator('#private-prep-open').boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  await page.locator('#private-prep-opponent').selectOption(other.playerId);
  const incompleteOnly = new URL(await page.locator('#private-prep-open').getAttribute('href'), 'http://127.0.0.1:4173');
  expect(incompleteOnly.searchParams.get('opponent')).toBe(other.playerId);
  expect(incompleteOnly.searchParams.getAll('date')).toEqual([]);
  await page.locator('#private-prep-opponent').selectOption(opponent.playerId);
  const url = new URL(await page.locator('#private-prep-open').getAttribute('href'), 'http://127.0.0.1:4173');
  expect(url.searchParams.get('opponent')).toBe(opponent.playerId);
  expect(url.searchParams.getAll('date')).toEqual([]);
  expect(state.requests.some(item => item.path.startsWith('/api/reflections/'))).toBe(false);
  page.on('request', request => { if (page.url().includes('/opponent-prep.html')) prepNetwork.push(request.url()); });
  await page.locator('#private-prep-open').click();
  await expect(page).toHaveURL(/opponent-prep\.html/);
  expect(state.requests.some(item => item.path.startsWith('/api/reflections/'))).toBe(false);
  await page.locator('#prep-open').click();
  await expect(page.locator('#prep-login')).toBeVisible();
  await login(page);
  await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  await expect(page.locator('.opponent-prep-focus')).toContainText('Next time I will watch the ball.');
  await expect(page.locator('.opponent-prep-evidence')).toContainText('Next time I will focus on moving my feet.');
  await expect(page.locator('.opponent-prep-evidence')).toContainText('Next time I will practise a calm receive.');
  const richCard = page.locator('.opponent-prep-card').filter({ hasText:'2026-10-12' });
  await expect(richCard.locator('.opponent-prep-section')).toContainText('Serve placement');
  await expect(richCard.locator('.opponent-prep-section')).toContainText('I varied the serve.');
  await richCard.locator('.opponent-prep-full summary').click();
  await expect(richCard.locator('.opponent-prep-full-value strong').filter({ hasText:'Serve placement' })).toHaveCount(1);
  await expect(richCard.locator('.opponent-prep-full-value li')).toHaveText(['I varied the serve.']);
  await expect(page.locator('.opponent-prep-evidence')).not.toContainText('OTHER_OPPONENT_SECRET');
  await expect(page.locator('.opponent-prep-evidence')).not.toContainText('UNRELATED_SAVED_NOTE');
  await expect(page.locator('.opponent-prep-evidence')).not.toContainText('DAILY_SECRET');
  await expect(page.locator('.opponent-prep-evidence')).not.toContainText('COACH_SECRET');
  await expect(page.locator('.opponent-prep-translation').filter({ hasText:'OTHER_SECTION_SHOULD_NOT_APPEAR' })).toHaveCount(0);
  await expect(page.locator('.opponent-prep-translation').filter({ hasText:'RICH_OTHER_SECTION_SHOULD_NOT_APPEAR' })).toHaveCount(0);
  await expect(page.locator('.opponent-prep-card').first()).toContainText('Incomplete');
  expect(state.requests.filter(item => item.path === '/api/reflections/day').map(item => item.date).sort()).toEqual(['2025-01-01','2026-10-11','2026-10-12','2026-10-13']);
  expect(state.requests.filter(item => item.path.startsWith('/api/reflections/')).every(item => item.environment === 'uat')).toBe(true);
  expect(state.requests.filter(item => item.path.startsWith('/api/reflections/') && item.path !== '/api/reflections/login').every(item => item.method === 'GET')).toBe(true);
  expect(prepNetwork.filter(url => !url.startsWith('http://127.0.0.1:4173/') && !url.startsWith(API))).toEqual([]);
  expect(await page.evaluate(() => typeof window.gtag)).toBe('undefined');
  expect(await page.evaluate(() => Object.values(localStorage).join(' ') + Object.values(sessionStorage).join(' '))).not.toContain('focus on moving');
  expect(await page.evaluate(key => localStorage.getItem(key), privateKey)).toBeNull();
  expect(errors).toEqual([]);
});

test('language switches use only the named translated section and revalidate the notebook session', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  const sessionCount = state.requests.filter(item => item.path === '/api/reflections/session').length;
  await page.locator('#language-toggle').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  await expect(page.locator('.opponent-prep-evidence')).toContainText('次は足を動かすことを意識します。');
  await expect(page.locator('.opponent-prep-evidence')).toContainText('次は落ち着いたレシーブを練習します。');
  await expect(page.locator('.opponent-prep-focus')).toContainText('次はボールをよく見ます。');
  await expect(page.locator('.opponent-prep-translation').filter({ hasText:'Next time I will' })).toHaveCount(0);
  expect(state.requests.filter(item => item.path === '/api/reflections/session')).toHaveLength(sessionCount + 1);
  state.expire = true;
  await page.locator('#language-toggle').click();
  await expect(page.locator('#prep-login')).toBeVisible();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), privateKey)).toBeNull();
});

test('a remembered different player cannot read this profile; a fresh owner sign-in does not replace their token', async ({ page }) => {
  const state = await mock(page, { remembered:'private-other' });
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('#prep-login')).toBeVisible();
  await expect(page.locator('[role=alert]')).toContainText('another player');
  expect(state.requests.some(item => ['/api/reflections/dates','/api/reflections/day'].includes(item.path))).toBe(false);
  await login(page); await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  expect(await page.evaluate(key => localStorage.getItem(key), privateKey)).toBe('private-other');
  await page.locator('#prep-hide').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), privateKey)).toBe('private-other');
});

test('cancelled or revoked access never reveals late results; other tabs and frozen pages clear private text', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  let release; state.delayDay = new Promise(resolve => { release = resolve; });
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect.poll(() => state.requests.some(item => item.path === '/api/reflections/day')).toBe(true);
  await expect(page.locator('#prep-progress')).toContainText('0 of 4 saved dates');
  await page.locator('#prep-cancel').click(); release();
  await expect(page.locator('#prep-open')).toBeVisible(); await expect(page.locator('.opponent-prep-card')).toHaveCount(0);
  state.delayDay = null;
  await page.locator('#prep-open').click(); await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  await page.evaluate(key => { const oldValue = localStorage.getItem(key); localStorage.removeItem(key); window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue:null })); }, privateKey);
  await expect(page.locator('.opponent-prep-card')).toHaveCount(0);
  await expect(page.locator('#prep-open')).toBeVisible();
  await page.evaluate(key => localStorage.setItem(key, 'private-owner'), privateKey);
  await page.locator('#prep-open').click(); await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted:true })));
  await expect(page.locator('.opponent-prep-card')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted:true })));
  await expect(page.locator('#prep-open')).toBeVisible();
});

test('missing named sections do not fall back to originals, and untrusted text is escaped', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  state.mutateDay = result => { for (const key of Object.keys(result.document.fields)) if (key.startsWith('match.')) result.document.fields[key] = 'Original text without a translation heading'; };
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-missing')).toHaveCount(3);
  await expect(page.locator('.opponent-prep-missing').first()).toContainText('no non-empty “English Back-Translation” section');
  await expect(page.locator('.opponent-prep-translation')).toHaveCount(0);
  await expect(page.locator('.opponent-prep-full-value').first()).toBeHidden();
  await page.locator('.opponent-prep-full summary').first().click();
  await expect(page.locator('.opponent-prep-full-value').first()).toBeVisible();
  await expect(page.locator('.opponent-prep-full-value').first()).toContainText('Original text without a translation heading');
  await page.locator('#prep-hide').click();
  state.mutateDay = result => { for (const key of Object.keys(result.document.fields)) if (key.startsWith('match.')) result.document.fields[key] = 'English Back-Translation\nNext time <img src=x onerror=alert(1)> I will practise.'; };
  await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  await expect(page.locator('.opponent-prep-card').first()).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.opponent-prep-card img')).toHaveCount(0);
});

test('a day response cannot attribute another opponent’s note to the selected opponent', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  state.mutateDay = result => {
    result.matches = result.matches.map(item => ({ ...item, opponentId:other.playerId }));
    for (const key of Object.keys(result.document.fields)) if (key.startsWith('match.')) result.document.fields[key] = 'English Back-Translation\nNOT_THE_SELECTED_OPPONENT';
  };
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-message')).toContainText('No saved notebook dates with a recorded meeting');
  await expect(page.locator('body')).not.toContainText('NOT_THE_SELECTED_OPPONENT');
});

test('all saved dates and match cards remain visible with complete translated sections', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  const dates = Array.from({ length:16 }, (_, index) => new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10));
  const longSentence = `${'Long synthetic point '.repeat(30)}FULL_SENTENCE_END.`;
  const full = `English Back-Translation\n## Serve placement\nFirst point.\nSecond point.\nThird point.\nFourth point.\n${longSentence}\n**Other useful detail**\nFifth point.\nJapanese Translation（日本語訳）\n日本語の例です。`;
  state.dates = dates;
  state.documents = Object.fromEntries(dates.map((date, index) => {
    const key = `training:OLDER-${index}`;
    return [date, day(date, [{ key, source:'training', opponentId:opponent.playerId, opponentName:opponent.displayName, score:'1-2', result:'incomplete' }], { [`match.${key}.en`]:full })];
  }));
  const newest = state.documents[dates.at(-1)];
  for (let index = 0; index < 32; index++) {
    const key = `training:EXTRA-${index}`;
    newest.matches.push({ key, source:'training', opponentId:opponent.playerId, opponentName:opponent.displayName, score:'3-1', result:'win' });
    newest.document.fields[`match.${key}.en`] = 'English Back-Translation\nAn extra complete takeaway.';
  }
  const missing = 'training:MISSING-HEADING', dailyOnly = 'training:DAILY-ONLY';
  newest.matches.push({ key:missing, source:'training', opponentId:opponent.playerId, opponentName:opponent.displayName, score:'1-2', result:'incomplete' });
  newest.document.fields[`match.${missing}.en`] = 'Saved match writing without either named heading.';
  newest.matches.push({ key:dailyOnly, source:'training', opponentId:opponent.playerId, opponentName:opponent.displayName, score:'0-1', result:'incomplete' });
  newest.document.fields['daily.en'] = 'A private daily entry, not attributed to any opponent.';
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(50);
  expect(state.requests.filter(item => item.path === '/api/reflections/day')).toHaveLength(16);
  await expect(page.locator('.opponent-prep-card').filter({ hasText:dates[0] })).toHaveCount(1);
  const section = page.locator('.opponent-prep-card').filter({ hasText:dates[0] }).locator('.opponent-prep-section');
  await expect(section).toContainText('Fourth point.');
  await expect(section).toContainText(longSentence);
  await expect(section).toContainText('Other useful detail');
  await expect(section).toContainText('Fifth point.');
  await expect(page.locator('.opponent-prep-missing')).toHaveCount(2);
  await expect(page.locator('.opponent-prep-missing').filter({ hasText:'no non-empty “English Back-Translation” section' })).toHaveCount(1);
  await expect(page.locator('.opponent-prep-missing').filter({ hasText:'No match-specific note' })).toHaveCount(1);
  await expect(page.locator('.opponent-prep-evidence')).not.toContainText('A private daily entry');
});

test('failed dates are clearly marked and can be retried without losing successful dates', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  state.failDates.add('2026-10-12');
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(2);
  await expect(page.locator('.opponent-prep-partial')).toContainText('1 saved date could not be checked');
  state.failDates.clear();
  await page.locator('#prep-retry-dates').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  await expect(page.locator('.opponent-prep-partial')).toHaveCount(0);
  expect(state.requests.filter(item => item.path === '/api/reflections/day' && item.date === '2026-10-12')).toHaveLength(2);
  expect(state.requests.filter(item => item.path === '/api/reflections/session')).toHaveLength(2);
});

test('repeated failures halt scanning and report every unchecked date for retry', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  state.dates.forEach(date => state.failDates.add(date));
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-partial')).toContainText('4 saved dates could not be checked');
  await expect(page.locator('.opponent-prep-message[role=status]')).toContainText('among the checked dates');
  state.failDates.clear(); await page.locator('#prep-retry-dates').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  await expect(page.locator('.opponent-prep-partial')).toHaveCount(0);
});

test('revocation during a scan clears partial results instead of treating the date as missing', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  state.mutateDay = () => { state.expire = true; };
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('#prep-login')).toBeVisible();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(0);
  await expect(page.locator('.opponent-prep-partial')).toHaveCount(0);
  await expect(page.locator('[role=alert]')).toContainText('expired or was revoked');
});

test('non-JSON authentication errors clear partial results and the revoked remembered session', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  state.errorStatus.set('2026-10-13', 401);
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('#prep-login')).toBeVisible();
  await expect(page.locator('[role=alert]')).toContainText('expired or was revoked');
  await expect(page.locator('.opponent-prep-card, .opponent-prep-partial')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), privateKey)).toBeNull();
});

test('non-JSON rate limits are reported and retry only failed or unchecked dates', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  state.errorStatus.set('2026-10-13', 429);
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-partial')).toBeVisible();
  const attempted = state.requests.filter(item => item.path === '/api/reflections/day').map(item => item.date);
  expect(attempted).toContain('2026-10-13');
  state.errorStatus.clear(); await page.locator('#prep-retry-dates').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  await expect(page.locator('.opponent-prep-partial')).toHaveCount(0);
  const final = state.requests.filter(item => item.path === '/api/reflections/day').map(item => item.date);
  expect(final.filter(date => date === '2026-10-13')).toHaveLength(2);
  for (const date of state.dates.filter(date => date !== '2026-10-13')) expect(final.filter(value => value === date)).toHaveLength(1);
});

test('invalid saved-date metadata is reported rather than silently ignored', async ({ page }) => {
  const state = await mock(page, { remembered:'private-owner' });
  state.dates.push('2026-02-30');
  await page.goto(prepUrl); await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  await expect(page.locator('[role=alert]')).toContainText('saved-date entries were invalid');
  expect(state.requests.some(item => item.path === '/api/reflections/day' && item.date === '2026-02-30')).toBe(false);
});

test('production uses the production notebook session and never the UAT session', async ({ page }) => {
  const state = await mock(page, { remembered:'private-other' });
  await page.addInitScript(() => localStorage.setItem('lk-private-reflection-session-prod', 'private-owner'));
  await page.route('https://prod-prep.test/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url:`http://127.0.0.1:4173${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await page.goto(`https://prod-prep.test${prepUrl}`);
  await page.locator('#prep-open').click();
  await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  const calls = state.requests.filter(item => item.path.startsWith('/api/reflections/'));
  expect(calls.every(item => item.environment === 'prod' && item.token === 'private-owner')).toBe(true);
  expect(await page.evaluate(key => localStorage.getItem(key), privateKey)).toBe('private-other');
});

for (const language of ['en', 'ja']) test(`private preparation fits supported screen sizes (${language})`, async ({ page }) => {
  await mock(page, { remembered:'private-owner', language });
  await page.goto(prepUrl); await page.locator('#prep-open').click(); await expect(page.locator('.opponent-prep-card')).toHaveCount(3);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height:900 });
    await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth)).toBeLessThanOrEqual(1);
    const bounds = await page.locator('.opponent-prep-card').first().boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
  }
});
