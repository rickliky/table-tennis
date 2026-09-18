#!/usr/bin/env node
/**
 * build-static-data.js — Generate static-data.js from static/*.json lookup files.
 *
 * Run: node scripts/build-static-data.js
 * Output: static-data.js (loaded as <script> tag by admin.html)
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const staticDir = path.join(root, 'static');
const outFile = path.join(root, 'static-data.js');

const files = {
  playingStyles: 'playing-styles.json',
  grips: 'grips.json',
  playingHands: 'playing-hands.json',
  rubberTypes: 'rubber-types.json',
  schoolLevels: 'school-levels.json',
  genders: 'genders.json',
  statuses: 'statuses.json',
  tournamentRounds: 'tournament-rounds.json',
  tournamentResults: 'tournament-results.json',
  resultStatuses: 'result-statuses.json',
  grades: 'grades.json'
};

const data = {};
for (const [key, file] of Object.entries(files)) {
  const filePath = path.join(staticDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${file}`);
    process.exit(1);
  }
  data[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const js = `window.LK_STATIC = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(outFile, js, 'utf8');
console.log(`Generated ${outFile} (${(js.length / 1024).toFixed(1)} KB)`);
