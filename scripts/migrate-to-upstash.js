#!/usr/bin/env node
/**
 * migrate-to-upstash.js — Push local backup data to Upstash via Worker API.
 *
 * NOTE: This is a ONE-TIME migration tool. Golden source is now Upstash.
 * Use `scripts/export-from-upstash.js` for daily backups (Upstash → local).
 *
 * Usage: node scripts/migrate-to-upstash.js [uat|prod]
 */
const fs = require('fs');
const path = require('path');

const WORKER_URL = 'https://little-kings-api.little-kings.workers.dev';
const environment = process.argv[2] || 'uat';
if (!['uat', 'prod'].includes(environment)) {
  console.error('Usage: node scripts/migrate-to-upstash.js [uat|prod]');
  process.exit(1);
}

function readLatestBackup(type) {
  const dir = path.resolve(__dirname, '..', 'backup', environment);
  const files = fs.readdirSync(dir).filter(f => f.startsWith(`${type}.json.`)).sort().reverse();
  if (!files.length) throw new Error(`No backup found for ${type} in backup/${environment}/`);
  return JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
}

async function push(collection, entityType, idField, records) {
  let created = 0, skipped = 0, failed = 0;
  for (const record of records) {
    const targetId = record[idField];
    if (!targetId) { skipped++; continue; }
    try {
      const res = await fetch(`${WORKER_URL}/api/change?environment=${environment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, targetId, after: record, action: 'create' })
      });
      const result = await res.json();
      if (result.ok) {
        if (result.change) { created++; process.stdout.write('.'); }
        else { skipped++; process.stdout.write('-'); }
      } else {
        failed++;
        console.error(`\n  FAIL ${targetId}: ${result.error}`);
      }
    } catch (err) {
      failed++;
      console.error(`\n  ERROR ${targetId}: ${err.message}`);
    }
  }
  console.log(`\n  ${collection}: ${created} created, ${skipped} skipped (no change), ${failed} failed`);
  return { created, skipped, failed };
}

async function main() {
  console.log(`Pushing ${environment} data to Upstash via Worker API...\n`);

  const clubs = readLatestBackup('clubs');
  const opponents = readLatestBackup('externalOpponents');
  const tournaments = readLatestBackup('tournaments');
  const progress = readLatestBackup('tournamentProgress');
  const allPlayers = readLatestBackup('players');
  const rubbers = readLatestBackup('rubbers');

  await push('clubs', 'club', 'clubId', clubs);
  await push('externalOpponents', 'externalOpponent', 'externalOpponentId', opponents);
  await push('tournaments', 'tournament', 'tournamentId', tournaments);
  await push('tournamentProgress', 'tournamentProgress', 'tournamentProgressId', progress);
  await push('players', 'player', 'playerId', allPlayers);
  await push('rubbers', 'rubber', 'rubberId', rubbers);

  console.log('\nDone. Review pending changes in Data Maintenance page and approve.');
}

main().catch(err => { console.error(err); process.exit(1); });
