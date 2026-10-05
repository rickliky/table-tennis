#!/usr/bin/env node
/* Preview or submit LK-0064's 2026 All-Japan Junior Kanagawa qualifier results to UAT. */
const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = 'uat';
const submitMode = process.argv.includes('--submit-uat');
const tournamentId = 'TOURNAMENT-0003';
const playerId = 'LK-0064';
const playerName = '加藤蒼也';
const progressId = 'TP-0249';
const batchId = 'BATCH-TOURNAMENT-0003-LK-0064-20260926';
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const matchInputs = [
  ['TM-0012', '一回戦', 'EXT-0250', '石橋悠人', 3, 1],
  ['TM-0013', '二回戦', 'EXT-0247', '永井元気', 3, 0],
  ['TM-0014', '三回戦', 'EXT-0207', '押田清敬', 3, 2],
  ['TM-0015', '四回戦', 'EXT-0230', '鈴木晴大', 3, 2],
  ['TM-0016', '五回戦', 'EXT-0229', '柏木芳仁', 3, 0]
];

const matches = matchInputs.map(([tournamentMatchId, round, opponentId, opponentName, player1Sets, player2Sets]) => ({
  tournamentMatchId,
  tournamentId,
  matchDate: '2026-09-26',
  round,
  format: 'Singles',
  player1Id: playerId,
  player1Name: playerName,
  player1Sets,
  player2Id: opponentId,
  player2Name: opponentName,
  player2Sets,
  winnerId: playerId,
  winnerName: playerName,
  score: `${player1Sets}-${player2Sets}`,
  resultStatus: 'RS-001'
}));

async function request(path, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(`${API}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Little-Kings-Tournament-Results/1.0', ...(options.headers || {}) }
      });
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch { throw new Error(`Worker returned ${response.status}: ${text.slice(0, 120)}`); }
      if (!response.ok || result.ok === false) throw new Error(result.error || `Worker returned ${response.status}`);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < 5) await wait(attempt * 1500);
    }
  }
  throw lastError;
}

const sameRecord = (left, right) => JSON.stringify(left) === JSON.stringify(right);

(async () => {
  const [data, pendingData] = await Promise.all([
    request(`/api/public-data?environment=${environment}`),
    request(`/api/pending?environment=${environment}`)
  ]);
  const people = [...(data.players || []), ...(data.externalOpponents || [])];
  const personId = person => person.playerId || person.externalOpponentId;
  const personById = new Map(people.map(person => [personId(person), person]));
  const tournament = (data.tournaments || []).find(item => item.tournamentId === tournamentId);
  const player = personById.get(playerId);
  const progress = (data.tournamentProgress || []).find(item => item.tournamentProgressId === progressId);
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);
  if (!player) throw new Error(`Player not found: ${playerId}`);
  if (!progress || progress.playerId !== playerId || progress.tournamentId !== tournamentId) throw new Error(`Progress record mismatch: ${progressId}`);
  for (const match of matches) {
    const opponent = personById.get(match.player2Id);
    if (!opponent || opponent.displayName !== match.player2Name) throw new Error(`Opponent mismatch: ${match.player2Id} / ${match.player2Name}`);
  }

  const nextProgress = {
    ...progress,
    result: 'TP-016',
    qualified: true,
    recommended: false,
    totalWins: 5,
    totalLosses: 0,
    totalDraws: 0,
    eliminated: false
  };
  const approvedById = new Map((data.tournamentMatches || []).map(match => [match.tournamentMatchId, match]));
  const pending = (pendingData.changes || []).filter(change => change.status === 'pending');
  const pendingByTarget = new Map(pending.map(change => [`${change.entityType}:${change.targetId}`, change]));
  const jobs = [];
  for (const match of matches) {
    const approved = approvedById.get(match.tournamentMatchId);
    if (approved) {
      if (!sameRecord(approved, match)) throw new Error(`Approved ID collision: ${match.tournamentMatchId}`);
      continue;
    }
    const queued = pendingByTarget.get(`tournamentMatch:${match.tournamentMatchId}`);
    if (queued) {
      if (!sameRecord(queued.after, match)) throw new Error(`Pending ID collision: ${match.tournamentMatchId}`);
      continue;
    }
    jobs.push({ entityType: 'tournamentMatch', targetId: match.tournamentMatchId, action: 'create', after: match });
  }
  if (!sameRecord(progress, nextProgress)) {
    const queued = pendingByTarget.get(`tournamentProgress:${progressId}`);
    if (queued && !sameRecord(queued.after, nextProgress)) throw new Error(`Conflicting progress change: ${progressId}`);
    if (!queued) jobs.push({ entityType: 'tournamentProgress', targetId: progressId, action: 'update', after: nextProgress });
  }

  console.log(JSON.stringify({
    environment,
    tournament: `${tournament.name || tournament.nameJa} (${tournamentId})`,
    player: `${playerName} (${playerId})`,
    batchId,
    matches,
    progress: nextProgress,
    jobs: jobs.map(job => `${job.action} ${job.entityType} ${job.targetId}`)
  }, null, 2));
  if (!submitMode) {
    console.log('\nPreview only. Re-run with --submit-uat to create pending UAT changes.');
    return;
  }
  for (const job of jobs) {
    await request(`/api/change?environment=${environment}`, {
      method: 'POST',
      body: JSON.stringify({ ...job, batchId })
    });
    console.log(`✓ ${job.entityType} ${job.targetId}`);
    await wait(400);
  }

  const verification = await request(`/api/pending?environment=${environment}`);
  const queued = (verification.changes || []).filter(change => change.status === 'pending' && change.batchId === batchId);
  const expectedTargets = new Set([...matches.map(match => match.tournamentMatchId), progressId]);
  if (queued.length !== expectedTargets.size || queued.some(change => !expectedTargets.has(change.targetId))) {
    throw new Error(`Verification failed: expected ${expectedTargets.size} pending changes, found ${queued.length}`);
  }
  console.log(`Verified ${queued.length} pending changes in ${batchId}.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
