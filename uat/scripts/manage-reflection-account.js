#!/usr/bin/env node
// UAT-only account management. Never print credentials or journal contents.
// Credentials are process environment variables, not command-line arguments:
// ADMIN_PASSWORD, REFLECTION_PLAYER_ID, REFLECTION_PASSWORD (new/reset only).
// Preview by default; pass --apply with --enable, --disable, or --reset.
const API = 'https://little-kings-api.little-kings.workers.dev';
async function main() {
  if (!process.env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD is required');
  const loginResponse = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'admin', password: process.env.ADMIN_PASSWORD }) });
  if (!loginResponse.ok) throw new Error(`Admin login failed (${loginResponse.status})`);
  const { token } = await loginResponse.json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const endpoint = `${API}/api/reflections/accounts?environment=uat`;
  const response = await fetch(endpoint, { headers });
  if (!response.ok) throw new Error(`Account list unavailable (${response.status})`);
  const { accounts } = await response.json();
  if (process.argv.includes('--list')) { console.log(JSON.stringify(accounts, null, 2)); return; }
  const action = ['enable', 'disable', 'reset'].filter(value => process.argv.includes(`--${value}`));
  const playerId = process.env.REFLECTION_PLAYER_ID;
  if (action.length !== 1 || !/^LK-\d{4}$/.test(playerId || '')) throw new Error('Set REFLECTION_PLAYER_ID and select exactly one of --enable, --disable, --reset');
  const previous = accounts.find(account => account.playerId === playerId);
  if (action[0] === 'reset' && !previous) throw new Error('Cannot reset an account that does not exist');
  if (action[0] === 'disable' && !previous) throw new Error('Cannot disable an account that does not exist');
  if (action[0] === 'enable' && previous?.enabled) { console.log(`${playerId} is already enabled; no change. Use --reset explicitly to reset credentials.`); return; }
  const body = { playerId, enabled: action[0] === 'reset' ? previous.enabled : action[0] === 'enable' };
  if (!previous || action[0] === 'reset') {
    if (!process.env.REFLECTION_PASSWORD) throw new Error('REFLECTION_PASSWORD is required for initial enable/reset');
    body.password = process.env.REFLECTION_PASSWORD;
  }
  console.log(`UAT ${action[0]}: ${playerId}. Existing sessions will be revoked; journal text will not be touched.`);
  if (!process.argv.includes('--apply')) { console.log('Preview only. Add --apply to perform this action.'); return; }
  const update = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!update.ok) throw new Error(`Account update failed (${update.status})`);
  const result = await update.json();
  console.log(`Account updated: ${result.playerId}, enabled=${result.enabled}, version=${result.version}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
