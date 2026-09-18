#!/usr/bin/env node
/**
 * Convert player rubber type values from Japanese to English enums.
 * 裏ソフト → INVERTED, 表ソフト → SHORT_PIPS, 粒高 → LONG_PIPS, アンチ → ANTI
 */
const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) { console.error('UPSTASH env vars required'); process.exit(1); }
const headers = { Authorization: `Bearer ${token}` };
const TYPE_MAP = { '裏ソフト': 'INVERTED', '表ソフト': 'SHORT_PIPS', '粒高': 'LONG_PIPS', 'アンチ': 'ANTI' };

async function readUpstash(key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers });
  const d = await res.json();
  return d.result ? JSON.parse(d.result) : [];
}
async function writeUpstash(key, value) {
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Write failed: ${res.status}`);
}

async function convert(environment) {
  console.log(`Converting ${environment} players...`);
  const players = await readUpstash(`${environment}:players`);
  let changed = 0;
  for (const p of players) {
    let modified = false;
    for (const field of ['forehandRubberType', 'backhandRubberType']) {
      const val = p[field];
      if (val && TYPE_MAP[val]) {
        p[field] = TYPE_MAP[val];
        modified = true;
      }
    }
    if (modified) changed++;
  }
  console.log(`  ${changed} players updated out of ${players.length}`);
  if (changed) {
    await writeUpstash(`${environment}:players`, players);
    console.log(`  ✓ Written to ${environment}:players`);
  }
  return players;
}

(async () => {
  await convert('uat');
  await convert('prod');
  console.log('Done');
})().catch(e => { console.error(e.message); process.exit(1); });
