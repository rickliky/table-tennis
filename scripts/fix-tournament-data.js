#!/usr/bin/env node
/**
 * Fix tournament progress data from the 2026 全農杯 image.
 *
 * Corrections:
 * 1. Add `recommended` flag for 推薦 players (pre-qualified)
 * 2. Fix `rank` values to match actual placements
 * 3. Add `qualified` flag for all representative players
 * 4. Fix name spellings in external opponents
 *
 * Usage: node scripts/fix-tournament-data.js [uat|prod]
 */

const API = 'https://little-kings-api.little-kings.workers.dev';
const env = process.argv[2] || 'uat';

async function api(path, body) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${API}${path}${sep}environment=${env}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

async function change(entityType, targetId, after) {
  return api('/api/change', { entityType, targetId, action: 'update', after });
}

// ─── Name corrections for external opponents ───
const nameFixes = {
  'EXT-0001': { displayName: '茂田翔紀' },   // was 茂田翔稀
  'EXT-0005': { displayName: '森本陽喜' },   // was 森本陽菜
  'EXT-0006': { displayName: '蒋 修逸' },    // was 藤 修逸
  'EXT-0022': { displayName: '酬醐 宙' },    // was 酬醐 亘
  'EXT-0033': { displayName: '鈴木伶奈' },   // was 鈴木奈々美
};

// ─── Tournament progress corrections ───
// Each entry: { id, rank, recommended, qualified }
// rank = actual placement (null for 推薦 players)
// recommended = true for 推薦 (pre-qualified)
// qualified = true for all (代表選手 advancing to nationals)
const progressFixes = [
  // ホープス男子
  { id: 'TP-0001', playerId: 'EXT-0001', rank: null, recommended: true, qualified: true },   // 茂田翔紀 (推薦)
  { id: 'TP-0002', playerId: 'EXT-0002', rank: 1, recommended: false, qualified: true },    // 神保和悠
  { id: 'TP-0003', playerId: 'EXT-0003', rank: 2, recommended: false, qualified: true },    // 下田旺典
  { id: 'TP-0004', playerId: 'LK-0046', rank: 3, recommended: false, qualified: true },     // 加藤史也 (LK)
  { id: 'TP-0005', playerId: 'EXT-0004', rank: 4, recommended: false, qualified: true },    // 三浦健人
  { id: 'TP-0006', playerId: 'EXT-0005', rank: 5, recommended: false, qualified: true },    // 森本陽喜 (tied)
  { id: 'TP-0007', playerId: 'EXT-0006', rank: 5, recommended: false, qualified: true },    // 蒋 修逸 (tied)
  { id: 'TP-0008', playerId: 'EXT-0007', rank: 7, recommended: false, qualified: true },    // 山下 駿

  // ホープス女子
  { id: 'TP-0009', playerId: 'EXT-0008', rank: null, recommended: true, qualified: true },   // 鈴木希華 (推薦)
  { id: 'TP-0010', playerId: 'EXT-0009', rank: 1, recommended: false, qualified: true },    // 新井想来
  { id: 'TP-0011', playerId: 'EXT-0010', rank: 2, recommended: false, qualified: true },    // 鈴木愛梨
  { id: 'TP-0012', playerId: 'EXT-0011', rank: 3, recommended: false, qualified: true },    // 佐々木 真心
  { id: 'TP-0013', playerId: 'EXT-0012', rank: 4, recommended: false, qualified: true },    // 森本 潤
  { id: 'TP-0014', playerId: 'EXT-0013', rank: 5, recommended: false, qualified: true },    // 下田祐梨
  { id: 'TP-0015', playerId: 'LK-0002', rank: 5, recommended: false, qualified: true },     // 李 紫妤 (LK, tied)
  { id: 'TP-0016', playerId: 'EXT-0015', rank: 7, recommended: false, qualified: true },    // 大宮心花
  { id: 'TP-0017', playerId: 'EXT-0016', rank: 8, recommended: false, qualified: true },    // 北川結愛

  // カップ男子
  { id: 'TP-0018', playerId: 'EXT-0017', rank: null, recommended: true, qualified: true },   // 茂田悠稀 (推薦)
  { id: 'TP-0019', playerId: 'EXT-0018', rank: 1, recommended: false, qualified: true },    // 倉田東央
  { id: 'TP-0020', playerId: 'EXT-0019', rank: 2, recommended: false, qualified: true },    // 吉野明琳
  { id: 'TP-0021', playerId: 'EXT-0020', rank: 3, recommended: false, qualified: true },    // 今牧晴大
  { id: 'TP-0022', playerId: 'EXT-0021', rank: 4, recommended: false, qualified: true },    // 金丸 楓
  { id: 'TP-0023', playerId: 'EXT-0022', rank: 4, recommended: false, qualified: true },    // 酬醐 宙 (tied)
  { id: 'TP-0024', playerId: 'EXT-0023', rank: 6, recommended: false, qualified: true },    // 下田陽太
  { id: 'TP-0025', playerId: 'EXT-0024', rank: 7, recommended: false, qualified: true },    // 渡邉栄介
  { id: 'TP-0026', playerId: 'EXT-0025', rank: 8, recommended: false, qualified: true },    // 宮下璃多

  // カップ女子
  { id: 'TP-0027', playerId: 'EXT-0026', rank: null, recommended: true, qualified: true },   // 森本夏実 (推薦)
  { id: 'TP-0028', playerId: 'EXT-0027', rank: 1, recommended: false, qualified: true },    // 村守夏帆
  { id: 'TP-0029', playerId: 'EXT-0028', rank: 2, recommended: false, qualified: true },    // 伊藤楓香
  { id: 'TP-0030', playerId: 'EXT-0029', rank: 3, recommended: false, qualified: true },    // 鈴木梨紗
  { id: 'TP-0031', playerId: 'EXT-0030', rank: 4, recommended: false, qualified: true },    // 石川 楓
  { id: 'TP-0032', playerId: 'EXT-0031', rank: 4, recommended: false, qualified: true },    // 高宮歌乃 (tied)
  { id: 'TP-0033', playerId: 'EXT-0032', rank: 6, recommended: false, qualified: true },    // 田村舞桜
  { id: 'TP-0034', playerId: 'EXT-0033', rank: 7, recommended: false, qualified: true },    // 鈴木伶奈
  { id: 'TP-0035', playerId: 'LK-0003', rank: 8, recommended: false, qualified: true },     // 下田結愛 (LK)

  // パンピ男子 (no 推薦)
  { id: 'TP-0036', playerId: 'EXT-0034', rank: 1, recommended: false, qualified: true },    // 張本 翔
  { id: 'TP-0037', playerId: 'EXT-0035', rank: 2, recommended: false, qualified: true },    // 坂場郁斗
  { id: 'TP-0038', playerId: 'EXT-0036', rank: 3, recommended: false, qualified: true },    // 吉野琉太
  { id: 'TP-0039', playerId: 'EXT-0037', rank: 4, recommended: false, qualified: true },    // 吉村来夢
  { id: 'TP-0040', playerId: 'EXT-0038', rank: 5, recommended: false, qualified: true },    // 出雲悠真
  { id: 'TP-0041', playerId: 'EXT-0039', rank: 6, recommended: false, qualified: true },    // 村庄凑仁

  // パンピ女子 (no 推薦)
  { id: 'TP-0042', playerId: 'EXT-0040', rank: 1, recommended: false, qualified: true },    // 板野夏音
  { id: 'TP-0043', playerId: 'EXT-0041', rank: 2, recommended: false, qualified: true },    // 内田紗衣
  { id: 'TP-0044', playerId: 'EXT-0042', rank: 3, recommended: false, qualified: true },    // 中園琴葉
  { id: 'TP-0045', playerId: 'EXT-0043', rank: 4, recommended: false, qualified: true },    // 伊藤心香
  { id: 'TP-0046', playerId: 'EXT-0044', rank: 4, recommended: false, qualified: true },    // 倉田和歌 (tied)
  { id: 'TP-0047', playerId: 'EXT-0045', rank: 6, recommended: false, qualified: true },    // 浅野あさき
];

async function main() {
  console.log(`Fixing tournament data for ${env}...`);

  // 1. Fix external opponent names
  console.log('\n--- Fixing external opponent names ---');
  for (const [extId, updates] of Object.entries(nameFixes)) {
    try {
      await change('externalOpponent', extId, { externalOpponentId: extId, ...updates });
      console.log(`  ✓ ${extId}: ${Object.entries(updates).map(([k, v]) => `${k}="${v}"`).join(', ')}`);
    } catch (e) {
      console.error(`  ✗ ${extId}: ${e.message}`);
    }
  }

  // 2. Fix tournament progress records
  console.log('\n--- Fixing tournament progress records ---');
  for (const fix of progressFixes) {
    try {
      await change('tournamentProgress', fix.id, {
        tournamentProgressId: fix.id,
        tournamentId: 'TOURNAMENT-0001',
        playerId: fix.playerId,
        rank: fix.rank,
        recommended: fix.recommended,
        qualified: fix.qualified,
      });
      const label = fix.recommended ? '推薦' : `rank ${fix.rank}`;
      console.log(`  ✓ ${fix.id}: ${label}, qualified=${fix.qualified}`);
    } catch (e) {
      console.error(`  ✗ ${fix.id}: ${e.message}`);
    }
  }

  console.log('\nDone. Changes are pending approval in Data Maintenance → Manage → Pending Changes.');
}

main().catch(console.error);
