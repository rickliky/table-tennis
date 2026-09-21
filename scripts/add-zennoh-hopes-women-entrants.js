#!/usr/bin/env node
/* Add clubs and external players printed on the 2026 全農杯 ホープス女子 draw sheet. */
const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = process.argv[2] || 'uat';

async function create(entityType, targetId, after) {
  const response = await fetch(`${API}/api/change?environment=${environment}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType, targetId, action: 'create', after }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || `HTTP ${response.status}`);
}
async function submit(label, action) {
  try { await action(); console.log(`✓ ${label}`); }
  catch (error) { console.error(`✗ ${label}: ${error.message}`); }
}

async function main() {
  const clubs = [
    ['CLUB-0024', '川口卓球'], ['CLUB-0025', 'ピンポンアム'],
    ['CLUB-0026', '酒匂卓球メイツ'], ['CLUB-0027', 'イセハラ卓球'],
  ];
  for (const [clubId, name] of clubs) await submit(`${clubId} ${name}`, () => create('club', clubId, { clubId, name, nameJa: name }));

  const players = [
    ['EXT-0060', '山田葵千花', 'CLUB-0023'], ['EXT-0061', '小林音蓮', 'CLUB-0024'],
    ['EXT-0062', '出雲さくら', 'CLUB-0007'], ['EXT-0063', '河又菜花', 'CLUB-0025'],
    ['EXT-0064', '中村青蘭', 'CLUB-0026'], ['EXT-0065', '阿部成珠', 'CLUB-0004'],
    ['EXT-0066', '田村瑠桜', 'CLUB-0018'], ['EXT-0067', '武田希', 'CLUB-0013'],
    ['EXT-0068', '山下結', 'CLUB-0007'], ['EXT-0069', '岡田美遥', 'CLUB-0027'],
    ['EXT-0070', '高宮花心', 'CLUB-0003'],
  ];
  for (const [externalOpponentId, displayName, clubId] of players) {
    await submit(`${externalOpponentId} ${displayName}`, () => create('externalOpponent', externalOpponentId, { externalOpponentId, displayName, clubId }));
  }
  console.log('Submitted clubs and players only; no tournament-match or tournament-progress data was changed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
