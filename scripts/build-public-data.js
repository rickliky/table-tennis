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

const publicData = {
  ok: true,
  club: read('club.json'),
  players,
  matches,
  lastUpdated: metadata.lastUpdated
};

fs.writeFileSync(path.join(root, 'public-data.json'), `${JSON.stringify(publicData)}\n`);
fs.writeFileSync(path.join(root, 'admin-players.json'), `${JSON.stringify(allPlayers)}\n`);
fs.writeFileSync(path.join(root, 'admin-training-matches.json'), `${JSON.stringify(read('training-matches.json'))}\n`);
