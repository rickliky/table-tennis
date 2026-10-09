#!/usr/bin/env node
/*
 * Create and approve the January 2027 Goto Cup and Kanto Hopes tournament
 * records in UAT, including the three confirmed Little Kings entrants.
 *
 * Usage:
 *   $env:ADMIN_PASSWORD="..."
 *   node scripts/add-january-2027-tournaments.js --apply-uat
 *
 * The script is repeat-safe and writes only through the authenticated Worker.
 */
const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = 'uat';
const applyMode = process.argv.includes('--apply-uat');
const adminPassword = process.env.ADMIN_PASSWORD;
const batchId = 'BATCH-JANUARY-2027-TOURNAMENTS';

const tournaments = [
  {
    tournamentId: 'TOURNAMENT-0004',
    name: '第56回後藤杯卓球選手権大会（名古屋オープン）カデット・ホープス・カブ種目',
    nameJa: '第56回後藤杯卓球選手権大会（名古屋オープン）カデット・ホープス・カブ種目',
    date: '2027-01-09',
    location: 'スカイホール豊田（豊田市総合体育館）・愛知県豊田市八幡町1-20',
    category: 'カデット・ホープス・カブ 男女シングルス',
    format: 'Single Elimination + Consolation',
    notes: '開催期間：2027年1月9日（土）～10日（日）。各種目シングルス。初日敗退者は2日目のコンソレーションマッチに出場可。5ゲームマッチ。主催：愛知県卓球協会。'
  },
  {
    tournamentId: 'TOURNAMENT-0005',
    name: '令和8年度 第31回関東ホープス卓球大会',
    nameJa: '令和8年度 第31回関東ホープス卓球大会',
    date: '2027-01-30',
    location: 'くまがやドーム体育館・埼玉県熊谷市上川上300',
    category: '団体戦・ホープス・カブ・バンビ 男女個人戦',
    format: 'Preliminary Round Robin + Single Elimination',
    notes: '開催期間：2027年1月30日（土）～31日（日）。1月30日は団体戦、1月31日は個人戦。全種目で予選リーグ後、1位・2位による決勝トーナメントを実施。主催：関東卓球連盟。'
  }
];

const entrants = [
  ['TP-0294', 'TOURNAMENT-0004', 'LK-0046', 'ホープス男子シングルス'],
  ['TP-0295', 'TOURNAMENT-0004', 'LK-0003', 'カブ女子シングルス'],
  ['TP-0296', 'TOURNAMENT-0004', 'LK-0002', 'ホープス女子シングルス'],
  ['TP-0297', 'TOURNAMENT-0005', 'LK-0046', 'ホープス男子シングルス'],
  ['TP-0298', 'TOURNAMENT-0005', 'LK-0003', 'カブ女子シングルス'],
  ['TP-0299', 'TOURNAMENT-0005', 'LK-0002', 'ホープス女子シングルス']
];

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function request(path, { method = 'GET', token = '', body } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(`${API}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Little-Kings-January-2027-Tournaments/1.0',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch { throw new Error(`Worker returned ${response.status}: ${text.slice(0, 120)}`); }
      if (!response.ok || result.ok === false) throw new Error(result.error || `Worker returned ${response.status}`);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await wait(attempt * 1000);
    }
  }
  throw lastError;
}

async function login() {
  if (!adminPassword) throw new Error('ADMIN_PASSWORD is required. Set it in the environment; do not store it in the repository.');
  const result = await request('/api/login', {
    method: 'POST',
    body: { role: 'admin', password: adminPassword }
  });
  return result.token;
}

const sameRecord = (left, right) => JSON.stringify(left) === JSON.stringify(right);

async function submitChange(token, job) {
  const result = await request(`/api/change?environment=${environment}`, {
    method: 'POST',
    token,
    body: { ...job, batchId }
  });
  return result.change;
}

async function approveChange(token, changeId) {
  await request(`/api/approve?environment=${environment}`, {
    method: 'POST',
    token,
    body: { changeId, decision: 'accept' }
  });
}

(async () => {
  const token = await login();
  let [data, pendingData] = await Promise.all([
    request(`/api/admin-data?environment=${environment}`, { token }),
    request(`/api/pending?environment=${environment}`, { token })
  ]);
  const playerIds = new Set((data.players || []).map(player => player.playerId));
  for (const playerId of new Set(entrants.map(entry => entry[2]))) {
    if (!playerIds.has(playerId)) throw new Error(`Player not found: ${playerId}`);
  }

  const activePending = () => (pendingData.changes || []).filter(change => change.status === 'pending');
  const plan = [];
  for (const tournament of tournaments) {
    const approved = (data.tournaments || []).find(item => item.tournamentId === tournament.tournamentId);
    const pending = activePending().find(change => change.entityType === 'tournament' && change.targetId === tournament.tournamentId);
    if (approved && !sameRecord(approved, tournament)) throw new Error(`Approved tournament ID collision: ${tournament.tournamentId}`);
    if (pending && !sameRecord(pending.after, tournament)) throw new Error(`Pending tournament ID collision: ${tournament.tournamentId}`);
    plan.push(`${approved ? 'existing' : pending ? 'pending' : 'create'} tournament ${tournament.tournamentId}`);
  }

  const clubsById = new Map((data.clubs || []).map(club => [club.clubId, club]));
  const playersById = new Map((data.players || []).map(player => [player.playerId, player]));
  const progressRecords = entrants.map(([tournamentProgressId, tournamentId, playerId, division]) => {
    const player = playersById.get(playerId);
    const club = clubsById.get(player.clubId);
    return {
      tournamentProgressId,
      tournamentId,
      division,
      playerId,
      playerName: player.displayName,
      clubName: club?.nameJa || club?.name || '',
      schoolLevel: player.schoolLevel || '',
      grade: player.grade || ''
    };
  });
  for (const progress of progressRecords) {
    const approved = (data.tournamentProgress || []).find(item => item.tournamentProgressId === progress.tournamentProgressId);
    const pending = activePending().find(change => change.entityType === 'tournamentProgress' && change.targetId === progress.tournamentProgressId);
    if (approved && !sameRecord(approved, progress)) throw new Error(`Approved progress ID collision: ${progress.tournamentProgressId}`);
    if (pending && !sameRecord(pending.after, progress)) throw new Error(`Pending progress ID collision: ${progress.tournamentProgressId}`);
    plan.push(`${approved ? 'existing' : pending ? 'pending' : 'create'} progress ${progress.tournamentProgressId} (${progress.playerId})`);
  }

  console.log(JSON.stringify({ environment, batchId, tournaments, progressRecords, plan }, null, 2));
  if (!applyMode) {
    console.log('\nPreview only. Re-run with --apply-uat to create and approve these UAT records.');
    return;
  }

  // Progress validation requires its tournament to already be approved, so
  // create/approve tournament records first.
  for (const tournament of tournaments) {
    const approved = (data.tournaments || []).find(item => item.tournamentId === tournament.tournamentId);
    if (approved) continue;
    let pending = activePending().find(change => change.entityType === 'tournament' && change.targetId === tournament.tournamentId);
    if (!pending) {
      pending = await submitChange(token, { entityType: 'tournament', targetId: tournament.tournamentId, action: 'create', after: tournament });
      pendingData.changes.push(pending);
      console.log(`Submitted ${tournament.tournamentId}`);
    }
    await approveChange(token, pending.changeId);
    console.log(`Approved ${tournament.tournamentId}`);
  }

  data = await request(`/api/admin-data?environment=${environment}`, { token });
  pendingData = await request(`/api/pending?environment=${environment}`, { token });
  const pendingProgressChanges = [];
  for (const progress of progressRecords) {
    const approved = (data.tournamentProgress || []).find(item => item.tournamentProgressId === progress.tournamentProgressId);
    if (approved) continue;
    let pending = activePending().find(change => change.entityType === 'tournamentProgress' && change.targetId === progress.tournamentProgressId);
    if (!pending) {
      pending = await submitChange(token, { entityType: 'tournamentProgress', targetId: progress.tournamentProgressId, action: 'create', after: progress });
      pendingData.changes.push(pending);
      console.log(`Submitted ${progress.tournamentProgressId}`);
    }
    pendingProgressChanges.push(pending);
  }
  if (pendingProgressChanges.length) {
    await request(`/api/approve-batch?environment=${environment}`, {
      method: 'POST',
      token,
      body: { batchId, decision: 'accept' }
    });
    console.log(`Approved ${pendingProgressChanges.length} participant records.`);
  }

  const verification = await request(`/api/admin-data?environment=${environment}`, { token });
  const tournamentIds = new Set(tournaments.map(item => item.tournamentId));
  const progressIds = new Set(progressRecords.map(item => item.tournamentProgressId));
  const verifiedTournaments = (verification.tournaments || []).filter(item => tournamentIds.has(item.tournamentId));
  const verifiedProgress = (verification.tournamentProgress || []).filter(item => progressIds.has(item.tournamentProgressId));
  if (verifiedTournaments.length !== tournaments.length || verifiedProgress.length !== progressRecords.length) {
    throw new Error(`Verification failed: found ${verifiedTournaments.length}/${tournaments.length} tournaments and ${verifiedProgress.length}/${progressRecords.length} participant records`);
  }
  console.log(`Verified ${verifiedTournaments.length} tournaments and ${verifiedProgress.length} participant records in UAT.`);
})().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
