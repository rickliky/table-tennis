(() => {
  'use strict';
  let data, tournaments, progress, players, language = localStorage.getItem('lk-language') || 'ja';
  const app = document.getElementById('tournament-app');
  const words = {
    en: {
      title: 'TOURNAMENTS', subtitle: 'Tournament Results & Rankings',
      noData: 'No tournament data available.',
      location: 'Location', date: 'Date', format: 'Format',
      players: 'Little Kings Players', divisions: 'Divisions',
      rank: 'Rank', result: 'Result', participant: 'Participant',
      club: 'Club', grade: 'Grade', division: 'Division',
      allDivisions: 'All Divisions', calendarTitle: 'Tournament Calendar',
      selectTournament: 'Select a tournament to view details',
      backToList: 'Back to list', totalPlayers: 'Total participants',
      lkPlayers: 'LK Players', viewDetails: 'View Details',
      tournamentHistory: 'Tournament History', notes: 'Notes',
      noLKPlayers: 'No Little Kings players in this tournament',
      prep: 'Preparation Brief', known: 'known to Little Kings', unscouted: 'unscouted', priority: 'Priority opponents', tournamentMatches: 'Documented Match Results', representative: 'Representative', competitionHub: 'Competition Hub', latestEvent: 'Latest event', field: 'Tournament field', qualifiers: 'Representatives', outcomes: 'Little Kings outcomes', explore: 'Explore event', eventOverview: 'Event overview', jumpToDivision: 'Jump to division'
    },
    ja: {
      title: '大会情報', subtitle: '大会結果・ランキング',
      noData: '大会データがありません。',
      location: '会場', date: '日付', format: '形式',
      players: 'リトルキングス選手', divisions: '部門',
      rank: '順位', result: '結果', participant: '参加者',
      club: 'クラブ', grade: '学年', division: '部門',
      allDivisions: 'すべての部門', calendarTitle: '大会カレンダー',
      selectTournament: '大会を選択してください',
      backToList: '一覧に戻る', totalPlayers: '参加者数',
      lkPlayers: 'LK選手', viewDetails: '詳細を見る',
      tournamentHistory: '大会履歴', notes: '備考',
      noLKPlayers: 'リトルキングス選手がいません',
      prep: '対戦準備ブリーフ', known: 'LK既知の対戦相手', unscouted: '未スカウト', priority: '優先対戦相手', tournamentMatches: '登録済み大会試合', representative: '代表', competitionHub: 'COMPETITION HUB', latestEvent: '最新大会', field: '大会フィールド', qualifiers: '代表', outcomes: 'リトルキングスの結果', explore: '大会を見る', eventOverview: '大会概要', jumpToDivision: '部門へ移動'
    }
  };
  const t = key => words[language][key];

  const lookupValue = (table, value) => {
    if (!value) return value;
    const item = (window.LK_STATIC?.[table] || []).find(entry =>
      entry.id === value || entry.name === value || entry.nameJa === value || entry.nameEn === value
    );
    return item ? (language === 'en' ? item.nameEn : item.nameJa) : value;
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]
  );

  const formatDate = date => {
    if (!date) return '';
    const d = new Date(`${date}T00:00:00`);
    const weekday = d.toLocaleDateString(language === 'en' ? 'en-US' : 'ja-JP', { weekday: 'short' });
    return language === 'en'
      ? `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${weekday})`
      : `${date} (${weekday})`;
  };

  const formatDateShort = date => {
    if (!date) return '';
    const d = new Date(`${date}T00:00:00`);
    return language === 'en'
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatDateMonth = date => {
    if (!date) return '';
    const d = new Date(`${date}T00:00:00`);
    return language === 'en'
      ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `${d.getFullYear()}年${d.getMonth() + 1}月`;
  };

  const playerMap = () => new Map(players.map(p => [p.playerId, p]));
  const externalMap = () => new Map((data.externalOpponents || []).map(e => [e.externalOpponentId, e]));
  const clubMap = () => new Map((data.clubs || []).map(c => [c.clubId, c]));

  const fullName = player => {
    if (!player) return '';
    if (language === 'en') {
      return player.englishName ? `${player.displayName} (${player.englishName})` : player.displayName;
    }
    return player.displayName;
  };

  const clubName = (clubId, cMap) => {
    if (!clubId || !cMap) return '';
    const club = cMap.get(clubId);
    if (!club) return clubId;
    return language === 'en' ? (club.nameEn || club.name || club.nameJa || clubId) : (club.nameJa || club.name || clubId);
  };

  const lkClubLabel = cMap => {
    const club = cMap.get('CLUB-0001');
    if (!club) return language === 'en' ? 'LK Players' : 'LK選手';
    const name = language === 'en' ? (club.nameEn || club.name || 'Little Kings') : (club.nameJa || club.name || 'リトルキングス');
    return `${name} ${language === 'en' ? 'Players' : '選手'}`;
  };

  const resultEmoji = rank => rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '';
  const ordinal = language === 'en'
    ? n => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
    : n => `${n}位`;
  const resultLabel = rank => rank ? `${resultEmoji(rank)} ${ordinal(rank)}` : '-';
  const progressLabel = item => item.recommended ? (language === 'en' ? 'Recommended' : '推薦') : item.rank ? resultLabel(item.rank) : item.result ? lookupValue('tournamentResults', item.result) : (language === 'en' ? 'Participant' : '出場');

  // ─── Calendar Timeline ───
  function renderCalendarTimeline(tournamentDates) {
    if (!tournamentDates.size) return '';

    const sortedDates = [...tournamentDates].sort();
    const firstDate = new Date(`${sortedDates[0]}T00:00:00`);
    const lastDate = new Date(`${sortedDates[sortedDates.length - 1]}T00:00:00`);

    // Group by month
    const months = new Map();
    sortedDates.forEach(dateStr => {
      const d = new Date(`${dateStr}T00:00:00`);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(monthKey)) months.set(monthKey, []);
      months.get(monthKey).push(dateStr);
    });

    const monthNames = language === 'en'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

    let html = '<div class="cal-timeline">';
    months.forEach((dates, monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      html += `<div class="cal-month">`;
      html += `<div class="cal-month-label">${monthNames[month - 1]} ${year}</div>`;
      html += `<div class="cal-dots">`;
      dates.forEach(dateStr => {
        const d = new Date(`${dateStr}T00:00:00`);
        const day = d.getDate();
        const tournament = tournaments.find(t => t.date === dateStr);
        const name = tournament ? escapeHtml(tournament.name) : '';
        html += `<button class="cal-dot-btn" data-date="${dateStr}" title="${name}">
          <span class="cal-dot"></span>
          <span class="cal-dot-label">${day}</span>
        </button>`;
      });
      html += `</div></div>`;
    });
    html += '</div>';
    return html;
  }

  // ─── Tournament Card ───
  function renderTournamentCard(tournament, pMap, cMap) {
    const tProgress = progress.filter(p => p.tournamentId === tournament.tournamentId);
    const lkPlayers = tProgress.filter(p => p.playerId.startsWith('LK-'));
    const divisions = [...new Set(tProgress.map(p => p.division))];
    const totalParticipants = tProgress.length;

    const lkResults = lkPlayers.sort((a, b) => Number(b.recommended) - Number(a.recommended) || (a.rank || 99) - (b.rank || 99));

    const lkResultHtml = lkResults.map(p => {
      const player = pMap.get(p.playerId);
      const name = fullName(player) || p.playerName;
      const club = player ? clubName(player.clubId, cMap) : '';
      const resultText = p.result ? escapeHtml(lookupValue('tournamentResults', p.result)) : '';
      return `<span class="tc-lk-result">
       <a href="player.html?id=${p.playerId}">${escapeHtml(name)}</a>
        ${club ? `<small>${escapeHtml(club)}</small>` : ''}
         <i>${escapeHtml(progressLabel(p))}</i>
      </span>`;
    }).join('');

    // Avatars for top players
    const topPlayers = lkPlayers.slice(0, 4);
    const qualifierCount = tProgress.filter(p => p.qualified).length;

    return `
      <article class="tc" data-id="${tournament.tournamentId}">
        <div class="tc-accent"></div>
        <div class="tc-body">
          <div class="tc-header">
            <div class="tc-date-badge">
              <span class="tc-date-month">${formatDateShort(tournament.date).split(' ')[0]}</span>
              <span class="tc-date-day">${new Date(`${tournament.date}T00:00:00`).getDate()}</span>
            </div>
            <div class="tc-title-group">
              <h3 class="tc-title">${escapeHtml(tournament.name)}</h3>
              <div class="tc-kicker">${escapeHtml(tournament.category || t('competitionHub'))}</div><div class="tc-meta">
                <span class="tc-meta-item">📍 ${escapeHtml(tournament.location || '-')}</span>
                <span class="tc-meta-item">👥 ${totalParticipants} ${t('participant')}${totalParticipants !== 1 && language === 'en' ? 's' : ''}</span>
                ${divisions.length ? `<span class="tc-meta-item">📋 ${divisions.map(d => escapeHtml(d)).join(', ')}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="tc-event-strip"><span><b>${totalParticipants}</b> ${t('field')}</span><span><b>${qualifierCount}</b> ${t('qualifiers')}</span><span><b>${divisions.length}</b> ${t('divisions')}</span></div>
          ${lkPlayers.length ? `
            <div class="tc-lk-section">
              <div class="tc-lk-header">
                <span class="tc-lk-badge">${lkClubLabel(cMap)}</span>
                <span class="tc-lk-count">${lkPlayers.length}</span>
              </div>
              ${lkResultHtml ? `<div class="tc-lk-results">${lkResultHtml}</div>` : ''}
              <div class="tc-lk-avatars">
                ${topPlayers.map(p => {
                  const player = pMap.get(p.playerId);
                  const name = fullName(player) || p.playerName;
                  return `<a href="player.html?id=${p.playerId}" class="tc-avatar" title="${escapeHtml(name)}">
                    <img src="img/${p.playerId}.jpg" alt="${escapeHtml(name)}" onerror="this.parentElement.innerHTML='<span>${escapeHtml(name).charAt(0)}</span>'" />
                  </a>`;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <div class="tc-footer">
            <button class="tc-view-btn" data-id="${tournament.tournamentId}">${t('explore')} →</button>
          </div>
        </div>
      </article>`;
  }

  // ─── Tournament List View ───
  function renderTournamentList() {
    if (!tournaments.length) {
      return `<section class="tp-hero"><div class="tp-empty"><p>${t('noData')}</p></div></section>`;
    }

    const sorted = [...tournaments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const tournamentDates = getTournamentDates();
    const pMap = playerMap();
    const cMap = clubMap();

    // Summary stats
    const totalTournaments = tournaments.length;
    const totalParticipants = progress.length;
    const totalLkPlayers = new Set(progress.filter(p => p.playerId.startsWith('LK-')).map(p => p.playerId)).size;

    const calendarHtml = renderCalendarTimeline(tournamentDates);
    const cards = sorted.map(t => renderTournamentCard(t, pMap, cMap)).join('');
    const latest = sorted[0]; const latestProgress = latest ? progress.filter(item => item.tournamentId === latest.tournamentId) : [];

    return `
      <section class="tp-hero">
        <div class="tp-hero-inner">
          <p class="eyebrow">${t('competitionHub')}</p>
          <h1>${t('subtitle')}</h1>
          <div class="tp-stats">
            <div class="tp-stat">
              <span class="tp-stat-value">${totalTournaments}</span>
              <span class="tp-stat-label">${language === 'en' ? 'Tournaments' : '大会'}</span>
            </div>
            <div class="tp-stat-divider"></div>
            <div class="tp-stat">
              <span class="tp-stat-value">${totalParticipants}</span>
              <span class="tp-stat-label">${language === 'en' ? 'Participants' : '参加者'}</span>
            </div>
            <div class="tp-stat-divider"></div>
            <div class="tp-stat">
              <span class="tp-stat-value">${totalLkPlayers}</span>
              <span class="tp-stat-label">${lkClubLabel(cMap)}</span>
            </div>
          </div>
        </div>
      </section>

       ${latest ? `<section class="tp-feature" data-id="${latest.tournamentId}"><div class="tp-feature-label">${t('latestEvent')}</div><div><h2>${escapeHtml(latest.name)}</h2><p>${formatDate(latest.date)} · ${escapeHtml(latest.location || '-')}</p></div><div class="tp-feature-stats"><span><b>${latestProgress.length}</b>${t('participant')}</span><span><b>${latestProgress.filter(item => item.playerId.startsWith('LK-')).length}</b>${t('lkPlayers')}</span></div><button class="tp-feature-btn" data-id="${latest.tournamentId}">${t('explore')} →</button></section>` : ''}
       ${calendarHtml ? `
        <section class="tp-calendar-section">
          <h2 class="tp-section-title">${t('calendarTitle')}</h2>
          ${calendarHtml}
        </section>
      ` : ''}

      <section class="tp-list-section">
        <h2 class="tp-section-title">${t('tournamentHistory')}</h2>
        <div class="tp-grid" id="tournament-list">
          ${cards}
        </div>
      </section>`;
  }

  const participantFor = (id, pMap, eMap) => pMap.get(id) || eMap.get(id);
  const documentedMatchesFor = id => [...(data.matches || []), ...(data.tournamentMatches || [])].filter(match => match.player1Id === id || match.player2Id === id);

  function preparationBrief(divPlayers, division, pMap, eMap) {
    const lkIds = divPlayers.filter(item => item.playerId.startsWith('LK-')).map(item => item.playerId);
    if (!lkIds.length) return '';
    const opponents = divPlayers.filter(item => !item.playerId.startsWith('LK-'));
    const known = opponents.filter(item => lkIds.some(id => documentedMatchesFor(id).some(match => match.player1Id === item.playerId || match.player2Id === item.playerId)));
    const priority = [...opponents].sort((left, right) => Number(right.recommended || right.qualified) - Number(left.recommended || left.qualified) || (left.rank || 99) - (right.rank || 99)).slice(0, 5);
    const opponentCard = item => {
      const person = participantFor(item.playerId, pMap, eMap) || { displayName: item.playerName || item.playerId };
      const record = lkIds.flatMap(id => documentedMatchesFor(id)).filter(match => match.player1Id === item.playerId || match.player2Id === item.playerId);
      const recordText = record.length ? record.map(match => { const ownSets = match.player1Id === item.playerId ? match.player1Sets : match.player2Sets, lkSets = match.player1Id === item.playerId ? match.player2Sets : match.player1Sets; return `${ownSets}-${lkSets}`; }).join(', ') : (language === 'en' ? 'No LK record' : 'LK対戦記録なし');
      const tier = item.recommended ? (language === 'en' ? 'Recommended' : '推薦') : item.qualified ? t('representative') : (language === 'en' ? 'Field opponent' : '大会出場者');
      return `<li><b>${escapeHtml(fullName(person))}</b><span>${escapeHtml(tier)} · ${escapeHtml(recordText)}</span></li>`;
    };
    return `<aside class="division-prep"><header><p>${t('prep')}</p><h4>${escapeHtml(division)}</h4></header><div class="division-prep-metrics"><span><b>${opponents.length}</b>${language === 'en' ? 'field opponents' : '対戦候補'}</span><span><b>${known.length}</b>${t('known')}</span><span><b>${opponents.length - known.length}</b>${t('unscouted')}</span></div><section><h5>${t('priority')}</h5><ol>${priority.map(opponentCard).join('')}</ol></section></aside>`;
  }

  // ─── Tournament Detail View ───
  function showTournamentDetail(tournamentId) {
    const tournament = tournaments.find(t => t.tournamentId === tournamentId);
    if (!tournament) return;

    const tProgress = progress.filter(p => p.tournamentId === tournamentId);
    const pMap = playerMap();
    const eMap = externalMap();
    const cMap = clubMap();
    const divisions = [...new Set(tProgress.map(p => p.division))];
    const lkPlayers = tProgress.filter(p => p.playerId.startsWith('LK-'));
    const tournamentMatches = (data.tournamentMatches || []).filter(match => match.tournamentId === tournamentId).sort((left, right) => `${left.matchDate}${left.tournamentMatchId}`.localeCompare(`${right.matchDate}${right.tournamentMatchId}`));

    // Division sections
    const divisionSections = divisions.map(div => {
      const divPlayers = tProgress.filter(p => p.division === div).sort((a, b) => (a.recommended ? 0 : 1) - (b.recommended ? 0 : 1) || (a.rank || 99) - (b.rank || 99));
      const rows = divPlayers.map(p => {
        const isLk = p.playerId.startsWith('LK-');
        const player = pMap.get(p.playerId) || eMap.get(p.playerId);
        const name = fullName(player) || p.playerName;
        const club = p.clubName || (player?.clubId ? clubName(player.clubId, cMap) : '');
        const grade = player?.grade ? lookupValue('grades', player.grade) : '';
        const nameHtml = isLk
          ? `<a href="player.html?id=${p.playerId}" class="lk-link">${escapeHtml(name)}</a>`
          : escapeHtml(name);
        const rankHtml = p.recommended
          ? `<span class="rank-badge recommended">${language === 'en' ? 'REC' : '推薦'}</span>`
          : p.rank ? resultLabel(p.rank) : '-';
        const resultHtml = p.result ? escapeHtml(lookupValue('tournamentResults', p.result)) : '';
        const qualHtml = p.qualified ? `<span class="qual-badge">${language === 'en' ? '代表' : '代表'}</span>` : '';

        return `
          <tr class="${isLk ? 'tr-lk' : ''}">
            <td class="td-rank">${rankHtml}</td>
            <td class="td-name">${isLk ? '<span class="lk-chip">LK</span> ' : ''}${nameHtml} ${qualHtml}</td>
            <td class="td-club">${escapeHtml(club)}</td>
            <td class="td-grade">${escapeHtml(grade)}</td>
            <td class="td-result">${resultHtml}</td>
          </tr>`;
      }).join('');

      return `
        <div class="dv-section" id="division-${divisions.indexOf(div)}">
          <div class="dv-header">
            <div><p>${t('field')}</p><h3 class="dv-title">${escapeHtml(div)}</h3></div><span class="dv-count">${divPlayers.length} ${t('participant')}${divPlayers.length !== 1 && language === 'en' ? 's' : ''}<b>${divPlayers.filter(item => item.qualified).length} ${t('qualifiers')}</b></span>
          </div>
          <div class="dv-table-wrap">
            <table class="dv-table">
              <thead>
                <tr>
                  <th class="th-rank">${t('rank')}</th>
                  <th class="th-name">${t('participant')}</th>
                  <th class="th-club">${t('club')}</th>
                  <th class="th-grade">${t('grade')}</th>
                  <th class="th-result">${t('result')}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${preparationBrief(divPlayers, div, pMap, eMap)}
        </div>`;
    }).join('');

    // LK Player highlight cards
    const lkHighlight = lkPlayers.length ? `
      <div class="detail-lk-section">
        <h2 class="detail-lk-title">${lkClubLabel(cMap)} <span class="detail-lk-count">${lkPlayers.length}</span></h2>
        <div class="detail-lk-grid">
          ${lkPlayers.sort((a, b) => (a.recommended ? 0 : 1) - (b.recommended ? 0 : 1) || (a.rank || 99) - (b.rank || 99)).map(p => {
            const player = pMap.get(p.playerId);
            const name = fullName(player) || p.playerName;
            const club = player?.clubId ? clubName(player.clubId, cMap) : '';
            const rankLabel = p.recommended
              ? (language === 'en' ? 'Recommended' : '推薦')
              : p.rank ? resultLabel(p.rank) : '';
            return `
              <a href="player.html?id=${p.playerId}" class="detail-lk-card">
                <img src="img/${p.playerId}.jpg" alt="${escapeHtml(name)}" onerror="this.style.display='none'" />
                <div class="detail-lk-info">
                  <b>${escapeHtml(name)}</b>
                  <small>${escapeHtml(p.division)}${club ? ` · ${escapeHtml(club)}` : ''}</small>
                  <span>${rankLabel}${p.result ? ` · ${escapeHtml(lookupValue('tournamentResults', p.result))}` : ''}</span>
                </div>
              </a>`;
          }).join('')}
        </div>
      </div>` : '';

    // Notes
    const notesHtml = tournament.notes ? `
      <div class="detail-notes">
        <h3>${t('notes')}</h3>
        <p>${escapeHtml(tournament.notes)}</p>
       </div>` : '';
    const tournamentResultsHtml = tournamentMatches.length ? `<section class="tournament-match-results"><div class="section-title"><div><p>${t('tournamentMatches')}</p><h2>${t('tournamentMatches')}</h2></div></div><div>${tournamentMatches.map(match => { const first = participantFor(match.player1Id, pMap, eMap), second = participantFor(match.player2Id, pMap, eMap), firstName = fullName(first) || match.player1Name || match.player1Id, secondName = fullName(second) || match.player2Name || match.player2Id; return `<article><span>${escapeHtml(match.round || '-')}</span><b class="${match.winnerId === match.player1Id ? 'winner' : ''}">${escapeHtml(firstName)}</b><strong>${match.player1Sets}-${match.player2Sets}</strong><b class="${match.winnerId === match.player2Id ? 'winner' : ''}">${escapeHtml(secondName)}</b></article>`; }).join('')}</div></section>` : '';

    const qualifierCount = tProgress.filter(item => item.qualified).length;
    const divisionNav = divisions.length > 1 ? `<nav class="detail-division-nav" aria-label="${t('jumpToDivision')}">${divisions.map((div, index) => `<a href="#division-${index}">${escapeHtml(div)}</a>`).join('')}</nav>` : '';
    app.innerHTML = `
      <section class="tp-hero tp-hero-detail">
        <div class="tp-hero-inner">
          <button class="back-btn" id="back-to-list">← ${t('backToList')}</button>
          <p class="eyebrow">${t('eventOverview')}</p>
          <h1>${escapeHtml(tournament.name)}</h1>
          <div class="detail-meta">
            <span class="detail-meta-item"><b>${t('date')}</b> ${formatDate(tournament.date)}</span>
            <span class="detail-meta-item"><b>${t('location')}</b> ${escapeHtml(tournament.location || '-')}</span>
            ${tournament.format ? `<span class="detail-meta-item"><b>${t('format')}</b> ${escapeHtml(tournament.format)}</span>` : ''}
            <span class="detail-meta-item"><b>${t('totalPlayers')}</b> ${tProgress.length}</span>
          </div>
        </div>
      </section>

       <section class="detail-content"><div class="detail-scoreboard"><div><small>${t('field')}</small><b>${tProgress.length}</b></div><div><small>${t('divisions')}</small><b>${divisions.length}</b></div><div><small>${t('qualifiers')}</small><b>${qualifierCount}</b></div><div><small>${t('lkPlayers')}</small><b>${lkPlayers.length}</b></div></div>${divisionNav}
        ${lkHighlight}
         ${notesHtml}
         <div class="detail-divisions">
           ${divisionSections}
         </div>
         ${tournamentResultsHtml}
       </section>`;

    document.getElementById('back-to-list')?.addEventListener('click', () => render());
  }

  // ─── Helpers ───
  function getTournamentDates() {
    const dates = new Set();
    tournaments.forEach(t => { if (t.date) dates.add(t.date); });
    return dates;
  }

  // ─── Init ───
  async function init() {
    try {
      data = await window.LKData.loadPublicData();
      tournaments = data.tournaments || [];
      progress = data.tournamentProgress || [];
      data.tournamentMatches = data.tournamentMatches || [];
      players = data.players || [];
      render();
    } catch (error) {
      app.innerHTML = `<section class="tp-hero"><div class="tp-empty"><p>${error.message}</p></div></section>`;
    }
  }

  function render() {
    app.innerHTML = renderTournamentList();

    // Calendar dot clicks
    app.querySelectorAll('.cal-dot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tournament = tournaments.find(t => t.date === btn.dataset.date);
        if (tournament) showTournamentDetail(tournament.tournamentId);
      });
    });
    app.querySelectorAll('.tp-feature, .tp-feature-btn').forEach(item => {
      item.addEventListener('click', event => {
        event.stopPropagation();
        const tournament = tournaments.find(entry => entry.tournamentId === item.dataset.id);
        if (tournament) showTournamentDetail(tournament.tournamentId);
      });
    });

    // Card clicks
    app.querySelectorAll('.tc').forEach(card => {
      card.addEventListener('click', e => {
        // Don't navigate if clicking a link inside the card
        if (e.target.closest('a')) return;
        showTournamentDetail(card.dataset.id);
      });
    });

    // View detail buttons
    app.querySelectorAll('.tc-view-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showTournamentDetail(btn.dataset.id);
      });
    });
  }

  document.getElementById('language-toggle')?.addEventListener('click', () => {
    language = language === 'en' ? 'ja' : 'en';
    localStorage.setItem('lk-language', language);
    location.reload();
  });
  const langBtn = document.getElementById('language-toggle');
  if (langBtn) langBtn.textContent = language === 'ja' ? 'ENGLISH' : '日本語';

  init();
})();
