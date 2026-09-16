/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sources = {
  players: read('data/players.json'),
  matches: read('data/training-matches.json'),
  clubs: [read('data/club.json')],
  externalOpponents: read('data/external-opponents.json'),
  tournaments: read('data/tournaments.json'),
  tournamentMatches: read('data/tournament-matches.json')
};

const sourceValue = value => Array.isArray(value) ? value : value?.entries || [];
const club = { clubId: 'CLUB-0001', ...sources.clubs[0], prefectureId: sources.clubs[0].prefectureId || '14', status: sources.clubs[0].status || 'Active' };
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  clubs: [club],
  players: sourceValue(sources.players).map(player => ({ ...player, clubId: player.clubId || club.clubId })),
  matches: sourceValue(sources.matches),
  externalOpponents: sourceValue(sources.externalOpponents),
  tournaments: sourceValue(sources.tournaments),
  tournamentMatches: sourceValue(sources.tournamentMatches)
};

const unmapped = [];
const lookup = { gender: new Set(['Male', 'Female', 'Other']), schoolLevel: new Set(['小学生', '中学生', '高校生', '一般', '未設定']), playingHand: new Set(['右', '左']), status: new Set(['Active', 'Inactive']) };
output.players.forEach(player => Object.entries(lookup).forEach(([field, values]) => { if (player[field] && !values.has(player[field])) unmapped.push(`${player.playerId}.${field}=${player[field]}`); }));
if (unmapped.length) { console.error('Unmapped values:\n' + unmapped.join('\n')); process.exitCode = 1; }
const outFile = path.join(root, 'migration.json');
fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Migration data written to ${outFile}`);
