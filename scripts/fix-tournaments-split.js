#!/usr/bin/env node
/**
 * Fix: Split mixed tournament data into two correct tournaments.
 * Submits all changes as pending. User approves in Data Maintenance.
 *
 * Usage: node scripts/fix-tournaments-split.js [uat|prod]
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

async function main() {
  console.log(`Submitting tournament split changes for ${env}...`);
  let ok = 0, fail = 0;

  async function submit(label, fn) {
    try { await fn(); console.log(`  ✓ ${label}`); ok++; }
    catch (e) { console.error(`  ✗ ${label}: ${e.message}`); fail++; }
  }

  // ─── Tournament changes ───
  console.log('\n--- Tournaments ---');
  await submit('TOURNAMENT-0001 → 東京卓球選手権大会予選の部', () =>
    change('tournament', 'TOURNAMENT-0001', {
      tournamentId: 'TOURNAMENT-0001',
      name: '東京卓球選手権大会予選の部',
      nameJa: '東京卓球選手権大会予選の部',
      date: '2027-02-20',
      location: '東京武道館',
      format: 'Block Tournament',
      status: 'Completed',
      notes: '49名参加。無条件出場選手7名。各ブロック上位3名が代表。2日間開催。',
    }));

  await submit('Create TOURNAMENT-0002 (全農杯)', () =>
    api('/api/change', {
      entityType: 'tournament',
      targetId: 'TOURNAMENT-0002',
      action: 'create',
      after: {
        tournamentId: 'TOURNAMENT-0002',
        name: '2026年度全農杯日本卓球選手権大会（ホープス・カップ・ポピンズの部）県予選会',
        nameJa: '2026年度全農杯日本卓球選手権大会（ホープス・カップ・ポピンズの部）県予選会',
        date: '2026-05-03',
        location: '川崎市多摩スポーツセンター',
        format: 'Round Robin',
        status: 'Completed',
        notes: '代表選手28名が下記本大会へ出場する。本大会 2026年7月24日（金）～26日（日）グリーンアリーナ神戸（神戸総合運動公園内体育館）',
      },
    }));

  // ─── パンピ → TOURNAMENT-0002 ───
  console.log('\n--- Move パンピ to TOURNAMENT-0002 ---');
  const panpi = [
    ['TP-0036', 'EXT-0034', 'パンピ男子', 1],
    ['TP-0037', 'EXT-0035', 'パンピ男子', 2],
    ['TP-0038', 'EXT-0036', 'パンピ男子', 3],
    ['TP-0039', 'EXT-0037', 'パンピ男子', 4],
    ['TP-0040', 'EXT-0038', 'パンピ男子', 5],
    ['TP-0041', 'EXT-0039', 'パンピ男子', 6],
    ['TP-0042', 'EXT-0040', 'パンピ女子', 1],
    ['TP-0043', 'EXT-0041', 'パンピ女子', 2],
    ['TP-0044', 'EXT-0042', 'パンピ女子', 3],
    ['TP-0045', 'EXT-0043', 'パンピ女子', 4],
    ['TP-0046', 'EXT-0044', 'パンピ女子', 4],
    ['TP-0047', 'EXT-0045', 'パンピ女子', 6],
  ];
  for (const [id, pid, div, rank] of panpi) {
    await submit(`${id} → TOURNAMENT-0002`, () =>
      change('tournamentProgress', id, {
        tournamentProgressId: id, tournamentId: 'TOURNAMENT-0002',
        playerId: pid, division: div, rank, recommended: false, qualified: true,
      }));
  }

  // ─── Fix qualified flags for TOURNAMENT-0001 (東京) ───
  console.log('\n--- Fix qualified flags for TOURNAMENT-0001 (東京) ---');
  const t1 = [
    // ホープス男子 - only 推薦 is qualified
    ['TP-0001', 'EXT-0001', true, true],
    ['TP-0002', 'EXT-0002', false, false],
    ['TP-0003', 'EXT-0003', false, false],
    ['TP-0004', 'LK-0046', false, false],
    ['TP-0005', 'EXT-0004', false, false],
    ['TP-0006', 'EXT-0005', false, false],
    ['TP-0007', 'EXT-0006', false, false],
    ['TP-0008', 'EXT-0007', false, false],
    // ホープス女子
    ['TP-0009', 'EXT-0008', true, true],
    ['TP-0010', 'EXT-0009', false, false],
    ['TP-0011', 'EXT-0010', false, false],
    ['TP-0012', 'EXT-0011', false, false],
    ['TP-0013', 'EXT-0012', false, false],
    ['TP-0014', 'EXT-0013', false, false],
    ['TP-0015', 'LK-0002', false, false],
    ['TP-0016', 'EXT-0015', false, false],
    ['TP-0017', 'EXT-0016', false, false],
    // カブ男子
    ['TP-0018', 'EXT-0017', true, true],
    ['TP-0019', 'EXT-0018', false, false],
    ['TP-0020', 'EXT-0019', false, false],
    ['TP-0021', 'EXT-0020', false, false],
    ['TP-0022', 'EXT-0021', false, false],
    ['TP-0023', 'EXT-0022', false, false],
    ['TP-0024', 'EXT-0023', false, false],
    ['TP-0025', 'EXT-0024', false, false],
    ['TP-0026', 'EXT-0025', false, false],
    // カブ女子
    ['TP-0027', 'EXT-0026', false, false],
    ['TP-0028', 'EXT-0027', false, false],
    ['TP-0029', 'EXT-0028', false, false],
    ['TP-0030', 'EXT-0029', false, false],
    ['TP-0031', 'EXT-0030', false, false],
    ['TP-0032', 'EXT-0031', false, false],
    ['TP-0033', 'EXT-0032', false, false],
    ['TP-0034', 'EXT-0033', false, false],
    ['TP-0035', 'LK-0003', false, false],
  ];
  for (const [id, pid, rec, qual] of t1) {
    const label = rec ? '推薦→qualified' : 'not qualified';
    await submit(`${id}: ${label}`, () =>
      change('tournamentProgress', id, {
        tournamentProgressId: id, tournamentId: 'TOURNAMENT-0001',
        playerId: pid, recommended: rec, qualified: qual,
      }));
  }

  console.log(`\nDone: ${ok} submitted, ${fail} failed.`);
  console.log('Approve in Data Maintenance → Manage → Pending Changes:');
  console.log('  1. TOURNAMENT-0001 rename');
  console.log('  2. TOURNAMENT-0002 create');
  console.log('  3. All TP-00xx progress changes');
}

main().catch(console.error);
