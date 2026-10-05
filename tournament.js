(() => {
  'use strict';
  let data, tournaments, progress, players, language = localStorage.getItem('lk-language') || 'ja';
  const app = document.getElementById('tournament-app');
  const initialParams = new URLSearchParams(location.search);
  let activeTournamentId = initialParams.get('event') || initialParams.get('id') || '';
  let activeDetailView = ['overview','little-kings','field','matches'].includes(initialParams.get('view')) ? initialParams.get('view') : 'overview';
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
      prep: 'Preparation Brief', known: 'known to Little Kings', unscouted: 'unscouted', priority: 'Priority opponents', tournamentMatches: 'Documented Match Results', representative: 'Representative', competitionHub: 'Competition Hub', latestEvent: 'Latest event', field: 'Tournament field', qualifiers: 'Representatives', outcomes: 'Little Kings outcomes', explore: 'Explore event', eventOverview: 'Event overview', jumpToDivision: 'Jump to division', tournamentRecord: 'Tournament record'
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
      prep: '対戦準備ブリーフ', known: 'LK既知の対戦相手', unscouted: '未スカウト', priority: '優先対戦相手', tournamentMatches: '登録済み大会試合', representative: '代表', competitionHub: 'COMPETITION HUB', latestEvent: '最新大会', field: '大会フィールド', qualifiers: '代表', outcomes: 'リトルキングスの結果', explore: '大会を見る', eventOverview: '大会概要', jumpToDivision: '部門へ移動', tournamentRecord: '大会戦績'
    }
  };
  const intelligenceWords = {
    en: {
      overviewView:'Overview', littleKingsView:'Little Kings', fieldView:'Field & Scouting', matchesView:'Matches',
      intelligence:'Tournament Intelligence', recordedEvidence:'Recorded evidence', documentedMatches:'Documented matches',
      lkRecord:'LK tournament record', sets:'Sets', setDifference:'Set differential', closeMatches:'Close matches',
      uniqueOpponents:'Unique opponents', noDocumentedMatches:'No documented matches', evidenceOnly:'Documented records only',
      playerProfile:'Player profile', openHeadToHead:'Open Head-to-Head', opponentsFaced:'Opponents faced', scorelines:'Scorelines',
      scoutingWorkspace:'Field & Scouting', searchField:'Japanese or Romanized player name, or club', allDivisions:'All divisions', allClubs:'All clubs',
      allStatuses:'All evidence', representativesOnly:'Representatives', knownOnly:'Known to LK', unknownOnly:'No LK record',
      knownMeetings:'LK meetings', tournamentHistory:'Tournament history', reportedSetup:'Reported setup', notRecorded:'Not recorded',
      category:'Category', hand:'Hand', style:'Style', grip:'Grip', forehand:'Forehand', backhand:'Backhand',
      currentEvent:'Current event', fieldEvidence:'LK versus field evidence', matrixHelp:'Cells show documented W-L from the LK player perspective. Training and tournament counts remain separate.',
      training:'Training', tournamentSource:'Tournament', combined:'Combined', meetings:'meetings', lastMeeting:'Last meeting',
      winRate:'Win rate', recentMeetings:'Meeting history', source:'Source', resultLabel:'Result', noMeetings:'No documented meetings between these players.',
      matchFilters:'Match filters', allPlayers:'All LK players', allRounds:'All rounds', allResults:'All results', wins:'LK wins', losses:'LK losses',
      visibleMatches:'visible matches', clearFilters:'Clear filters', progressStatus:'Progress', participantStatus:'Participant',
      dataCoverage:'Recorded data coverage', coverageNote:'Counts reflect saved records and may not represent a complete draw or all event matches.',
      openField:'Open field scouting', openMatches:'Open documented matches', externalOpponent:'External opponent', profileCompleteness:'Profile data',
      eventRecord:'Event record', fieldPlayers:'Field opponents', knownField:'Known opponents', unknownField:'Unknown opponents',
      close:'Close', selectLkPlayer:'Select Little Kings player', h2h:'HEAD TO HEAD', olderToNewer:'Oldest to newest',
      achievements:'Achievements', achievementNote:'Recorded qualification, placement, prize, and reached-stage achievements', champion:'Champion', runnerUp:'Runner-up', thirdPlace:'3rd place', prizeWinner:'Prize winner', finalist:'Finalist', semifinalist:'Semifinalist', quarterfinalist:'Quarterfinalist', top16:'Top 16', representativeAchievement:'Representative', recommendedAchievement:'Recommended entry', recordedPlacement:'Recorded placement'
    },
    ja: {
      overviewView:'概要', littleKingsView:'リトルキングス', fieldView:'フィールド・スカウティング', matchesView:'試合',
      intelligence:'大会インテリジェンス', recordedEvidence:'登録済み情報', documentedMatches:'登録済み試合',
      lkRecord:'LK大会戦績', sets:'セット', setDifference:'セット差', closeMatches:'接戦',
      uniqueOpponents:'対戦相手数', noDocumentedMatches:'登録済み試合なし', evidenceOnly:'登録済み記録のみ',
      playerProfile:'選手プロフィール', openHeadToHead:'直接対決を開く', opponentsFaced:'対戦相手', scorelines:'スコアライン',
      scoutingWorkspace:'フィールド・スカウティング', searchField:'日本語名・ローマ字表記・クラブを検索', allDivisions:'全ての部門', allClubs:'全てのクラブ',
      allStatuses:'全ての記録状況', representativesOnly:'代表選手', knownOnly:'LK対戦記録あり', unknownOnly:'LK対戦記録なし',
      knownMeetings:'LK対戦', tournamentHistory:'大会履歴', reportedSetup:'登録済みセッティング', notRecorded:'未登録',
      category:'カテゴリ', hand:'利き手', style:'戦型', grip:'グリップ', forehand:'フォア', backhand:'バック',
      currentEvent:'対象大会', fieldEvidence:'LK対フィールド記録', matrixHelp:'セルはLK選手視点の登録済み勝敗です。練習試合と大会試合の件数は分けて表示します。',
      training:'練習', tournamentSource:'大会', combined:'合計', meetings:'対戦', lastMeeting:'最終対戦',
      winRate:'勝率', recentMeetings:'対戦履歴', source:'種類', resultLabel:'結果', noMeetings:'この2選手の登録済み対戦はありません。',
      matchFilters:'試合フィルター', allPlayers:'全てのLK選手', allRounds:'全てのラウンド', allResults:'全ての結果', wins:'LK勝利', losses:'LK敗戦',
      visibleMatches:'表示中', clearFilters:'フィルター解除', progressStatus:'進捗', participantStatus:'出場',
      dataCoverage:'登録データ範囲', coverageNote:'件数は保存済みレコードに基づき、大会の全組合せ・全試合を示すとは限りません。',
      openField:'フィールド分析を開く', openMatches:'登録済み試合を開く', externalOpponent:'外部選手', profileCompleteness:'プロフィール情報',
      eventRecord:'大会戦績', fieldPlayers:'対戦候補', knownField:'既知の相手', unknownField:'未確認の相手',
      close:'閉じる', selectLkPlayer:'リトルキングス選手を選択', h2h:'直接対決', olderToNewer:'古い順から新しい順',
      achievements:'大会実績', achievementNote:'登録済みの代表選出・順位・入賞・到達ラウンド', champion:'優勝', runnerUp:'準優勝', thirdPlace:'3位', prizeWinner:'入賞', finalist:'決勝進出', semifinalist:'準決勝進出', quarterfinalist:'準々決勝進出', top16:'ベスト16', representativeAchievement:'代表選出', recommendedAchievement:'推薦出場', recordedPlacement:'登録順位'
    }
  };
  const t = key => words[language][key] ?? intelligenceWords[language][key] ?? key;
  const tournamentGuides = {
    overview:{
      en:{title:'How to Use the Tournament Hub',intro:'Use this page to find recorded events, Little Kings entries, published results, and available preparation evidence.',read:['Participant totals count records currently entered for each event; they may not represent a complete draw.','Representative and recommended badges reproduce the recorded event information. They are not Little Kings performance ratings.','Select an event to review divisions, documented match results, and the players behind the totals.'],action:'Start with the relevant event and division, confirm the listed field, then use documented matches to prepare questions and adaptable tactics.',limit:'Do not compare events by participant count alone or assume a missing player, result, or match did not exist. It may simply not be recorded yet.'},
      ja:{title:'大会ハブの使い方',intro:'登録済みの大会、リトルキングス出場選手、公開結果、対戦準備に使える情報を確認するページです。',read:['参加者数は現在その大会に登録されているレコード数です。大会の全組合せが登録済みとは限りません。','代表・推薦バッジは登録された大会情報を表示しています。リトルキングス独自の実力評価ではありません。','大会を選ぶと、部門、登録済み試合結果、集計対象の選手を確認できます。'],action:'対象の大会・部門を開き、登録フィールドを確認してから、記録済み試合を対戦準備の質問や対応可能な戦術に変えてください。',limit:'参加者数だけで大会を比較しないでください。選手・結果・試合が表示されない場合も、存在しなかったのではなく未登録の可能性があります。'}
    },
    detail:{
      en:{title:'How to Read This Event',intro:'Read the event overview, Little Kings outcomes, documented matches, and division field as separate types of evidence.',read:['The scoreboard summarizes recorded entries, divisions, representatives, and Little Kings players. Open a division to see the underlying names.','Documented match results are actual saved event matches. A listed finish or badge is event-progress information and may exist without a match-by-match record.','Achievement highlights reproduce recorded qualification, placement, prize, or reached-stage fields only; they are never inferred from an incomplete match sequence.','Preparation coverage means a Little Kings player has a documented meeting with that opponent. Training and tournament evidence should remain separate.'],action:'Check the player, score, date, and source; then use repeated patterns to plan serve, receive, first attack, and fallback options with the coach.',limit:'A past result does not predict the next match. Fields and brackets may be incomplete, and no documented meeting means “unknown,” not “easy.”'},
      ja:{title:'大会詳細の見方',intro:'大会概要、リトルキングスの結果、登録済み試合、部門フィールドは、それぞれ別の情報として確認してください。',read:['スコアボードは登録済みの参加者、部門、代表、LK選手を集計しています。部門を開くと対象選手を確認できます。','登録済み試合結果は保存された実際の大会試合です。順位やバッジは大会進捗情報であり、試合ごとの記録がない場合もあります。','大会実績は登録済みの代表選出、順位、入賞、到達ラウンドだけを表示し、不完全な試合記録から推測しません。','対戦把握は、LK選手とその相手の記録済み対戦があることを示します。練習試合と大会試合は分けて確認してください。'],action:'選手、スコア、日付、出典を確認し、繰り返し見えるパターンをコーチとサーブ、レシーブ、先手、代替プランに変えてください。',limit:'過去結果は次の試合を予測しません。フィールドや組合せが未完成の場合があり、対戦記録なしは「不明」であって「簡単」ではありません。'}
    }
  };
  const tournamentGuide = key => window.LKHowToRead.details(tournamentGuides[key]?.[language] || tournamentGuides[key]?.en, language, 'tournament-data-guide');
  const profileImage = playerId => window.lkProfileImage ? window.lkProfileImage(playerId) : 'img/NoProfilePic.jpg';
  const participantLabel = count => `${t('participant')}${count !== 1 && language === 'en' ? 's' : ''}`;

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
  const matchRecordText = (wins, losses, games) => language === 'en' ? `${wins}W-${losses}L · ${games} matches` : `${wins}勝${losses}敗 · ${games}試合`;

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

    const lkResults = lkPlayers.sort((a, b) => (achievementsFor(a)[0]?.priority ?? 99) - (achievementsFor(b)[0]?.priority ?? 99) || (a.rank || 99) - (b.rank || 99));

    const lkResultHtml = lkResults.map(p => {
      const player = pMap.get(p.playerId);
      const name = fullName(player) || p.playerName;
      const club = player ? clubName(player.clubId, cMap) : '';
      const resultText = p.result ? escapeHtml(lookupValue('tournamentResults', p.result)) : '';
      const achievementHtml = achievementBadgesHtml(p);
      return `<span class="tc-lk-result">
        <a href="player.html?id=${p.playerId}">${escapeHtml(name)}</a>
         ${club ? `<small>${escapeHtml(club)}</small>` : ''}
          ${achievementHtml ? `<span class="tc-achievement-badges">${achievementHtml}</span>` : `<i>${escapeHtml(progressLabel(p))}</i>`}
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
                <span class="tc-meta-item">👥 ${totalParticipants} ${participantLabel(totalParticipants)}</span>
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
                    <img src="${profileImage(p.playerId)}" alt="${escapeHtml(name)}" />
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

      ${tournamentGuide('overview')}

       ${latest ? `<section class="tp-feature" data-id="${latest.tournamentId}"><div class="tp-feature-label">${t('latestEvent')}</div><div><h2>${escapeHtml(latest.name)}</h2><p>${formatDate(latest.date)} · ${escapeHtml(latest.location || '-')}</p></div><div class="tp-feature-stats"><span><b>${latestProgress.length}</b>${participantLabel(latestProgress.length)}</span><span><b>${latestProgress.filter(item => item.playerId.startsWith('LK-')).length}</b>${t('lkPlayers')}</span></div><button class="tp-feature-btn" data-id="${latest.tournamentId}">${t('explore')} →</button></section>` : ''}
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

  const participantFor = (id, pMap = playerMap(), eMap = externalMap()) => pMap.get(id) || eMap.get(id);
  const rubberName = value => {
    if (!value) return '';
    const rubber = (data.rubbers || []).find(item => item.rubberId === value || item.name === value);
    return rubber?.name || value;
  };
  const allDocumentedMatches = () => [
    ...(data.matches || []).map(match => ({ ...match, evidenceSource:'training', evidenceId:match.matchId })),
    ...(data.tournamentMatches || []).map(match => ({ ...match, evidenceSource:'tournament', evidenceId:match.tournamentMatchId }))
  ];
  const meetingsFor = (firstId, secondId) => allDocumentedMatches().filter(match =>
    (match.player1Id === firstId && match.player2Id === secondId) || (match.player1Id === secondId && match.player2Id === firstId)
  ).sort((left,right) => `${left.matchDate || ''}${left.evidenceId || ''}`.localeCompare(`${right.matchDate || ''}${right.evidenceId || ''}`));
  const matchesForPlayer = (records, id) => records.filter(match => match.player1Id === id || match.player2Id === id);
  const scoreFor = (match, id) => match.player1Id === id
    ? { own:Number(match.player1Sets) || 0, other:Number(match.player2Sets) || 0 }
    : { own:Number(match.player2Sets) || 0, other:Number(match.player1Sets) || 0 };
  const summarizeMatches = (records, id) => {
    const decided = records.filter(match => match.winnerId);
    const wins = decided.filter(match => match.winnerId === id).length;
    const losses = decided.length - wins;
    const sets = decided.reduce((total,match) => { const score=scoreFor(match,id); return { own:total.own+score.own, other:total.other+score.other }; },{own:0,other:0});
    const close = decided.filter(match => { const score=scoreFor(match,id); return Math.abs(score.own-score.other)===1; });
    const closeWins = close.filter(match => match.winnerId === id).length;
    const opponents = new Set(records.map(match => match.player1Id === id ? match.player2Id : match.player1Id));
    return { records, decided, wins, losses, setsWon:sets.own, setsLost:sets.other, setDiff:sets.own-sets.other, close:close.length, closeWins, opponents:opponents.size, winRate:decided.length?Math.round(wins/decided.length*100):0 };
  };
  const scorelineCounts = (records,id) => ['3-0','3-1','3-2','2-3','1-3','0-3'].map(scoreline => ({ scoreline, count:records.filter(match => { const score=scoreFor(match,id); return `${score.own}-${score.other}`===scoreline; }).length }));
  const recordLabel = stats => stats.decided.length ? matchRecordText(stats.wins,stats.losses,stats.decided.length) : t('noDocumentedMatches');
  const progressStatus = item => item?.recommended ? (language==='en'?'Recommended':'推薦') : item?.qualified ? t('representative') : item?.rank ? resultLabel(item.rank) : item?.result ? lookupValue('tournamentResults',item.result) : t('participantStatus');
  const achievementPriority = { champion:0, runnerUp:1, podium:2, prize:3, finalist:4, semifinalist:5, quarterfinalist:6, top16:7, placement:8, representative:9, recommended:10 };
  function achievementsFor(item){
    if(!item)return [];
    const achievements=[],add=(key,label,icon,tier=key)=>{if(!achievements.some(entry=>entry.key===key))achievements.push({key,label,icon,tier,priority:achievementPriority[tier]??99});};
    const resultId=String(item.result||''),resultText=lookupValue('tournamentResults',item.result)||'',normalized=String(resultText).toLowerCase(),resultRanks={'TP-002':1,'TP-003':2,'TP-004':3,'TP-005':4,'TP-006':5,'TP-007':6,'TP-008':7,'TP-009':8},rank=Number(item.rank)||resultRanks[resultId]||0;
    if(rank===1)add('champion',t('champion'),'🏆');
    else if(rank===2)add('runnerUp',t('runnerUp'),'🥈');
    else if(rank===3)add('thirdPlace',t('thirdPlace'),'🥉','podium');
    else if(rank>3&&rank<=8)add(`placement-${rank}`,resultLabel(rank),'🏅','placement');
    if(!rank){
      if(resultId==='TP-020'||normalized.includes('prize')||normalized.includes('award')||normalized.includes('入賞'))add('prizeWinner',t('prizeWinner'),'🏅','prize');
      else if(resultId==='TP-011'||normalized.includes('top 16')||normalized.includes('ベスト16'))add('top16',t('top16'),'⭐');
      else if(normalized.includes('quarter')||normalized.includes('準々決勝')||normalized.includes('ベスト8'))add('quarterfinalist',t('quarterfinalist'),'🎖️');
      else if(normalized.includes('semi')||normalized.includes('準決勝')||normalized.includes('ベスト4'))add('semifinalist',t('semifinalist'),'🥉');
      else if(normalized.includes('final')||normalized.includes('決勝'))add('finalist',t('finalist'),'🥈');
      else if(normalized.includes('champion')||normalized.includes('winner')||normalized==='優勝')add('champion',t('champion'),'🏆');
      else if(normalized.includes('runner-up')||normalized.includes('準優勝'))add('runnerUp',t('runnerUp'),'🥈');
    }
    if(item.qualified)add('representative',t('representativeAchievement'),'★');
    if(item.recommended)add('recommended',t('recommendedAchievement'),'◆');
    return achievements.sort((left,right)=>left.priority-right.priority);
  }
  const achievementBadgesHtml=item=>achievementsFor(item).map(achievement=>`<span class="tournament-achievement-badge ${achievement.tier}"><i aria-hidden="true">${achievement.icon}</i><b>${escapeHtml(achievement.label)}</b></span>`).join('');
  const divisionForMatch = (match,tProgress) => {
    const first=tProgress.find(item=>item.playerId===match.player1Id)?.division, second=tProgress.find(item=>item.playerId===match.player2Id)?.division;
    return first===second ? first || '' : first || second || '';
  };
  const setDetailUrl = (tournamentId=activeTournamentId,view=activeDetailView,mode='push') => {
    const url=new URL(location.href);
    if(tournamentId){url.searchParams.set('event',tournamentId);url.searchParams.set('view',view);}else{url.searchParams.delete('event');url.searchParams.delete('view');}
    url.searchParams.delete('id');
    history[mode==='replace'?'replaceState':'pushState'](null,'',url);
  };
  const initials = person => (person?.displayName || '?').replace(/[\s()（）]/g,'').slice(0,2);
  const setupFields = person => [
    [t('category'),lookupValue('schoolLevels',person?.schoolLevel)],
    [t('grade'),lookupValue('grades',person?.grade)],
    [t('hand'),lookupValue('playingHands',person?.playingHand)],
    [t('style'),lookupValue('playingStyles',person?.playingStyle)],
    [t('grip'),lookupValue('grips',person?.grip)],
    [t('forehand'),rubberName(person?.forehandRubber)],
    [t('backhand'),rubberName(person?.backhandRubber)]
  ];

  function ensureTournamentDialogs(){
    if(!document.querySelector('#tournament-opponent-dialog')) document.body.insertAdjacentHTML('beforeend','<dialog id="tournament-opponent-dialog" class="tournament-intelligence-dialog"><button class="modal-close" type="button" aria-label="Close">×</button><div></div></dialog>');
    document.querySelectorAll('.tournament-intelligence-dialog').forEach(dialog=>{
      if(dialog.dataset.ready)return; dialog.dataset.ready='true';
      dialog.querySelector('.modal-close').onclick=()=>dialog.close();
      dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
      dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
    });
  }

  function openOpponentCard(opponentId,tournamentId=activeTournamentId){
    ensureTournamentDialogs();
    const dialog=document.querySelector('#tournament-opponent-dialog'),target=dialog.querySelector(':scope > div'),person=externalMap().get(opponentId);
    if(!person)return;
    const cMap=clubMap(),current=progress.find(item=>item.tournamentId===tournamentId&&item.playerId===opponentId),historyRecords=progress.filter(item=>item.playerId===opponentId).sort((a,b)=>(tournaments.find(t=>t.tournamentId===b.tournamentId)?.date||'').localeCompare(tournaments.find(t=>t.tournamentId===a.tournamentId)?.date||'')),lkMeetings=allDocumentedMatches().filter(match=>(match.player1Id===opponentId&&match.player2Id?.startsWith('LK-'))||(match.player2Id===opponentId&&match.player1Id?.startsWith('LK-'))),lkIds=[...new Set(lkMeetings.map(match=>match.player1Id===opponentId?match.player2Id:match.player1Id))],reported=setupFields(person).filter(([,value])=>value).length;
    const historyHtml=historyRecords.map(item=>{const event=tournaments.find(tournament=>tournament.tournamentId===item.tournamentId);return `<li><button type="button" data-open-event="${escapeHtml(item.tournamentId)}"><b>${escapeHtml(event?.name||item.tournamentId)}</b><span>${escapeHtml(event?.date||'')} · ${escapeHtml(item.division||'')} · ${escapeHtml(progressStatus(item))}</span></button></li>`;}).join('')||`<li>${t('notRecorded')}</li>`;
    const meetingHtml=lkIds.map(lkId=>{const lk=playerMap().get(lkId),records=meetingsFor(lkId,opponentId),stats=summarizeMatches(records,lkId);return `<li><button type="button" data-h2h-lk="${escapeHtml(lkId)}" data-h2h-opponent="${escapeHtml(opponentId)}"><b>${escapeHtml(fullName(lk)||lkId)}</b><span>${escapeHtml(recordLabel(stats))} · ${records.filter(item=>item.evidenceSource==='training').length} ${t('training')} / ${records.filter(item=>item.evidenceSource==='tournament').length} ${t('tournamentSource')}</span></button></li>`;}).join('')||`<li>${t('noMeetings')}</li>`;
    target.innerHTML=`<section class="opponent-profile-card"><header><span class="opponent-monogram" aria-hidden="true">${escapeHtml(initials(person))}</span><div><p class="eyebrow">${t('externalOpponent')}</p><h2>${escapeHtml(fullName(person))}</h2><span>${escapeHtml(clubName(person.clubId,cMap)||t('notRecorded'))}</span></div>${current?.qualified?`<b class="qual-badge">${t('representative')}</b>`:''}</header><div class="opponent-profile-kpis"><span><small>${t('currentEvent')}</small><b>${escapeHtml(progressStatus(current))}</b></span><span><small>${t('knownMeetings')}</small><b>${lkMeetings.length}</b></span><span><small>${t('tournamentHistory')}</small><b>${historyRecords.length}</b></span><span><small>${t('profileCompleteness')}</small><b>${reported}/7</b></span></div><section><h3>${t('reportedSetup')}</h3><dl>${setupFields(person).map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value||t('notRecorded'))}</dd></div>`).join('')}</dl></section><section><h3>${t('knownMeetings')}</h3><ul class="opponent-evidence-list">${meetingHtml}</ul></section><section><h3>${t('tournamentHistory')}</h3><ul class="opponent-evidence-list">${historyHtml}</ul></section></section>`;
    target.querySelectorAll('[data-h2h-lk]').forEach(button=>button.onclick=()=>openHeadToHead(button.dataset.h2hLk,button.dataset.h2hOpponent));
    target.querySelectorAll('[data-open-event]').forEach(button=>button.onclick=()=>{dialog.close();activeTournamentId=button.dataset.openEvent;activeDetailView='overview';setDetailUrl();showTournamentDetail(activeTournamentId);});
    dialog.querySelector('.modal-close').setAttribute('aria-label',t('close')); document.body.classList.add('modal-open'); dialog.showModal();
  }

  function openHeadToHead(lkId,opponentId){
    document.querySelector('#tournament-opponent-dialog')?.close();
    window.LKHeadToHead?.open({ data, playerId:lkId, opponentId, language });
  }

  function eventSummary(tournamentMatches,lkPlayers){
    const participations=lkPlayers.flatMap(item=>matchesForPlayer(tournamentMatches,item.playerId).map(match=>({match,id:item.playerId}))), wins=participations.filter(item=>item.match.winnerId===item.id).length, losses=participations.filter(item=>item.match.winnerId&&item.match.winnerId!==item.id).length, sets=participations.reduce((total,item)=>{const score=scoreFor(item.match,item.id);return {won:total.won+score.own,lost:total.lost+score.other};},{won:0,lost:0}), close=participations.filter(item=>{const score=scoreFor(item.match,item.id);return Math.abs(score.own-score.other)===1;}).length, opponents=new Set(participations.map(item=>item.match.player1Id===item.id?item.match.player2Id:item.match.player1Id));
    return {wins,losses,setsWon:sets.won,setsLost:sets.lost,setDiff:sets.won-sets.lost,close,opponents:opponents.size,participations:participations.length};
  }
  const eventKpisHtml=(tProgress,divisions,lkPlayers,tournamentMatches)=>{const summary=eventSummary(tournamentMatches,lkPlayers);return `<div class="detail-scoreboard tournament-intelligence-kpis"><div><small>${t('field')}</small><b>${tProgress.length}</b></div><div><small>${t('divisions')}</small><b>${divisions.length}</b></div><div><small>${t('qualifiers')}</small><b>${tProgress.filter(item=>item.qualified).length}</b></div><div><small>${t('documentedMatches')}</small><b>${tournamentMatches.length}</b></div><div><small>${t('lkRecord')}</small><b>${summary.wins}-${summary.losses}</b></div><div><small>${t('setDifference')}</small><b>${summary.setDiff>0?'+':''}${summary.setDiff}</b></div></div>`;};
  function renderAchievementSection(lkPlayers){
    const pMap=playerMap(),achieved=lkPlayers.map(item=>({item,achievements:achievementsFor(item)})).filter(entry=>entry.achievements.length).sort((left,right)=>left.achievements[0].priority-right.achievements[0].priority);
    if(!achieved.length)return '';
    const cards=achieved.map(({item,achievements})=>{const person=pMap.get(item.playerId),name=fullName(person)||item.playerName||item.playerId,primary=achievements[0];return `<a class="tournament-achievement-card ${primary.tier}" href="player.html?id=${encodeURIComponent(item.playerId)}"><span class="tournament-achievement-icon" aria-hidden="true">${primary.icon}</span><span class="tournament-achievement-person"><small>${escapeHtml(item.division||'')}</small><b>${escapeHtml(name)}</b></span><span class="tournament-achievement-badges">${achievementBadgesHtml(item)}</span></a>`;}).join('');
    return `<section class="tournament-achievements"><header><div><p class="eyebrow">${t('achievements')}</p><h2>${t('achievements')}</h2></div><span>${t('achievementNote')}</span></header><div>${cards}</div></section>`;
  }

  function renderOverviewView(tournament,tProgress,divisions,lkPlayers,tournamentMatches){
    const summary=eventSummary(tournamentMatches,lkPlayers),divisionCards=divisions.map(division=>{const entries=tProgress.filter(item=>item.division===division);return `<button type="button" data-open-view="field"><small>${t('division')}</small><b>${escapeHtml(division)}</b><span>${entries.length} ${participantLabel(entries.length)} · ${entries.filter(item=>item.qualified).length} ${t('qualifiers')}</span></button>`;}).join(''),recent=tournamentMatches.slice(-4).reverse().map(match=>renderTournamentMatchCard(match,tournament,tProgress)).join('');
    return `${eventKpisHtml(tProgress,divisions,lkPlayers,tournamentMatches)}${tournamentGuide('detail')}${renderAchievementSection(lkPlayers)}<section class="tournament-coverage-note"><div><p class="eyebrow">${t('dataCoverage')}</p><h2>${t('recordedEvidence')}</h2></div><p>${t('coverageNote')}</p></section><section class="tournament-overview-analysis"><article><small>${t('lkRecord')}</small><b>${summary.wins}-${summary.losses}</b><span>${summary.participations} ${t('documentedMatches')}</span></article><article><small>${t('sets')}</small><b>${summary.setsWon}-${summary.setsLost}</b><span>${summary.setDiff>0?'+':''}${summary.setDiff} ${t('setDifference')}</span></article><article><small>${t('closeMatches')}</small><b>${summary.close}</b><span>${t('evidenceOnly')}</span></article><article><small>${t('uniqueOpponents')}</small><b>${summary.opponents}</b><span>${t('evidenceOnly')}</span></article></section>${tournament.notes?`<div class="detail-notes"><h3>${t('notes')}</h3><p>${escapeHtml(tournament.notes)}</p></div>`:''}<section class="tournament-overview-divisions"><header><p class="eyebrow">${t('divisions')}</p><h2>${t('field')}</h2></header><div>${divisionCards}</div></section>${recent?`<section class="tournament-overview-recent"><header><div><p class="eyebrow">${t('documentedMatches')}</p><h2>${t('recordedEvidence')}</h2></div><button type="button" data-open-view="matches">${t('openMatches')} →</button></header><div class="match-list tournament-match-list">${recent}</div></section>`:''}`;
  }

  function renderLittleKingsView(tournament,tProgress,lkPlayers,tournamentMatches){
    if(!lkPlayers.length)return `<p class="tp-empty">${t('noLKPlayers')}</p>`;
    const pMap=playerMap(),cards=lkPlayers.map(item=>{
      const person=pMap.get(item.playerId),name=fullName(person)||item.playerName,records=matchesForPlayer(tournamentMatches,item.playerId),stats=summarizeMatches(records,item.playerId),scorelines=scorelineCounts(records,item.playerId).filter(entry=>entry.count),opponents=[...new Set(records.map(match=>match.player1Id===item.playerId?match.player2Id:match.player1Id))],achievementHtml=achievementBadgesHtml(item);
      return `<article class="tournament-lk-intel-card ${achievementHtml?'has-achievement':''}"><header><img src="${profileImage(item.playerId)}" alt="${escapeHtml(name)}"><div><p>${escapeHtml(item.division||'')}</p><h2>${escapeHtml(name)}</h2>${achievementHtml?'':`<span>${escapeHtml(progressStatus(item))}</span>`}</div><a href="player.html?id=${escapeHtml(item.playerId)}">${t('playerProfile')} →</a></header>${achievementHtml?`<div class="tournament-lk-achievements"><small>${t('achievements')}</small><div>${achievementHtml}</div></div>`:''}<div class="tournament-lk-stat-grid"><span><small>${t('eventRecord')}</small><b>${stats.wins}-${stats.losses}</b></span><span><small>${t('sets')}</small><b>${stats.setsWon}-${stats.setsLost}</b></span><span><small>${t('setDifference')}</small><b>${stats.setDiff>0?'+':''}${stats.setDiff}</b></span><span><small>${t('closeMatches')}</small><b>${stats.close?`${stats.closeWins}-${stats.close-stats.closeWins}`:'—'}</b></span></div><div class="tournament-lk-scorelines"><small>${t('scorelines')}</small>${scorelines.map(entry=>`<span class="${entry.scoreline.startsWith('3-')?'win':'loss'}"><b>${entry.scoreline}</b>${entry.count}</span>`).join('')||`<em>${t('noDocumentedMatches')}</em>`}</div><section><h3>${t('opponentsFaced')}</h3><div class="tournament-lk-opponents">${opponents.map(opponentId=>{const opponent=participantFor(opponentId),meeting=meetingsFor(item.playerId,opponentId),eventMeeting=meeting.filter(record=>record.evidenceSource==='tournament'&&record.tournamentId===tournament.tournamentId),label=fullName(opponent)||opponentId;return `<button type="button" ${opponentId.startsWith('EXT-')?`data-h2h-lk="${escapeHtml(item.playerId)}" data-h2h-opponent="${escapeHtml(opponentId)}"`:''}><b>${escapeHtml(label)}</b><span>${eventMeeting.map(match=>{const score=scoreFor(match,item.playerId);return `${score.own}-${score.other}`;}).join(', ')||t('noDocumentedMatches')}</span></button>`;}).join('')||`<p>${t('noDocumentedMatches')}</p>`}</div></section></article>`;
    }).join('');
    return `<section class="tournament-view-heading"><p class="eyebrow">${t('littleKingsView')}</p><h2>${lkClubLabel(clubMap())}</h2><p>${t('coverageNote')}</p></section><div class="tournament-lk-intel-grid">${cards}</div>`;
  }

  function externalKnownMeetings(opponentId,lkIds){return lkIds.flatMap(lkId=>meetingsFor(lkId,opponentId));}
  function renderFieldView(tournament,tProgress,lkPlayers){
    const eMap=externalMap(),cMap=clubMap(),lkIds=lkPlayers.map(item=>item.playerId),opponents=tProgress.filter(item=>item.playerId.startsWith('EXT-')),divisions=[...new Set(opponents.map(item=>item.division).filter(Boolean))],clubs=[...new Set(opponents.map(item=>item.clubName||clubName(eMap.get(item.playerId)?.clubId,cMap)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja')),cards=opponents.map(item=>{const person=eMap.get(item.playerId)||{displayName:item.playerName},club=item.clubName||clubName(person.clubId,cMap),meetings=externalKnownMeetings(item.playerId,lkIds),known=meetings.length>0,reported=setupFields(person).filter(([,value])=>value).length,searchText=window.LKData.playerSearchText(person,item.playerName,club,item.division,item.playerId);return `<button type="button" class="tournament-opponent-card" data-opponent-id="${escapeHtml(item.playerId)}" data-player-search="${escapeHtml(searchText)}" data-division="${escapeHtml(item.division||'')}" data-club="${escapeHtml(club||'')}" data-known="${known?'known':'unknown'}" data-qualified="${item.qualified?'true':'false'}"><span class="opponent-monogram" aria-hidden="true">${escapeHtml(initials(person))}</span><span class="tournament-opponent-main"><small>${escapeHtml(club||t('notRecorded'))}</small><b>${escapeHtml(fullName(person)||item.playerName||item.playerId)}</b><em>${escapeHtml(item.division||'')}</em></span><span class="tournament-opponent-evidence"><b>${escapeHtml(progressStatus(item))}</b><small>${meetings.length} ${t('knownMeetings')} · ${reported}/7 ${t('profileCompleteness')}</small></span></button>`;}).join('');
    const matrixRows=opponents.map(item=>{const person=eMap.get(item.playerId)||{displayName:item.playerName},club=item.clubName||clubName(person.clubId,cMap),cells=lkPlayers.map(lk=>{const records=meetingsFor(lk.playerId,item.playerId),stats=summarizeMatches(records,lk.playerId),training=records.filter(record=>record.evidenceSource==='training').length,eventRecords=records.filter(record=>record.evidenceSource==='tournament').length;return records.length?`<td><button type="button" data-h2h-lk="${escapeHtml(lk.playerId)}" data-h2h-opponent="${escapeHtml(item.playerId)}"><b>${stats.wins}-${stats.losses}</b><small>${training}T · ${eventRecords}O</small></button></td>`:'<td class="empty">—</td>';}).join('');return `<tr data-matrix-opponent="${escapeHtml(item.playerId)}"><th><button type="button" data-opponent-id="${escapeHtml(item.playerId)}"><b>${escapeHtml(fullName(person)||item.playerName||item.playerId)}</b><small>${escapeHtml(club||'')}</small></button></th>${cells}</tr>`;}).join('');
    return `<section class="tournament-view-heading"><p class="eyebrow">${t('scoutingWorkspace')}</p><h2>${t('fieldView')}</h2><p>${t('coverageNote')}</p></section><div class="tournament-field-kpis"><span><small>${t('fieldPlayers')}</small><b>${opponents.length}</b></span><span><small>${t('knownField')}</small><b>${opponents.filter(item=>externalKnownMeetings(item.playerId,lkIds).length).length}</b></span><span><small>${t('unknownField')}</small><b>${opponents.filter(item=>!externalKnownMeetings(item.playerId,lkIds).length).length}</b></span><span><small>${t('qualifiers')}</small><b>${opponents.filter(item=>item.qualified).length}</b></span></div><section class="tournament-field-controls" aria-label="${t('scoutingWorkspace')}"><label><span>${t('searchField')}</span><input id="tournament-field-query" type="search"></label><label><span>${t('division')}</span><select id="tournament-field-division"><option value="">${t('allDivisions')}</option>${divisions.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select></label><label><span>${t('club')}</span><select id="tournament-field-club"><option value="">${t('allClubs')}</option>${clubs.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select></label><label><span>${t('recordedEvidence')}</span><select id="tournament-field-status"><option value="">${t('allStatuses')}</option><option value="qualified">${t('representativesOnly')}</option><option value="known">${t('knownOnly')}</option><option value="unknown">${t('unknownOnly')}</option></select></label><span id="tournament-field-visible">${opponents.length} ${participantLabel(opponents.length)}</span></section><div class="tournament-opponent-grid">${cards}</div><p class="tournament-filter-empty" id="tournament-field-empty" hidden>${t('noData')}</p><details class="tournament-field-matrix"><summary><span><b>${t('fieldEvidence')}</b><small>${t('matrixHelp')}</small></span></summary><div><table><thead><tr><th>${t('externalOpponent')}</th>${lkPlayers.map(item=>`<th>${escapeHtml(fullName(playerMap().get(item.playerId))||item.playerName)}</th>`).join('')}</tr></thead><tbody>${matrixRows}</tbody></table></div></details>`;
  }

  function renderTournamentMatchCard(match,tournament,tProgress){
    const pMap=playerMap(),eMap=externalMap(),first=participantFor(match.player1Id,pMap,eMap),second=participantFor(match.player2Id,pMap,eMap),firstName=match.player1Name||fullName(first)||match.player1Id,secondName=match.player2Name||fullName(second)||match.player2Id,firstWon=match.winnerId===match.player1Id,secondWon=match.winnerId===match.player2Id,lkIds=[match.player1Id,match.player2Id].filter(id=>id.startsWith('LK-')),externalId=[match.player1Id,match.player2Id].find(id=>id.startsWith('EXT-')),lkId=lkIds[0],division=divisionForMatch(match,tProgress),lkWon=Boolean(lkId&&match.winnerId===lkId),result=lkId?(lkWon?'win':'loss'):'other';
    const nameHtml=(id,name)=>id.startsWith('LK-')?`<a href="player.html?id=${encodeURIComponent(id)}">${escapeHtml(name)}</a>`:`<button type="button" data-opponent-id="${escapeHtml(id)}">${escapeHtml(name)}</button>`,dot=won=>`<i class="game-result-dot ${won?'win':'loss'}">${won?'W':'L'}</i>`,reflectLinks=lkIds.map(id=>`<a class="tournament-reflection-link" href="feedback.html?mode=match&matchType=tournament&matchId=${encodeURIComponent(match.tournamentMatchId)}&player=${encodeURIComponent(id)}">${language==='en'?'Reflect':'振り返り'} · ${escapeHtml(id===match.player1Id?firstName:secondName)}</a>`).join(''),reflections=(data.matchFeedback||[]).filter(item=>item.matchType==='tournament'&&item.matchId===match.tournamentMatchId),reflectionHtml=reflections.length?`<div class="tournament-match-reflections">${reflections.map(item=>`<details><summary>${language==='en'?'Player reflection':'選手振り返り'} · ${escapeHtml(item.playerName||item.playerId)}</summary><small>${language==='en'?'What worked':'機能したこと'}</small><p>${escapeHtml(item.whatWorked)}</p><small>${language==='en'?'Main difficulty':'一番難しかったこと'}</small><p>${escapeHtml(item.challenge)}</p><small>${language==='en'?'Next-match plan':'次の対戦プラン'}</small><p>${escapeHtml(item.nextPlan)}</p></details>`).join('')}</div>`:'';
    const matchSearch=window.LKData.searchText(window.LKData.playerSearchText(first,firstName,match.player1Id),window.LKData.playerSearchText(second,secondName,match.player2Id),division,match.round);
    return `<article class="match-card tournament-match-card" data-match-search="${escapeHtml(matchSearch)}" data-match-lk="${escapeHtml(lkIds.join(' '))}" data-match-round="${escapeHtml(match.round||'')}" data-match-result="${result}"><div class="match-meta"><span>${formatDateShort(match.matchDate)}</span><span class="badge tournament">${escapeHtml(match.round||t('tournamentSource'))}</span></div><div class="match-score"><span class="match-player ${firstWon?'winner':'loser'}">${dot(firstWon)}${nameHtml(match.player1Id,firstName)}</span><strong class="score">${match.player1Sets} <i>:</i> ${match.player2Sets}</strong><span class="match-player ${secondWon?'winner':'loser'}">${dot(secondWon)}${nameHtml(match.player2Id,secondName)}</span></div><div class="match-context"><span>${escapeHtml(division||tournament.name)}</span><b></b></div>${lkId&&externalId?`<button type="button" class="tournament-h2h-open" data-h2h-lk="${escapeHtml(lkId)}" data-h2h-opponent="${escapeHtml(externalId)}">${t('openHeadToHead')} →</button>`:''}${reflectLinks?`<div class="tournament-reflection-actions">${reflectLinks}</div>`:''}${reflectionHtml}</article>`;
  }

  function renderMatchesView(tournament,tProgress,lkPlayers,tournamentMatches){
    const rounds=[...new Set(tournamentMatches.map(match=>match.round).filter(Boolean))],cards=tournamentMatches.map(match=>renderTournamentMatchCard(match,tournament,tProgress)).join('');
    return `<section class="tournament-view-heading"><p class="eyebrow">${t('documentedMatches')}</p><h2>${t('matchesView')}</h2><p>${t('coverageNote')}</p></section><section class="tournament-match-filters"><label><span>${t('searchField')}</span><input id="tournament-match-query" type="search"></label><label><span>${t('lkPlayers')}</span><select id="tournament-match-player"><option value="">${t('allPlayers')}</option>${lkPlayers.map(item=>`<option value="${escapeHtml(item.playerId)}">${escapeHtml(fullName(playerMap().get(item.playerId))||item.playerName)}</option>`).join('')}</select></label><label><span>${language==='en'?'Round':'ラウンド'}</span><select id="tournament-match-round"><option value="">${t('allRounds')}</option>${rounds.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select></label><label><span>${t('resultLabel')}</span><select id="tournament-match-result"><option value="">${t('allResults')}</option><option value="win">${t('wins')}</option><option value="loss">${t('losses')}</option></select></label><button type="button" id="tournament-match-clear">${t('clearFilters')}</button><span id="tournament-match-visible">${tournamentMatches.length} ${t('visibleMatches')}</span></section>${tournamentMatches.length?`<section class="tournament-match-results tournament-intelligence-results"><div class="match-list tournament-match-list">${cards}</div></section>`:`<p class="tp-empty">${t('noDocumentedMatches')}</p>`}<p class="tournament-filter-empty" id="tournament-match-empty" hidden>${t('noDocumentedMatches')}</p>`;
  }

  function applyFieldFilters(){
    const query=(document.querySelector('#tournament-field-query')?.value||'').trim(),division=document.querySelector('#tournament-field-division')?.value||'',club=document.querySelector('#tournament-field-club')?.value||'',status=document.querySelector('#tournament-field-status')?.value||'';let visible=0;
    app.querySelectorAll('.tournament-opponent-card').forEach(card=>{const statusMatch=!status||(status==='qualified'&&card.dataset.qualified==='true')||(status===card.dataset.known),show=window.LKData.matchesSearch(card.dataset.playerSearch,query)&&(!division||card.dataset.division===division)&&(!club||card.dataset.club===club)&&statusMatch;card.hidden=!show;if(show)visible++;app.querySelector(`[data-matrix-opponent="${CSS.escape(card.dataset.opponentId)}"]`)?.toggleAttribute('hidden',!show);});
    const count=document.querySelector('#tournament-field-visible');if(count)count.textContent=`${visible} ${participantLabel(visible)}`;const empty=document.querySelector('#tournament-field-empty');if(empty)empty.hidden=visible!==0;
  }
  function applyMatchFilters(){
    const query=(document.querySelector('#tournament-match-query')?.value||'').trim(),player=document.querySelector('#tournament-match-player')?.value||'',round=document.querySelector('#tournament-match-round')?.value||'',result=document.querySelector('#tournament-match-result')?.value||'';let visible=0;
    app.querySelectorAll('.tournament-match-card').forEach(card=>{const show=window.LKData.matchesSearch(card.dataset.matchSearch,query)&&(!player||card.dataset.matchLk.split(' ').includes(player))&&(!round||card.dataset.matchRound===round)&&(!result||card.dataset.matchResult===result);card.hidden=!show;if(show)visible++;});
    const count=document.querySelector('#tournament-match-visible');if(count)count.textContent=`${visible} ${t('visibleMatches')}`;const empty=document.querySelector('#tournament-match-empty');if(empty)empty.hidden=visible!==0;
  }

  // ─── Tournament Detail View ───
  function showTournamentDetail(tournamentId,pushState=false){
    const tournament=tournaments.find(item=>item.tournamentId===tournamentId);if(!tournament){activeTournamentId='';render();return;}
    activeTournamentId=tournamentId;if(pushState)setDetailUrl(tournamentId,activeDetailView);
    const tProgress=progress.filter(item=>item.tournamentId===tournamentId),divisions=[...new Set(tProgress.map(item=>item.division).filter(Boolean))],lkPlayers=tProgress.filter(item=>item.playerId.startsWith('LK-')),tournamentMatches=(data.tournamentMatches||[]).filter(match=>match.tournamentId===tournamentId).sort((left,right)=>`${left.matchDate||''}${left.tournamentMatchId||''}`.localeCompare(`${right.matchDate||''}${right.tournamentMatchId||''}`)),views={overview:()=>renderOverviewView(tournament,tProgress,divisions,lkPlayers,tournamentMatches),'little-kings':()=>renderLittleKingsView(tournament,tProgress,lkPlayers,tournamentMatches),field:()=>renderFieldView(tournament,tProgress,lkPlayers),matches:()=>renderMatchesView(tournament,tProgress,lkPlayers,tournamentMatches)},viewHtml=(views[activeDetailView]||views.overview)();
    app.innerHTML=`<section class="tp-hero tp-hero-detail"><div class="tp-hero-inner"><button class="back-btn" id="back-to-list">← ${t('backToList')}</button><p class="eyebrow">${t('intelligence')}</p><h1>${escapeHtml(tournament.name)}</h1><div class="detail-meta"><span class="detail-meta-item"><b>${t('date')}</b> ${formatDate(tournament.date)}</span><span class="detail-meta-item"><b>${t('location')}</b> ${escapeHtml(tournament.location||'-')}</span>${tournament.format?`<span class="detail-meta-item"><b>${t('format')}</b> ${escapeHtml(tournament.format)}</span>`:''}<span class="detail-meta-item"><b>${t('totalPlayers')}</b> ${tProgress.length}</span></div></div></section><nav class="tournament-detail-tabs" aria-label="${t('intelligence')}">${[['overview','overviewView'],['little-kings','littleKingsView'],['field','fieldView'],['matches','matchesView']].map(([id,label])=>`<button type="button" data-detail-view="${id}" class="${activeDetailView===id?'active':''}" aria-current="${activeDetailView===id?'page':'false'}">${t(label)}</button>`).join('')}</nav><section class="detail-content tournament-detail-view" data-view="${activeDetailView}">${viewHtml}</section>`;
    document.querySelector('#back-to-list').onclick=()=>{activeTournamentId='';activeDetailView='overview';setDetailUrl('','','push');render();};
    app.querySelectorAll('[data-detail-view]').forEach(button=>button.onclick=()=>{activeDetailView=button.dataset.detailView;setDetailUrl(tournamentId,activeDetailView);showTournamentDetail(tournamentId);window.scrollTo({top:document.querySelector('.tournament-detail-tabs').offsetTop-90,behavior:'smooth'});});
    app.querySelectorAll('[data-open-view]').forEach(button=>button.onclick=()=>{activeDetailView=button.dataset.openView;setDetailUrl(tournamentId,activeDetailView);showTournamentDetail(tournamentId);});
    app.querySelectorAll('[data-opponent-id]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();openOpponentCard(button.dataset.opponentId,tournamentId);});
    app.querySelectorAll('[data-h2h-lk]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();openHeadToHead(button.dataset.h2hLk,button.dataset.h2hOpponent);});
    ['#tournament-field-query','#tournament-field-division','#tournament-field-club','#tournament-field-status'].forEach(selector=>document.querySelector(selector)?.addEventListener(selector.includes('query')?'input':'change',applyFieldFilters));
    ['#tournament-match-query','#tournament-match-player','#tournament-match-round','#tournament-match-result'].forEach(selector=>document.querySelector(selector)?.addEventListener(selector.includes('query')?'input':'change',applyMatchFilters));
    document.querySelector('#tournament-match-clear')?.addEventListener('click',()=>{['#tournament-match-query','#tournament-match-player','#tournament-match-round','#tournament-match-result'].forEach(selector=>{const input=document.querySelector(selector);if(input)input.value='';});applyMatchFilters();});
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
    if (activeTournamentId && tournaments.some(item => item.tournamentId === activeTournamentId)) {
      showTournamentDetail(activeTournamentId);
      return;
    }
    app.innerHTML = renderTournamentList();

    // Calendar dot clicks
    app.querySelectorAll('.cal-dot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tournament = tournaments.find(t => t.date === btn.dataset.date);
        if (tournament) { activeDetailView = 'overview'; showTournamentDetail(tournament.tournamentId, true); }
      });
    });
    app.querySelectorAll('.tp-feature, .tp-feature-btn').forEach(item => {
      item.addEventListener('click', event => {
        event.stopPropagation();
        const tournament = tournaments.find(entry => entry.tournamentId === item.dataset.id);
        if (tournament) { activeDetailView = 'overview'; showTournamentDetail(tournament.tournamentId, true); }
      });
    });

    // Card clicks
    app.querySelectorAll('.tc').forEach(card => {
      card.addEventListener('click', e => {
        // Don't navigate if clicking a link inside the card
        if (e.target.closest('a')) return;
        activeDetailView = 'overview'; showTournamentDetail(card.dataset.id, true);
      });
    });

    // View detail buttons
    app.querySelectorAll('.tc-view-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        activeDetailView = 'overview'; showTournamentDetail(btn.dataset.id, true);
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
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(location.search);
    activeTournamentId = params.get('event') || params.get('id') || '';
    activeDetailView = ['overview','little-kings','field','matches'].includes(params.get('view')) ? params.get('view') : 'overview';
    document.querySelectorAll('.tournament-intelligence-dialog[open]').forEach(dialog => dialog.close());
    render();
  });

  init();
})();
