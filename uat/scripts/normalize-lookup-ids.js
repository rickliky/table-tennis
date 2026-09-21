#!/usr/bin/env node
/**
 * Normalizes stored player and external-opponent lookup values to canonical IDs.
 * Usage: node scripts/normalize-lookup-ids.js [uat|prod]
 *
 * Changes are submitted through the Worker and require approval before applying.
 */
const fs = require('fs');
const vm = require('vm');

const environment = process.argv[2] || 'uat';
const workerUrl = 'https://little-kings-api.little-kings.workers.dev';
if (!['uat', 'prod'].includes(environment)) throw new Error('Usage: node scripts/normalize-lookup-ids.js [uat|prod]');

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('static-data.js', 'utf8'), sandbox);
const lookups = sandbox.window.LK_STATIC;
const fields = {
  gender: 'genders', schoolLevel: 'schoolLevels', playingHand: 'playingHands', grip: 'grips',
  playingStyle: 'playingStyles', forehandRubberType: 'rubberTypes', backhandRubberType: 'rubberTypes',
  status: 'statuses', grade: 'grades'
};

function canonicalId(table, value) {
  if (!value) return value;
  const entry = (lookups[table] || []).find(item => item.id === value || item.name === value || item.nameJa === value || item.nameEn === value || `${item.nameJa} / ${item.nameEn}` === value);
  return entry?.id || value;
}

function normalize(record) {
  const next = { ...record };
  for (const [field, table] of Object.entries(fields)) next[field] = canonicalId(table, record[field]);
  return next;
}

async function submit(entityType, idField, records) {
  let submitted = 0;
  for (const record of records) {
    const after = normalize(record);
    if (JSON.stringify(after) === JSON.stringify(record)) continue;
    const response = await fetch(`${workerUrl}/api/change?environment=${environment}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, targetId: record[idField], action: 'update', after })
    });
    const result = await response.json();
    if (!result.ok) throw new Error(`${record[idField]}: ${result.error || 'request failed'}`);
    submitted++;
    process.stdout.write('.');
  }
  return submitted;
}

(async () => {
  const response = await fetch(`${workerUrl}/api/public-data?environment=${environment}`);
  const data = await response.json();
  const players = await submit('player', 'playerId', data.players || []);
  const opponents = await submit('externalOpponent', 'externalOpponentId', data.externalOpponents || []);
  console.log(`\nSubmitted ${players} player and ${opponents} external-opponent normalization changes for ${environment}.`);
})().catch(error => { console.error(`\nNormalization failed: ${error.message}`); process.exit(1); });
