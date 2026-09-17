(() => {
  'use strict';
  let data, tournaments, progress, players, language = localStorage.getItem('lk-language') || 'ja';
  const app = document.getElementById('tournament-app');
  const words = {
    en: { title:'TOURNAMENTS', subtitle:'Tournament Results & Rankings', noData:'No tournament data available.', location:'Location', date:'Date', format:'Format', players:'Little Kings Players', divisions:'Divisions', rank:'Rank', result:'Result', participant:'Participant', club:'Club', grade:'Grade', division:'Division', allDivisions:'All Divisions', calendarTitle:'Tournament Calendar', selectTournament:'Select a tournament to view details', backToList:'← Back to list', totalPlayers:'Total participants' },
    ja: { title:'大会情報', subtitle:'大会結果・ランキング', noData:'大会データがありません。', location:'会場', date:'日付', format:'形式', players:'リトルキングス選手', divisions:'部門', rank:'順位', result:'結果', participant:'参加者', club:'クラブ', grade:'学年', division:'部門', allDivisions:'すべての部門', calendarTitle:'大会カレンダー', selectTournament:'大会を選択してください', backToList:'← 一覧に戻る', totalPlayers:'参加者数' }
  };
  const t = key => words[language][key];
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);
  const formatDate = date => {
    if (!date) return '';
    const d = new Date(`${date}T00:00:00`);
    return `${date} (${d.toLocaleDateString(language === 'en' ? 'en-US' : 'ja-JP', { weekday: 'short' })})`;
  };
  const playerMap = () => new Map(players.map(p => [p.playerId, p]));
  const externalMap = () => new Map((data.externalOpponents || []).map(e => [e.externalOpponentId, e]));
  const clubMap = () => new Map((data.clubs || []).map(c => [c.clubId, c]));
  const resultEmoji = rank => rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : '';
  const resultLabel = rank => rank ? `${resultEmoji(rank)} ${rank}位` : '-';

  function getTournamentDates() {
    const dates = new Set();
    tournaments.forEach(t => { if (t.date) dates.add(t.date); });
    return dates;
  }

  function renderCalendar(tournamentDates) {
    const now = new Date();
    let currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthNames = language === 'en' ? ['January','February','March','April','May','June','July','August','September','October','November','December'] : ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const dayNames = language === 'en' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] : ['日','月','火','水','木','金','土'];

    function render() {
      const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;

      let days = '';
      for (let i = 0; i < firstDay; i++) days += '<td class="cal-empty"></td>';
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const hasTournament = tournamentDates.has(dateStr);
        const isToday = dateStr === today;
        const classes = ['cal-day'];
        if (hasTournament) classes.push('has-tournament');
        if (isToday) classes.push('today');
        if (!hasTournament) classes.push('no-event');
        const tournament = hasTournament ? tournaments.find(t => t.date === dateStr) : null;
        const tooltip = tournament ? escapeHtml(tournament.name) : '';
        days += `<td class="${classes.join(' ')}"${tooltip ? ` title="${tooltip}"` : ''}${hasTournament ? ` data-date="${dateStr}"` : ''}><span>${d}</span>${hasTournament ? '<i class="cal-dot"></i>' : ''}</td>`;
      }

      return `
        <div class="tournament-calendar">
          <div class="cal-header">
            <button class="cal-nav" id="cal-prev" aria-label="Previous month">‹</button>
            <h3>${monthNames[month]} ${year}</h3>
            <button class="cal-nav" id="cal-next" aria-label="Next month">›</button>
          </div>
          <table class="cal-table">
            <thead><tr>${dayNames.map(d => `<th>${d}</th>`).join('')}</tr></thead>
            <tbody><tr>${days}</tr></tbody>
          </table>
        </div>`;
    }

    const container = document.createElement('div');
    container.innerHTML = render();
    container.addEventListener('click', e => {
      if (e.target.id === 'cal-prev' || e.target.closest('#cal-prev')) {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        container.innerHTML = render();
      } else if (e.target.id === 'cal-next' || e.target.closest('#cal-next')) {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        container.innerHTML = render();
      } else {
        const td = e.target.closest('td[data-date]');
        if (td) {
          const tournament = tournaments.find(t => t.date === td.dataset.date);
          if (tournament) showTournamentDetail(tournament.tournamentId);
        }
      }
    });
    return container;
  }

  function renderTournamentList() {
    if (!tournaments.length) {
      return `<section class="tournament-hero"><div class="tournament-empty"><p>${t('noData')}</p></div></section>`;
    }

    const sorted = [...tournaments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const tournamentDates = getTournamentDates();
    const calendar = renderCalendar(tournamentDates);
    const pMap = playerMap();
    const eMap = externalMap();
    const cMap = clubMap();

    const cards = sorted.map(tournament => {
      const tProgress = progress.filter(p => p.tournamentId === tournament.tournamentId);
      const lkPlayers = tProgress.filter(p => p.playerId.startsWith('LK-'));
      const divisions = [...new Set(tProgress.map(p => p.division))];
      const totalParticipants = tProgress.length;

      const lkSummary = lkPlayers.map(p => {
        const player = pMap.get(p.playerId);
        const name = player ? (language === 'en' && player.englishName ? `${player.displayName} (${player.englishName})` : player.displayName) : p.playerName;
        return `<span class="tournament-lk-player"><a href="player.html?id=${p.playerId}">${escapeHtml(name)}</a> <small>${escapeHtml(p.division)} · ${resultLabel(p.seed)}</small></span>`;
      }).join('');

      return `
        <article class="tournament-card" data-id="${tournament.tournamentId}">
          <div class="tournament-card-header">
            <h3>${escapeHtml(tournament.name)}</h3>
            <div class="tournament-card-meta">
              <span>${t('date')}: <b>${formatDate(tournament.date)}</b></span>
              <span>${t('location')}: <b>${escapeHtml(tournament.location)}</b></span>
              <span>${t('totalPlayers')}: <b>${totalParticipants}</b></span>
            </div>
          </div>
          <div class="tournament-card-divisions">
            <small>${t('divisions')}: ${divisions.map(d => escapeHtml(d)).join(' · ')}</small>
          </div>
          ${lkPlayers.length ? `<div class="tournament-card-lk"><p>${t('players')} (${lkPlayers.length})</p><div class="tournament-lk-list">${lkSummary}</div></div>` : ''}
        </article>`;
    }).join('');

    return `
      <section class="tournament-hero">
        <div class="tournament-header">
          <p class="eyebrow">${t('title')}</p>
          <h1>${t('subtitle')}</h1>
        </div>
      </section>
      <section class="tournament-content">
        <div class="tournament-sidebar">
          <h2>${t('calendarTitle')}</h2>
          <div id="tournament-calendar"></div>
        </div>
        <div class="tournament-list" id="tournament-list">
          ${cards}
        </div>
      </section>`;
  }

  function showTournamentDetail(tournamentId) {
    const tournament = tournaments.find(t => t.tournamentId === tournamentId);
    if (!tournament) return;
    const tProgress = progress.filter(p => p.tournamentId === tournamentId);
    const pMap = playerMap();
    const eMap = externalMap();
    const cMap = clubMap();
    const divisions = [...new Set(tProgress.map(p => p.division))];
    const lkPlayers = tProgress.filter(p => p.playerId.startsWith('LK-'));

    const divisionSections = divisions.map(div => {
      const divPlayers = tProgress.filter(p => p.division === div).sort((a, b) => (a.seed || 99) - (b.seed || 99));
      const rows = divPlayers.map(p => {
        const isLk = p.playerId.startsWith('LK-');
        const player = pMap.get(p.playerId) || eMap.get(p.playerId);
        const name = player ? (language === 'en' && player.englishName ? `${player.displayName} (${player.englishName})` : player.displayName) : p.playerName;
        const club = player?.clubId ? (cMap.get(player.clubId)?.name || player.clubId) : '';
        const grade = player?.grade || '';
        const nameHtml = isLk ? `<a href="player.html?id=${p.playerId}" class="lk-player-link">${escapeHtml(name)}</a>` : escapeHtml(name);
        const lkBadge = isLk ? '<span class="lk-badge">LK</span>' : '';
        return `
          <tr class="${isLk ? 'lk-row' : ''}">
            <td class="rank-cell">${resultLabel(p.seed)}</td>
            <td class="name-cell">${lkBadge} ${nameHtml}</td>
            <td>${escapeHtml(club)}</td>
            <td>${escapeHtml(grade)}</td>
            <td>${escapeHtml(p.result || '')}</td>
          </tr>`;
      }).join('');

      return `
        <section class="division-section">
          <h3>${escapeHtml(div)} <small>(${divPlayers.length} ${t('participant')}${divPlayers.length > 1 ? 's' : ''})</small></h3>
          <table class="division-table">
            <thead><tr><th>${t('rank')}</th><th>${t('participant')}</th><th>${t('club')}</th><th>${t('grade')}</th><th>${t('result')}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    }).join('');

    const lkHighlight = lkPlayers.length ? `
      <section class="tournament-lk-highlight">
        <h2>${t('players')} (${lkPlayers.length})</h2>
        <div class="lk-highlight-grid">
          ${lkPlayers.map(p => {
            const player = pMap.get(p.playerId);
            const name = player ? (language === 'en' && player.englishName ? `${player.displayName} (${player.englishName})` : player.displayName) : p.playerName;
            return `
              <a href="player.html?id=${p.playerId}" class="lk-highlight-card">
                <img src="img/${p.playerId}.jpg" alt="${escapeHtml(name)}" onerror="this.style.display='none'" />
                <div>
                  <b>${escapeHtml(name)}</b>
                  <small>${escapeHtml(p.division)}</small>
                  <span>${resultLabel(p.seed)} ${p.result ? `· ${escapeHtml(p.result)}` : ''}</span>
                </div>
              </a>`;
          }).join('')}
        </div>
      </section>` : '';

    app.innerHTML = `
      <section class="tournament-hero">
        <div class="tournament-header">
          <button class="back-button" id="back-to-list">${t('backToList')}</button>
          <p class="eyebrow">${t('title')}</p>
          <h1>${escapeHtml(tournament.name)}</h1>
          <div class="tournament-detail-meta">
            <span>${t('date')}: <b>${formatDate(tournament.date)}</b></span>
            <span>${t('location')}: <b>${escapeHtml(tournament.location)}</b></span>
            <span>${t('format')}: <b>${escapeHtml(tournament.format || '-')}</b></span>
            <span>${t('totalPlayers')}: <b>${tProgress.length}</b></span>
          </div>
        </div>
      </section>
      ${lkHighlight}
      <section class="tournament-divisions">
        ${divisionSections}
      </section>`;

    document.getElementById('back-to-list')?.addEventListener('click', () => render());

    if (tournament.notes) {
      const notesSection = document.createElement('section');
      notesSection.className = 'tournament-notes';
      notesSection.innerHTML = `<p>${escapeHtml(tournament.notes)}</p>`;
      const divisionsSection = app.querySelector('.tournament-divisions');
      if (divisionsSection) divisionsSection.before(notesSection);
    }
  }

  async function init() {
    try {
      data = await window.LKData.loadPublicData();
      tournaments = data.tournaments || [];
      progress = data.tournamentProgress || [];
      players = data.players || [];
      app.innerHTML = renderTournamentList();
      const calContainer = document.getElementById('tournament-calendar');
      if (calContainer) {
        const calendar = renderCalendar(getTournamentDates());
        calContainer.appendChild(calendar);
      }
      document.getElementById('tournament-list')?.addEventListener('click', e => {
        const card = e.target.closest('.tournament-card');
        if (card) showTournamentDetail(card.dataset.id);
      });
    } catch (error) {
      app.innerHTML = `<section class="tournament-hero"><div class="tournament-empty"><p>${error.message}</p></div></section>`;
    }
  }

  document.getElementById('language-toggle')?.addEventListener('click', () => {
    language = language === 'en' ? 'ja' : 'en';
    localStorage.setItem('lk-language', language);
    location.reload();
  });

  init();
})();
