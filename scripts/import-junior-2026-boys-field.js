#!/usr/bin/env node
/* Preview or submit the Junior Boys field for the 2026 All-Japan Junior Kanagawa qualifier. */
const fs = require('fs');
const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = 'uat';
const tournamentId = 'TOURNAMENT-0003';
const submitMode = process.argv.includes('--submit-uat');
const division = 'ジュニア男子シングルス';
const source = fs.readFileSync('scripts/junior-2026-boys-field.tsv', 'utf8').trim().split('\n').map(line => {
  const [name, clubName] = line.trim().split('\t');
  if (!name || !clubName) throw new Error(`Invalid source row: ${line}`);
  return { name, clubName };
});
const knownPlayers = { '加藤蒼也': 'LK-0064', '岡田琉生明': 'LK-0093' };
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const number = id => Number(String(id || '').match(/(\d+)$/)?.[1] || 0);
const nextId = (prefix, records, field) => {
  let next = Math.max(0, ...records.map(record => number(record[field]))) + 1;
  return () => `${prefix}${String(next++).padStart(4, '0')}`;
};
async function getJson(path) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${API}${path}`, { headers: { 'User-Agent': 'Little-Kings-Junior-Field-Import/1.0' } });
      if (!response.ok) throw new Error(`Worker returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 1500);
    }
  }
  throw lastError;
}
async function submit(entityType, targetId, action, after) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(`${API}/api/change?environment=${environment}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Little-Kings-Junior-Field-Import/1.0' },
        body: JSON.stringify({ entityType, targetId, action, after })
      });
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch { throw new Error(`Worker returned ${response.status}: ${text.slice(0, 100)}`); }
      if (!response.ok || !result.ok) throw new Error(result.error || `Worker returned ${response.status}`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await wait(attempt * 1500);
    }
  }
  throw lastError;
}
(async () => {
  const [data, pendingData] = await Promise.all([
    getJson(`/api/public-data?environment=${environment}`),
    getJson(`/api/pending?environment=${environment}`)
  ]);
  const people = [...(data.players || []), ...(data.externalOpponents || [])];
  const personByName = new Map(people.map(person => [person.displayName, person]));
  const clubs = data.clubs || [];
  const clubByName = new Map(clubs.flatMap(club => [[club.name, club], [club.nameJa, club]].filter(([name]) => name)));
  const clubId = nextId('CLUB-', clubs, 'clubId');
  const externalId = nextId('EXT-', data.externalOpponents || [], 'externalOpponentId');
  const progressId = nextId('TP-', data.tournamentProgress || [], 'tournamentProgressId');
  const newClubs = [], newPlayers = [], progress = [];
  const stagedClubByName = new Map();
  const stagedPlayerByName = new Map();
  for (const entry of source) {
    let club = clubByName.get(entry.clubName) || stagedClubByName.get(entry.clubName);
    if (!club) {
      club = { clubId: clubId(), name: entry.clubName, nameJa: entry.clubName, logoUrl: '', prefectureId: '14', status: 'Active' };
      stagedClubByName.set(entry.clubName, club);
      newClubs.push(club);
    }
    let player = knownPlayers[entry.name] ? people.find(person => (person.playerId || person.externalOpponentId) === knownPlayers[entry.name]) : personByName.get(entry.name);
    if (!player) player = stagedPlayerByName.get(entry.name);
    if (!player) {
      player = { externalOpponentId: externalId(), clubId: club.clubId, displayName: entry.name, englishName: '', gender: 'GD-001', schoolLevel: 'SL-003', grade: '', playingHand: '', grip: '', playingStyle: '', blade: '', forehandRubber: '', backhandRubber: '', forehandRubberType: '', backhandRubberType: '', status: 'ST-001' };
      stagedPlayerByName.set(entry.name, player);
      newPlayers.push(player);
    }
    progress.push({ tournamentProgressId: progressId(), tournamentId, division, playerId: player.playerId || player.externalOpponentId, playerName: entry.name, clubName: entry.clubName, qualified: false, recommended: false });
  }
  const tournament = { tournamentId, name: '令和8年度 全日本卓球選手権大会（ジュニアの部）神奈川県予選会', nameJa: '令和8年度 全日本卓球選手権大会（ジュニアの部）神奈川県予選会', date: '2026-09-26', location: 'ひらつかサン・ライフアリーナ（神奈川県平塚市）', category: division, format: 'Single Elimination', status: 'Completed', notes: '主催：一般社団法人神奈川県卓球協会、ほか。ジュニア男子シングルス代表9名。' };
  const queued = new Set((pendingData.changes || []).filter(change => change.status === 'pending').map(change => `${change.entityType}:${change.targetId}`));
  const jobs = [
    ...(!data.tournaments.some(item => item.tournamentId === tournamentId) && !queued.has(`tournament:${tournamentId}`) ? [{ entityType: 'tournament', targetId: tournamentId, action: 'create', after: tournament }] : []),
    ...newClubs.filter(item => !queued.has(`club:${item.clubId}`)).map(after => ({ entityType: 'club', targetId: after.clubId, action: 'create', after })),
    ...newPlayers.filter(item => !queued.has(`externalOpponent:${item.externalOpponentId}`)).map(after => ({ entityType: 'externalOpponent', targetId: after.externalOpponentId, action: 'create', after })),
    ...progress.filter(item => !queued.has(`tournamentProgress:${item.tournamentProgressId}`)).map(after => ({ entityType: 'tournamentProgress', targetId: after.tournamentProgressId, action: 'create', after }))
  ];
  console.log(JSON.stringify({ fieldEntries: source.length, reusedPlayers: source.length - newPlayers.length, newClubs: newClubs.length, newExternalPlayers: newPlayers.length, newProgress: progress.length, jobs: jobs.length }, null, 2));
  console.log(`Existing players reused: ${source.filter(entry => !newPlayers.some(player => player.displayName === entry.name)).map(entry => entry.name).join(', ')}`);
  if (!submitMode) return;
  for (const job of jobs) {
    await submit(job.entityType, job.targetId, job.action, job.after);
    console.log(`✓ ${job.entityType} ${job.targetId}`);
    await wait(400);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
