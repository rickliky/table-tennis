const API_URL = 'https://script.google.com/macros/s/AKfycbx6IaN9YT2a4bv_8W76qtNwkFCjZ_-mODBEMTK9IiJlSi91UCIgJ56MQ4WJqeKK3TiUvA/exec?action=publicData';
Chart.defaults.layout.padding = { top: 18, right: 8, bottom: 0, left: 0 };
Chart.register({ id: 'valueLabels', afterDatasetsDraw(chart) { const { ctx } = chart, isWinRate = chart.canvas.id === 'wins-chart'; if (chart.canvas.id === 'session-timeline-chart' && chart.width < 700) return; ctx.save(); ctx.fillStyle = isWinRate ? '#090a0b' : '#f6f0e2'; ctx.font = '700 11px Barlow Condensed'; ctx.textAlign = 'center'; chart.data.datasets.forEach((dataset, datasetIndex) => chart.getDatasetMeta(datasetIndex).data.forEach((element, index) => { const value = dataset.data[index]; if (value === null || value === undefined) return; const point = element.tooltipPosition(), isBar = chart.getDatasetMeta(datasetIndex).type === 'bar', horizontalBar = isBar && chart.options.indexAxis === 'y', label = isWinRate ? `${value}%` : Math.abs(value); ctx.fillText(label, horizontalBar ? (element.x + element.base) / 2 : point.x, isBar ? (horizontalBar ? point.y + 4 : (element.y + element.base) / 2 + 4) : point.y - 8); })); ctx.restore(); } });
let data = { players: [], matches: [] }, selectedMonth = 'all', selectedYear = 'all', selectedSession = '', calendarMonth = '', recentStart = 0, charts = [];
let language = localStorage.getItem('lk-language') || 'ja';
const words = {
  en: { navPlayers:'Players',navMatches:'Matches',navStats:'Statistics',navSessions:'Sessions',eyebrow:'CLUB TRAINING MATCH GAME LOG',heroDescription:'Every point. Every player. One club.',viewResults:'View match results',matchesPlayed:'Matches played',activePlayers:'Active players',latestResult:'Latest result',winsLeader:'Wins leader',sectionStatsKicker:'THE NUMBERS',sectionStats:'Club Training Statistics',rankingTitle:'Win Rankings',minimumMatches:'Min. 3 matches',sectionMatchesKicker:'CLUB TRAINING GAME LOG',sectionMatches:'Training Match Results',sectionPlayersKicker:'THE SQUAD',sectionPlayers:'Players',sessionKicker:'TRAINING LOG',sessionTitle:'Session Replay',allResults:'All results',training:'Training',tournament:'Tournament',incomplete:'Incomplete',trainingYear:'Training year',trainingMonth:'Training month',winsChart:'Win Rate Leaders',formatChart:'Score Breakdown',groupKicker:'SQUAD BREAKDOWN',groupTitle:'Group Statistics',categoryStats:'Player Category',genderStats:'Gender',threeMonthKicker:'RECENT FORM',threeMonthTitle:'Monthly Leaderboard',monthLeader:'Month leader',yearLeader:'Year leader',gamesPlayed:'games played',participated:'participated',unassigned:'Unassigned',loading:'Loading live data...',updating:'Live data',lastUpdated:'Last updated',officialSite:'Official club website',matches:'matches',players:'players',noSessions:'No training sessions found' },
  ja: { navPlayers:'選手',navMatches:'試合結果',navStats:'スタッツ',navSessions:'練習日',eyebrow:'クラブ練習試合ゲームログ',heroDescription:'すべてのポイント。すべての選手。ひとつのクラブ。',viewResults:'試合結果を見る',matchesPlayed:'試合数',activePlayers:'登録選手',latestResult:'最新試合日',winsLeader:'最多勝',sectionStatsKicker:'数字で見る',sectionStats:'クラブ練習スタッツ',rankingTitle:'勝利ランキング',minimumMatches:'最低3試合',sectionMatchesKicker:'クラブ練習ゲームログ',sectionMatches:'練習試合結果',sectionPlayersKicker:'選手紹介',sectionPlayers:'選手',sessionKicker:'練習ログ',sessionTitle:'練習日リプレイ',allResults:'すべて',training:'クラブ練習',tournament:'大会',incomplete:'未完了',trainingYear:'練習年',trainingMonth:'練習月',winsChart:'勝率ランキング',formatChart:'スコア内訳',groupKicker:'グループ別',groupTitle:'グループスタッツ',categoryStats:'区分別',genderStats:'性別',threeMonthKicker:'直近の成績',threeMonthTitle:'月間リーダーボード',monthLeader:'月間リーダー',yearLeader:'年間リーダー',gamesPlayed:'試合',participated:'参加',unassigned:'未設定',loading:'データを読み込んでいます...',updating:'ライブデータ',lastUpdated:'最終更新',officialSite:'公式クラブサイト',matches:'試合',players:'選手',noSessions:'練習記録がありません' }
};
const t = key => words[language][key];
const nameFor = player => language === 'en' && player.englishName ? `${player.displayName} | ${player.englishName}` : player.displayName;
const recordText = (wins, losses, games = wins + losses) => language === 'en' ? `${wins}W-${losses}L · ${games}G` : `${wins}勝-${losses}負 · ${games}試合`;
const dateLabel = date => `${date} · ${new Date(`${date}T00:00:00`).toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}`;
const playerLink = player => `<a class="player-link" href="player.html?id=${player.playerId}">${nameFor(player)}</a>`;
const resultDots = (matches, playerId) => { const playerMatches = matches.filter(match => isComplete(match) && (match.player1Id === playerId || match.player2Id === playerId)), wins = playerMatches.filter(match => match.winnerId === playerId).length, losses = playerMatches.length - wins, winLabel = language === 'ja' ? '勝' : 'W', lossLabel = language === 'ja' ? '負' : 'L'; return `<aside class="match-result-dots"><i class="win">${winLabel}</i><b>${wins}</b><i class="loss">${lossLabel}</i><b>${losses}</b></aside>`; };
const opponentCategoryBreakdown = (matches, playerId) => { const records = new Map(); matches.filter(match => isComplete(match) && (match.player1Id === playerId || match.player2Id === playerId)).forEach(match => { const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id, category = data.players.find(player => player.playerId === opponentId)?.schoolLevel || (language === 'en' ? 'Unassigned' : '未設定'), record = records.get(category) || { wins:0, losses:0 }; if (match.winnerId === playerId) record.wins++; else record.losses++; records.set(category,record); }); return sortCategories([...records.entries()]).map(([category,record]) => `${category}: ${language === 'en' ? 'W' : '勝'} ${record.wins} · ${language === 'en' ? 'L' : '負'} ${record.losses}`).join('\n'); };
const recordSummary = (stats, matches, playerId) => { const games = stats.wins + stats.losses, rate = Math.round(stats.wins / games * 100), winLabel = language === 'ja' ? '勝' : 'W', lossLabel = language === 'ja' ? '負' : 'L', categories = opponentCategoryBreakdown(matches, playerId); return `<span class="leader-record"><b class="${rate >= 50 ? 'positive' : 'negative'}" title="${categories}">${rate}%</b><small><i class="win">${winLabel}</i> ${stats.wins} <i class="loss">${lossLabel}</i> ${stats.losses} · ${language === 'en' ? `${games}G` : `${games}試合`}</small><em class="leader-category-records">${categories.replace(/\n/g,' · ')}</em></span>`; };
const isComplete = match => Number(match.player1Sets) >= 3 || Number(match.player2Sets) >= 3;
const eligibility = (matches, playerId) => { const completed = matches.filter(isComplete), dates = [...new Set(completed.map(match => match.matchDate))].sort(), periodStart = dates[0]; const playedBeforePeriod = playerId && data.matches.some(match => isComplete(match) && eventType(match) === 'training' && match.matchDate < periodStart && (match.player1Id === playerId || match.player2Id === playerId)); const firstDate = playedBeforePeriod ? periodStart : playerId && completed.filter(match => match.player1Id === playerId || match.player2Id === playerId).map(match => match.matchDate).sort()[0]; const gameDays = firstDate ? dates.filter(date => date >= firstDate).length : dates.length, minimum = gameDays * 2; return { minimum, gameDays, text: language === 'en' ? 'Eligibility: 2 matches per match day, starting on the period’s first day for returning players.' : '対象: 継続参加選手は期間初日から、初参加選手は初出場日から試合日ごとに2試合。' }; };
const minimumText = minimum => language === 'en' ? `min. ${minimum}` : `最低${minimum}試合`;
const categoryOrder = ['小学生', '中学生', '高校生', '一般'];
const sortCategories = entries => entries.sort(([left], [right]) => { const index = category => category === t('unassigned') || category === 'Unassigned' ? 98 : categoryOrder.includes(category) ? categoryOrder.indexOf(category) : 97; return index(left) - index(right) || left.localeCompare(right, 'ja'); });
const isAssignedCategory = category => category && category !== t('unassigned') && category !== 'Unassigned';
const categoryLeaders = () => language === 'en' ? 'Category leaders' : 'カテゴリ首位';
const rankIcon = index => ['🥇', '🥈', '🥉'][index] || `${index + 1}`;
const phrase = key => ({ matchDays: language === 'en' ? 'match days' : '試合日', since: language === 'en' ? 'Since' : '集計開始', yearKicker: language === 'en' ? 'YEAR IN REVIEW' : '年間成績', yearTitle: language === 'en' ? 'Yearly Leaderboard' : '年間リーダーボード', selectYear: language === 'en' ? 'Select year' : '年を選択', trainingLog: language === 'en' ? 'CLUB TRAINING MATCH GAME LOG' : 'クラブ練習試合ゲームログ', matchDayVolume: language === 'en' ? 'Match-Day Volume' : '試合日別試合数', menu: language === 'en' ? 'MENU' : 'メニュー', h2h: language === 'en' ? 'HEAD TO HEAD' : '直接対決', h2hTimeline: language === 'en' ? 'Newest to oldest · Win / Draw / Loss timeline' : '新しい順 · 勝ち / 引分 / 負け タイムライン', win: language === 'en' ? 'WIN' : '勝ち', loss: language === 'en' ? 'LOSS' : '負け', draw: language === 'en' ? 'DRAW' : '引分' })[key];
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
  const firstResult = match.winnerId === match.player1Id ? 'win' : match.winnerId === match.player2Id ? 'loss' : '', secondResult = match.winnerId === match.player2Id ? 'win' : match.winnerId === match.player1Id ? 'loss' : '', dot = result => result ? `<i class="game-result-dot ${result}" title="${t(result)}">${result === 'win' ? 'W' : 'L'}</i>` : ''; return `<button class="match-card" data-match-id="${match.matchId}"><div class="match-meta"><span>${dateLabel(match.matchDate)}</span><span class="badge ${eventType(match)}">${t(eventType(match))}</span></div><div class="match-score"><span class="match-player ${firstResult === 'win' ? 'winner' : firstResult === 'loss' ? 'loser' : ''}">${dot(firstResult)}${nameFor(first)}${first.schoolLevel ? `<small class="match-category">${first.schoolLevel}</small>` : ''}</span><strong class="score">${match.player1Sets} <i>:</i> ${match.player2Sets}</strong><span class="match-player ${secondResult === 'win' ? 'winner' : secondResult === 'loss' ? 'loser' : ''}">${dot(secondResult)}${nameFor(second)}${second.schoolLevel ? `<small class="match-category">${second.schoolLevel}</small>` : ''}</span></div><div class="match-context"><span>${match.event || 'Little Kings'}</span><b>${!isComplete(match) ? t('incomplete') : ''}</b></div></button>`;
}


function renderSession() {
  const dates = [...new Set(data.matches.filter(match => eventType(match) === 'training').map(match => match.matchDate))].sort().reverse();
  if (!dates.length) { document.querySelector('#session-summary').textContent = t('noSessions'); return; }
  if (!dates.includes(selectedSession)) selectedSession = dates[0];
  if (!calendarMonth) calendarMonth = selectedSession.slice(0, 7);
  renderCalendar(dates);
  const chronologicalDates = [...dates].reverse(), counts = chronologicalDates.map(date => data.matches.filter(match => match.matchDate === date && eventType(match) === 'training').length), participants = chronologicalDates.map(date => new Set(data.matches.filter(match => match.matchDate === date && eventType(match) === 'training').flatMap(match => [match.player1Id,match.player2Id])).size);
  charts.push(new Chart(document.querySelector('#session-timeline-chart'), { type: 'bar', data: { labels: chronologicalDates, datasets: [{ label: t('players'), data: participants, backgroundColor: 'rgba(84,184,209,.62)', borderRadius: 4 }, { type: 'line', label: t('matches'), data: counts, borderColor: '#d6a516', backgroundColor: '#d6a516', tension: .25, pointBackgroundColor: '#f6f0e2', pointRadius: 4, order: 10 }] }, options: { plugins: { legend: { labels: { color: '#f6f0e2' } } }, scales: { x: { ticks: { color: '#a5a198', maxRotation: 45 }, grid: { display: false } }, y: { ticks: { color: '#a5a198', stepSize: 1 }, grid: { color: 'rgba(246,240,226,.1)' } } } } }));
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
  document.querySelector('#session-summary').innerHTML = `<strong>${dateLabel(date)}</strong><span>${matches.length} ${t('matches')}</span><span>${participants} ${t('players')}</span>`;
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
    const categories = sortCategories([...groups.entries()].filter(([category]) => isAssignedCategory(category)));
    const leaders = categories.map(([category, entries]) => `<section class="category-podium"><h4>🏆 ${category}</h4>${entries.slice(0, 3).map((entry, index) => `<div><i>${rankIcon(index)}</i><b>${playerLink(entry.player)}</b>${recordSummary(entry.stats, matches, entry.player.playerId)}</div>`).join('')}</section>`).join('');
    const champions = categories.map(([category, entries]) => { const entry = entries[0], games = entry.stats.wins + entry.stats.losses, winLabel = language === 'en' ? 'W' : '勝', lossLabel = language === 'en' ? 'L' : '負'; return `<div><span>${category}</span><b>${playerLink(entry.player)}</b><small>${Math.round(entry.stats.wins / games * 100)}% · ${language === 'en' ? `${games}G` : `${games}試合`} · <i class="win">${winLabel}</i>${entry.stats.wins} <i class="loss">${lossLabel}</i>${entry.stats.losses}</small></div>`; }).join('');
    return { month, matches, participants, leaders, champions, eligibility: periodEligibility };
  });
  document.querySelector('#three-month-summary').innerHTML = `<div class="three-month-cards">${report.map(item => `<article><header><p>${item.month}</p><strong>${item.matches.length}<small>${t('matches')}</small></strong><span>${item.eligibility.gameDays} ${phrase('matchDays')} · ${item.participants.size} ${t('players')} ${t('participated')}</span><small class="eligibility">${item.eligibility.text}</small></header><div class="champion-strip"><b>🏆 ${categoryLeaders()}</b>${item.champions}</div><div class="podiums">${item.leaders}</div></article>`).join('')}</div>`;
}

function renderYearlySummary() {
  const matches = data.matches.filter(match => eventType(match) === 'training'), rankings = rankPlayers(matches).filter(entry => entry.stats.wins + entry.stats.losses >= eligibility(matches, entry.player.playerId).minimum);
  const categories = new Map();
  rankings.forEach(entry => { const category = entry.player.schoolLevel || t('unassigned'); if (!categories.has(category)) categories.set(category, []); categories.get(category).push(entry); });
  const categoryEntries = sortCategories([...categories.entries()].filter(([category]) => isAssignedCategory(category)));
  const participants = new Set(matches.filter(isComplete).flatMap(match => [match.player1Id,match.player2Id])).size, winLabel = language === 'ja' ? '勝' : 'W', lossLabel = language === 'ja' ? '負' : 'L'; document.querySelector('#overall-link-detail').textContent = language === 'en' ? `Top 3 by category · ${participants} players` : `カテゴリ別 TOP 3 · ${participants}人`; document.querySelector('#overall-stat-list').innerHTML = categoryEntries.map(([category, entries]) => `<section><b>🏆 ${category}</b>${entries.slice(0,3).map((entry,index) => { const games = entry.stats.wins + entry.stats.losses, rate = Math.round(entry.stats.wins / games * 100), categories = opponentCategoryBreakdown(matches, entry.player.playerId); return `<span><i>${rankIcon(index)}</i><a class="player-link" href="player.html?id=${entry.player.playerId}">${nameFor(entry.player)}<small class="alltime-record"><b class="${rate >= 50 ? 'positive' : 'negative'}" title="${categories}">${rate}%</b><em><i class="win">${winLabel}</i>${entry.stats.wins} <i class="loss">${lossLabel}</i>${entry.stats.losses} · ${language === 'en' ? `${games}G` : `${games}試合`}</em><em class="leader-category-records">${categories.replace(/\n/g,' · ')}</em></small></a></span>`; }).join('')}</section>`).join('');
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
  document.querySelector('#overall-link-title').textContent = language === 'en' ? 'All-Time Leaderboard' : '通算リーダーボード'; document.querySelector('#overall-link-detail').textContent = language === 'en' ? 'Top 3 by category' : 'カテゴリ別 TOP 3'; document.querySelector('#session-timeline-title').textContent = phrase('matchDayVolume'); document.querySelector('#menu-toggle').textContent = '☰'; document.querySelector('#menu-toggle').setAttribute('aria-label', phrase('menu'));
  document.querySelector('#player-search').placeholder = language === 'en' ? 'Search players' : '選手を検索';
  const matches = visibleMatches(), ranked = rankPlayers(matches), dates = matches.map(match => match.matchDate).filter(Boolean).sort();
  charts.forEach(chart => chart.destroy()); charts = [];
  document.querySelector('#player-count').textContent = data.players.length;
  renderPlayers(ranked); renderGroupStats(matches); renderThreeMonthSummary(); renderYearlySummary(); renderSession();
  document.querySelector('#last-updated').textContent = `${t('lastUpdated')}: ${new Date(data.lastUpdated).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-GB')}`;
}

document.querySelector('#language-toggle').onclick = () => { language = language === 'en' ? 'ja' : 'en'; localStorage.setItem('lk-language', language); render(); };
document.querySelector('#menu-toggle').onclick = event => { const menu = document.querySelector('nav'); const open = menu.classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', open); };
document.querySelector('nav').onclick = event => { if (event.target.matches('a')) { document.querySelector('nav').classList.remove('open'); document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false'); } };
document.querySelector('#player-search').oninput = () => renderPlayers(rankPlayers());
document.querySelector('#recent-prev').onclick = () => { recentStart++; renderThreeMonthSummary(); };
document.querySelector('#recent-next').onclick = () => { recentStart--; renderThreeMonthSummary(); };
document.addEventListener('click', event => { const card = event.target.closest('.match-card'); if (card?.dataset.matchId) { const match = data.matches.find(item => item.matchId === card.dataset.matchId); if (match) location.href = `player.html?id=${match.player1Id}&opponent=${match.player2Id}`; } if (event.target.closest('.modal-close')) document.querySelector('#head-to-head').close(); });
fetch('./public-data.json').then(response => { if (!response.ok) throw new Error(); return response.json(); }).catch(() => fetch(API_URL).then(response => response.json())).then(result => { if (!result.ok) throw new Error(); data = result; render(); }).catch(() => document.querySelectorAll('.loading').forEach(element => { element.textContent = 'Unable to load live data.'; }));
