#!/usr/bin/env node
// Direct Upstash Redis update — bypasses Worker approval workflow.
// Usage: UPSTASH_URL=... UPSTASH_TOKEN=... node scripts/persist-club-id.js
//    or: node scripts/persist-club-id.js <upstash-rest-url> <upstash-rest-token>

const CLUB_ID = 'CLUB-0001';

const url = process.argv[2] || process.env.UPSTASH_REDIS_REST_URL;
const token = process.argv[3] || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.log('Usage: node scripts/persist-club-id.js <upstash-rest-url> <upstash-rest-token>');
  console.log('   or: UPSTASH_URL=... UPSTASH_TOKEN=... node scripts/persist-club-id.js');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };
const get = async (key) => {
  const res = await fetch(`${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`, { headers });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
};
const set = async (key, value) => {
  const res = await fetch(`${url.replace(/\/$/, '')}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    body: JSON.stringify(value)
  });
  return res.json();
};

(async () => {
  for (const env of ['uat', 'prod']) {
    const key = `${env}:players`;
    console.log(`\nUpdating ${key}...`);
    const players = await get(key);
    if (!players || !players.length) { console.log('  No players found, skipping.'); continue; }

    let changed = 0;
    players.forEach(p => { if (!p.clubId) { p.clubId = CLUB_ID; changed++; } });

    if (!changed) { console.log(`  All ${players.length} players already have clubId.`); continue; }

    await set(key, players);
    console.log(`  Updated ${changed} / ${players.length} players with clubId: "${CLUB_ID}"`);
  }
  console.log('\nDone. Both environments updated directly in Upstash.');
})().catch(err => { console.error(err.message); process.exit(1); });
