#!/usr/bin/env node
/* Preview or submit the verified 2026-10-01 Little Kings training matches to UAT. */
const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = 'uat';
const date = '2026-10-01';
const submitMode = process.argv.includes('--submit-uat');

const source = require('fs').readFileSync('scripts/training-matches-2026-10-01.txt', 'utf8');

const aliases = {
  '名古屋':'LK-0011', '三田村ひな':'LK-0081', 'ジェイス':'LK-0080', '繁田':'LK-0089',
  '向井':'LK-0092', '加藤3':'LK-0046', '井関2':'LK-0065', '伊従':'LK-0155',
  '金子':'LK-0016', 'ケイツ':'LK-0002', '望月':'LK-0005', '長嵐':'LK-0152',
  '福原':'LK-0004', '岡田':'LK-0093', '土屋':'LK-0015', '山本':'LK-0009',
  '池田':'LK-0062', '加藤2':'LK-0064', '萩谷':'LK-0094', '岩崎':'LK-0085',
  '李母':'LK-0087', '西田':'LK-0012', '吉川':'LK-0013', '大谷':'LK-0018',
  '栗原':'LK-0006', '青山':'LK-0032', '岡崎':'LK-0084', '石塚':'LK-0079',
  '三田村':'LK-0001', '諏訪光':'LK-0090', '坪内':'LK-0082', '下田':'LK-0003',
  '坪内父':'LK-0083', '笹岡':'LK-0088'
};

const rows = source.trim().split('\n').map((line, index) => {
  const parsed = line.trim().match(/^(.+?)\s+(\d+)-(\d+)\s+(.+)$/);
  if (!parsed) throw new Error(`Invalid row ${index + 1}: ${line}`);
  const [, winnerAlias, winnerSets, loserSets, loserAlias] = parsed;
  const player1Id = aliases[winnerAlias], player2Id = aliases[loserAlias];
  if (!player1Id || !player2Id) throw new Error(`Missing verified alias on row ${index + 1}`);
  const complete = Number(winnerSets) >= 3 || Number(loserSets) >= 3;
  return { row: index + 1, matchId: `LKM-20261001-${String(index + 1).padStart(3, '0')}`, winnerAlias, loserAlias, player1Id, player2Id, player1Sets: Number(winnerSets), player2Sets: Number(loserSets), complete };
});

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function getJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Little-Kings-Training-Import/1.0' } });
      if (!response.ok) throw new Error(`Worker returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 1500);
    }
  }
  throw lastError;
}
async function submit(match) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${API}/api/change?environment=${environment}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Little-Kings-Training-Import/1.0' },
        body: JSON.stringify({ entityType: 'match', targetId: match.matchId, action: 'create', after: match })
      });
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch { throw new Error(`Worker returned ${response.status}: ${text.slice(0, 120)}`); }
      if (!response.ok) throw new Error(result.error || response.status);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 1200);
    }
  }
  throw lastError;
}

(async () => {
  const [data, pendingData] = await Promise.all([
    getJson(`${API}/api/public-data?environment=${environment}`),
    getJson(`${API}/api/pending?environment=${environment}`)
  ]);
  const people = new Map((data.players || []).map(player => [player.playerId, player]));
  const existing = new Set((data.matches || []).map(match => match.matchId));
  const queued = new Set((pendingData.changes || []).filter(change => change.status === 'pending' && change.entityType === 'match').map(change => change.targetId));
  const records = rows.map(row => {
    const player1 = people.get(row.player1Id), player2 = people.get(row.player2Id);
    if (!player1 || !player2) throw new Error(`A mapped player is missing from UAT: ${row.matchId}`);
    return {
      matchId: row.matchId, matchDate: date, event: 'Little Kings Club Matches', division: 'Open', format: 'Singles',
      player1Id: row.player1Id, player1Name: player1.displayName, player1Sets: row.player1Sets,
      player2Id: row.player2Id, player2Name: player2.displayName, player2Sets: row.player2Sets,
      winnerId: row.complete ? row.player1Id : '', winnerName: row.complete ? player1.displayName : '',
      score: `${row.player1Sets}-${row.player2Sets}`, resultStatus: row.complete ? 'RS-001' : 'RS-002'
    };
  });
  const pending = records.filter(record => !existing.has(record.matchId) && !queued.has(record.matchId));
  const complete = pending.filter(record => record.resultStatus === 'RS-001').length;
  console.log(`${submitMode ? 'Submitting' : 'Previewing'} ${pending.length} new matches (${complete} completed, ${pending.length - complete} incomplete); ${existing.size ? records.filter(record => existing.has(record.matchId)).length : 0} approved and ${records.filter(record => queued.has(record.matchId)).length} already queued.`);
  pending.forEach(record => console.log(`${record.matchId}  ${record.player1Name} ${record.score} ${record.player2Name}  ${record.resultStatus}`));
  if (!submitMode) return;
  for (const record of pending) {
    await submit(record);
    console.log(`✓ ${record.matchId}`);
    await wait(400);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
