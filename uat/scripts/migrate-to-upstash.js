#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const WORKER_URL = 'https://little-kings-api.little-kings.workers.dev';
const ENVIRONMENT = 'uat';

async function push(collection, entityType, idField, records) {
  let created = 0, skipped = 0, failed = 0;
  for (const record of records) {
    const targetId = record[idField];
    if (!targetId) { skipped++; continue; }
    try {
      const res = await fetch(`${WORKER_URL}/api/change?environment=${ENVIRONMENT}`, {
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
  const root = path.resolve(__dirname, '..');
  const clubs = JSON.parse(fs.readFileSync(path.join(root, 'data/club.json'), 'utf8'));
  const opponents = JSON.parse(fs.readFileSync(path.join(root, 'data/external-opponents.json'), 'utf8'));
  const tournaments = JSON.parse(fs.readFileSync(path.join(root, 'data/tournaments.json'), 'utf8'));
  const progress = JSON.parse(fs.readFileSync(path.join(root, 'data/tournament-progress.json'), 'utf8'));

  console.log('Pushing to Upstash Redis via Worker API...\n');

  await push('clubs', 'club', 'clubId', clubs);
  await push('externalOpponents', 'externalOpponent', 'externalOpponentId', opponents);
  await push('tournaments', 'tournament', 'tournamentId', tournaments);
  await push('tournamentProgress', 'tournamentProgress', 'tournamentProgressId', progress);

  // Push players
  const allPlayers = JSON.parse(fs.readFileSync(path.join(root, 'data/players.json'), 'utf8'));
  await push('players', 'player', 'playerId', allPlayers);

  console.log('\nDone. Review pending changes in Data Maintenance page and approve.');
}

main().catch(err => { console.error(err); process.exit(1); });
