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
      noLKPlayers: 'No Little Kings players in this tournament'
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
      noLKPlayers: 'リトルキングス選手がいません'
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

    // All LK player results (sorted by seed)
    const lkResults = lkPlayers
      .filter(p => p.seed)
      .sort((a, b) => a.seed - b.seed);

    const lkResultHtml = lkResults.map(p => {
      const player = pMap.get(p.playerId);
      const name = fullName(player) || p.playerName;
      const club = player ? clubName(player.clubId, cMap) : '';
      const resultText = p.result ? escapeHtml(lookupValue('tournamentResults', p.result)) : '';
      return `<span class="tc-lk-result">
        ${resultEmoji(p.seed)} <a href="player.html?id=${p.playerId}">${escapeHtml(name)}</a>
        ${club ? `<small>${escapeHtml(club)}</small>` : ''}
        ${resultText ? `<i>${resultText}</i>` : ''}
      </span>`;
    }).join('');

    // Avatars for top players
    const topPlayers = lkPlayers.filter(p => p.seed && p.seed <= 3).sort((a, b) => a.seed - b.seed);

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
              <div class="tc-meta">
                <span class="tc-meta-item">📍 ${escapeHtml(tournament.location || '-')}</span>
                <span class="tc-meta-item">👥 ${totalParticipants} ${t('participant')}${totalParticipants !== 1 && language === 'en' ? 's' : ''}</span>
                ${divisions.length ? `<span class="tc-meta-item">📋 ${divisions.map(d => escapeHtml(d)).join(', ')}</span>` : ''}
              </div>
            </div>
          </div>

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
            <button class="tc-view-btn" data-id="${tournament.tournamentId}">${t('viewDetails')} →</button>
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

    return `
      <section class="tp-hero">
        <div class="tp-hero-inner">
          <p class="eyebrow">${t('title')}</p>
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

    // Division sections
    const divisionSections = divisions.map(div => {
      const divPlayers = tProgress.filter(p => p.division === div).sort((a, b) => (a.rank || 99) - (b.rank || 99));
      const rows = divPlayers.map(p => {
        const isLk = p.playerId.startsWith('LK-');
        const player = pMap.get(p.playerId) || eMap.get(p.playerId);
        const name = fullName(player) || p.playerName;
        const club = player?.clubId ? clubName(player.clubId, cMap) : '';
        const grade = player?.grade || '';
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
        <div class="dv-section">
          <div class="dv-header">
            <h3 class="dv-title">${escapeHtml(div)}</h3>
            <span class="dv-count">${divPlayers.length} ${t('participant')}${divPlayers.length !== 1 && language === 'en' ? 's' : ''}</span>
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
        </div>`;
    }).join('');

    // LK Player highlight cards
    const lkHighlight = lkPlayers.length ? `
      <div class="detail-lk-section">
        <h2 class="detail-lk-title">${lkClubLabel(cMap)} <span class="detail-lk-count">${lkPlayers.length}</span></h2>
        <div class="detail-lk-grid">
          ${lkPlayers.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map(p => {
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

    app.innerHTML = `
      <section class="tp-hero tp-hero-detail">
        <div class="tp-hero-inner">
          <button class="back-btn" id="back-to-list">← ${t('backToList')}</button>
          <p class="eyebrow">${t('title')}</p>
          <h1>${escapeHtml(tournament.name)}</h1>
          <div class="detail-meta">
            <span class="detail-meta-item"><b>${t('date')}</b> ${formatDate(tournament.date)}</span>
            <span class="detail-meta-item"><b>${t('location')}</b> ${escapeHtml(tournament.location || '-')}</span>
            ${tournament.format ? `<span class="detail-meta-item"><b>${t('format')}</b> ${escapeHtml(tournament.format)}</span>` : ''}
            <span class="detail-meta-item"><b>${t('totalPlayers')}</b> ${tProgress.length}</span>
          </div>
        </div>
      </section>

      <section class="detail-content">
        ${lkHighlight}
        ${notesHtml}
        <div class="detail-divisions">
          ${divisionSections}
        </div>
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
