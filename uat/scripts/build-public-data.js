const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const metadata = read('metadata.json');
const allPlayers = read('players.json');
const players = allPlayers.filter(player => player.status === 'Active');
const matches = [
  ...read('training-matches.json'),
  ...read('tournament-matches.json')
];

const allClubs = read('club.json');
const publicData = {
  ok: true,
  club: Array.isArray(allClubs) ? allClubs[0] : allClubs,
  clubs: Array.isArray(allClubs) ? allClubs : [allClubs],
  players,
  matches,
  externalOpponents: read('external-opponents.json'),
  tournaments: read('tournaments.json'),
  tournamentMatches: read('tournament-matches.json'),
  tournamentProgress: read('tournament-progress.json'),
  rubbers: read('rubbers.json'),
  lastUpdated: metadata.lastUpdated
};

fs.writeFileSync(path.join(root, 'public-data.json'), `${JSON.stringify(publicData)}\n`);
fs.writeFileSync(path.join(root, 'admin-players.json'), `${JSON.stringify(allPlayers)}\n`);
fs.writeFileSync(path.join(root, 'admin-training-matches.json'), `${JSON.stringify(read('training-matches.json'))}\n`);

// Generate rubbers.js from data/rubbers.json
const allRubbers = read('rubbers.json');
const byType = {};
allRubbers.forEach(r => {
  if (!byType[r.type]) byType[r.type] = [];
  byType[r.type].push({ rubberId: r.rubberId, name: r.name, brand: r.brand });
});
const nameToId = {};
allRubbers.forEach(r => { nameToId[r.name] = r.rubberId; });
const rubbersJs = `window.RUBBER_DB=${JSON.stringify(byType)};\nwindow.RUBBER_NAME_TO_ID=${JSON.stringify(nameToId)};\nwindow.RUBBERS=${JSON.stringify(allRubbers)};\n`;
fs.writeFileSync(path.join(root, 'rubbers.js'), rubbersJs, 'utf8');
