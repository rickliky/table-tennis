#!/usr/bin/env node
/**
 * Rubber Database Rebuild — Direct Upstash Push
 *
 * Reads current rubbers from Upstash directly (REST API),
 * applies cleanup rules, and writes the cleaned master list back.
 */
const fs = require('fs');
const path = require('path');

const environment = process.argv[2] || 'uat';
if (!['uat', 'prod'].includes(environment)) {
  console.error('Usage: node rebuild-rubbers.js [uat|prod]');
  process.exit(1);
}

const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required.');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${token}` };

async function readUpstash(key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers });
  const d = await res.json();
  return d.result ? JSON.parse(d.result) : [];
}

async function writeUpstash(key, value) {
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Write failed for ${key}: ${res.status}`);
}

// ── Type mapping ──
const TYPE_MAP = { '裏ソフト': 'INVERTED', '表ソフト': 'SHORT_PIPS', '粒高': 'LONG_PIPS', 'アンチ': 'ANTI' };

// ── IDs to REMOVE ──
const REMOVE_IDS = new Set([
  'RB-0057','RB-0065','RB-0074','RB-0149','RB-0164',  // blades
  'RB-0058','RB-0064','RB-0113','RB-0173',              // fakes
  'RB-0185','RB-0186','RB-0187','RB-0188','RB-0189',   // OX
  'RB-0190','RB-0191','RB-0192','RB-0193','RB-0194',
  'RB-0195','RB-0196','RB-0197','RB-0198','RB-0199',
  'RB-0200','RB-0201','RB-0202','RB-0203',
]);

// ── Type RECLASSIFICATIONS ──
const TYPE_FIXES = {
  'RB-0026': 'SHORT_PIPS', 'RB-0027': 'SHORT_PIPS', 'RB-0028': 'SHORT_PIPS',
  'RB-0088': 'SHORT_PIPS', 'RB-0123': 'LONG_PIPS', 'RB-0162': 'SHORT_PIPS',
};

// ── MERGE map ──
const MERGE_MAP = { 'RB-0156': 'RB-0155' };

// ── REVIEW flags ──
const REVIEW_IDS = new Set(['RB-0001', 'RB-0114', 'RB-0131', 'RB-0163']);

// ── Brand normalization ──
const BRAND_FIXES = {
  'STIGA':'Stiga','stiga':'Stiga','TIBHAR':'Tibhar','tibhar':'Tibhar',
  'XIOM':'Xiom','xiom':'Xiom','DHS':'DHS','VICTAS':'Victas','victas':'Victas',
  'friendship':'729','Friendship':'729',
};

// ── Name fixes ──
const NAME_FIXES = { 'RB-0128': { model: 'Genius' } };  // Tibhar Genuis → Genius

async function main() {
  console.log(`=== Rubber Database Rebuild (${environment}) ===\n`);

  // 1. Read current rubbers
  console.log('Reading rubbers from Upstash...');
  const current = await readUpstash(`${environment}:rubbers`);
  console.log(`  Found ${current.length} rubbers\n`);

  // 2. Process
  const kept = [], removed = [], reclassified = [], merged = [], reviewed = [];

  for (const r of current) {
    const id = r.rubberId;

    if (REMOVE_IDS.has(id)) { removed.push({ id, name: r.name || r.model }); continue; }
    if (MERGE_MAP[id]) { merged.push({ id, name: r.name || r.model, into: MERGE_MAP[id] }); continue; }

    const updated = { ...r };

    // Convert type
    const curType = updated.type || updated.rubberType || '';
    const newType = TYPE_MAP[curType] || curType;
    if (newType !== curType) updated.type = newType;

    // Reclassify
    if (TYPE_FIXES[id]) {
      reclassified.push({ id, name: r.name || r.model, from: updated.type, to: TYPE_FIXES[id] });
      updated.type = TYPE_FIXES[id];
    }

    // Brand normalization
    if (BRAND_FIXES[updated.brand]) updated.brand = BRAND_FIXES[updated.brand];

    // Name fixes
    if (NAME_FIXES[id]) {
      updated.model = NAME_FIXES[id].model;
      updated.name = `${updated.brand} ${NAME_FIXES[id].model}`;
    }

    // Ensure fields
    if (!updated.status) updated.status = 'ACTIVE';
    if (!updated.type) console.warn(`  ⚠ ${id}: no type`);

    // Review flag
    if (REVIEW_IDS.has(id)) { updated.reviewNote = 'Verify product existence'; reviewed.push({ id, name: updated.name }); }

    // Clean legacy
    delete updated.rubberType;

    kept.push(updated);
  }

  // 3. Report
  console.log('--- Cleanup Summary ---');
  console.log(`  Kept:         ${kept.length}`);
  console.log(`  Removed:      ${removed.length}`);
  console.log(`  Merged:       ${merged.length}`);
  console.log(`  Reclassified: ${reclassified.length}`);
  console.log(`  Review:       ${reviewed.length}`);

  const tc = {};
  kept.forEach(r => { tc[r.type] = (tc[r.type] || 0) + 1; });
  console.log('\n--- Type Distribution ---');
  Object.entries(tc).sort().forEach(([t, c]) => console.log(`  ${t}: ${c}`));

  if (reclassified.length) {
    console.log('\n--- Reclassifications ---');
    reclassified.forEach(r => console.log(`  ${r.id} ${r.name}: ${r.from} → ${r.to}`));
  }
  if (removed.length) {
    console.log('\n--- Removed ---');
    removed.forEach(r => console.log(`  ${r.id} ${r.name}`));
  }
  if (merged.length) {
    console.log('\n--- Merged ---');
    merged.forEach(r => console.log(`  ${r.id} ${r.name} → ${r.into}`));
  }
  if (reviewed.length) {
    console.log('\n--- Needs Review ---');
    reviewed.forEach(r => console.log(`  ${r.id} ${r.name}`));
  }

  // 4. Backup
  const today = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(__dirname, '..', 'backup', environment, `rubbers-cleaned.json.${today}`);
  fs.writeFileSync(backupPath, JSON.stringify(kept, null, 2));
  console.log(`\nBackup: ${backupPath}`);

  // 5. Write to Upstash
  console.log(`\nWriting ${kept.length} rubbers to ${environment}:rubbers...`);
  await writeUpstash(`${environment}:rubbers`, kept);
  console.log('  ✓ Done');

  // 6. Verify
  console.log('\nVerifying...');
  const verify = await readUpstash(`${environment}:rubbers`);
  console.log(`  ${environment}:rubbers count: ${verify.length}`);

  // Show first few to confirm type conversion
  console.log('\nSample entries:');
  verify.slice(0, 3).forEach(r => console.log(`  ${r.rubberId} ${r.name} type=${r.type} brand=${r.brand}`));

  console.log('\n=== Done ===');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
