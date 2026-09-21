#!/usr/bin/env node
/**
 * Move パンピ records to TOURNAMENT-0002.
 * Run AFTER approving TOURNAMENT-0002 in Data Maintenance.
 * Usage: node scripts/fix-panpi-to-t2.js [uat|prod]
 */
const API = 'https://little-kings-api.little-kings.workers.dev';
const env = process.argv[2] || 'uat';
async function api(path, body) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${API}${path}${sep}environment=${env}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json(); if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`); return json;
}
const panpi = [
  ['TP-0036', 'EXT-0034', 'パンピ男子', 1], ['TP-0037', 'EXT-0035', 'パンピ男子', 2],
  ['TP-0038', 'EXT-0036', 'パンピ男子', 3], ['TP-0039', 'EXT-0037', 'パンピ男子', 4],
  ['TP-0040', 'EXT-0038', 'パンピ男子', 5], ['TP-0041', 'EXT-0039', 'パンピ男子', 6],
  ['TP-0042', 'EXT-0040', 'パンピ女子', 1], ['TP-0043', 'EXT-0041', 'パンピ女子', 2],
  ['TP-0044', 'EXT-0042', 'パンピ女子', 3], ['TP-0045', 'EXT-0043', 'パンピ女子', 4],
  ['TP-0046', 'EXT-0044', 'パンピ女子', 4], ['TP-0047', 'EXT-0045', 'パンピ女子', 6],
];
(async () => {
  for (const [id, pid, div, rank] of panpi) {
    try {
      await api('/api/change', { entityType: 'tournamentProgress', targetId: id, action: 'update', after: { tournamentProgressId: id, tournamentId: 'TOURNAMENT-0002', playerId: pid, division: div, rank, recommended: false, qualified: true } });
      console.log(`✓ ${id} → TOURNAMENT-0002`);
    } catch (e) { console.error(`✗ ${id}: ${e.message}`); }
  }
})();
