import assert from 'node:assert/strict';
import worker from './src/index.js';

const collections = ['clubs', 'players', 'matches', 'external-opponents', 'tournaments', 'tournament-matches', 'tournament-progress', 'rubbers', 'session-feedback', 'match-feedback', 'sessions', 'import-batches', 'pending-changes'];
const store = new Map();
for (const environment of ['uat', 'prod']) {
  for (const collection of collections) store.set(`${environment}:${collection}`, JSON.stringify([]));
  store.set(`${environment}:players`, JSON.stringify([
    { playerId: 'LK-0001', displayName: 'Active player', status: 'ST-001' },
    { playerId: 'LK-0002', displayName: 'Inactive player', status: 'ST-002' }
  ]));
  store.set(`${environment}:pending-changes`, JSON.stringify([{ changeId: 'CHANGE-EXISTING', status: 'accepted', after: { private: true } }]));
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'get') return Response.json({ result: store.get(parts[1]) ?? null });
  if (parts[0] === 'set') {
    store.set(parts[1], String(options.body ?? ''));
    return Response.json({ result: 'OK' });
  }
  throw new Error(`Unexpected mock Redis request: ${url}`);
};

const env = {
  UPSTASH_REDIS_REST_URL: 'https://mock-redis.local',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token',
  SITE_PASSWORD: 'site-password',
  ADMIN_PASSWORD: 'admin-password',
  APPROVER_PASSWORD: 'approver-password',
  SESSION_SECRET: 'test-session-secret',
  SECURE_PROD: 'false'
};

async function call(path, { method = 'GET', token = '', body, environment = 'uat', environmentValues = {} } = {}) {
  const separator = path.includes('?') ? '&' : '?';
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return worker.fetch(new Request(`https://worker.test${path}${separator}environment=${environment}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  }), { ...env, ...environmentValues });
}

async function signIn(role, password) {
  const response = await call('/api/login', { method: 'POST', body: { role, password } });
  assert.equal(response.status, 200);
  return (await response.json()).token;
}

try {
  const [siteToken, adminToken, approverToken] = await Promise.all([
    signIn('site', env.SITE_PASSWORD),
    signIn('admin', env.ADMIN_PASSWORD),
    signIn('approver', env.APPROVER_PASSWORD)
  ]);

  assert.equal((await call('/api/public-data')).status, 401, 'UAT member data must require a session');
  const memberResponse = await call('/api/public-data', { token: siteToken });
  assert.equal(memberResponse.status, 200);
  assert.deepEqual((await memberResponse.json()).players.map(player => player.playerId), ['LK-0001'], 'member data must exclude inactive players');

  assert.equal((await call('/api/admin-data', { token: siteToken })).status, 403, 'site sessions must not read maintenance data');
  assert.equal((await call('/api/pending', { token: siteToken })).status, 403, 'site sessions must not read audit records');
  assert.equal((await call('/api/change', { method: 'POST', token: siteToken, body: { entityType: 'player', action: 'create', targetId: 'LK-0003', after: { playerId: 'LK-0003', displayName: 'Blocked' } } })).status, 403, 'site sessions must not submit maintenance changes');

  const adminDataResponse = await call('/api/admin-data', { token: adminToken });
  assert.equal(adminDataResponse.status, 200);
  assert.equal((await adminDataResponse.json()).players.length, 2, 'maintenance data must include inactive players');

  const createResponse = await call('/api/change', { method: 'POST', token: adminToken, body: { entityType: 'player', action: 'create', targetId: 'LK-0003', after: { playerId: 'LK-0003', displayName: 'Pending player', status: 'ST-001' } } });
  assert.equal(createResponse.status, 200, 'admin sessions must submit maintenance changes');
  const changeId = (await createResponse.json()).change.changeId;
  assert.equal((await call('/api/pending', { token: adminToken })).status, 200, 'admin sessions must read audit records');
  assert.equal((await call('/api/approve', { method: 'POST', body: { changeId, decision: 'reject' } })).status, 401, 'anonymous users must not reject changes');
  assert.equal((await call('/api/approve', { method: 'POST', token: approverToken, body: { changeId, decision: 'reject' } })).status, 200, 'approvers must review changes');
  assert.equal((await call('/api/bulk-rubbers', { method: 'POST', token: approverToken, body: { rubbers: [{ rubberId: 'RB-TEST' }] } })).status, 403, 'approvers must not bulk-write data');

  assert.equal((await call('/api/public-data', { environment: 'prod' })).status, 200, 'production remains compatible until the secure-production switch is enabled');
  assert.equal((await call('/api/public-data', { environment: 'prod', environmentValues: { SECURE_PROD: 'true' } })).status, 401, 'the production security switch must require authentication');
  assert.equal((await call('/api/session', { token: `${siteToken}tampered` })).status, 401, 'tampered sessions must be rejected');

  console.log('Worker security tests passed.');
} finally {
  globalThis.fetch = originalFetch;
}
