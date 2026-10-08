#!/usr/bin/env node
/*
 * Preview, submit, or approve the 2026-10-08 Little Kings training import in UAT.
 *
 *   node scripts/import-training-matches-2026-10-08.js                 # preview
 *   $env:ADMIN_PASSWORD="..."
 *   node scripts/import-training-matches-2026-10-08.js --submit-uat    # queue changes
 *   node scripts/import-training-matches-2026-10-08.js --approve-uat   # queue + approve
 *
 * Repeat-safe: an approved or already-queued batch is detected and left alone.
 */
const crypto = require('crypto');
const fs = require('fs');

const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = 'uat';
const date = '2026-10-08';
const sessionId = 'LKS-20261008';
const matchFormat = 'Best of 5';
const sourceName = 'Direct transcription 2026-10-08';
const submitMode = process.argv.includes('--submit-uat') || process.argv.includes('--approve-uat');
const approveMode = process.argv.includes('--approve-uat');
const source = fs.readFileSync('scripts/training-matches-2026-10-08.txt', 'utf8');

const aliases = {
  '李母': 'LK-0087', '下田': 'LK-0003', '土屋': 'LK-0015', '福原': 'LK-0004',
  '向井': 'LK-0092', '本木': 'LK-0086', '西田': 'LK-0012', '繁田': 'LK-0089',
  '吉川': 'LK-0013', '中村': 'LK-0060', '佐藤': 'LK-0033', '岩崎': 'LK-0085',
  '三田村': 'LK-0001', '岡田': 'LK-0093', '長島2': 'LK-0091', '大谷': 'LK-0018',
  '岡崎': 'LK-0084', '青山': 'LK-0032', 'ケイツ': 'LK-0002', '坪内父': 'LK-0083',
  '山本': 'LK-0009', 'ジェイス': 'LK-0080', '栗原': 'LK-0006', '望月': 'LK-0005',
  '金子': 'LK-0016', '加藤ふ': 'LK-0046', '加藤そ': 'LK-0064', '坪内': 'LK-0082',
  '笹岡': 'LK-0088', '石塚': 'LK-0079'
};

const rows = source.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
  const parsed = line.trim().match(/^(.+?)\s+(\d+)-(\d+)\s+(.+)$/);
  if (!parsed) throw new Error(`Invalid row ${index + 1}: ${line}`);
  const [, player1Alias, player1SetsText, player2SetsText, player2Alias] = parsed;
  const player1Id = aliases[player1Alias], player2Id = aliases[player2Alias];
  if (!player1Id || !player2Id) throw new Error(`Missing verified alias on row ${index + 1}: ${player1Alias} / ${player2Alias}`);
  if (player1Id === player2Id) throw new Error(`Same player on both sides of row ${index + 1}`);
  return {
    row: index + 1,
    player1Alias,
    player1Id,
    player1Sets: Number(player1SetsText),
    player2Alias,
    player2Id,
    player2Sets: Number(player2SetsText)
  };
});

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const personId = person => person.playerId || person.externalOpponentId;
const exactKey = record => {
  const first = record.player1Id <= record.player2Id
    ? `${record.player1Id}:${record.player1Sets}`
    : `${record.player2Id}:${record.player2Sets}`;
  const second = record.player1Id <= record.player2Id
    ? `${record.player2Id}:${record.player2Sets}`
    : `${record.player1Id}:${record.player1Sets}`;
  return `${record.matchDate}|${first}|${second}`;
};

let token = '';
async function request(path, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const response = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}environment=${environment}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Little-Kings-Training-Import/3.0',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {})
        }
      });
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch { throw new Error(`Worker returned ${response.status}: ${text.slice(0, 160)}`); }
      if (!response.ok) throw new Error(result.error || `Worker returned ${response.status}`);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < 8) await wait(Math.min(10000, attempt * 1500));
    }
  }
  throw lastError;
}

async function login() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD is required for UAT writes; set it in the environment.');
  const result = await request('/api/login', { method: 'POST', body: JSON.stringify({ role: 'admin', password }) });
  token = result.token;
}

async function submitChange(entityType, targetId, after, action, batchId) {
  return request('/api/change', {
    method: 'POST',
    body: JSON.stringify({ entityType, targetId, after, action, batchId })
  });
}

(async () => {
  await login();
  const [data, pendingData] = await Promise.all([
    request('/api/public-data'),
    request('/api/pending')
  ]);
  const people = new Map([...(data.players || []), ...(data.externalOpponents || [])].map(person => [personId(person), person]));
  const canonical = rows.map(row => ({
    matchDate: date,
    sessionId,
    matchFormat,
    division: '',
    player1Id: row.player1Id,
    player1Sets: row.player1Sets,
    player2Id: row.player2Id,
    player2Sets: row.player2Sets
  }));
  const inputHash = hash(JSON.stringify(canonical));
  const importBatchId = `IMP-${inputHash.slice(0, 16).toUpperCase()}`;
  const batchId = `BATCH-${importBatchId}`;
  const suffix = inputHash.slice(0, 6).toUpperCase();
  const records = rows.map((row, index) => {
    const player1 = people.get(row.player1Id), player2 = people.get(row.player2Id);
    if (!player1 || !player2) throw new Error(`A mapped player is missing from UAT on row ${row.row}`);
    const complete = (row.player1Sets >= 3 || row.player2Sets >= 3) && row.player1Sets !== row.player2Sets;
    const winnerId = complete ? (row.player1Sets > row.player2Sets ? row.player1Id : row.player2Id) : '';
    return {
      matchDate: date,
      sessionId,
      matchFormat,
      event: 'Club Training',
      division: '',
      format: 'Singles',
      player1Id: row.player1Id,
      player1Name: player1.displayName,
      player1Sets: row.player1Sets,
      player2Id: row.player2Id,
      player2Name: player2.displayName,
      player2Sets: row.player2Sets,
      score: `${row.player1Sets}-${row.player2Sets}`,
      resultStatus: complete ? 'RS-001' : 'RS-002',
      winnerId,
      winnerName: winnerId ? people.get(winnerId).displayName : '',
      player1SchoolLevel: player1.schoolLevel || '',
      player1Grade: player1.grade || '',
      player2SchoolLevel: player2.schoolLevel || '',
      player2Grade: player2.grade || '',
      matchId: `LKM-${date.replace(/-/g, '')}-I${suffix}-${String(index + 1).padStart(3, '0')}`,
      importBatchId
    };
  });

  const approvedDuplicate = (data.importBatches || []).find(item => item.inputHash === inputHash || item.importBatchId === importBatchId);
  if (approvedDuplicate) {
    const live = (data.matches || []).filter(record => record.importBatchId === importBatchId).length;
    console.log(`Already approved: ${importBatchId} (${approvedDuplicate.rowCount} rows, ${live} matches live in UAT)`);
    return;
  }

  const pending = (pendingData.changes || []).filter(change => change.status === 'pending');
  const pendingByTarget = new Map(pending.map(change => [`${change.entityType}:${change.targetId}`, change]));
  const foreignTargets = [
    ['importBatch', importBatchId],
    ['session', sessionId],
    ...records.map(record => ['match', record.matchId])
  ].map(([type, id]) => pendingByTarget.get(`${type}:${id}`)).filter(change => change && change.batchId !== batchId);
  if (foreignTargets.length) throw new Error(`Expected target is pending in another batch: ${foreignTargets[0].targetId}`);

  const existingKeys = new Set((data.matches || []).map(exactKey));
  const otherPendingKeys = new Set(pending.filter(change => change.entityType === 'match' && change.after && change.batchId !== batchId).map(change => exactKey(change.after)));
  const duplicate = records.find(record => existingKeys.has(exactKey(record)) || otherPendingKeys.has(exactKey(record)));
  if (duplicate) throw new Error(`Exact duplicate already exists or is pending: ${duplicate.player1Name} ${duplicate.score} ${duplicate.player2Name}`);
  const inInput = new Map();
  for (const record of records) {
    const key = exactKey(record);
    if (inInput.has(key)) throw new Error(`Duplicate input row: ${record.player1Name} ${record.score} ${record.player2Name}`);
    inInput.set(key, record);
  }
  if (rows.length !== 57) throw new Error(`Expected 57 source rows, found ${rows.length}`);

  const complete = records.filter(record => record.resultStatus === 'RS-001').length;
  const alreadyQueued = [
    pendingByTarget.get(`importBatch:${importBatchId}`),
    pendingByTarget.get(`session:${sessionId}`),
    ...records.map(record => pendingByTarget.get(`match:${record.matchId}`))
  ].filter(change => change?.batchId === batchId).length;
  console.log(`${submitMode ? 'Submitting' : 'Previewing'} ${importBatchId}: ${records.length} matches (${complete} completed, ${records.length - complete} incomplete), ${alreadyQueued}/${records.length + 2} changes already queued.`);
  records.forEach(record => console.log(`${record.matchId}  ${record.player1Name} ${record.score} ${record.player2Name}  ${record.resultStatus}`));
  if (!submitMode || alreadyQueued === records.length + 2) {
    if (alreadyQueued === records.length + 2 && approveMode) await approveBatch(batchId, importBatchId, records.length);
    return;
  }

  const now = new Date().toISOString();
  const pendingImport = pendingByTarget.get(`importBatch:${importBatchId}`);
  const importRecord = pendingImport?.after || {
    importBatchId,
    importType: 'trainingMatches',
    inputHash,
    sourceName,
    sessionDate: date,
    sessionId,
    rowCount: records.length,
    matchIds: records.map(record => record.matchId),
    note: 'Results provided directly; shorthand aliases verified against UAT player records. 長島2 = LK-0091 confirmed for this session.',
    createdAt: now
  };
  if (!pendingImport) {
    await submitChange('importBatch', importBatchId, importRecord, 'create', batchId);
    console.log(`✓ ${importBatchId}`);
  }

  const pendingSession = pendingByTarget.get(`session:${sessionId}`);
  if (!pendingSession) {
    const existingSession = (data.sessions || []).find(item => item.sessionId === sessionId);
    const sessionRecord = existingSession || {
      sessionId,
      sessionDate: date,
      venue: '',
      sessionType: 'Club Training',
      matchFormat,
      source: sourceName,
      verifiedAt: date,
      coachGoal: '',
      coachNote: '',
      createdAt: now,
      updatedAt: now
    };
    await submitChange('session', sessionId, sessionRecord, existingSession ? 'update' : 'create', batchId);
    console.log(`✓ ${sessionId}`);
  }

  for (const record of records) {
    if (pendingByTarget.get(`match:${record.matchId}`)?.batchId === batchId) continue;
    await submitChange('match', record.matchId, record, 'create', batchId);
    console.log(`✓ ${record.matchId}`);
    await wait(150);
  }

  const verification = await request('/api/pending');
  const queued = (verification.changes || []).filter(change => change.status === 'pending' && change.batchId === batchId);
  const expectedTargets = new Set([importBatchId, sessionId, ...records.map(record => record.matchId)]);
  if (queued.length !== expectedTargets.size || queued.some(change => !expectedTargets.has(change.targetId))) {
    throw new Error(`Batch verification failed: found ${queued.length}/${expectedTargets.size} pending changes`);
  }
  console.log(`Verified ${queued.length} pending changes in ${batchId}.`);
  if (approveMode) await approveBatch(batchId, importBatchId, records.length);
})().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});

async function approveBatch(batchId, importBatchId, expected) {
  const result = await request('/api/approve-batch', { method: 'POST', body: JSON.stringify({ batchId, decision: 'accept' }) });
  console.log(`Approved ${result.processed} changes in ${batchId}.`);
  const after = await request('/api/public-data');
  const count = (after.matches || []).filter(record => record.importBatchId === importBatchId).length;
  console.log(`Approved ${count}/${expected} matches now live in UAT.`);
  if (count !== expected) throw new Error(`Post-approval verification failed: ${count}/${expected} matches found`);
}
