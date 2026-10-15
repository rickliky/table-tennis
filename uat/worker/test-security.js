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

  const legacyProductionResponse = await call('/api/public-data', { environment: 'prod' });
  assert.equal(legacyProductionResponse.status, 200, 'production remains compatible until the secure-production switch is enabled');
  assert.equal((await legacyProductionResponse.json()).players.length, 2, 'legacy production payload must remain unchanged before cutover');
  assert.equal((await call('/api/public-data', { environment: 'prod', environmentValues: { SECURE_PROD: 'true' } })).status, 401, 'the production security switch must require authentication');
  assert.equal((await call('/api/session', { token: `${siteToken}tampered` })).status, 401, 'tampered sessions must be rejected');

  // Separate approved imports append matches to one session, without replacing its metadata.
  const sessionRecord = { sessionId: 'LKS-20261003', sessionDate: '2026-10-03', sessionType: 'Club Training', matchFormat: 'Best of 5', source: 'Original notebook', venue: 'Original venue', coachGoal: 'Original goal', coachNote: 'Original note' };
  const firstMatch = { matchId: 'LKM-SYNTHETIC-FIRST', matchDate: '2026-10-03', sessionId: sessionRecord.sessionId, player1Id: 'LK-0001', player2Id: 'LK-0002', player1Sets: 3, player2Sets: 1 };
  for (const [index, hashCharacter] of ['a', 'b'].entries()) {
    const inputHash = hashCharacter.repeat(64), importBatchId = `IMP-${inputHash.slice(0, 16).toUpperCase()}`, batchId = `BATCH-${importBatchId}`;
    const match = { ...firstMatch, matchId: index ? 'LKM-SYNTHETIC-SECOND' : firstMatch.matchId, player2Sets: index ? 2 : 1, importBatchId };
    const imported = { importBatchId, inputHash, importType: 'trainingMatches', sessionId: sessionRecord.sessionId, sessionDate: sessionRecord.sessionDate, sourceName: 'Training matches 2026-10-03', rowCount: 1, matchIds: [match.matchId] };
    for (const [entityType, targetId, after, action] of [
      ['importBatch', importBatchId, imported, 'create'],
      ['session', sessionRecord.sessionId, sessionRecord, index ? 'update' : 'create'],
      ['match', match.matchId, match, 'create']
    ]) assert.equal((await call('/api/change', { method: 'POST', token: adminToken, body: { entityType, targetId, after, action, batchId } })).status, 200);
    assert.equal((await call('/api/approve-batch', { method: 'POST', token: approverToken, body: { batchId, decision: 'accept' } })).status, 200);
    assert.deepEqual(JSON.parse(store.get('uat:sessions')), [sessionRecord], 'same-session imports must preserve one session and its metadata');
    assert.equal(JSON.parse(store.get('uat:matches')).length, index + 1, 'later imports must append, not replace earlier matches');
  }
  assert.deepEqual(JSON.parse(store.get('uat:matches'))[0], { ...firstMatch, importBatchId: 'IMP-AAAAAAAAAAAAAAAA' });
  assert.equal(JSON.parse(store.get('uat:import-batches')).length, 2, 'each import has independent batch history');
  assert.deepEqual(JSON.parse(store.get('prod:sessions')), [], 'synthetic UAT approvals must not touch production');

  console.log('Worker security and same-session incremental import tests passed.');
} finally {
  globalThis.fetch = originalFetch;
}
