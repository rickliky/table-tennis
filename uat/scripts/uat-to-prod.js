#!/usr/bin/env node
/**
 * uat-to-prod.js — Export UAT data and overwrite PROD collections directly.
 *
 * Uses the /api/bulk-write endpoint (admin auth required).
 * This REPLACES all PROD data with UAT data in one shot — no pending changes.
 *
 * Usage: node scripts/uat-to-prod.js
 * Requires: ADMIN_PASSWORD env var or interactive prompt
 */
const WORKER_URL = 'https://little-kings-api.little-kings.workers.dev';
const ENTITIES = [
  { entityType: 'club', collection: 'clubs', idField: 'clubId' },
  { entityType: 'player', collection: 'players', idField: 'playerId' },
  { entityType: 'match', collection: 'matches', idField: 'matchId' },
  { entityType: 'externalOpponent', collection: 'externalOpponents', idField: 'externalOpponentId' },
  { entityType: 'tournament', collection: 'tournaments', idField: 'tournamentId' },
  { entityType: 'tournamentMatch', collection: 'tournamentMatches', idField: 'tournamentMatchId' },
  { entityType: 'tournamentProgress', collection: 'tournamentProgress', idField: 'tournamentProgressId' },
  { entityType: 'rubber', collection: 'rubbers', idField: 'rubberId' },
];

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
  if (!adminPassword) {
    console.error('Set ADMIN_PASSWORD environment variable:');
    console.error('  $env:ADMIN_PASSWORD="your-password"; node scripts/uat-to-prod.js');
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

  console.log('\n3. Logging in as admin...');
  const token = await login(adminPassword);
  console.log('   Login OK');

  console.log('\n4. Pushing UAT data to PROD...');
  let total = 0, failed = 0;
  for (const entity of ENTITIES) {
    const records = uatData[entity.collection] || [];
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

  console.log(`\n5. Clearing PROD pending changes...`);
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
