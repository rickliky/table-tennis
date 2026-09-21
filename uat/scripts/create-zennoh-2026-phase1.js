#!/usr/bin/env node
/* Submit the 2026 全農杯 tournament and player-name corrections to UAT. */
const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = process.argv[2] || 'uat';

async function change(entityType, targetId, action, after) {
  const response = await fetch(`${API}/api/change?environment=${environment}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType, targetId, action, after }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || `HTTP ${response.status}`);
}

async function submit(label, task) {
  try { await task(); console.log(`✓ ${label}`); }
  catch (error) { console.error(`✗ ${label}: ${error.message}`); }
}

async function main() {
  await submit('Create 2026 全農杯 tournament', () => change('tournament', 'TOURNAMENT-0001', 'create', {
    tournamentId: 'TOURNAMENT-0001',
    name: '2026年度全農杯日本卓球選手権大会（ホープス・カブ・バンビの部）県予選会',
    nameJa: '2026年度全農杯日本卓球選手権大会（ホープス・カブ・バンビの部）県予選会',
    date: '2026-05-03', location: '川崎市多摩スポーツセンター', format: 'Round Robin', status: 'Completed',
    notes: '参加116名。代表選手28名が本大会へ出場。本大会：2026年7月24日（金）〜26日（日）、グリーンアリーナ神戸（神戸総合運動公園内体育館）。',
  }));

  // Corrections confirmed from the supplied results sheet.
  const names = [
    ['EXT-0001', '茂田翔紀'], ['EXT-0005', '森本陽喜'], ['EXT-0006', '蒋修逸'],
    ['EXT-0013', '下田さくら'], ['EXT-0018', '倉田東弥'], ['EXT-0022', '酬醐宙'],
    ['EXT-0026', '森本夏愛'], ['EXT-0029', '鈴木梨楓'], ['EXT-0033', '鈴木伶奈'],
    ['EXT-0041', '内田結衣'], ['EXT-0042', '中間琴海'],
  ];
  for (const [externalOpponentId, displayName] of names) {
    await submit(`${externalOpponentId} → ${displayName}`, () => change('externalOpponent', externalOpponentId, 'update', { externalOpponentId, displayName }));
  }
  console.log('\nApprove these UAT pending changes, then run create-zennoh-2026-phase2.js.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
