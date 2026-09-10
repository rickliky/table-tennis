const DATA_URL = 'https://script.google.com/macros/s/AKfycbx6IaN9YT2a4bv_8W76qtNwkFCjZ_-mODBEMTK9IiJlSi91UCIgJ56MQ4WJqeKK3TiUvA/exec?action=publicData';
const playerId = new URLSearchParams(location.search).get('id');
const eventType = match => /club|training|練習/i.test(`${match.event} ${match.division}`) ? 'Training' : 'Tournament';
fetch(DATA_URL).then(response => response.json()).then(data => {
  const player = data.players.find(item => item.playerId === playerId);
  if (!player) throw new Error('Player not found');
  const matches = data.matches.filter(match => match.player1Id === playerId || match.player2Id === playerId).sort((a, b) => b.matchDate.localeCompare(a.matchDate));
  const won = matches.filter(match => match.winnerId === playerId).length;
  const lost = matches.length - won;
  const sets = matches.reduce((total, match) => total + (match.player1Id === playerId ? match.player1Sets - match.player2Sets : match.player2Sets - match.player1Sets), 0);
  document.title = `${player.displayName} | Little Kings`;
  document.querySelector('#profile-hero').innerHTML = `<div><p class="eyebrow">PLAYER PROFILE</p><span class="player-id">${player.playerId}</span><h1>${player.englishName || player.displayName}</h1><p class="hero-ja">${player.displayName}</p><p class="profile-details">${[player.playingHand, player.grip, player.playingStyle].filter(Boolean).join(' · ') || 'Little Kings Table Tennis Club'}</p></div><div class="profile-record"><strong>${won}<small>WINS</small></strong><strong>${lost}<small>LOSSES</small></strong><strong>${matches.length ? Math.round(won / matches.length * 100) : 0}%<small>WIN RATE</small></strong><strong>${sets > 0 ? '+' : ''}${sets}<small>SET DIFF.</small></strong></div>`;
  const months = [...new Set(matches.map(match => match.matchDate.slice(0, 7)))].sort();
  const wins = months.map(month => matches.filter(match => match.matchDate.startsWith(month) && match.winnerId === playerId).length);
  const losses = months.map(month => matches.filter(match => match.matchDate.startsWith(month) && match.winnerId !== playerId).length);
  new Chart(document.querySelector('#monthly-chart'), { type: 'bar', data: { labels: months, datasets: [{ label: 'Wins', data: wins, backgroundColor: '#d6a516' }, { label: 'Losses', data: losses, backgroundColor: '#5e5b55' }] }, options: { plugins: { legend: { labels: { color: '#f6f0e2' } } }, scales: { x: { stacked: true, ticks: { color: '#f6f0e2' }, grid: { display: false } }, y: { stacked: true, ticks: { color: '#a5a198', stepSize: 1 }, grid: { color: 'rgba(246,240,226,.1)' } } } } });
  new Chart(document.querySelector('#career-chart'), { type: 'doughnut', data: { labels: ['Wins', 'Losses'], datasets: [{ data: [won, lost], backgroundColor: ['#d6a516', '#5e5b55'], borderWidth: 0 }] }, options: { plugins: { legend: { labels: { color: '#f6f0e2' } } }, cutout: '68%' } });
  document.querySelector('#profile-matches').innerHTML = matches.map(match => { const opponent = match.player1Id === playerId ? match.player2Name : match.player1Name; const score = match.player1Id === playerId ? `${match.player1Sets} - ${match.player2Sets}` : `${match.player2Sets} - ${match.player1Sets}`; return `<article class="match-card"><div class="match-meta"><span>${match.matchDate}</span><span class="badge ${eventType(match).toLowerCase()}">${eventType(match)}</span></div><div class="match-score"><span class="match-player ${match.winnerId === playerId ? 'winner' : ''}">${player.displayName}</span><strong class="score">${score}</strong><span class="match-player">${opponent}</span></div></article>`; }).join('');
}).catch(() => { document.querySelector('#profile-hero').innerHTML = '<div class="loading">Unable to load this player profile.</div>'; });
