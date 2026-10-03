#!/usr/bin/env node
/**
 * uat-to-prod.js — Preview UAT/PROD differences, then merge approved UAT changes into PROD.
 *
 * Uses the /api/bulk-write endpoint (admin auth required).
 * PROD-only records are preserved. UAT records replace matching IDs only.
 *
 * Usage: node scripts/uat-to-prod.js [--apply] [--clear-history]
 * Requires: ADMIN_PASSWORD env var or interactive prompt
 */
const WORKER_URL = 'https://little-kings-api.little-kings.workers.dev';
const apply = process.argv.includes('--apply');
const clearHistory = process.argv.includes('--clear-history');
const ENTITIES = [
  { entityType: 'club', collection: 'clubs', idField: 'clubId' },
  { entityType: 'player', collection: 'players', idField: 'playerId' },
  { entityType: 'match', collection: 'matches', idField: 'matchId' },
  { entityType: 'externalOpponent', collection: 'externalOpponents', idField: 'externalOpponentId' },
  { entityType: 'tournament', collection: 'tournaments', idField: 'tournamentId' },
  { entityType: 'tournamentMatch', collection: 'tournamentMatches', idField: 'tournamentMatchId' },
  { entityType: 'tournamentProgress', collection: 'tournamentProgress', idField: 'tournamentProgressId' },
  { entityType: 'rubber', collection: 'rubbers', idField: 'rubberId' },
  { entityType: 'sessionFeedback', collection: 'sessionFeedback', idField: 'feedbackId' },
];
const stableJson = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const recordLabel = (record, idField) => `${record[idField]}${record.displayName ? ` (${record.displayName})` : record.nameJa ? ` (${record.nameJa})` : record.name ? ` (${record.name})` : ''}`;
function compareAndMerge(entity, uatRecords, prodRecords) {
  const uat = new Map(uatRecords.map(record => [record[entity.idField], record]));
  const prod = new Map(prodRecords.map(record => [record[entity.idField], record]));
  const prodOnly = [...prod.keys()].filter(id => !uat.has(id));
  const uatOnly = [...uat.keys()].filter(id => !prod.has(id));
  const changed = [...uat.keys()].filter(id => prod.has(id) && stableJson(uat.get(id)) !== stableJson(prod.get(id)));
  const merged = new Map(prod);
  for (const record of uatRecords) merged.set(record[entity.idField], record);
  return { prodOnly, uatOnly, changed, records: [...merged.values()], labels: ids => ids.map(id => recordLabel((uat.get(id) || prod.get(id)), entity.idField)) };
}

async function login(adminPassword) {
  const res = await fetch(`${WORKER_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin', password: adminPassword })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Login failed: ${data.error}`);
  return data.token;
}

async function main() {
  // Get admin password
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (apply && !adminPassword) {
    console.error('Set ADMIN_PASSWORD environment variable:');
    console.error('  $env:ADMIN_PASSWORD="your-password"; node scripts/uat-to-prod.js --apply');
    process.exit(1);
  }

  console.log('1. Fetching UAT data...');
  const uatRes = await fetch(`${WORKER_URL}/api/public-data?environment=uat`);
  if (!uatRes.ok) throw new Error(`UAT API returned ${uatRes.status}`);
  const uatData = await uatRes.json();
  if (!uatData.ok) throw new Error('UAT API returned invalid response');
  console.log(`   UAT: ${uatData.players?.length || 0} players, ${uatData.matches?.length || 0} matches, ${uatData.externalOpponents?.length || 0} ext opponents, ${uatData.tournaments?.length || 0} tournaments, ${uatData.tournamentProgress?.length || 0} progress, ${uatData.rubbers?.length || 0} rubbers`);

  console.log('\n2. Fetching current PROD data (for comparison)...');
  const prodRes = await fetch(`${WORKER_URL}/api/public-data?environment=prod`);
  if (!prodRes.ok) throw new Error(`PROD API returned ${prodRes.status}`);
  const prodData = await prodRes.json();
  console.log(`   PROD: ${prodData.players?.length || 0} players, ${prodData.matches?.length || 0} matches, ${prodData.externalOpponents?.length || 0} ext opponents, ${prodData.tournaments?.length || 0} tournaments, ${prodData.tournamentProgress?.length || 0} progress, ${prodData.rubbers?.length || 0} rubbers`);

  console.log('\n3. Comparing collections (UAT values override matching PROD IDs; PROD-only IDs are retained)...');
  const plans = ENTITIES.map(entity => ({ entity, ...compareAndMerge(entity, uatData[entity.collection] || [], prodData[entity.collection] || []) }));
  for (const plan of plans) {
    console.log(`   ${plan.entity.collection}: ${plan.uatOnly.length} UAT-only, ${plan.changed.length} changed, ${plan.prodOnly.length} PROD-only preserved`);
    if (plan.prodOnly.length) console.log(`      PROD-only: ${plan.labels(plan.prodOnly).join(', ')}`);
  }
  if (!apply) {
    console.log('\nPreview only. Review the differences, then rerun with --apply to write the merged collections.');
    return;
  }

  console.log('\n4. Logging in as admin...');
  const token = await login(adminPassword);
  console.log('   Login OK');

  console.log('\n5. Pushing merged UAT + preserved PROD data to PROD...');
  let total = 0, failed = 0;
  for (const plan of plans) {
    const { entity, records } = plan;
    try {
      const res = await fetch(`${WORKER_URL}/api/bulk-write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ entityType: entity.entityType, records, environment: 'prod' })
      });
      const result = await res.json();
      if (result.ok) {
        total += records.length;
        console.log(`   ✅ ${entity.collection}: ${records.length} records written`);
      } else {
        failed++;
        console.error(`   ❌ ${entity.collection}: ${result.error}`);
      }
    } catch (err) {
      failed++;
      console.error(`   ❌ ${entity.collection}: ${err.message}`);
    }
  }

  if (!clearHistory) {
    console.log('\n6. Preserved PROD history. Use --clear-history only after review.');
    console.log(`\n✅ Migration complete: ${total} records written, ${failed} failures`);
    console.log('   Verify PROD at: https://rickliky.github.io/table-tennis/');
    return;
  }
  console.log(`\n6. Clearing PROD processed history...`);
  try {
    const res = await fetch(`${WORKER_URL}/api/clear-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (result.ok) console.log(`   Cleared ${result.deleted} processed changes, ${result.remaining} pending remain`);
    else console.error(`   Failed: ${result.error}`);
  } catch (err) {
    console.error(`   Failed: ${err.message}`);
  }

  console.log(`\n✅ Migration complete: ${total} records written, ${failed} failures`);
  console.log('   Verify PROD at: https://rickliky.github.io/table-tennis/');
}

main().catch(err => { console.error(err); process.exit(1); });
