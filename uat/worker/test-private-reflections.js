import assert from 'node:assert/strict';
import worker from './src/index.js';
import { SAVE_SCRIPT } from './src/private-reflections.js';

const store = new Map(), hashes = new Map(), sorted = new Map();
const hashFor = key => { if (!hashes.has(key)) hashes.set(key, new Map()); return hashes.get(key); };
const setJson = (key, value) => store.set(key, JSON.stringify(value));
const getJson = key => JSON.parse(store.get(key) || 'null');
const players = [{ playerId: 'LK-0080', displayName: 'Player A' }, { playerId: 'LK-0002', displayName: 'Player B' }, { playerId: 'LK-0003', displayName: 'Player C' }];
for (const environment of ['uat', 'prod']) {
  setJson(`${environment}:players`, players);
  setJson(`${environment}:session-feedback`, [{ feedbackId: 'legacy', note: 'DO NOT EXPOSE' }]);
  setJson(`${environment}:match-feedback`, [{ matchFeedbackId: 'legacy', whatWorked: 'DO NOT EXPOSE' }]);
  setJson(`${environment}:pending-changes`, [{ entityType: 'sessionFeedback', changeId: 'CHANGE-LEGACY', status: 'pending', batchId: 'LEGACY', after: { note: 'DO NOT EXPOSE' } }]);
}
setJson('uat:matches', [
  { matchId: 'M-A', player1Id: 'LK-0080', player2Id: 'LK-0003', player2Name: 'Opponent C', matchDate: '2026-10-11', player1Sets: 3, player2Sets: 1, event: 'Club training', format: 'Singles' },
  { matchId: 'M-B', player1Id: 'LK-0003', player2Id: 'LK-0002', player1Name: 'Opponent C', matchDate: '2026-10-11', player1Sets: 2, player2Sets: 1, event: 'Club training' }
]);
setJson('uat:tournament-matches', [{ tournamentMatchId: 'TM-A', player1Id: 'LK-0080', player2Id: 'EXT-0001', player2Name: 'Tournament opponent', matchDate: '2026-10-11', player1Sets: 0, player2Sets: 3 }]);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input), parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'get') return Response.json({ result: store.get(parts[1]) || null });
  if (parts[0] === 'set') { store.set(parts[1], options.body); return Response.json({ result: 'OK' }); }
  const [command, ...args] = JSON.parse(options.body);
  let result;
  if (command === 'GET') result = store.get(args[0]) || null;
  else if (command === 'SET') { store.set(args[0], args[1]); result = 'OK'; }
  else if (command === 'DEL') { result = store.delete(args[0]) ? 1 : 0; }
  else if (command === 'HGET') result = hashFor(args[0]).get(args[1]) || null;
  else if (command === 'HGETALL') result = [...hashFor(args[0])].flat();
  else if (command === 'ZREVRANGE') result = [...(sorted.get(args[0]) || [])].sort().reverse();
  else if (command === 'EVAL') {
    const [script, numkeys, ...rest] = args, keys = rest.slice(0, numkeys), values = rest.slice(numkeys);
    if (script === SAVE_SCRIPT) {
      const [id, version, revision, patch, updatedAt, , date] = values;
      const account = JSON.parse(hashFor(keys[0]).get(id) || 'null');
      const current = getJson(keys[1]) || { revision: 0, fields: {} };
      if (!account?.enabled || account.version !== Number(version) || !store.has(keys[3])) result = ['unauthorized'];
      else if (current.revision !== Number(revision)) result = ['conflict'];
      else {
        current.fields = { ...current.fields, ...JSON.parse(patch) }; current.revision++; current.updatedAt = updatedAt;
        setJson(keys[1], current); if (!sorted.has(keys[2])) sorted.set(keys[2], new Set()); sorted.get(keys[2]).add(date);
        result = ['saved', String(current.revision), updatedAt];
      }
    } else if (script.includes('previous.version')) {
      const previous = JSON.parse(hashFor(keys[0]).get(values[0]) || '{}'), account = JSON.parse(values[1]);
      account.version = (previous.version || 0) + 1;
      if (!account.hash) { account.hash = previous.hash; account.salt = previous.salt; }
      hashFor(keys[0]).set(values[0], JSON.stringify(account)); result = String(account.version);
    } else if (script.includes("redis.call('INCR'")) { const count = Number(store.get(keys[0]) || 0) + 1; store.set(keys[0], String(count)); result = count; }
    else throw new Error('Unknown Lua script');
  } else throw new Error(`Unknown Redis command: ${command}`);
  return Response.json({ result });
};
const env = { UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'test-only', SITE_PASSWORD: 'site-test-only', ADMIN_PASSWORD: 'admin-test-only', APPROVER_PASSWORD: 'approver-test-only', SESSION_SECRET: 'test-only', SECURE_PROD: 'true' };
async function call(path, { token, body, method = body ? 'POST' : 'GET', environment = 'uat', origin = 'https://rickliky.github.io', ip = '192.0.2.1', environmentValues = {} } = {}) {
  const url = new URL(`https://worker.test${path}`); url.searchParams.set('environment', environment);
  const response = await worker.fetch(new Request(url, { method, headers: { Origin: origin, 'CF-Connecting-IP': ip, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }), { ...env, ...environmentValues });
  return { status: response.status, value: method === 'OPTIONS' ? null : await response.json(), headers: response.headers };
}
const day = '/api/reflections/day?date=2026-10-11';
try {
  const admin = (await call('/api/login', { body: { role: 'admin', password: env.ADMIN_PASSWORD } })).value.token;
  const site = (await call('/api/login', { body: { role: 'site', password: env.SITE_PASSWORD } })).value.token;
  const approver = (await call('/api/login', { body: { role: 'approver', password: env.APPROVER_PASSWORD } })).value.token;
  assert.equal((await call('/api/reflections/accounts', { token: site })).status, 403);
  assert.equal((await call('/api/reflections/accounts', { token: approver })).status, 403);
  for (const id of ['LK-0080', 'LK-0002', 'LK-0003']) assert.equal((await call('/api/reflections/accounts', { token: admin, body: { playerId: id, enabled: true, password: 'synthetic-password-only' } })).status, 200);
  const directory = await call('/api/reflections/directory');
  assert.equal(directory.value.players.length, 3);
  assert.equal(directory.headers.get('cache-control'), 'no-store');
  assert.equal(directory.value.players[2].bilingual, false);
  assert.ok(!JSON.stringify(directory.value).includes('salt'));
  assert.ok(!JSON.stringify((await call('/api/reflections/accounts', { token: admin })).value).includes('hash'));
  assert.equal((await call('/api/reflections/directory', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('/api/reflections/directory', { method: 'OPTIONS' })).status, 204);
  assert.equal((await call('/api/reflections/login', { body: { playerId: 'LK-0080', password: 'wrong-password' } })).status, 401);
  const login = async id => (await call('/api/reflections/login', { body: { playerId: id, password: 'synthetic-password-only' } })).value;
  const a = await login('LK-0080'), b = await login('LK-0002'), c = await login('LK-0003');
  assert.ok(Math.abs(a.expires - Date.now() - 56 * 86400000) < 2000);
  for (const token of [undefined, site, admin, approver, `${a.token}tampered`]) assert.equal((await call(day, { token })).status, 401);
  assert.equal((await call('/api/admin-data', { token: a.token })).status, 401);
  assert.equal((await call(day, { token: a.token, environment: 'prod' })).status, 404);
  assert.equal((await call(day, { token: a.token, environment: 'prod', environmentValues: { PRIVATE_REFLECTION_PROD: 'true' } })).status, 401, 'UAT tokens cannot authenticate in PROD even after rollout');
  assert.equal((await call(`${day}&playerId=LK-0002`, { token: a.token })).status, 403);
  const ownDay = await call(day, { token: a.token });
  assert.equal(ownDay.value.matches.length, 2);
  assert.ok(ownDay.value.matches.every(match => match.key !== 'training:M-B'));
  assert.equal((await call(day, { token: b.token })).value.matches[0].result, 'incomplete');
  assert.equal((await call(day, { token: a.token, body: { revision: 0, patch: { 'match.training:M-B.en': 'not mine' } } })).status, 400);
  assert.equal((await call('/api/reflections/day?date=2026-02-30', { token: a.token })).status, 400);
  assert.equal((await call(day, { token: c.token, body: { revision: 0, patch: { 'daily.en': 'not enabled' } } })).status, 400);
  assert.equal((await call(day, { token: a.token, body: { revision: 0, playerId: 'LK-0002', patch: { 'daily.en': 'not mine' } } })).status, 400);
  assert.equal((await call(day, { token: a.token, body: { revision: 0, patch: { 'daily.en': 'x'.repeat(8001) } } })).status, 400);
  assert.equal((await call(day, { token: a.token, body: { revision: 0, patch: { 'daily.en': 'x'.repeat(70000) } } })).status, 413);
  const concurrent = await Promise.all(['first', 'second'].map(text => call(day, { token: a.token, body: { revision: 0, patch: { 'daily.en': text } } })));
  assert.deepEqual(concurrent.map(result => result.status).sort(), [200, 409], 'atomic revision check must reject the stale writer');
  assert.equal((await call(day, { token: a.token, body: { revision: 1, patch: { 'coach.ja': 'synthetic coach comment' } } })).status, 200);
  const stored = (await call(day, { token: a.token })).value.document;
  assert.ok(['first', 'second'].includes(stored.fields['daily.en']));
  assert.equal(stored.fields['coach.ja'], 'synthetic coach comment');
  assert.deepEqual((await call('/api/reflections/dates', { token: a.token })).value.dates, ['2026-10-11']);
  assert.deepEqual((await call('/api/reflections/dates', { token: b.token })).value.dates, []);
  assert.deepEqual((await call(day, { token: b.token })).value.document.fields, {});
  const adminPaths = ['/api/reflections/admin/players', '/api/reflections/admin/dates?playerId=LK-0080', '/api/reflections/admin/day?playerId=LK-0080&date=2026-10-11'];
  for (const path of adminPaths) {
    for (const token of [undefined, site, approver, a.token, `${admin}tampered`]) {
      assert.ok([401, 403].includes((await call(path, { token })).status), `${path} must reject non-Admin access`);
    }
    const result = await call(path, { token: admin });
    assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.ok(!JSON.stringify(result.value).includes('hash')); assert.ok(!JSON.stringify(result.value).includes('salt'));
    assert.equal((await call(path, { token: admin, body: { patch: { 'coach.ja': 'must not write' } } })).status, 405);
    assert.equal((await call(path, { token: admin, method: 'DELETE' })).status, 405);
    assert.equal((await call(path, { token: admin, environment: 'prod' })).status, 404);
    assert.equal((await call(path, { token: admin, origin: 'https://evil.example' })).status, 403);
  }
  assert.deepEqual((await call(adminPaths[1], { token: admin })).value.dates, ['2026-10-11']);
  const adminDay = (await call(adminPaths[2], { token: admin })).value;
  assert.equal(adminDay.player.playerId, 'LK-0080'); assert.deepEqual(adminDay.document, stored);
  assert.equal(adminDay.matches.length, 2);
  assert.equal((await call('/api/reflections/admin/day?playerId=LK-9999&date=2026-10-11', { token: admin })).status, 404);
  assert.equal((await call('/api/reflections/admin/day?playerId=../../prod&date=2026-10-11', { token: admin })).status, 400);
  assert.equal((await call('/api/reflections/admin/day?playerId=LK-0080&date=2026-02-30', { token: admin })).status, 400);
  for (const path of ['/api/public-data', '/api/admin-data', '/api/pending']) {
    const result = await call(path, { token: admin }); assert.equal(result.status, 200);
    assert.ok(!JSON.stringify(result.value).includes('DO NOT EXPOSE'), path);
    assert.ok(!JSON.stringify(result.value).includes('synthetic coach comment'), path);
  }
  assert.equal((await call('/api/change', { token: admin, body: { entityType: 'sessionFeedback', action: 'create' } })).status, 403);
  assert.equal((await call('/api/approve', { token: admin, body: { changeId: 'CHANGE-LEGACY', decision: 'accept' } })).status, 403);
  assert.equal((await call('/api/approve-batch', { token: admin, body: { batchId: 'LEGACY', decision: 'accept' } })).status, 403);
  assert.equal((await call('/api/bulk-write?environment=prod', { token: admin, environment: 'prod', body: { environment: 'uat', entityType: 'matchFeedback', records: [] } })).status, 403);
  assert.ok(JSON.stringify((await call('/api/admin-data', { token: admin, environment: 'prod' })).value).includes('DO NOT EXPOSE'), 'production remains unchanged');
  assert.equal((await call('/api/reflections/logout', { token: b.token, method: 'POST' })).status, 200);
  assert.equal((await call(day, { token: b.token })).status, 401);
  await call('/api/reflections/accounts', { token: admin, body: { playerId: 'LK-0080', enabled: true, password: 'changed-synthetic-password' } });
  assert.equal((await call(day, { token: a.token })).status, 401, 'reset invalidates old sessions');
  const resetLogin = await call('/api/reflections/login', { body: { playerId: 'LK-0080', password: 'changed-synthetic-password' } });
  assert.equal(resetLogin.status, 200);
  await call('/api/reflections/accounts', { token: admin, body: { playerId: 'LK-0080', enabled: false } });
  assert.equal((await call(day, { token: resetLogin.value.token })).status, 401, 'disable invalidates sessions');
  assert.equal((await call('/api/reflections/directory')).value.players.length, 2);
  assert.equal((await call(adminPaths[2], { token: admin })).value.document.fields['coach.ja'], 'synthetic coach comment', 'Admin may read a disabled account, without enabling it');
  const sessionEntry = [...store].find(([key, value]) => key.includes('session:') && JSON.parse(value).playerId === 'LK-0003');
  const expired = JSON.parse(sessionEntry[1]); expired.expires = Date.now() - 1; setJson(sessionEntry[0], expired);
  assert.equal((await call(day, { token: c.token })).status, 401);
  for (let index = 0; index < 10; index++) await call('/api/reflections/login', { ip: '192.0.2.2', body: { playerId: 'LK-0002', password: 'wrong' } });
  assert.equal((await call('/api/reflections/login', { ip: '192.0.2.2', body: { playerId: 'LK-0002', password: 'wrong' } })).status, 429);
  console.log('Private reflection authorization, isolation, revocation, rate-limit and autosave tests passed.');
} finally { globalThis.fetch = originalFetch; }
