#!/usr/bin/env node
/**
 * Audit all dropdown options vs actual data in Upstash.
 * Reads options from static/*.json files (source of truth for dropdowns).
 */
const fs = require('fs');
const path = require('path');

const API = 'https://little-kings-api.little-kings.workers.dev/api/public-data?environment=uat';
const staticDir = path.resolve(__dirname, '..', 'static');

function readStatic(name) {
  return JSON.parse(fs.readFileSync(path.join(staticDir, `${name}.json`), 'utf8')).map(x => x.name);
}

const playerSelects = {
  gender: readStatic('genders'),
  schoolLevel: readStatic('school-levels'),
  playingHand: readStatic('playing-hands'),
  grip: readStatic('grips'),
  playingStyle: readStatic('playing-styles'),
  forehandRubberType: readStatic('rubber-types'),
  backhandRubberType: readStatic('rubber-types'),
  status: readStatic('statuses')
};

const tournamentMatchSelects = {
  resultStatus: readStatic('result-statuses')
};

const tournamentProgressSelects = {
  round: readStatic('tournament-rounds'),
  result: readStatic('tournament-results')
};

function audit(label, dropdownOptions, actualValues, entityName) {
  const actualSet = new Set(actualValues.filter(Boolean));
  const optionSet = new Set(dropdownOptions);

  const missingFromDropdown = [...actualSet].filter(v => !optionSet.has(v));
  const unusedOptions = [...optionSet].filter(v => !actualSet.has(v));

  if (missingFromDropdown.length || unusedOptions.length) {
    console.log(`\n❌ ${label} (${entityName})`);
    if (missingFromDropdown.length) console.log(`   In data but MISSING from dropdown: ${missingFromDropdown.map(v => JSON.stringify(v)).join(', ')}`);
    if (unusedOptions.length) console.log(`   In dropdown but UNUSED in data:    ${unusedOptions.map(v => JSON.stringify(v)).join(', ')}`);
  } else {
    console.log(`✅ ${label} (${entityName}) — all options match`);
  }
}

(async () => {
  const res = await fetch(API);
  const data = await res.json();

  console.log('=== Player Fields ===');
  for (const [field, options] of Object.entries(playerSelects)) {
    const values = data.players.map(p => p[field]);
    audit(field, options, values, 'player');
  }

  console.log('\n=== External Opponent Fields ===');
  for (const [field, options] of Object.entries(playerSelects)) {
    if (field === 'status') continue;
    const values = data.externalOpponents.map(p => p[field]);
    audit(field, options, values, 'externalOpponent');
  }

  console.log('\n=== Tournament Match Fields ===');
  for (const [field, options] of Object.entries(tournamentMatchSelects)) {
    const values = data.tournamentMatches.map(m => m[field]);
    audit(field, options, values, 'tournamentMatch');
  }

  console.log('\n=== Tournament Progress Fields ===');
  for (const [field, options] of Object.entries(tournamentProgressSelects)) {
    const values = data.tournamentProgress.map(p => p[field]);
    audit(field, options, values, 'tournamentProgress');
  }

  // Grade values
  console.log('\n=== Grade values in data ===');
  const grades = {};
  data.players.forEach(p => { const g = p.grade || '(empty)'; grades[g] = (grades[g] || 0) + 1; });
  Object.entries(grades).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${v}x  ${k}`));
})();
