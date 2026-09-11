const API_URL = 'https://script.google.com/macros/s/AKfycbx6IaN9YT2a4bv_8W76qtNwkFCjZ_-mODBEMTK9IiJlSi91UCIgJ56MQ4WJqeKK3TiUvA/exec?action=publicData';
let data = { players: [], matches: [] }, mode = 'all', selectedMonth = 'all', selectedYear = 'all', selectedSession = '', calendarMonth = '', charts = [];
let language = localStorage.getItem('lk-language') || 'en';
const words = {
  en: { navPlayers:'Players',navMatches:'Matches',navStats:'Statistics',navSessions:'Sessions',eyebrow:'OFFICIAL CLUB DATABASE',heroDescription:'Every point. Every player. One club.',viewResults:'View match results',matchesPlayed:'Matches played',activePlayers:'Active players',latestResult:'Latest result',winsLeader:'Wins leader',sectionStatsKicker:'THE NUMBERS',sectionStats:'Club Statistics',rankingTitle:'Win Rankings',minimumMatches:'Min. 3 matches',sectionMatchesKicker:'LIVE ARCHIVE',sectionMatches:'Latest Results',sectionPlayersKicker:'THE SQUAD',sectionPlayers:'Players',sessionKicker:'TRAINING LOG',sessionTitle:'Session Replay',allResults:'All results',training:'Training',tournament:'Tournament',trainingYear:'Training year',trainingMonth:'Training month',winsChart:'Most Wins',formatChart:'Match Breakdown',groupKicker:'SQUAD BREAKDOWN',groupTitle:'Group Statistics',categoryStats:'Player Category',genderStats:'Gender',threeMonthKicker:'RECENT FORM',threeMonthTitle:'Last 3 Months',unassigned:'Unassigned',loading:'Loading live data...',updating:'Live data',lastUpdated:'Last updated',officialSite:'Official club website',matches:'matches',players:'players',noSessions:'No training sessions found' },
  ja: { navPlayers:'選手',navMatches:'試合結果',navStats:'スタッツ',navSessions:'練習日',eyebrow:'公式クラブデータベース',heroDescription:'すべてのポイント。すべての選手。ひとつのクラブ。',viewResults:'試合結果を見る',matchesPlayed:'試合数',activePlayers:'登録選手',latestResult:'最新試合日',winsLeader:'最多勝',sectionStatsKicker:'数字で見る',sectionStats:'クラブスタッツ',rankingTitle:'勝利ランキング',minimumMatches:'最低3試合',sectionMatchesKicker:'試合アーカイブ',sectionMatches:'最新練習・大会結果',sectionPlayersKicker:'選手紹介',sectionPlayers:'選手',sessionKicker:'練習ログ',sessionTitle:'練習日リプレイ',allResults:'すべて',training:'クラブ練習',tournament:'大会',trainingYear:'練習年',trainingMonth:'練習月',winsChart:'勝利数ランキング',formatChart:'試合内訳',groupKicker:'グループ別',groupTitle:'グループスタッツ',categoryStats:'区分別',genderStats:'性別',threeMonthKicker:'直近の成績',threeMonthTitle:'直近3か月',unassigned:'未設定',loading:'データを読み込んでいます...',updating:'ライブデータ',lastUpdated:'最終更新',officialSite:'公式クラブサイト',matches:'試合',players:'選手',noSessions:'練習記録がありません' }
};
const t = key => words[language][key];
const nameFor = player => language === 'en' && player.englishName ? player.englishName : player.displayName;
const eventType = match => /club|training|練習/i.test(`${match.event} ${match.division}`) ? 'training' : 'tournament';
const visibleMatches = () => { const base = mode === 'all' ? data.matches : data.matches.filter(match => eventType(match) === mode); return base.filter(match => (selectedYear === 'all' || match.matchDate.startsWith(selectedYear)) && (selectedMonth === 'all' || (eventType(match) === 'training' && match.matchDate.startsWith(selectedMonth)))); };
const playerMap = () => new Map(data.players.map(player => [player.playerId, player]));

function playerStats(matches = visibleMatches()) {
  const stats = new Map(data.players.map(player => [player.playerId, { wins: 0, losses: 0, setsFor: 0, setsAgainst: 0 }]));
  matches.forEach(match => {
    [[match.player1Id, match.player1Sets, match.player2Sets], [match.player2Id, match.player2Sets, match.player1Sets]].forEach(([id, won, lost]) => {
      const record = stats.get(id);
      if (!record) return;
      record.setsFor += won; record.setsAgainst += lost;
      if (match.winnerId === id) record.wins++; else record.losses++;
    });
  });
  return stats;
}

function rankPlayers(matches = visibleMatches()) {
  const stats = playerStats(matches);
  return data.players.map(player => ({ player, stats: stats.get(player.playerId) })).sort((a, b) => { const ap = a.stats.wins + a.stats.losses, bp = b.stats.wins + b.stats.losses; const ar = ap ? a.stats.wins / ap : 0, br = bp ? b.stats.wins / bp : 0; return br - ar || bp - ap || b.stats.wins - a.stats.wins; });
}

function matchCard(match, players) {
  const first = players.get(match.player1Id) || { displayName: match.player1Name };
  const second = players.get(match.player2Id) || { displayName: match.player2Name };
  return `<button class="match-card" data-match-id="${match.matchId}"><div class="match-meta"><span>${match.matchDate}</span><span class="badge ${eventType(match)}">${t(eventType(match))}</span></div><div class="match-score"><span class="match-player ${match.winnerId === match.player1Id ? 'winner' : ''}">${nameFor(first)}</span><strong class="score">${match.player1Sets} - ${match.player2Sets}</strong><span class="match-player ${match.winnerId === match.player2Id ? 'winner' : ''}">${nameFor(second)}</span></div></button>`;
}

function renderCharts(ranked) {
  charts.forEach(chart => chart.destroy());
  const training = data.matches.filter(match => eventType(match) === 'training').length;
  const tournament = data.matches.length - training;
  charts = [
    new Chart(document.querySelector('#wins-chart'), { type: 'bar', data: { labels: ranked.slice(0, 6).map(entry => nameFor(entry.player)), datasets: [{ data: ranked.slice(0, 6).map(entry => entry.stats.wins), backgroundColor: '#d6a516', borderRadius: 3 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#f6f0e2' }, grid: { display: false } }, y: { ticks: { color: '#a5a198', stepSize: 1 }, grid: { color: 'rgba(246,240,226,.1)' } } } } }),
    new Chart(document.querySelector('#format-chart'), { type: 'doughnut', data: { labels: [t('training'), t('tournament')], datasets: [{ data: [training, tournament], backgroundColor: ['#d6a516', '#68645c'], borderWidth: 0 }] }, options: { plugins: { legend: { labels: { color: '#f6f0e2' } } }, cutout: '68%' } })
  ];
}

function renderSession() {
  const dates = [...new Set(data.matches.filter(match => eventType(match) === 'training').map(match => match.matchDate))].sort().reverse();
  if (!dates.length) { document.querySelector('#session-summary').textContent = t('noSessions'); return; }
  if (!dates.includes(selectedSession)) selectedSession = dates[0];
  if (!calendarMonth) calendarMonth = selectedSession.slice(0, 7);
  renderCalendar(dates);
  showSession(selectedSession);
}

function renderCalendar(dates) {
  const [year, month] = calendarMonth.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const startDay = monthStart.getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: startDay }, () => '<span class="calendar-day blank"></span>');
  for (let day = 1; day <= days; day++) {
    const date = `${calendarMonth}-${String(day).padStart(2, '0')}`;
    const available = dates.includes(date);
    cells.push(`<button class="calendar-day ${available ? 'available' : ''} ${date === selectedSession ? 'selected' : ''}" ${available ? `data-date="${date}"` : 'disabled'}>${day}</button>`);
  }
  document.querySelector('#session-calendar').innerHTML = `<div class="calendar-head"><button data-direction="-1" aria-label="Previous month">‹</button><strong>${calendarMonth}</strong><button data-direction="1" aria-label="Next month">›</button></div><div class="calendar-week">${['S','M','T','W','T','F','S'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div>`;
  document.querySelector('#session-calendar').onclick = event => {
    const date = event.target.dataset.date;
    if (date) { selectedSession = date; calendarMonth = date.slice(0, 7); renderCalendar(dates); showSession(date); return; }
    const direction = Number(event.target.dataset.direction);
    if (direction) { const next = new Date(year, month - 1 + direction, 1); calendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`; renderCalendar(dates); }
  };
}

function showSession(date) {
  const matches = data.matches.filter(match => match.matchDate === date && eventType(match) === 'training');
  const participants = new Set(matches.flatMap(match => [match.player1Id, match.player2Id])).size;
  document.querySelector('#session-summary').innerHTML = `<strong>${date}</strong><span>${matches.length} ${t('matches')}</span><span>${participants} ${t('players')}</span>`;
  document.querySelector('#session-matches').innerHTML = matches.map(match => matchCard(match, playerMap())).join('');
}

function setupMonths() {
  const select = document.querySelector('#month-select');
  const months = [...new Set(data.matches.filter(match => eventType(match) === 'training').map(match => match.matchDate.slice(0, 7)))].sort().reverse();
  select.innerHTML = `<option value="all">${t('allResults')}</option>${months.map(month => `<option value="${month}">${month}</option>`).join('')}`;
  select.value = months.includes(selectedMonth) ? selectedMonth : 'all';
  const years = [...new Set(months.map(month => month.slice(0, 4)))];
  const yearSelect = document.querySelector('#year-select');
  yearSelect.innerHTML = `<option value="all">${t('allResults')}</option>${years.map(year => `<option value="${year}">${year}</option>`).join('')}`;
  yearSelect.value = years.includes(selectedYear) ? selectedYear : 'all';
}

function renderPlayers(ranked) {
  const query = document.querySelector('#player-search').value.toLowerCase();
  document.querySelector('#player-grid').innerHTML = ranked.filter(entry => entry.stats.wins + entry.stats.losses > 0 && nameFor(entry.player).toLowerCase().includes(query)).map(({ player, stats }) => {
    const total = stats.wins + stats.losses;
    return `<a class="player-card" href="player.html?id=${player.playerId}"><span class="player-id">${player.playerId}</span><h3 class="player-name">${nameFor(player)}</h3><div class="player-detail">${[player.playingHand, player.playingStyle].filter(Boolean).join(' · ') || 'LITTLE KINGS'}</div><div class="player-record">${stats.wins}W - ${stats.losses}L <small>${total ? Math.round(stats.wins / total * 100) : 0}%</small></div></a>`;
  }).join('');
}

function renderGroupStats(matches) {
  const playerById = playerMap();
  const renderGroup = (field, target) => {
    const groups = new Map();
    data.players.forEach(player => groups.set(player[field] || t('unassigned'), { players: 0, wins: 0, games: 0 }));
    data.players.forEach(player => groups.get(player[field] || t('unassigned')).players++);
    matches.forEach(match => [match.player1Id, match.player2Id].forEach(id => { const player = playerById.get(id); if (!player) return; const group = groups.get(player[field] || t('unassigned')); group.games++; if (match.winnerId === id) group.wins++; }));
    document.querySelector(target).innerHTML = [...groups.entries()].sort((a, b) => b[1].games - a[1].games).map(([label, value]) => `<div class="group-row"><strong>${label}</strong><span>${value.players} ${t('players')}</span><span>${value.games ? Math.round(value.wins / value.games * 100) : 0}%</span></div>`).join('');
  };
  renderGroup('schoolLevel', '#category-stats');
  renderGroup('gender', '#gender-stats');
}

function renderThreeMonthSummary() {
  const months = [...new Set(data.matches.map(match => match.matchDate.slice(0, 7)))].sort().slice(-3);
  const report = months.map(month => {
    const matches = data.matches.filter(match => match.matchDate.startsWith(month));
    const participants = new Set(matches.flatMap(match => [match.player1Id, match.player2Id]));
    const rankings = rankPlayers(matches).filter(entry => entry.stats.wins + entry.stats.losses);
    const groups = new Map();
    rankings.forEach(entry => { const category = entry.player.schoolLevel || t('unassigned'); if (!groups.has(category)) groups.set(category, []); groups.get(category).push(entry); });
    const leaders = [...groups.entries()].map(([category, entries]) => `<li><b>${category}</b><span>${entries.slice(0, 3).map(entry => `${nameFor(entry.player)} ${Math.round(entry.stats.wins / (entry.stats.wins + entry.stats.losses) * 100)}%`).join(' · ')}</span></li>`).join('');
    return { month, matches, participants, leader: rankings[0], leaders };
  });
  document.querySelector('#three-month-summary').innerHTML = `<div class="three-month-cards">${report.map(item => `<article><p>${item.month}</p><strong>${item.matches.length}</strong><span>${t('matches')} · ${item.participants.size} ${t('players')}</span><h3>${item.leader ? nameFor(item.leader.player) : '-'}</h3><small>${item.leader ? Math.round(item.leader.stats.wins / (item.leader.stats.wins + item.leader.stats.losses) * 100) : 0}% WIN RATE</small><ul>${item.leaders}</ul></article>`).join('')}</div><article class="three-month-chart"><canvas id="three-month-chart"></canvas></article>`;
  charts.push(new Chart(document.querySelector('#three-month-chart'), { type: 'bar', data: { labels: report.map(item => item.month), datasets: [{ label: t('matches'), data: report.map(item => item.matches.length), backgroundColor: '#d6a516', borderRadius: 4 }, { label: t('players'), data: report.map(item => item.participants.size), backgroundColor: '#6e6a62', borderRadius: 4 }] }, options: { plugins: { legend: { labels: { color: '#f6f0e2' } } }, scales: { x: { ticks: { color: '#f6f0e2' }, grid: { display: false } }, y: { ticks: { color: '#a5a198', stepSize: 1 }, grid: { color: 'rgba(246,240,226,.1)' } } } } }));
}

function openHeadToHead(matchId) {
  const match = data.matches.find(item => item.matchId === matchId); if (!match) return;
  const map = playerMap(), first = map.get(match.player1Id), second = map.get(match.player2Id);
  const history = data.matches.filter(item => (item.player1Id === match.player1Id && item.player2Id === match.player2Id) || (item.player1Id === match.player2Id && item.player2Id === match.player1Id)).sort((a,b) => a.matchDate.localeCompare(b.matchDate));
  const firstWins = history.filter(item => item.winnerId === match.player1Id).length;
  document.querySelector('#head-to-head-content').innerHTML = `<p class="eyebrow">HEAD TO HEAD</p><h2>${nameFor(first)} <em>${firstWins} - ${history.length - firstWins}</em> ${nameFor(second)}</h2><p class="h2h-meta">${history.length} historic matches · ${match.matchDate}</p><div class="h2h-chart"><canvas id="h2h-chart"></canvas></div><div class="h2h-history">${[...history].reverse().map(item => `<div><span>${item.matchDate}</span><strong>${item.player1Name} ${item.player1Sets}-${item.player2Sets} ${item.player2Name}</strong></div>`).join('')}</div>`;
  let running = 0; const trend = history.map(item => { running += item.winnerId === match.player1Id ? 1 : -1; return running; });
  new Chart(document.querySelector('#h2h-chart'), { type: 'line', data: { labels: history.map(item => item.matchDate), datasets: [{ label: `${nameFor(first)} lead`, data: trend, borderColor: '#d6a516', backgroundColor: 'rgba(214,165,22,.18)', fill: true, tension: .3, pointBackgroundColor: '#f6f0e2' }] }, options: { plugins: { legend: { labels: { color: '#f6f0e2' } } }, scales: { x: { ticks: { color: '#a5a198' }, grid: { display: false } }, y: { ticks: { color: '#a5a198', stepSize: 1 }, grid: { color: 'rgba(246,240,226,.1)' } } } } });
  document.querySelector('#head-to-head').showModal();
}

function render() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelector('#language-toggle').textContent = language === 'en' ? '日本語' : 'ENGLISH';
  document.querySelector('#player-search').placeholder = language === 'en' ? 'Search players' : '選手を検索';
  setupMonths();
  const matches = visibleMatches(), ranked = rankPlayers(matches), dates = matches.map(match => match.matchDate).filter(Boolean).sort();
  document.querySelector('#match-count').textContent = matches.length;
  document.querySelector('#player-count').textContent = data.players.length;
  document.querySelector('#latest-date').textContent = dates.at(-1) || '-';
  document.querySelector('#win-leader').textContent = ranked[0] ? nameFor(ranked[0].player) : '-';
  document.querySelector('#leaderboard').innerHTML = ranked.filter(entry => entry.stats.wins + entry.stats.losses >= 3).slice(0, 8).map(({ player, stats }, index) => `<div class="leader-row"><span class="rank">${String(index + 1).padStart(2, '0')}</span><strong class="leader-name">${nameFor(player)}</strong><span class="record">${stats.wins}W · ${stats.losses}L</span><span class="percentage">${Math.round(stats.wins / (stats.wins + stats.losses) * 100)}%</span></div>`).join('') || '<div class="loading">-</div>';
  renderPlayers(ranked); renderCharts(ranked); renderGroupStats(matches); renderThreeMonthSummary(); renderSession();
  document.querySelector('#last-updated').textContent = `${t('lastUpdated')}: ${new Date(data.lastUpdated).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-GB')}`;
}

document.querySelector('#language-toggle').onclick = () => { language = language === 'en' ? 'ja' : 'en'; localStorage.setItem('lk-language', language); render(); };
document.querySelector('#player-search').oninput = () => renderPlayers(rankPlayers());
document.querySelector('#mode-switch').onclick = event => { if (!event.target.dataset.mode) return; mode = event.target.dataset.mode; if (mode !== 'training') selectedMonth = 'all'; document.querySelectorAll('#mode-switch button').forEach(button => button.classList.toggle('active', button === event.target)); render(); };
document.querySelector('#month-select').onchange = event => { selectedMonth = event.target.value; if (selectedMonth !== 'all') mode = 'training'; document.querySelectorAll('#mode-switch button').forEach(button => button.classList.toggle('active', button.dataset.mode === mode)); render(); };
document.querySelector('#year-select').onchange = event => { selectedYear = event.target.value; if (selectedYear !== 'all') mode = 'training'; document.querySelectorAll('#mode-switch button').forEach(button => button.classList.toggle('active', button.dataset.mode === mode)); render(); };
document.addEventListener('click', event => { const card = event.target.closest('.match-card'); if (card?.dataset.matchId) openHeadToHead(card.dataset.matchId); if (event.target.closest('.modal-close')) document.querySelector('#head-to-head').close(); });
fetch('./public-data.json').then(response => { if (!response.ok) throw new Error(); return response.json(); }).catch(() => fetch(API_URL).then(response => response.json())).then(result => { if (!result.ok) throw new Error(); data = result; render(); }).catch(() => document.querySelectorAll('.loading').forEach(element => { element.textContent = 'Unable to load live data.'; }));
