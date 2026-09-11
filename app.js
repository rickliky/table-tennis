const API_URL = 'https://script.google.com/macros/s/AKfycbx6IaN9YT2a4bv_8W76qtNwkFCjZ_-mODBEMTK9IiJlSi91UCIgJ56MQ4WJqeKK3TiUvA/exec?action=publicData';
Chart.register({ id: 'valueLabels', afterDatasetsDraw(chart) { const { ctx } = chart, isWinRate = chart.canvas.id === 'wins-chart'; ctx.save(); ctx.fillStyle = isWinRate ? '#090a0b' : '#f6f0e2'; ctx.font = '700 11px Barlow Condensed'; ctx.textAlign = 'center'; chart.data.datasets.forEach((dataset, datasetIndex) => chart.getDatasetMeta(datasetIndex).data.forEach((element, index) => { const value = dataset.data[index]; if (value === null || value === undefined) return; const point = element.tooltipPosition(); const isBar = chart.getDatasetMeta(datasetIndex).type === 'bar'; const label = isWinRate ? `${value}%` : Math.abs(value); ctx.fillText(label, point.x, isWinRate ? (element.y + element.base) / 2 + 4 : isBar ? (value < 0 ? point.y + 13 : point.y - 7) : point.y - 8); })); ctx.restore(); } });
let data = { players: [], matches: [] }, selectedMonth = 'all', selectedYear = 'all', selectedSummaryYear = '', selectedSession = '', calendarMonth = '', recentStart = 0, charts = [];
let language = localStorage.getItem('lk-language') || 'ja';
const words = {
  en: { navPlayers:'Players',navMatches:'Matches',navStats:'Statistics',navSessions:'Sessions',eyebrow:'CLUB TRAINING MATCH GAME LOG',heroDescription:'Every point. Every player. One club.',viewResults:'View match results',matchesPlayed:'Matches played',activePlayers:'Active players',latestResult:'Latest result',winsLeader:'Wins leader',sectionStatsKicker:'THE NUMBERS',sectionStats:'Club Training Statistics',rankingTitle:'Win Rankings',minimumMatches:'Min. 3 matches',sectionMatchesKicker:'CLUB TRAINING GAME LOG',sectionMatches:'Training Match Results',sectionPlayersKicker:'THE SQUAD',sectionPlayers:'Players',sessionKicker:'TRAINING LOG',sessionTitle:'Session Replay',allResults:'All results',training:'Training',tournament:'Tournament',incomplete:'Incomplete',trainingYear:'Training year',trainingMonth:'Training month',winsChart:'Win Rate Leaders',formatChart:'Score Breakdown',groupKicker:'SQUAD BREAKDOWN',groupTitle:'Group Statistics',categoryStats:'Player Category',genderStats:'Gender',threeMonthKicker:'RECENT FORM',threeMonthTitle:'Monthly Leaderboard',monthLeader:'Month leader',yearLeader:'Year leader',gamesPlayed:'games played',participated:'participated',unassigned:'Unassigned',loading:'Loading live data...',updating:'Live data',lastUpdated:'Last updated',officialSite:'Official club website',matches:'matches',players:'players',noSessions:'No training sessions found' },
  ja: { navPlayers:'選手',navMatches:'試合結果',navStats:'スタッツ',navSessions:'練習日',eyebrow:'クラブ練習試合ゲームログ',heroDescription:'すべてのポイント。すべての選手。ひとつのクラブ。',viewResults:'試合結果を見る',matchesPlayed:'試合数',activePlayers:'登録選手',latestResult:'最新試合日',winsLeader:'最多勝',sectionStatsKicker:'数字で見る',sectionStats:'クラブ練習スタッツ',rankingTitle:'勝利ランキング',minimumMatches:'最低3試合',sectionMatchesKicker:'クラブ練習ゲームログ',sectionMatches:'練習試合結果',sectionPlayersKicker:'選手紹介',sectionPlayers:'選手',sessionKicker:'練習ログ',sessionTitle:'練習日リプレイ',allResults:'すべて',training:'クラブ練習',tournament:'大会',incomplete:'未完了',trainingYear:'練習年',trainingMonth:'練習月',winsChart:'勝率ランキング',formatChart:'スコア内訳',groupKicker:'グループ別',groupTitle:'グループスタッツ',categoryStats:'区分別',genderStats:'性別',threeMonthKicker:'直近の成績',threeMonthTitle:'月間リーダーボード',monthLeader:'月間リーダー',yearLeader:'年間リーダー',gamesPlayed:'試合',participated:'参加',unassigned:'未設定',loading:'データを読み込んでいます...',updating:'ライブデータ',lastUpdated:'最終更新',officialSite:'公式クラブサイト',matches:'試合',players:'選手',noSessions:'練習記録がありません' }
};
const t = key => words[language][key];
const nameFor = player => player.displayName;
const playerLink = player => `<a class="player-link" href="player.html?id=${player.playerId}">${nameFor(player)}</a>`;
const isComplete = match => Number(match.player1Sets) >= 3 || Number(match.player2Sets) >= 3;
const eligibility = (matches, playerId) => { const completed = matches.filter(isComplete), dates = [...new Set(completed.map(match => match.matchDate))].sort(), periodStart = dates[0]; const playedBeforePeriod = playerId && data.matches.some(match => isComplete(match) && eventType(match) === 'training' && match.matchDate < periodStart && (match.player1Id === playerId || match.player2Id === playerId)); const firstDate = playedBeforePeriod ? periodStart : playerId && completed.filter(match => match.player1Id === playerId || match.player2Id === playerId).map(match => match.matchDate).sort()[0]; const gameDays = firstDate ? dates.filter(date => date >= firstDate).length : dates.length, minimum = gameDays * 2; return { minimum, gameDays, text: language === 'en' ? 'Eligibility: 2 matches per match day, starting on the period’s first day for returning players.' : '対象: 継続参加選手は期間初日から、初参加選手は初出場日から試合日ごとに2試合。' }; };
const minimumText = minimum => language === 'en' ? `min. ${minimum}` : `最低${minimum}試合`;
const categoryOrder = ['小学生', '中学生', '高校生', '一般'];
const sortCategories = entries => entries.sort(([left], [right]) => { const index = category => category === t('unassigned') || category === 'Unassigned' ? 98 : categoryOrder.includes(category) ? categoryOrder.indexOf(category) : 97; return index(left) - index(right) || left.localeCompare(right, 'ja'); });
const categoryLeaders = () => language === 'en' ? 'Category leaders' : 'カテゴリ首位';
const phrase = key => ({ matchDays: language === 'en' ? 'match days' : '試合日', yearKicker: language === 'en' ? 'YEAR IN REVIEW' : '年間成績', yearTitle: language === 'en' ? 'Yearly Leaderboard' : '年間リーダーボード', selectYear: language === 'en' ? 'Select year' : '年を選択', trainingLog: language === 'en' ? 'CLUB TRAINING MATCH GAME LOG' : 'クラブ練習試合ゲームログ', matchDayVolume: language === 'en' ? 'Match-Day Volume' : '試合日別試合数', menu: language === 'en' ? 'MENU' : 'メニュー', h2h: language === 'en' ? 'HEAD TO HEAD' : '直接対決', h2hTimeline: language === 'en' ? 'Newest to oldest · Win / Draw / Loss timeline' : '新しい順 · 勝ち / 引分 / 負け タイムライン', win: language === 'en' ? 'WIN' : '勝ち', loss: language === 'en' ? 'LOSS' : '負け', draw: language === 'en' ? 'DRAW' : '引分' })[key];
const eventType = match => /club|training|練習/i.test(`${match.event} ${match.division}`) ? 'training' : 'tournament';
const visibleMatches = () => data.matches.filter(match => eventType(match) === 'training' && (selectedYear === 'all' || match.matchDate.startsWith(selectedYear)) && (selectedMonth === 'all' || match.matchDate.startsWith(selectedMonth)));
const playerMap = () => new Map(data.players.map(player => [player.playerId, player]));

function playerStats(matches = visibleMatches()) {
  const stats = new Map(data.players.map(player => [player.playerId, { wins: 0, losses: 0, setsFor: 0, setsAgainst: 0 }]));
  matches.filter(isComplete).forEach(match => {
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
  return `<button class="match-card" data-match-id="${match.matchId}"><div class="match-meta"><span>${match.matchDate}</span><span class="badge ${eventType(match)}">${t(eventType(match))}</span></div><div class="match-score"><span class="match-player ${match.winnerId === match.player1Id ? 'winner' : ''}">${nameFor(first)}</span><strong class="score">${match.player1Sets} <i>:</i> ${match.player2Sets}</strong><span class="match-player ${match.winnerId === match.player2Id ? 'winner' : ''}">${nameFor(second)}</span></div><div class="match-context"><span>${match.event || 'Little Kings'}</span><b>${!isComplete(match) ? t('incomplete') : `${match.format || 'Singles'} · ${match.resultStatus || 'Recorded'}`}</b></div></button>`;
}

function renderCharts(ranked) {
  charts.forEach(chart => chart.destroy());
  const allTimeEligibility = eligibility(visibleMatches());
  const eligible = ranked.filter(entry => entry.stats.wins + entry.stats.losses >= eligibility(visibleMatches(), entry.player.playerId).minimum);
  document.querySelector('#wins-eligibility').textContent = allTimeEligibility.text;
  charts = [
    new Chart(document.querySelector('#wins-chart'), { type: 'bar', data: { labels: eligible.slice(0, 6).map(entry => [nameFor(entry.player), `${entry.stats.wins + entry.stats.losses}G · ${entry.stats.wins}W-${entry.stats.losses}L`]), datasets: [{ data: eligible.slice(0, 6).map(entry => Math.round(entry.stats.wins / (entry.stats.wins + entry.stats.losses) * 100)), backgroundColor: '#d6a516', borderRadius: 3 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.raw}% win rate` } } }, scales: { x: { ticks: { color: '#f6f0e2' }, grid: { display: false } }, y: { max: 100, ticks: { color: '#a5a198', callback: value => `${value}%` }, grid: { color: 'rgba(246,240,226,.1)' } } } } })
  ];
}

function renderSession() {
  const dates = [...new Set(data.matches.filter(match => eventType(match) === 'training').map(match => match.matchDate))].sort().reverse();
  if (!dates.length) { document.querySelector('#session-summary').textContent = t('noSessions'); return; }
  if (!dates.includes(selectedSession)) selectedSession = dates[0];
  if (!calendarMonth) calendarMonth = selectedSession.slice(0, 7);
  renderCalendar(dates);
  const counts = dates.map(date => data.matches.filter(match => match.matchDate === date && eventType(match) === 'training').length).reverse();
  charts.push(new Chart(document.querySelector('#session-timeline-chart'), { type: 'line', data: { labels: [...dates].reverse(), datasets: [{ label: t('matches'), data: counts, borderColor: '#d6a516', backgroundColor: 'rgba(214,165,22,.2)', fill: true, tension: .25, pointBackgroundColor: '#f6f0e2' }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#a5a198', maxRotation: 45 }, grid: { display: false } }, y: { ticks: { color: '#a5a198', stepSize: 1 }, grid: { color: 'rgba(246,240,226,.1)' } } } } }));
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
  const summarySelect = document.querySelector('#yearly-select');
  if (!selectedSummaryYear || !years.includes(selectedSummaryYear)) selectedSummaryYear = years[0] || '';
  summarySelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
  summarySelect.value = selectedSummaryYear;
}

function renderPlayers(ranked) {
  const query = document.querySelector('#player-search').value.toLowerCase();
  const groups = new Map();
  ranked.filter(entry => entry.stats.wins + entry.stats.losses > 0 && nameFor(entry.player).toLowerCase().includes(query)).forEach(entry => { const category = entry.player.schoolLevel || t('unassigned'); if (!groups.has(category)) groups.set(category, []); groups.get(category).push(entry); });
  document.querySelector('#player-grid').innerHTML = sortCategories([...groups.entries()]).map(([category, entries]) => `<section class="player-category"><h3>${category}</h3><div class="player-grid">${entries.map(({ player, stats }) => {
    const total = stats.wins + stats.losses;
    return `<a class="player-card" href="player.html?id=${player.playerId}"><span class="player-id">${player.playerId}</span><h3 class="player-name">${nameFor(player)}</h3><div class="player-detail">${[player.playingHand, player.playingStyle].filter(Boolean).join(' · ') || 'LITTLE KINGS'}</div><div class="player-record">${stats.wins}W - ${stats.losses}L <small>${total ? Math.round(stats.wins / total * 100) : 0}%</small></div><div class="record-bar"><i style="width:${stats.wins / total * 100}%"></i><b style="width:${stats.losses / total * 100}%"></b></div></a>`;
  }).join('')}</div></section>`).join('');
}

function renderGroupStats(matches) {
  const playerById = playerMap();
  const renderGroup = (field, target) => {
    const groups = new Map();
    data.players.forEach(player => groups.set(player[field] || t('unassigned'), { players: 0, wins: 0, games: 0 }));
    data.players.forEach(player => groups.get(player[field] || t('unassigned')).players++);
    matches.filter(isComplete).forEach(match => [match.player1Id, match.player2Id].forEach(id => { const player = playerById.get(id); if (!player) return; const group = groups.get(player[field] || t('unassigned')); group.games++; if (match.winnerId === id) group.wins++; }));
    const entries = field === 'schoolLevel' ? sortCategories([...groups.entries()]) : [...groups.entries()].sort((a, b) => b[1].games - a[1].games);
    const totalGames = entries.reduce((total, [, value]) => total + value.games, 0);
    document.querySelector(target).innerHTML = entries.map(([label, value]) => `<div class="group-row"><strong>${label}</strong><span>${value.players} ${t('players')}</span><span>${totalGames ? Math.round(value.games / totalGames * 100) : 0}%</span></div>`).join('');
  };
  renderGroup('schoolLevel', '#category-stats');
  renderGroup('gender', '#gender-stats');
}

function renderThreeMonthSummary() {
  const allMonths = [...new Set(data.matches.filter(match => eventType(match) === 'training').map(match => match.matchDate.slice(0, 7)))].sort().reverse();
  recentStart = Math.min(recentStart, Math.max(0, allMonths.length - 3));
  const months = allMonths.slice(recentStart, recentStart + 3);
  document.querySelector('#recent-prev').disabled = recentStart >= allMonths.length - 3;
  document.querySelector('#recent-next').disabled = recentStart === 0;
  const report = months.map(month => {
    const matches = data.matches.filter(match => eventType(match) === 'training' && match.matchDate.startsWith(month));
    const participants = new Set(matches.flatMap(match => [match.player1Id, match.player2Id]));
    const periodEligibility = eligibility(matches), rankings = rankPlayers(matches).filter(entry => entry.stats.wins + entry.stats.losses >= eligibility(matches, entry.player.playerId).minimum);
    const groups = new Map();
    rankings.forEach(entry => { const category = entry.player.schoolLevel || t('unassigned'); if (!groups.has(category)) groups.set(category, []); groups.get(category).push(entry); });
    const categories = sortCategories([...groups.entries()]);
    const leaders = categories.map(([category, entries]) => `<section class="category-podium"><h4>${category}</h4>${entries.slice(0, 3).map((entry, index) => { const games = entry.stats.wins + entry.stats.losses, minimum = eligibility(matches, entry.player.playerId).minimum; return `<div><i>${index + 1}</i><b>${playerLink(entry.player)}</b><span>${Math.round(entry.stats.wins / games * 100)}% · ${games}G (${minimumText(minimum)}) · ${entry.stats.wins}W-${entry.stats.losses}L</span><aside class="record-bar"><i style="width:${entry.stats.wins / games * 100}%"></i><b style="width:${entry.stats.losses / games * 100}%"></b></aside></div>`; }).join('')}</section>`).join('');
    const champions = categories.map(([category, entries]) => { const entry = entries[0], games = entry.stats.wins + entry.stats.losses; return `<div><span>${category}</span><b>${playerLink(entry.player)}</b><small>${Math.round(entry.stats.wins / games * 100)}% · ${games}G · ${entry.stats.wins}W-${entry.stats.losses}L</small></div>`; }).join('');
    return { month, matches, participants, leaders, champions, eligibility: periodEligibility };
  });
  document.querySelector('#three-month-summary').innerHTML = `<div class="three-month-cards">${report.map(item => `<article><header><p>${item.month}</p><strong>${item.matches.length}<small>${t('matches')}</small></strong><span>${item.eligibility.gameDays} ${phrase('matchDays')} · ${item.participants.size} ${t('players')} ${t('participated')}</span><small class="eligibility">${item.eligibility.text}</small></header><div class="champion-strip"><b>${categoryLeaders()}</b>${item.champions}</div><div class="podiums">${item.leaders}</div></article>`).join('')}</div>`;
}

function renderYearlySummary() {
  const matches = data.matches.filter(match => eventType(match) === 'training' && match.matchDate.startsWith(selectedSummaryYear));
  const participants = new Set(matches.flatMap(match => [match.player1Id, match.player2Id]));
  const periodEligibility = eligibility(matches), rankings = rankPlayers(matches).filter(entry => entry.stats.wins + entry.stats.losses >= eligibility(matches, entry.player.playerId).minimum);
  const categories = new Map();
  rankings.forEach(entry => { const category = entry.player.schoolLevel || t('unassigned'); if (!categories.has(category)) categories.set(category, []); categories.get(category).push(entry); });
  const categoryEntries = sortCategories([...categories.entries()]);
  const podiums = categoryEntries.map(([category, entries]) => `<section class="category-podium"><h4>${category}</h4>${entries.slice(0, 3).map((entry, index) => { const games = entry.stats.wins + entry.stats.losses, minimum = eligibility(matches, entry.player.playerId).minimum; return `<div><i>${index + 1}</i><b>${playerLink(entry.player)}</b><span>${Math.round(entry.stats.wins / games * 100)}% · ${games}G (${minimumText(minimum)}) · ${entry.stats.wins}W-${entry.stats.losses}L</span><aside class="record-bar"><i style="width:${entry.stats.wins / games * 100}%"></i><b style="width:${entry.stats.losses / games * 100}%"></b></aside></div>`; }).join('')}</section>`).join('');
  const champions = categoryEntries.map(([category, entries]) => { const entry = entries[0], games = entry.stats.wins + entry.stats.losses; return `<div><span>${category}</span><b>${playerLink(entry.player)}</b><small>${Math.round(entry.stats.wins / games * 100)}% · ${games}G · ${entry.stats.wins}W-${entry.stats.losses}L</small></div>`; }).join('');
  document.querySelector('#yearly-summary').innerHTML = `<article><header><p>${selectedSummaryYear || '-'}</p><strong>${matches.length}<small>${t('matches')}</small></strong><span>${periodEligibility.gameDays} ${phrase('matchDays')} · ${participants.size} ${t('players')} ${t('participated')}</span><small class="eligibility">${periodEligibility.text}</small></header><div class="champion-strip"><b>${categoryLeaders()}</b>${champions}</div><div class="podiums">${podiums}</div></article>`;
}

function openHeadToHead(matchId) {
  const match = data.matches.find(item => item.matchId === matchId); if (!match) return;
  const map = playerMap(), first = map.get(match.player1Id), second = map.get(match.player2Id);
  const history = data.matches.filter(item => (item.player1Id === match.player1Id && item.player2Id === match.player2Id) || (item.player1Id === match.player2Id && item.player2Id === match.player1Id)).sort((a,b) => b.matchDate.localeCompare(a.matchDate));
  const firstWins = history.filter(item => item.winnerId === match.player1Id).length;
  const outcomes = history.map(item => item.winnerId === match.player1Id ? 1 : item.winnerId === match.player2Id ? -1 : 0);
  document.querySelector('#head-to-head-content').innerHTML = `<p class="eyebrow">${phrase('h2h')}</p><h2>${nameFor(first)} <em>${firstWins} - ${history.filter(item => item.winnerId === match.player2Id).length}</em> ${nameFor(second)}</h2><p class="h2h-meta">${phrase('h2hTimeline')}</p><div class="h2h-chart"><canvas id="h2h-chart"></canvas></div><div class="h2h-history">${history.map(item => `<div><span>${item.matchDate}</span><strong>${item.player1Name} ${item.player1Sets}-${item.player2Sets} ${item.player2Name}</strong></div>`).join('')}</div>`;
  new Chart(document.querySelector('#h2h-chart'), { type: 'bar', data: { labels: history.map(item => item.matchDate), datasets: [{ label: nameFor(first), data: outcomes, backgroundColor: outcomes.map(value => value > 0 ? '#d6a516' : value < 0 ? '#8c423a' : '#6e6a62'), borderRadius: 3 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#a5a198' }, grid: { display: false } }, y: { min: -1, max: 1, ticks: { color: '#a5a198', stepSize: 1, callback: value => value === 1 ? phrase('win') : value === -1 ? phrase('loss') : phrase('draw') }, grid: { color: 'rgba(246,240,226,.1)' } } } } });
  document.querySelector('#head-to-head').showModal();
}

function render() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelector('#language-toggle').textContent = language === 'en' ? '日本語' : 'ENGLISH';
  document.querySelector('#yearly-kicker').textContent = phrase('yearKicker'); document.querySelector('#yearly-title').textContent = phrase('yearTitle'); document.querySelector('#yearly-select-label').textContent = phrase('selectYear'); document.querySelector('#training-label').textContent = phrase('trainingLog'); document.querySelector('#session-timeline-title').textContent = phrase('matchDayVolume'); document.querySelector('#menu-toggle').textContent = phrase('menu');
  document.querySelector('#player-search').placeholder = language === 'en' ? 'Search players' : '選手を検索';
  setupMonths();
  const matches = visibleMatches(), ranked = rankPlayers(matches), dates = matches.map(match => match.matchDate).filter(Boolean).sort();
  document.querySelector('#match-count').textContent = matches.length;
  document.querySelector('#player-count').textContent = data.players.length;
  document.querySelector('#latest-date').textContent = dates.at(-1) || '-';
  document.querySelector('#win-leader').textContent = ranked[0] ? nameFor(ranked[0].player) : '-';
  renderPlayers(ranked); renderCharts(ranked); renderGroupStats(matches); renderThreeMonthSummary(); renderYearlySummary(); renderSession();
  document.querySelector('#last-updated').textContent = `${t('lastUpdated')}: ${new Date(data.lastUpdated).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-GB')}`;
}

document.querySelector('#language-toggle').onclick = () => { language = language === 'en' ? 'ja' : 'en'; localStorage.setItem('lk-language', language); render(); };
document.querySelector('#menu-toggle').onclick = event => { const menu = document.querySelector('nav'); const open = menu.classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', open); };
document.querySelector('nav').onclick = event => { if (event.target.matches('a')) { document.querySelector('nav').classList.remove('open'); document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false'); } };
document.querySelector('#player-search').oninput = () => renderPlayers(rankPlayers());
document.querySelector('#month-select').onchange = event => { selectedMonth = event.target.value; render(); };
document.querySelector('#year-select').onchange = event => { selectedYear = event.target.value; render(); };
document.querySelector('#yearly-select').onchange = event => { selectedSummaryYear = event.target.value; renderYearlySummary(); };
document.querySelector('#recent-prev').onclick = () => { recentStart++; renderThreeMonthSummary(); };
document.querySelector('#recent-next').onclick = () => { recentStart--; renderThreeMonthSummary(); };
document.addEventListener('click', event => { const card = event.target.closest('.match-card'); if (card?.dataset.matchId) openHeadToHead(card.dataset.matchId); if (event.target.closest('.modal-close')) document.querySelector('#head-to-head').close(); });
fetch('./public-data.json').then(response => { if (!response.ok) throw new Error(); return response.json(); }).catch(() => fetch(API_URL).then(response => response.json())).then(result => { if (!result.ok) throw new Error(); data = result; render(); }).catch(() => document.querySelectorAll('.loading').forEach(element => { element.textContent = 'Unable to load live data.'; }));
