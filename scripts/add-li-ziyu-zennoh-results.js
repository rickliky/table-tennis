#!/usr/bin/env node
/* Add 李紫妤's documented 2026 全農杯 tournament matches to UAT. */
const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = process.argv[2] || 'uat';
const tournamentId = 'TOURNAMENT-0001';
const liId = 'LK-0002';
const liName = '李紫妤';

const matches = [
  ['TM-0001', '1次リーグ · グループ4 · 11コート', 'EXT-0047', '吉田夢歩', 3, 1],
  ['TM-0002', '1次リーグ · グループ4 · 11コート', 'EXT-0052', '成岡絆', 3, 0],
  ['TM-0003', '1次リーグ · グループ4 · 11コート', 'EXT-0046', '神保さくら', 3, 0],
  ['TM-0004', '最終リーグ', 'EXT-0011', '佐々木真心', 0, 3],
  ['TM-0005', '最終リーグ', 'EXT-0015', '大宮心花', 3, 1],
  ['TM-0006', '最終リーグ', 'EXT-0016', '北川結愛', 3, 2],
  ['TM-0007', '最終リーグ', 'EXT-0013', '下田さくら', 0, 3],
];

async function main() {
  for (const [tournamentMatchId, round, opponentId, opponentName, player1Sets, player2Sets] of matches) {
    const winnerId = player1Sets > player2Sets ? liId : opponentId;
    const winnerName = winnerId === liId ? liName : opponentName;
    const response = await fetch(`${API}/api/change?environment=${environment}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'tournamentMatch', targetId: tournamentMatchId, action: 'create',
        after: {
          tournamentMatchId, tournamentId, matchDate: '2026-05-03', round, format: 'Singles',
          player1Id: liId, player1Name: liName, player1Sets,
          player2Id: opponentId, player2Name: opponentName, player2Sets,
          winnerId, winnerName, score: `${player1Sets}-${player2Sets}`, resultStatus: 'RS-001',
        },
      }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(`${tournamentMatchId}: ${json.error || response.status}`);
    console.log(`✓ ${tournamentMatchId}: ${liName} ${player1Sets}-${player2Sets} ${opponentName}`);
  }
  console.log('Submitted 7 completed tournament matches for approval.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
