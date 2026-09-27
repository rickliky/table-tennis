#!/usr/bin/env node
/* Preview or submit the verified 2026-09-24 Little Kings training matches to UAT. */
const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = 'uat';
const date = '2026-09-24';
const submitMode = process.argv.includes('--submit-uat');

const source = `
岡田 3-0 ひなちゃん
ケイツ 3-0 ジェイス
加藤3 3-0 李母
ジェイス 3-0 ひなちゃん
坪内 3-1 井関2
福原 3-1 青山
望月 3-1 山本
岡田 3-0 大谷
岡崎 3-1 向井
山本 2-0 ひなちゃん
加藤3 3-0 ジェイス
栗原 3-0 青山
李母 3-2 ケイツ
井関2 3-0 石塚
岡田 3-0 諏訪光
加藤2 3-1 土屋
繁田 3-1 坪内
繁田 3-0 井関2
加藤3 3-0 福原
岡崎 3-1 笹岡
望月 3-1 大谷
向井 3-1 青山
ジェイス 3-0 下田
李母 3-0 繁田
西田 3-0 ひなちゃん
三田村 3-0 岡田
山本 3-2 坪内父
岡崎 3-0 栗原
土屋 3-1 井関2
望月 3-0 ケイツ
李母 3-0 ジェイス
佐藤 3-1 大谷
ケイツ 3-0 繁田
下田 3-2 井関2
岡田 3-0 笹岡
石塚 3-1 坪内父
土屋 3-2 加藤3
岡崎 3-0 加藤2
坪内 3-0 ひなちゃん
山本 3-0 西田
岡田 3-0 佐藤
李母 3-0 下田
栗原 3-2 井関2
向井 3-2 大谷
土屋 3-0 福原
坪内父 3-0 望月
岡崎 3-0 ジェイス
諏訪光 3-2 青山
石塚 3-1 加藤3
向井 3-0 繁田
西田 3-0 井関2
山本 3-1 李母
栗原 3-1 土屋
岡崎 2-0 井関2
笹岡 3-0 青山
ジェイス 3-0 繁田
大谷 3-2 ケイツ
下田 3-0 西田
井関2 3-0 ひなちゃん
坪内父 3-1 諏訪光
大谷 3-0 石塚
向井 3-0 土屋
笹岡 2-1 井関2
望月 3-2 福原
岡崎 2-1 加藤3`;

const aliases = {
  '岡田':'LK-0093', 'ひなちゃん':'LK-0081', 'ケイツ':'LK-0002', 'ジェイス':'LK-0080',
  '加藤3':'LK-0046', '李母':'LK-0087', '坪内':'LK-0082', '井関2':'LK-0065',
  '福原':'LK-0004', '青山':'LK-0032', '望月':'LK-0005', '山本':'LK-0009',
  '大谷':'LK-0018', '岡崎':'LK-0084', '向井':'LK-0092', '栗原':'LK-0006',
  '石塚':'LK-0079', '諏訪光':'LK-0090', '加藤2':'LK-0064', '土屋':'LK-0015',
  '繁田':'LK-0089', '笹岡':'LK-0088', '下田':'LK-0003', '西田':'LK-0012',
  '三田村':'LK-0001', '坪内父':'LK-0083', '佐藤':'LK-0033'
};

const rows = source.trim().split('\n').map((line, index) => {
  const parsed = line.trim().match(/^(.+?)\s+(\d+)-(\d+)\s+(.+)$/);
  if (!parsed) throw new Error(`Invalid row ${index + 1}: ${line}`);
  const [, winnerAlias, winnerSets, loserSets, loserAlias] = parsed;
  const player1Id = aliases[winnerAlias], player2Id = aliases[loserAlias];
  if (!player1Id || !player2Id) throw new Error(`Missing verified alias on row ${index + 1}`);
  const complete = Number(winnerSets) >= 3 || Number(loserSets) >= 3;
  return { row: index + 1, matchId: `LKM-20260924-${String(index + 1).padStart(3, '0')}`, winnerAlias, loserAlias, player1Id, player2Id, player1Sets: Number(winnerSets), player2Sets: Number(loserSets), complete };
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
