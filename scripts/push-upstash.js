/* eslint-env node */
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const environment = process.argv[3] || 'uat';
if (!file || !['uat', 'prod'].includes(environment)) {
  console.error('Usage: node scripts/push-upstash.js <migration-json> [uat|prod]');
  process.exit(1);
}
const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required.');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, ''));
const collections = { clubs: data.clubs, players: data.players, matches: data.matches, 'external-opponents': data.externalOpponents, tournaments: data.tournaments, 'tournament-matches': data.tournamentMatches, rubbers: data.rubbers };
(async () => {
  for (const [name, value] of Object.entries(collections)) {
    const key = `${environment}:${name}`;
    const body = JSON.stringify(value || []);
    const response = await fetch(`${url}/set/${encodeURIComponent(key)}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain; charset=utf-8' }, body });
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    console.log(`Uploaded ${key}`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
