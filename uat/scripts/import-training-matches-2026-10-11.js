#!/usr/bin/env node
/*
 * Preview, submit, or approve the 2026-10-11 Little Kings training import in UAT.
 *
 *   node scripts/import-training-matches-2026-10-11.js                 # preview (read-only, Upstash REST)
 *   $env:ADMIN_PASSWORD="..."
 *   node scripts/import-training-matches-2026-10-11.js --submit-uat    # create players, then queue matches
 *   node scripts/import-training-matches-2026-10-11.js --approve-uat   # ... and approve the match batch
 *
 * Two stages are required: match rows may only reference approved players, so the two new
 * Nakamura player records are created and approved first, then the match batch is submitted.
 *
 * Repeat-safe: an approved or already-queued batch is detected and left alone.
 * Doubles row (加藤ふ・岡田 3-2 土屋・大谷) is intentionally excluded - 60 singles only.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = 'uat';
const date = '2026-10-11';
const sessionId = 'LKS-20261011';
const matchFormat = 'Best of 5';
const sourceName = 'Direct transcription 2026-10-11';
const expectedRows = 60;
const submitMode = process.argv.includes('--submit-uat') || process.argv.includes('--approve-uat');
const approveMode = process.argv.includes('--approve-uat');
const source = fs.readFileSync(path.join(__dirname, 'training-matches-2026-10-11.txt'), 'utf8');

/* Two new Little Kings players confirmed by the user for this session.
   LK-0060 (中村 / Nakamura) is a different, pre-existing record and is left untouched. */
const newPlayers = [
  {
    playerId: 'LK-0157', displayName: '中村祥吾', englishName: 'Shogo Nakamura', notebookName: '中村し',
    gender: '', schoolLevel: '', playingHand: '', grip: '', playingStyle: '', blade: '',
    forehandRubber: '', backhandRubber: '', forehandRubberType: '', backhandRubberType: '',
    rating: '', status: 'ST-001', grade: '', gradeHistory: [], clubId: 'CLUB-0001'
  },
  {
    playerId: 'LK-0158', displayName: '中村謙吾', englishName: 'Kengo Nakamura', notebookName: '中村け',
    gender: '', schoolLevel: '', playingHand: '', grip: '', playingStyle: '', blade: '',
    forehandRubber: '', backhandRubber: '', forehandRubberType: '', backhandRubberType: '',
    rating: '', status: 'ST-001', grade: '', gradeHistory: [], clubId: 'CLUB-0001'
  }
];

/* Aliases verified against UAT player records (notebookName / displayName). */
const aliases = {
  '中村け': 'LK-0158', '中村し': 'LK-0157',
  '長島む': 'LK-0091', '長島り': 'LK-0138',
  '井関つ': 'LK-0065', '井関て': 'LK-0156',
  '加藤そ': 'LK-0064', '加藤ふ': 'LK-0046',
  '李母': 'LK-0087', 'ケイツ': 'LK-0002', 'ジェイス': 'LK-0080',
  '金子': 'LK-0016', '阿久津': 'LK-0099', '長嵐': 'LK-0152', '望月': 'LK-0005',
  '向井': 'LK-0092', '名古屋': 'LK-0011', '山本': 'LK-0009', '池田': 'LK-0062',
  '三田村ひな': 'LK-0081', '本木': 'LK-0086', '岡田': 'LK-0093', '土屋': 'LK-0015',
  '大谷': 'LK-0018', '西田': 'LK-0012', '繁田': 'LK-0089'
};

const rows = source.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
  const parsed = line.trim().match(/^(.+?)\s+(\d+)-(\d+)\s+(.+)$/);
  if (!parsed) throw new Error(`Invalid row ${index + 1}: ${line}`);
  const [, player1Alias, player1SetsText, player2SetsText, player2Alias] = parsed;
  if (player1Alias.includes('・') || player2Alias.includes('・')) throw new Error(`Doubles row must stay excluded (row ${index + 1})`);
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
const exactKey = record => {
  const first = record.player1Id <= record.player2Id
    ? `${record.player1Id}:${record.player1Sets}`
    : `${record.player2Id}:${record.player2Sets}`;
  const second = record.player1Id <= record.player2Id
    ? `${record.player2Id}:${record.player2Sets}`
    : `${record.player1Id}:${record.player1Sets}`;
  return `${record.matchDate}|${first}|${second}`;
};

/* ---------- read-only data access (Upstash REST) for preview ---------- */
function upstashCredentials() {
  const envFile = path.join(__dirname, '..', 'upstash.env');
  const fromFile = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8').split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith('#'))
    .reduce((acc, line) => { const i = line.indexOf('='); if (i > 0) acc[line.slice(0, i).trim()] = line.slice(i + 1).trim(); return acc; }, {}) : {};
  const url = process.env.UPSTASH_REDIS_REST_URL || fromFile.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || fromFile.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash REST credentials are missing (set env or upstash.env).');
  return { url, token };
}

async function readUpstash(keys) {
  const { url, token } = upstashCredentials();
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(keys.map(key => ['GET', key]))
  });
  if (!response.ok) throw new Error(`Upstash returned ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json();
  const parse = (key, raw) => {
    if (!raw || raw.result === null || raw.result === undefined) return [];
    try { return JSON.parse(raw.result); } catch { throw new Error(`Stored ${key} is not valid JSON`); }
  };
  return payload.map((entry, index) => parse(keys[index], entry));
}

async function loadData() {
  const [players, matches, sessions, importBatches, pendingChanges] = await readUpstash([
    `${environment}:players`, `${environment}:matches`, `${environment}:sessions`,
    `${environment}:import-batches`, `${environment}:pending-changes`
  ]);
  return { players, matches, sessions, importBatches, pendingChanges };
}

/* ---------- Worker access for writes ---------- */
let token = '';
async function request(pathname, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const response = await fetch(`${API}${pathname}${pathname.includes('?') ? '&' : '?'}environment=${environment}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Little-Kings-Training-Import/4.0',
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
  return request('/api/change', { method: 'POST', body: JSON.stringify({ entityType, targetId, after, action, batchId }) });
}

async function approveBatch(batchId) {
  const result = await request('/api/approve-batch', { method: 'POST', body: JSON.stringify({ batchId, decision: 'accept' }) });
  console.log(`Approved ${result.processed} changes in ${batchId}.`);
  return result.processed;
}

(async () => {
  const data = await loadData();
  const pending = (data.pendingChanges || []).filter(change => change.status === 'pending');

  const existingIds = new Set(data.players.map(player => player.playerId));
  const playersToCreate = newPlayers.filter(player => !existingIds.has(player.playerId));
  const playersAlreadyLive = newPlayers.filter(player => existingIds.has(player.playerId));
  if (playersAlreadyLive.length) {
    console.log(`Players already live: ${playersAlreadyLive.map(p => `${p.playerId} ${p.displayName}`).join(', ')}`);
  }

  const people = new Map([...data.players, ...newPlayers].map(person => [person.playerId, person]));

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
  const playerBatchId = `BATCH-NP-20261011-${inputHash.slice(0, 6).toUpperCase()}`;
  const suffix = inputHash.slice(0, 6).toUpperCase();

  const records = rows.map((row, index) => {
    const player1 = people.get(row.player1Id), player2 = people.get(row.player2Id);
    if (!player1 || !player2) throw new Error(`A mapped player is missing on row ${row.row}: ${player1 ? '' : row.player1Alias} ${player2 ? '' : row.player2Alias} (people loaded: ${people.size})`);
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

  if (rows.length !== expectedRows) throw new Error(`Expected ${expectedRows} source rows, found ${rows.length}`);

  const approvedDuplicate = (data.importBatches || []).find(item => item.inputHash === inputHash || item.importBatchId === importBatchId);
  if (approvedDuplicate) {
    const live = (data.matches || []).filter(record => record.importBatchId === importBatchId).length;
    console.log(`Already approved: ${importBatchId} (${approvedDuplicate.rowCount} rows, ${live} matches live in UAT)`);
    return;
  }

  const pendingByTarget = new Map(pending.map(change => [`${change.entityType}:${change.targetId}`, change]));
  const foreignTargets = [
    ['importBatch', importBatchId],
    ['session', sessionId],
    ...playersToCreate.map(player => ['player', player.playerId]),
    ...records.map(record => ['match', record.matchId])
  ].map(([type, id]) => pendingByTarget.get(`${type}:${id}`)).filter(change => change && change.batchId !== batchId && change.batchId !== playerBatchId);
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

  const complete = records.filter(record => record.resultStatus === 'RS-001');
  const incomplete = records.filter(record => record.resultStatus === 'RS-002');
  const participants = new Set(records.flatMap(record => [record.player1Id, record.player2Id]));

  console.log(`\n=== 2026-10-11 UAT import preview (doubles excluded) ===`);
  console.log(`Source rows: ${records.length} singles   Session: ${sessionId}   Format: ${matchFormat}`);
  console.log(`Completed: ${complete.length}   Incomplete (below 3 sets): ${incomplete.length}`);
  console.log(`Distinct participants: ${participants.size}`);
  console.log(`Import batch: ${importBatchId}   Match batch: ${batchId}`);
  console.log(`\nAlias resolution (${Object.keys(aliases).length} aliases):`);
  for (const [alias, id] of Object.entries(aliases)) {
    const person = people.get(id);
    const flag = newPlayers.some(player => player.playerId === id) ? ' [NEW]' : '';
    console.log(`  ${alias.padEnd(8, '　')} -> ${id}${flag}  ${person.displayName} / ${person.englishName || '-'}  (notebook ${person.notebookName || '-'})`);
  }

  console.log(`\nNew players to create first (${playerBatchId}):`);
  for (const player of playersToCreate) console.log(`  + ${player.playerId}  ${player.displayName} / ${player.englishName}  (notebook ${player.notebookName})`);
  if (!playersToCreate.length) console.log('  (none - all players already live)');

  const queuedPlayers = playersToCreate.filter(player => pendingByTarget.get(`player:${player.playerId}`)?.batchId === playerBatchId).length;
  const queuedSession = pendingByTarget.get(`session:${sessionId}`)?.batchId === batchId ? 1 : 0;
  const queuedMatches = records.filter(record => pendingByTarget.get(`match:${record.matchId}`)?.batchId === batchId).length;
  const queuedImport = pendingByTarget.get(`importBatch:${importBatchId}`)?.batchId === batchId ? 1 : 0;
  console.log(`\nAlready queued: ${queuedPlayers}/${playersToCreate.length} players, ${queuedImport}/1 import batch, ${queuedSession}/1 session, ${queuedMatches}/${records.length} matches`);

  console.log(`\nIncomplete rows (kept as RS-002, excluded from completed statistics):`);
  incomplete.forEach(record => console.log(`  ${record.matchId}  ${record.player1Name} ${record.score} ${record.player2Name}`));

  console.log(`\nAll rows:`);
  records.forEach(record => console.log(`  ${record.matchId}  ${record.player1Name} ${record.score} ${record.player2Name}  ${record.resultStatus}`));

  if (!submitMode) {
    console.log(`\nPreview only - nothing was written. Re-run with --submit-uat or --approve-uat.`);
    return;
  }

  await login();

  /* Stage 1: create (and approve) the new player records - matches may only reference approved players. */
  const live = await request('/api/public-data');
  const liveIds = new Set((live.players || []).map(player => player.playerId));
  const stillToCreate = newPlayers.filter(player => !liveIds.has(player.playerId));
  const queuedPlayerChanges = (await request('/api/pending')).changes
    .filter(change => change.status === 'pending' && change.entityType === 'player' && change.batchId === playerBatchId);
  if (stillToCreate.length || queuedPlayerChanges.length) {
    for (const player of stillToCreate) {
      if (queuedPlayerChanges.some(change => change.targetId === player.playerId)) continue;
      await submitChange('player', player.playerId, player, 'create', playerBatchId);
      console.log(`✓ queued player ${player.playerId} ${player.displayName}`);
      await wait(150);
    }
    const queuedNow = (await request('/api/pending')).changes
      .filter(change => change.status === 'pending' && change.entityType === 'player' && change.batchId === playerBatchId);
    if (queuedNow.length) await approveBatch(playerBatchId);
    const after = await request('/api/public-data');
    const missing = newPlayers.filter(player => !(after.players || []).some(item => item.playerId === player.playerId));
    if (missing.length) throw new Error(`Player creation failed: ${missing.map(player => player.playerId).join(', ')}`);
    console.log(`Verified ${newPlayers.length} new player records are live in UAT.`);
  } else {
    console.log(`New players already live in UAT.`);
  }

  /* Stage 2: queue the match batch. */
  const current = await request('/api/public-data');
  const currentPending = (await request('/api/pending')).changes.filter(change => change.status === 'pending');
  const currentPendingByTarget = new Map(currentPending.map(change => [`${change.entityType}:${change.targetId}`, change]));
  const existingMatches = new Set((current.matches || []).map(exactKey));
  const duplicateNow = records.find(record => existingMatches.has(exactKey(record)));
  if (duplicateNow) throw new Error(`Exact duplicate already approved: ${duplicateNow.player1Name} ${duplicateNow.score} ${duplicateNow.player2Name}`);

  let queued = [
    currentPendingByTarget.get(`importBatch:${importBatchId}`),
    currentPendingByTarget.get(`session:${sessionId}`),
    ...records.map(record => currentPendingByTarget.get(`match:${record.matchId}`))
  ].filter(change => change?.batchId === batchId).length;
  const expected = records.length + 2;

  if (queued < expected) {
    const now = new Date().toISOString();
    const pendingImport = currentPendingByTarget.get(`importBatch:${importBatchId}`);
    const importRecord = pendingImport?.after || {
      importBatchId,
      importType: 'trainingMatches',
      inputHash,
      sourceName,
      sessionDate: date,
      sessionId,
      rowCount: records.length,
      matchIds: records.map(record => record.matchId),
      note: 'Results transcribed from the 2026-10-11 notebook; doubles row excluded. 李(母) 11-6 繁田 recorded as 1-0 incomplete per user instruction. Aliases confirmed: 中村け=LK-0158 (謙吾), 中村し=LK-0157 (祥吾), 長島む=LK-0091, 長島り=LK-0138, 井関つ=LK-0065, 井関て=LK-0156.',
      createdAt: now
    };
    if (!pendingImport) {
      await submitChange('importBatch', importBatchId, importRecord, 'create', batchId);
      console.log(`✓ ${importBatchId}`);
    }
    const pendingSession = currentPendingByTarget.get(`session:${sessionId}`);
    if (!pendingSession) {
      const existingSession = (current.sessions || []).find(item => item.sessionId === sessionId);
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
      if (currentPendingByTarget.get(`match:${record.matchId}`)?.batchId === batchId) continue;
      await submitChange('match', record.matchId, record, 'create', batchId);
      console.log(`✓ ${record.matchId}`);
      await wait(150);
    }
    queued = (await request('/api/pending')).changes
      .filter(change => change.status === 'pending' && change.batchId === batchId).length;
    if (queued !== expected) throw new Error(`Batch verification failed: found ${queued}/${expected} pending changes`);
    console.log(`Verified ${queued} pending changes in ${batchId}.`);
  } else {
    console.log(`Match batch already fully queued: ${queued}/${expected} pending changes.`);
  }

  if (approveMode) {
    await approveBatch(batchId);
    const verified = await request('/api/public-data');
    const count = (verified.matches || []).filter(record => record.importBatchId === importBatchId).length;
    const sessionLive = (verified.sessions || []).some(item => item.sessionId === sessionId);
    const playersLive = newPlayers.every(player => (verified.players || []).some(item => item.playerId === player.playerId));
    console.log(`Live in UAT: ${count}/${expected - 2} matches, session ${sessionLive ? 'yes' : 'NO'}, new players ${playersLive ? 'yes' : 'NO'}`);
    if (count !== records.length || !sessionLive || !playersLive) throw new Error('Post-approval verification failed');
  }
})().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
