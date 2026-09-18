#!/usr/bin/env node
/**
 * export-from-upstash.js — Export current Upstash data to offline backup files.
 *
 * Usage: node scripts/export-from-upstash.js [uat|prod]
 *
 * Creates dated backup files in backup/<env>/ directory.
 * These files are OFFLINE-ONLY reference — never used at runtime.
 */
const fs = require('fs');
const path = require('path');

const WORKER_URL = 'https://little-kings-api.little-kings.workers.dev';
const environment = process.argv[2] || 'uat';
if (!['uat', 'prod'].includes(environment)) {
  console.error('Usage: node scripts/export-from-upstash.js [uat|prod]');
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const backupDir = path.resolve(__dirname, '..', 'backup', environment);

const TYPES = ['clubs', 'players', 'matches', 'externalOpponents', 'tournaments', 'tournamentMatches', 'tournamentProgress', 'rubbers'];

(async () => {
  console.log(`Exporting ${environment} data from Upstash...`);
  const res = await fetch(`${WORKER_URL}/api/public-data?environment=${environment}`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error('API returned invalid response');

  fs.mkdirSync(backupDir, { recursive: true });

  for (const type of TYPES) {
    const records = data[type];
    if (!Array.isArray(records)) continue;
    const filename = `${type}.json.${date}`;
    fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(records, null, 2) + '\n', 'utf8');
    console.log(`  ${filename} (${records.length} records)`);
  }

  console.log(`\nBackup written to backup/${environment}/`);
})();
