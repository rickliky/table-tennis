(() => {
  'use strict';

  const app = document.querySelector('#admin-app');
  let language = localStorage.getItem('lk-language') || 'ja';
  const S = window.LK_STATIC || {};
  const bilingual = item => {
    // If name already contains " / " it's pre-bilingual (e.g. "ドライブ攻撃型 / Topspin attacker")
    if (item.name && item.name.includes(' / ')) return item.name;
    if (item.nameJa && item.nameEn) return `${item.nameJa} / ${item.nameEn}`;
    if (item.nameJa) return item.nameJa;
    if (item.nameEn) return item.nameEn;
    return item.name || item.id;
  };
  const toOpts = (list, empty) => {
    const opts = (list || []).map(x => ({ id: x.id, name: bilingual(x) }));
    return empty !== false ? [{ id: '', name: '' }, ...opts] : opts;
  };
  const genderOpts = toOpts(S.genders);
  const schoolLevelOpts = toOpts(S.schoolLevels);
  const playingHandOpts = toOpts(S.playingHands);
  const gripOpts = toOpts(S.grips);
  const playingStyleOpts = toOpts(S.playingStyles);
  const rubberTypeOpts = toOpts(S.rubberTypes);
  const statusOpts = toOpts(S.statuses, false);
  const gradeOpts = toOpts(S.grades);
  const roundOpts = toOpts(S.tournamentRounds);
  const resultOpts = toOpts(S.tournamentResults);
  const resultStatusOpts = toOpts(S.resultStatuses);
  const resultStatusId = value => resolveFieldValue('resultStatuses', value);
  const completedStatusId = (S.resultStatuses || []).find(x => x.nameEn === 'Completed' || x.name === 'Completed')?.id || 'Completed';
  const incompleteStatusId = (S.resultStatuses || []).find(x => x.nameEn === 'Incomplete' || x.name === 'Incomplete')?.id || 'Incomplete';
  const isIncompleteStatus = value => resultStatusId(value) === incompleteStatusId;
  const statusLabel = value => lookupName('resultStatuses', value);

  const playerFields = [['playerId', '選手ID / Player ID', 'text', true], ['clubId', 'クラブID / Club ID', 'select', true], ['displayName', '表示名 / Display name', 'text', true], ['englishName', 'ローマ字表記 / Romanized name', 'text'], ['notebookName', 'ノートブック名 / Player Name (Notebook)', 'text'], ['gender', '性別 / Gender', 'select', false, genderOpts], ['schoolLevel', 'カテゴリ / School level', 'select', false, schoolLevelOpts], ['grade', '学年 / Grade', 'select', false, gradeOpts], ['playingHand', '利き手 / Playing hand', 'select', false, playingHandOpts], ['grip', 'グリップ / Grip', 'select', false, gripOpts], ['playingStyle', '戦型 / Playing style', 'select', false, playingStyleOpts], ['forehandRubberType', 'フォア面種類 / Forehand type', 'select', false, rubberTypeOpts], ['forehandRubber', 'フォア面ラバー / Forehand rubber', 'rubber'], ['backhandRubberType', 'バック面種類 / Backhand type', 'select', false, rubberTypeOpts], ['backhandRubber', 'バック面ラバー / Backhand rubber', 'rubber'], ['status', '状態 / Status', 'select', true, statusOpts]];
  const rubberName = id => { if (!id) return ''; const r = (window.RUBBERS || []).find(x => x.rubberId === id); return r ? r.name : id; };
  const rubberIdByName = name => { if (!name) return ''; const r = (window.RUBBERS || []).find(x => x.name === name); return r ? r.rubberId : name; };
  const lookupName = (table, id) => {
    if (!id) return '';
    const entry = (S[table] || []).find(x => x.id === id);
    if (entry) return bilingual(entry);
    // Backward compat: if id is a display text, try to find it
    const byName = (S[table] || []).find(x => x.name === id || x.nameJa === id || x.nameEn === id);
    return byName ? bilingual(byName) : id;
  };
  const resolveFieldValue = (table, value) => {
    if (!value) return '';
    // Already an ID
    if ((S[table] || []).some(x => x.id === value)) return value;
    // Backward compat: text value → find ID
    const byName = (S[table] || []).find(x => x.name === value || x.nameJa === value || x.nameEn === value || `${x.nameJa || ''} / ${x.nameEn || ''}` === value);
    return byName ? byName.id : value;
  };
  const FIELD_TABLE_MAP = { gender: 'genders', schoolLevel: 'schoolLevels', playingHand: 'playingHands', grip: 'grips', playingStyle: 'playingStyles', status: 'statuses', grade: 'grades', forehandRubberType: 'rubberTypes', backhandRubberType: 'rubberTypes', round: 'tournamentRounds', result: 'tournamentResults', resultStatus: 'resultStatuses' };
  const displayValue = (field, val) => {
    if (val === '' || val == null) return String(val);
    if (field === 'forehandRubber' || field === 'backhandRubber') return rubberName(val);
    const tbl = FIELD_TABLE_MAP[field];
    if (tbl) {
      const entries = window.LK_STATIC?.[tbl] || [];
      const entry = entries.find(x => x.id === val);
      if (entry) return bilingual(entry);
      const byName = entries.find(x => x.name === val || x.nameJa === val || x.nameEn === val);
      if (byName) return bilingual(byName);
    }
    return String(val);
  };
  const gradeOptions = { '小学生': ['1年生','2年生','3年生','4年生','5年生','6年生'], '中学生': ['1年生','2年生','3年生'], '高校生': ['1年生','2年生','3年生'] };
  const gradeBirthYears = { '小学生': { '1年生':'2019–2020', '2年生':'2018–2019', '3年生':'2017–2018', '4年生':'2016–2017', '5年生':'2015–2016', '6年生':'2014–2015' }, '中学生': { '1年生':'2013–2014', '2年生':'2012–2013', '3年生':'2011–2012' }, '高校生': { '1年生':'2010–2011', '2年生':'2009–2010', '3年生':'2008–2009' } };
  const entityFields = {
    club: [['clubId', 'クラブID / Club ID', 'text', true], ['name', '名前 / Name', 'text', true], ['nameJa', '日本語名 / Japanese name', 'text', true], ['logoUrl', 'ロゴURL / Logo URL', 'text']],
    externalOpponent: [['externalOpponentId', '外部選手ID / External opponent ID', 'text', true], ['clubId', 'クラブID / Club ID', 'select', false], ['displayName', '表示名 / Display name', 'text', true], ['englishName', 'ローマジ / Romanized name', 'text'], ['gender', '性別 / Gender', 'select', false, genderOpts], ['schoolLevel', 'カテゴリ / Category', 'select', false, schoolLevelOpts], ['playingHand', '利き手 / Playing hand', 'select', false, playingHandOpts], ['grip', 'グリップ / Grip', 'select', false, gripOpts], ['playingStyle', '戦型 / Playing style', 'select', false, playingStyleOpts], ['forehandRubberType', 'フォア面種類 / Forehand type', 'select', false, rubberTypeOpts], ['forehandRubber', 'フォア面ラバー / Forehand rubber', 'rubber'], ['backhandRubberType', 'バック面種類 / Backhand type', 'select', false, rubberTypeOpts], ['backhandRubber', 'バック面ラバー / Backhand rubber', 'rubber']],
    tournament: [['tournamentId', '大会ID / Tournament ID', 'text', true], ['name', '大会名 / Tournament name', 'text', true], ['nameJa', '日本語名 / Japanese name', 'text'], ['date', '日付 / Date', 'text'], ['location', '会場 / Location', 'text'], ['category', 'カテゴリ / Category', 'text'], ['format', '形式 / Format', 'text']],
    tournamentMatch: [['tournamentMatchId', '大会試合ID / Tournament match ID', 'text', true], ['tournamentId', '大会ID / Tournament ID', 'tournament', true], ['matchDate', '日付 / Date', 'text', true], ['round', 'ラウンド / Round', 'text'], ['format', '形式 / Format', 'text'], ['player1Id', '選手1 / Player 1', 'player', true], ['player1Sets', '選手1セット / Player 1 sets', 'number'], ['player2Id', '選手2 / Player 2', 'player', true], ['player2Sets', '選手2セット / Player 2 sets', 'number'], ['winnerId', '勝者 / Winner', 'player'], ['score', 'スコア / Score', 'text'], ['resultStatus', '結果ステータス / Result status', 'select', false, resultStatusOpts]],
    tournamentProgress: [['tournamentProgressId', '進捗ID / Progress ID', 'text', true], ['tournamentId', '大会ID / Tournament ID', 'tournament', true], ['playerId', '選手 / Player', 'player', true], ['totalWins', '勝利数 / Total wins', 'number'], ['totalLosses', '敗北数 / Total losses', 'number'], ['totalDraws', '引き分け / Total draws', 'number'], ['eliminated', '敗退 / Eliminated', 'select', false, [['',''],['true','Yes','はい'],['false','No','いいえ']]]]
  };
  entityFields.clubs = entityFields.club;
  entityFields.externalOpponents = entityFields.externalOpponent;
  entityFields.tournaments = entityFields.tournament;
  entityFields.tournamentMatches = entityFields.tournamentMatch;
  entityFields.tournamentProgress = entityFields.tournamentProgress;
  const entityIdKey = { club: 'clubId', clubs: 'clubId', externalOpponent: 'externalOpponentId', externalOpponents: 'externalOpponentId', tournament: 'tournamentId', tournaments: 'tournamentId', tournamentMatch: 'tournamentMatchId', tournamentMatches: 'tournamentMatchId', tournamentProgress: 'tournamentProgressId' };
  const entityStorageKey = { club: 'clubs', clubs: 'clubs', externalOpponent: 'external-opponents', externalOpponents: 'external-opponents', tournament: 'tournaments', tournaments: 'tournaments', tournamentMatch: 'tournament-matches', tournamentMatches: 'tournament-matches', tournamentProgress: 'tournament-progress' };
  const entityLabel = { club: 'CLUB / クラブ', clubs: 'CLUB / クラブ', externalOpponent: 'EXTERNAL OPPONENT / 外部選手', externalOpponents: 'EXTERNAL OPPONENT / 外部選手', tournament: 'TOURNAMENT / 大会', tournaments: 'TOURNAMENT / 大会', tournamentMatch: 'TOURNAMENT MATCH / 大会試合', tournamentMatches: 'TOURNAMENT MATCH / 大会試合', tournamentProgress: 'TOURNAMENT PROGRESS / 大会進捗' };
  const entityTypeKey = { clubs: 'club', externalOpponents: 'externalOpponent', tournaments: 'tournament', tournamentMatches: 'tournamentMatch', tournamentProgress: 'tournamentProgress' };
  let players = [];
  let trainingMatches = [];
  let entityData = {};
  let pendingChanges = [];
  let allPlayersList = [];
  let currentRole = '';
  let activeTab = 'matches';
  let activePlayerSubTab = 'ourPlayers';
  let activeManageSubTab = 'pending';
  let selectedId = '';

  const el = (tag, options = {}) => Object.assign(document.createElement(tag), options);
  const text = (tag, value, className) => { const node = el(tag, { textContent: value }); if (className) node.className = className; return node; };
  function createDiff(before, after) { const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]); return [...keys].filter(key => key === 'gradeHistory' || JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])).map(field => ({ field, before: before?.[field] ?? '', after: after?.[field] ?? '' })); }
  function computeDiff(change) { if (change.diff && change.diff.length) return change.diff; if (change.changedFields && change.before && change.after) { return change.changedFields.filter(f => f !== 'gradeHistory').map(f => ({ field: f, before: change.before[f] ?? '', after: change.after[f] ?? '' })).filter(d => JSON.stringify(d.before) !== JSON.stringify(d.after)); } if (change.before && change.after) return createDiff(change.before, change.after); return []; }
  async function loadPendingChanges() { try { const result = await window.LKData.request('/api/pending'); pendingChanges = (result.changes || []).filter(c => c.status === 'pending'); } catch { pendingChanges = []; } }
  function findPendingChange(entityType, targetId) { return pendingChanges.find(c => c.entityType === entityType && c.targetId === targetId); }
  function renderPendingInfo(change) {
    const box = el('div', { className: 'admin-pending-info' });
    const header = el('div', { className: 'admin-pending-info-header' });
    const actionLabels = { create: 'NEW / 新規', update: 'MODIFIED / 変更', delete: 'DELETE / 削除' };
    header.append(text('p', `PENDING ${actionLabels[change.action] || change.action} / 承認待ち`, 'admin-pending-info-title'));
    const cancelBtn = button('CANCEL REQUEST / 申請取消', async () => {
      if (!confirm('Cancel this pending change? / この承認待ちの変更を取消しますか？\n\nThe change will be discarded. / 変更は破棄されます。')) return;
      try {
        await window.LKData.request('/api/approve', { method: 'POST', body: JSON.stringify({ changeId: change.changeId, decision: 'reject' }) });
        await loadPendingChanges();
        renderWorkspace();
      } catch (error) { alert(`${error.message} / 操作に失敗しました`); }
    }, 'danger');
    header.append(cancelBtn);
    box.append(header);
    const meta = el('div', { className: 'admin-pending-info-meta' });
    meta.append(text('span', `Submitted by: / 申請者: ${change.createdBy} · ${formatPendingDate(change.createdAt)}`));
    box.append(meta);
    const diff = computeDiff(change);
    if (diff.length) {
      const table = el('table', { className: 'admin-pending-table' });
      const thead = el('thead'); const thr = el('tr'); thr.append(text('th', 'Field / 項目'), text('th', 'Before / 変更前'), text('th', 'After / 変更後')); thead.append(thr); table.append(thead);
      const tbody = el('tbody'); table.append(tbody);
      diff.forEach(d => { const row = el('tr'); row.className = 'admin-pending-diff-row'; row.append(text('td', d.field), text('td', d.before === '' || d.before == null ? '—' : displayValue(d.field, d.before)), text('td', d.after === '' || d.after == null ? '—' : displayValue(d.field, d.after))); tbody.append(row); });
      box.append(table);
    } else if (change.action === 'create' && change.after) {
      const table = el('table', { className: 'admin-pending-table' });
      const thead = el('thead'); const thr = el('tr'); thr.append(text('th', 'Field / 項目'), text('th', 'Value / 値')); thead.append(thr); table.append(thead);
      const tbody = el('tbody'); table.append(tbody);
      Object.entries(change.after).forEach(([key, value]) => { if (value === '' || value === null || value === undefined || key === 'gradeHistory') return; const row = el('tr'); row.append(text('td', key), text('td', displayValue(key, value))); tbody.append(row); });
      box.append(table);
    } else if (change.action === 'delete') {
      box.append(text('p', 'Record will be deleted upon approval. / 承認後にレコードが削除されます。', 'admin-pending-info-note'));
    }
    return box;
  }
  const empty = node => { node.replaceChildren(); return node; };
  const canEditMatches = () => currentRole === 'admin' || currentRole === 'approver';
  const playerName = id => players.find(player => player.playerId === id)?.displayName || (entityData.externalOpponents || []).find(e => e.externalOpponentId === id)?.displayName || id || '';

  function shell() {
    currentRole = 'admin';
    loadWorkspace();
  }

  function showApproverLogin() {
    const loginOverlay = el('div', { className: 'admin-login-overlay' });
    const login = el('section', { className: 'admin-login admin-panel' });
    login.append(text('p', 'APPROVER SIGN-IN / 承認者ログイン', 'eyebrow'), text('h2', '承認者アクセス / Approver Access'), text('p', '承認待ちの変更を確認・承認できます。管理者権限はありません。\nYou can review and approve pending changes. No admin privileges.', 'admin-login-desc'));
    const form = el('form', { className: 'admin-login-form' });
    const password = el('input', { name: 'password', type: 'password', required: true, autocomplete: 'current-password', placeholder: 'Password / パスワード' });
    const actions = el('div', { className: 'admin-login-actions' });
    const submit = el('button', { type: 'submit', className: 'admin-button primary', textContent: 'SIGN IN / ログイン' });
    const cancelBtn = el('button', { type: 'button', className: 'admin-button secondary', textContent: 'CANCEL / キャンセル' });
    actions.append(submit, cancelBtn);
    const status = el('p', { className: 'admin-status', role: 'status' });
    form.append(password, actions); login.append(form, status); loginOverlay.append(login); app.append(loginOverlay);
    loginOverlay.addEventListener('click', e => { if (e.target === loginOverlay) loginOverlay.remove(); });
    cancelBtn.onclick = () => loginOverlay.remove();
    password.focus();
    form.addEventListener('submit', async event => {
      event.preventDefault(); status.textContent = 'Verifying... / 確認中...';
      try {
        const result = await window.LKData.request('/api/login', { method: 'POST', body: JSON.stringify({ role: 'approver', password: password.value }) });
        localStorage.setItem('lk-admin-session', result.token); currentRole = result.role; loginOverlay.remove(); renderWorkspace();
      } catch { status.textContent = 'Sign-in failed. / パスワードを確認してください。'; }
    });
  }

  async function loadWorkspace() {
    try {
      const data = await window.LKData.loadPublicData();
      players = data.players || []; trainingMatches = data.matches || [];
      players.forEach(p => { if (!p.gradeHistory) p.gradeHistory = []; });
      entityData = { clubs: data.clubs || [], externalOpponents: data.externalOpponents || [], tournaments: data.tournaments || [], tournamentMatches: data.tournamentMatches || [], tournamentProgress: data.tournamentProgress || [] };
      await loadPendingChanges();
      renderWorkspace();
    } catch { empty(app).append(text('p', 'Could not load admin data. / 管理データを読み込めませんでした。', 'admin-load-error')); }
  }

  function renderWorkspace() {
    empty(app);
    const header = el('header', { className: 'site-header' });
    const brand = el('a', { className: 'brand', href: 'index.html', 'aria-label': 'Little Kings home' });
    const brandText = el('span');
    brandText.append(text('span', 'LITTLE KINGS'), el('small', { textContent: language === 'en' ? 'DATA MAINTENANCE' : 'データメンテナンス' }));
    brand.append(el('img', { src: 'little-kings-logo.jpg', alt: 'Little Kings crown' }), brandText);
    const nav = el('nav', { 'aria-label': 'Main navigation' });
    nav.append(el('a', { href: 'index.html', textContent: language === 'en' ? 'Home' : 'ホーム' }), el('a', { href: 'index.html#players', textContent: language === 'en' ? 'Players' : '選手' }), el('a', { href: 'index.html#stats', textContent: language === 'en' ? 'Statistics' : '統計' }));
    const headerActions = el('div', { className: 'header-actions' });
    if (currentRole === 'approver') {
      headerActions.append(text('span', '承認者 / Approver', 'admin-role-badge'));
      headerActions.append(button('SIGN OUT / ログアウト', () => { localStorage.removeItem('lk-admin-session'); currentRole = 'admin'; renderWorkspace(); }, 'language-toggle'));
    } else {
      headerActions.append(button('APPROVER LOGIN / 承認者ログイン', () => showApproverLogin(), 'language-toggle'));
    }
    header.append(brand, nav, headerActions);
    const tabs = el('nav', { className: 'admin-tabs', ariaLabel: 'Data maintenance sections' });
    tabs.append(tab('matches', 'MATCHES / 試合'));
    tabs.append(tab('players', 'PLAYERS / 選手'));
    tabs.append(tab('tournaments', 'TOURNAMENTS / 大会'));
    if (currentRole === 'admin') tabs.append(tab('clubs', 'CLUBS / クラブ'));
    tabs.append(tab('manage', 'MANAGE / 管理'));
    app.append(header, tabs);
    if (activeTab === 'matches') renderAllMatches(); else if (activeTab === 'players') renderPlayers(activePlayerSubTab); else if (activeTab === 'tournaments') renderTournaments(); else if (activeTab === 'clubs') renderEntity('clubs'); else if (activeTab === 'manage') renderManage(); else renderAllMatches();
  }
  function button(label, onclick, className = '') { const node = el('button', { className: `admin-button ${className}`.trim(), type: 'button', textContent: label }); node.onclick = onclick; return node; }
  function tab(id, label) { const node = button(label, () => { activeTab = id; selectedId = ''; renderWorkspace(); }, `admin-tab${activeTab === id ? ' active' : ''}`); return node; }
  function roleLabel(role) { return ({ admin: '管理者', approver: '承認者' })[role] || role; }

  let activeMatchSubTab = 'training';

  function renderAllMatches() {
    const workspace = el('section', { className: 'admin-workspace' });
    const listPanel = el('section', { className: 'admin-panel admin-list-panel' });
    const listHeader = el('div', { className: 'admin-list-header' });
    const tourns = entityData.tournaments || [];
    const heading = el('div'); heading.append(text('p', 'MATCHES / 試合一覧', 'eyebrow'), text('h2', `${trainingMatches.length + (entityData.tournamentMatches || []).length} matches / 試合`));
    listHeader.append(heading); listPanel.append(listHeader);
    // Sub-tabs: Training / Tournament
    const subTabs = el('div', { className: 'admin-sub-tabs' });
    const subTab = (id, label) => { const node = button(label, () => { activeMatchSubTab = id; selectedId = ''; renderWorkspace(); }, `admin-sub-tab${activeMatchSubTab === id ? ' active' : ''}`); return node; };
    subTabs.append(subTab('training', 'TRAINING / 練習'), subTab('tournament', 'TOURNAMENT / 大会'));
    listPanel.append(subTabs);
    // Filters
    const isTraining = activeMatchSubTab === 'training';
    const filters = el('div', { className: 'admin-match-filters' });
    // Row 1: Player search (prominent)
    const searchRow = el('div', { className: 'admin-match-filter-row' });
    const playerSearch = el('input', { type: 'text', placeholder: '選手名で検索 / Search by player name...', ariaLabel: 'Search by player name' });
    searchRow.append(text('span', '🔍', 'admin-filter-icon'), playerSearch);
    filters.append(searchRow);
    // Row 2: Date range + Status (+ Tournament for tournament tab)
    const detailRow = el('div', { className: 'admin-match-filter-row' });
    const dateFrom = el('input', { type: 'date', ariaLabel: 'From date' });
    const dateTo = el('input', { type: 'date', ariaLabel: 'To date' });
    const statusFilter = el('select');
    ['', completedStatusId, incompleteStatusId].forEach(s => { statusFilter.append(el('option', { value: s, textContent: s ? statusLabel(s) : 'ALL STATUS / 全ステータス' })); });
    detailRow.append(text('span', 'FROM:', 'admin-filter-label'), dateFrom, text('span', 'TO:', 'admin-filter-label'), dateTo, text('span', 'STATUS:', 'admin-filter-label'), statusFilter);
    if (!isTraining) {
      const tournFilter = tournamentSelect('tournFilter', '');
      tournFilter.querySelector('input').placeholder = '大会 / Tournament...';
      detailRow.append(text('span', '大会:', 'admin-filter-label'), tournFilter);
      // Wire up tournament filter change
      tournFilter.onchange = updateList;
    }
    filters.append(detailRow);
    listPanel.append(filters);
    if (canEditMatches()) listPanel.append(button('+ ADD MATCH / 試合追加', () => isTraining ? showMatchEditor(null) : showTournamentMatchEditor(null), 'primary'));
    const list = el('div', { className: 'admin-player-list admin-match-list' }); listPanel.append(list);
    const editor = el('section', { className: 'admin-panel admin-editor-panel' }); workspace.append(listPanel, editor); app.append(workspace);
    const statusColor = s => isIncompleteStatus(s) || s === 'Void' ? 'status-incomplete' : 'status-complete';
    const tournName = tid => { const t = tourns.find(x => x.tournamentId === tid); return t ? t.name : tid; };
    const updateList = () => {
      empty(list);
      const from = dateFrom.value; const to = dateTo.value; const sf = statusFilter.value;
      const pq = playerSearch.value.trim().toLowerCase();
      if (isTraining) {
        const results = trainingMatches.filter(match => {
          if (sf && resultStatusId(match.resultStatus) !== sf) return false;
          if (from && match.matchDate < from) return false;
          if (to && match.matchDate > to) return false;
          if (pq) {
            const hay = `${match.player1Name || ''} ${match.player2Name || ''} ${match.player1Id || ''} ${match.player2Id || ''}`.toLowerCase();
            if (!hay.includes(pq)) return false;
          }
          return true;
        });
        if (!results.length) { list.append(text('p', '該当する試合がありません / No matches found.', 'admin-empty')); return; }
        const groups = {}; results.forEach(m => { const d = m.matchDate || 'No date'; if (!groups[d]) groups[d] = []; groups[d].push(m); });
        Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
          const dateHeader = el('div', { className: 'admin-match-date-header' });
          dateHeader.append(text('span', date === 'No date' ? 'No date / 日付なし' : date, 'admin-match-date'));
          dateHeader.append(text('span', `${groups[date].length} matches / 試合`, 'admin-match-date-count'));
          list.append(dateHeader);
          groups[date].sort((a, b) => b.matchId.localeCompare(a.matchId)).forEach(match => {
            const row = el('button', { type: 'button', className: `admin-player-row admin-match-row${match.matchId === selectedId ? ' selected' : ''}` });
            const players2 = el('span', { className: 'admin-match-players' });
            const p1win = match.winnerId === match.player1Id; const p2win = match.winnerId === match.player2Id;
            players2.append(text('b', match.player1Name || match.player1Id, p1win ? 'admin-match-winner' : ''), text('span', ' vs ', 'admin-match-vs'), text('b', match.player2Name || match.player2Id, p2win ? 'admin-match-winner' : ''));
            const score = el('span', { className: 'admin-match-score' }); score.textContent = match.score || '-';
            const badge = el('span', { className: `admin-match-badge ${statusColor(match.resultStatus)}` }); badge.textContent = statusLabel(match.resultStatus) || '-';
            row.append(players2, score, badge);
            row.onclick = () => { selectedId = match.matchId; updateList(); showMatchEditor(match); };
            list.append(row);
          });
        });
      } else {
        const tournFilterEl = detailRow.querySelector('.player-combobox');
        const tq = tournFilterEl ? tournFilterEl.querySelector('input')?.dataset?.value || '' : '';
        const results = (entityData.tournamentMatches || []).filter(m => {
          if (tq && m.tournamentId !== tq) return false;
          if (sf && resultStatusId(m.resultStatus) !== sf) return false;
          if (from && m.matchDate < from) return false;
          if (to && m.matchDate > to) return false;
          if (pq) {
            const hay = `${m.player1Name || ''} ${m.player2Name || ''} ${m.player1Id || ''} ${m.player2Id || ''}`.toLowerCase();
            if (!hay.includes(pq)) return false;
          }
          return true;
        });
        if (!results.length) { list.append(text('p', '該当する試合がありません / No matches found.', 'admin-empty')); return; }
        const groups = {}; results.forEach(m => { const d = m.matchDate || 'No date'; if (!groups[d]) groups[d] = []; groups[d].push(m); });
        Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
          const dateHeader = el('div', { className: 'admin-match-date-header' });
          dateHeader.append(text('span', date === 'No date' ? 'No date / 日付なし' : date, 'admin-match-date'));
          dateHeader.append(text('span', `${groups[date].length} matches / 試合`, 'admin-match-date-count'));
          list.append(dateHeader);
          groups[date].forEach(m => {
            const row = el('button', { type: 'button', className: `admin-player-row admin-match-row${m.tournamentMatchId === selectedId ? ' selected' : ''}` });
            const players2 = el('span', { className: 'admin-match-players' });
            players2.append(text('b', m.player1Name || m.player1Id || '?'), text('span', ' vs ', 'admin-match-vs'), text('b', m.player2Name || m.player2Id || '?'));
            const score = el('span', { className: 'admin-match-score' }); score.textContent = m.score || '-';
            const badge = el('span', { className: `admin-match-badge ${statusColor(m.resultStatus)}` }); badge.textContent = statusLabel(m.resultStatus) || '-';
            const tourn = el('span', { className: 'admin-match-tourn' }); tourn.textContent = tournName(m.tournamentId);
            row.append(players2, score, badge, tourn);
            row.onclick = () => { selectedId = m.tournamentMatchId; updateList(); showTournamentMatchEditor(m); };
            list.append(row);
          });
        });
      }
    };
    dateFrom.onchange = updateList; dateTo.onchange = updateList; statusFilter.onchange = updateList;
    playerSearch.oninput = updateList;
    const tournFilterEl = detailRow.querySelector('.player-combobox');
    if (tournFilterEl) { tournFilterEl.addEventListener('change', updateList); }
    updateList();
    if (isTraining) { showMatchEditor(trainingMatches.find(match => match.matchId === selectedId) || trainingMatches[0] || null); }
    else { const tm = entityData.tournamentMatches || []; showTournamentMatchEditor(tm.find(m => m.tournamentMatchId === selectedId) || tm[0] || null); }
  }

  function showMatchEditor(match) {
    const editor = document.querySelector('.admin-editor-panel'); if (!editor) return; empty(editor);
    const readOnly = !canEditMatches(); const record = match ? { ...match } : newMatch();
    editor.append(text('p', readOnly ? 'VIEW ONLY / 閲覧専用' : match ? 'EDIT TRAINING MATCH / 練習試合編集' : 'NEW TRAINING MATCH / 新規練習試合', 'eyebrow'), text('h2', match ? `${record.player1Name || record.player1Id} vs ${record.player2Name || record.player2Id}` : 'Add training match / 練習試合を追加'));
    const form = el('form', { className: 'admin-player-form admin-match-form' });
    // --- Date & Event section ---
    const sectionMeta = el('div', { className: 'admin-match-section' }); sectionMeta.append(text('p', 'INFO / 基本情報', 'admin-match-section-title'));
    const date = el('input', { name: 'matchDate', type: 'date', required: true, value: record.matchDate || '' });
    const event = el('input', { name: 'event', type: 'text', required: true, value: record.event || 'Club Training' });
    const division = el('input', { name: 'division', type: 'text', value: record.division || '' });
    const format = select('format', ['Singles'], record.format || 'Singles');
    const addMetaField = (label, input) => { const l = el('label'); l.append(text('span', label), input); sectionMeta.append(l); };
    addMetaField('日付 / Date', date); addMetaField('イベント / Event', event); addMetaField('部門 / Division', division); addMetaField('形式 / Format', format);
    form.append(sectionMeta);
    // --- Players & Score section ---
    const sectionMatch = el('div', { className: 'admin-match-section' }); sectionMatch.append(text('p', 'PLAYERS & SCORE / 選手＆スコア', 'admin-match-section-title'));
    const player1 = playerSelect('player1Id', record.player1Id); const player2 = playerSelect('player2Id', record.player2Id);
    const sets1 = el('input', { name: 'player1Sets', type: 'number', min: '0', step: '1', required: true, value: String(record.player1Sets ?? 0) });
    const sets2 = el('input', { name: 'player2Sets', type: 'number', min: '0', step: '1', required: true, value: String(record.player2Sets ?? 0) });
    const resultStatus = select('resultStatus', resultStatusOpts.filter(Boolean), resultStatusId(record.resultStatus) || completedStatusId);
    const p1sl = el('input', { name: 'player1SchoolLevel', type: 'hidden', value: record.player1SchoolLevel || '' });
    const p1gr = el('input', { name: 'player1Grade', type: 'hidden', value: record.player1Grade || '' });
    const p2sl = el('input', { name: 'player2SchoolLevel', type: 'hidden', value: record.player2SchoolLevel || '' });
    const p2gr = el('input', { name: 'player2Grade', type: 'hidden', value: record.player2Grade || '' });
    const snapshotFromPlayer = (pid, slInput, grInput) => { const p = players.find(pl => pl.playerId === pid); if (p) { slInput.value = p.schoolLevel || ''; grInput.value = p.grade || ''; } else { slInput.value = ''; grInput.value = ''; } };
    player1.onchange = () => snapshotFromPlayer(player1.value, p1sl, p1gr);
    player2.onchange = () => snapshotFromPlayer(player2.value, p2sl, p2gr);
    if (record.player1Id) snapshotFromPlayer(record.player1Id, p1sl, p1gr);
    if (record.player2Id) snapshotFromPlayer(record.player2Id, p2sl, p2gr);
    const addMatchField = (label, input) => { const l = el('label'); l.append(text('span', label), input); sectionMatch.append(l); };
    addMatchField('選手1 / Player 1', player1); addMatchField('選手2 / Player 2', player2);
    addMatchField('選手1 セット / P1 Sets', sets1); addMatchField('選手2 セット / P2 Sets', sets2);
    addMatchField('結果ステータス / Result Status', resultStatus);
    form.append(sectionMatch);
    form.append(p1sl, p1gr, p2sl, p2gr);
    [date, event, division, format, player1, player2, sets1, sets2, resultStatus].forEach(input => { input.disabled = readOnly; });
    const derived = text('p', '', 'admin-derived'); form.append(derived);
    const updateDerived = () => {
      const one = Number(sets1.value); const two = Number(sets2.value); const incomplete = isIncompleteStatus(resultStatus.value);
      derived.textContent = `Score: ${Number.isFinite(one) ? one : 0}-${Number.isFinite(two) ? two : 0} · Winner: ${incomplete || one === two ? 'なし / None' : playerName(one > two ? player1.value : player2.value) || 'Select players / 選手を選択'}`;
    };
    [player1, player2, sets1, sets2, resultStatus].forEach(input => input.oninput = updateDerived); updateDerived();
    if (!readOnly) {
      const actions = el('div', { className: 'admin-editor-actions' });
      actions.append(button('SAVE / 保存', () => { if (confirm(match ? 'Submit this match change for approval? / この試合の変更を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。' : 'Submit this new match for approval? / 新規試合を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。')) form.requestSubmit(); }, 'primary'));
      actions.append(button(match ? 'RESET / リセット' : 'CLEAR / クリア', () => { if (match) { Object.keys(record).forEach(key => { const el = form.elements[key]; if (el) el.value = record[key] ?? ''; }); player1.value = record.player1Id || ''; player2.value = record.player2Id || ''; } else { form.reset(); } updateDerived(); }, 'secondary'));
      form.append(actions);
      form.onsubmit = event => {
        event.preventDefault(); const next = match ? { ...record, ...Object.fromEntries(new FormData(form)) } : Object.fromEntries(new FormData(form));
        if (!next.player1Id || !next.player2Id || next.player1Id === next.player2Id) { derived.textContent = 'Choose two different players. / 異なる2名の選手を選択してください。'; return; }
        next.player1Sets = Number(next.player1Sets); next.player2Sets = Number(next.player2Sets); next.player1Name = playerName(next.player1Id); next.player2Name = playerName(next.player2Id); next.score = `${next.player1Sets}-${next.player2Sets}`;
        if (isIncompleteStatus(next.resultStatus) || next.player1Sets === next.player2Sets) { next.winnerId = ''; next.winnerName = ''; } else { next.winnerId = next.player1Sets > next.player2Sets ? next.player1Id : next.player2Id; next.winnerName = playerName(next.winnerId); }
        next.matchId = match?.matchId || newMatchId();
        submitChange('match', next.matchId, next, match ? 'update' : 'create').then(loadWorkspace).catch(error => { derived.textContent = `${error.message} / 保存できませんでした`; });
      };
    }
    editor.append(form);
    if (match) {
      const pending = findPendingChange('match', match.matchId);
      if (pending) editor.append(renderPendingInfo(pending));
      renderRecordHistory('match', match.matchId).then(history => { if (history.childNodes.length) editor.append(history); });
    }
  }

  function showTournamentMatchEditor(match) {
    const editor = document.querySelector('.admin-editor-panel'); if (!editor) return; empty(editor);
    const readOnly = !canEditMatches(); const record = match ? { ...match } : { tournamentMatchId: newEntityId('tournamentMatch'), tournamentId: '', matchDate: new Date().toISOString().slice(0, 10), round: '', format: '', player1Id: '', player1Sets: 0, player2Id: '', player2Sets: 0, winnerId: '', score: '0-0', resultStatus: completedStatusId };
    editor.append(text('p', readOnly ? 'VIEW ONLY / 閲覧専用' : match ? 'EDIT TOURNAMENT MATCH / 大会試合編集' : 'NEW TOURNAMENT MATCH / 新規大会試合', 'eyebrow'), text('h2', match ? `${record.player1Name || record.player1Id || '?'} vs ${record.player2Name || record.player2Id || '?'}` : 'Add tournament match / 大会試合を追加'));
    const form = el('form', { className: 'admin-player-form admin-match-form' });
    // --- Info section ---
    const sectionMeta = el('div', { className: 'admin-match-section' }); sectionMeta.append(text('p', 'INFO / 基本情報', 'admin-match-section-title'));
    const tournamentInput = tournamentSelect('tournamentId', record.tournamentId || '');
    const date = el('input', { name: 'matchDate', type: 'date', required: true, value: record.matchDate || '' });
    const round = el('input', { name: 'round', type: 'text', value: record.round || '' });
    const format = el('input', { name: 'format', type: 'text', value: record.format || '' });
    const resultStatus = select('resultStatus', resultStatusOpts.filter(Boolean), resultStatusId(record.resultStatus) || completedStatusId);
    const addMetaField = (label, input) => { const l = el('label'); l.append(text('span', label), input); sectionMeta.append(l); };
    addMetaField('大会 / Tournament', tournamentInput); addMetaField('日付 / Date', date); addMetaField('ラウンド / Round', round); addMetaField('形式 / Format', format); addMetaField('結果ステータス / Result Status', resultStatus);
    form.append(sectionMeta);
    // --- Players & Score section ---
    const sectionMatch = el('div', { className: 'admin-match-section' }); sectionMatch.append(text('p', 'PLAYERS & SCORE / 選手＆スコア', 'admin-match-section-title'));
    const player1 = playerSelect('player1Id', record.player1Id || ''); const player2 = playerSelect('player2Id', record.player2Id || '');
    const sets1 = el('input', { name: 'player1Sets', type: 'number', min: '0', step: '1', required: true, value: String(record.player1Sets ?? 0) });
    const sets2 = el('input', { name: 'player2Sets', type: 'number', min: '0', step: '1', required: true, value: String(record.player2Sets ?? 0) });
    const addMatchField = (label, input) => { const l = el('label'); l.append(text('span', label), input); sectionMatch.append(l); };
    addMatchField('選手1 / Player 1', player1); addMatchField('選手2 / Player 2', player2);
    addMatchField('選手1 セット / P1 Sets', sets1); addMatchField('選手2 セット / P2 Sets', sets2);
    form.append(sectionMatch);
    [tournamentInput, date, round, format, resultStatus, player1, player2, sets1, sets2].forEach(input => { input.disabled = readOnly; });
    const derived = text('p', '', 'admin-derived'); form.append(derived);
    const updateDerived = () => {
      const one = Number(sets1.value); const two = Number(sets2.value);
      const winner = isIncompleteStatus(resultStatus.value) ? '' : one > two ? player1.value : two > one ? player2.value : '';
      derived.textContent = `Score: ${Number.isFinite(one) ? one : 0}-${Number.isFinite(two) ? two : 0} · Winner: ${winner ? playerName(winner) : 'なし / None'}`;
    };
    [player1, player2, sets1, sets2, resultStatus].forEach(input => input.oninput = updateDerived); updateDerived();
    if (!readOnly) {
      const actions = el('div', { className: 'admin-editor-actions' });
      actions.append(button('SAVE / 保存', () => { if (confirm(match ? 'Submit this match change? / この試合の変更を申請しますか？' : 'Submit this new match? / 新規試合を申請しますか？')) form.requestSubmit(); }, 'primary'));
      actions.append(button(match ? 'RESET / リセット' : 'CLEAR / クリア', () => { if (match) { Object.keys(record).forEach(key => { const el = form.elements[key]; if (el) el.value = record[key] ?? ''; }); player1.value = record.player1Id || ''; player2.value = record.player2Id || ''; tournamentInput.value = record.tournamentId || ''; } else { form.reset(); } updateDerived(); }, 'secondary'));
      form.append(actions);
      form.onsubmit = event => {
        event.preventDefault(); const next = match ? { ...record, ...Object.fromEntries(new FormData(form)) } : Object.fromEntries(new FormData(form));
        next.player1Name = playerName(next.player1Id); next.player2Name = playerName(next.player2Id);
        next.player1Sets = Number(next.player1Sets); next.player2Sets = Number(next.player2Sets);
        next.score = `${next.player1Sets}-${next.player2Sets}`;
        next.winnerId = isIncompleteStatus(next.resultStatus) ? '' : next.player1Sets > next.player2Sets ? next.player1Id : next.player2Sets > next.player1Sets ? next.player2Id : '';
        next.winnerName = next.winnerId ? playerName(next.winnerId) : '';
        next.tournamentMatchId = match?.tournamentMatchId || newEntityId('tournamentMatch');
        submitChange('tournamentMatch', next.tournamentMatchId, next, match ? 'update' : 'create').then(loadWorkspace).catch(error => { derived.textContent = `${error.message} / 保存できませんでした`; });
      };
    }
    editor.append(form);
    if (match) {
      const pending = findPendingChange('tournamentMatch', match.tournamentMatchId);
      if (pending) editor.append(renderPendingInfo(pending));
      renderRecordHistory('tournamentMatch', match.tournamentMatchId).then(history => { if (history.childNodes.length) editor.append(history); });
    }
  }

  let activeTournSubTab = 'list';

  function renderTournaments() {
    const workspace = el('section', { className: 'admin-workspace' });
    const listPanel = el('section', { className: 'admin-panel admin-list-panel' });
    const listHeader = el('div', { className: 'admin-list-header' });
    const tourns = entityData.tournaments || [];
    const heading = el('div'); heading.append(text('p', 'TOURNAMENTS / 大会', 'eyebrow'), text('h2', `${tourns.length} tournaments / 大会`));
    listHeader.append(heading); listPanel.append(listHeader);
    // Sub-tabs: List / Progress
    const subTabs = el('div', { className: 'admin-sub-tabs' });
    const subTab = (id, label) => { const node = button(label, () => { activeTournSubTab = id; selectedId = ''; renderWorkspace(); }, `admin-sub-tab${activeTournSubTab === id ? ' active' : ''}`); return node; };
    subTabs.append(subTab('list', 'LIST / 一覧'), subTab('progress', 'PROGRESS / 進捗'));
    listPanel.append(subTabs);
    if (canEditMatches()) {
      if (activeTournSubTab === 'list') listPanel.append(button('+ ADD TOURNAMENT / 大会追加', () => showEntityEditor('tournament', null), 'primary'));
      else listPanel.append(button('+ ADD PROGRESS / 進捗追加', () => showTournamentProgressEditor(null), 'primary'));
    }
    const list = el('div', { className: 'admin-player-list' }); listPanel.append(list);
    const editor = el('section', { className: 'admin-panel admin-editor-panel' }); workspace.append(listPanel, editor); app.append(workspace);
    if (activeTournSubTab === 'list') {
      const updateList = () => {
        empty(list);
        tourns.sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(t => {
          const row = el('button', { type: 'button', className: `admin-player-row${t.tournamentId === selectedId ? ' selected' : ''}` });
          const info = el('span'); info.append(text('b', t.name || t.tournamentId), text('small', `${t.date || ''} · ${t.tournamentId}`));
          row.append(info);
          row.onclick = () => { selectedId = t.tournamentId; updateList(); showEntityEditor('tournament', t); };
          list.append(row);
        });
      };
      updateList(); showEntityEditor('tournament', tourns.find(t => t.tournamentId === selectedId) || tourns[0] || null);
    } else {
      const records = entityData.tournamentProgress || [];
      const filters = el('div', { className: 'admin-match-filters' });
      const tournFilter = tournamentSelect('tournFilter', '');
      tournFilter.querySelector('input').placeholder = '大会で絞り込み / Filter by tournament...';
      const playerFilter = playerSelect('playerFilter', '');
      playerFilter.querySelector('input').placeholder = '選手で絞り込み / Filter by player...';
      filters.append(text('span', '大会:', 'admin-filter-label'), tournFilter, text('span', '選手:', 'admin-filter-label'), playerFilter);
      listPanel.append(filters);
      const tournName = tid => { const t = tourns.find(x => x.tournamentId === tid); return t ? t.name : tid; };
      const updateList = () => {
        empty(list); const tq = tournFilter.value; const pq = playerFilter.value;
        const results = records.filter(r => { if (tq && r.tournamentId !== tq) return false; if (pq && r.playerId !== pq) return false; return true; });
        if (!results.length) { list.append(text('p', '該当する記録がありません / No records found.', 'admin-empty')); return; }
        results.forEach(r => {
          const row = el('button', { type: 'button', className: `admin-player-row${r.tournamentProgressId === selectedId ? ' selected' : ''}` });
          const info = el('span'); info.append(text('b', playerName(r.playerId) || r.playerId, '', ' '),
            text('small', `W${r.totalWins ?? 0} L${r.totalLosses ?? 0} D${r.totalDraws ?? 0}${r.eliminated === 'true' ? ' ✕' : ''} · ${tournName(r.tournamentId)}`));
          row.append(info);
          row.onclick = () => { selectedId = r.tournamentProgressId; updateList(); showTournamentProgressEditor(r); };
          list.append(row);
        });
      };
      tournFilter.onchange = updateList; playerFilter.onchange = updateList;
      updateList(); showTournamentProgressEditor(records.find(r => r.tournamentProgressId === selectedId) || records[0] || null);
    }
  }

  function showTournamentProgressEditor(record) {
    const editor = document.querySelector('.admin-editor-panel'); if (!editor) return; empty(editor);
    const readOnly = !canEditMatches(); const rec = record ? { ...record } : { tournamentProgressId: newEntityId('tournamentProgress'), tournamentId: '', playerId: '', totalWins: 0, totalLosses: 0, totalDraws: 0, eliminated: '' };
    editor.append(text('p', readOnly ? 'VIEW ONLY / 閲覧専用' : record ? 'EDIT PROGRESS / 進捗編集' : 'NEW PROGRESS / 新規進捗', 'eyebrow'), text('h2', record ? `${playerName(rec.playerId) || rec.playerId} - ${rec.tournamentId}` : 'Add progress record / 進捗記録を追加'));
    const form = el('form', { className: 'admin-player-form' });
    const tournamentInput = tournamentSelect('tournamentId', rec.tournamentId || '');
    const playerInput = playerSelect('playerId', rec.playerId || '');
    const wins = el('input', { name: 'totalWins', type: 'number', min: '0', step: '1', value: String(rec.totalWins ?? 0) });
    const losses = el('input', { name: 'totalLosses', type: 'number', min: '0', step: '1', value: String(rec.totalLosses ?? 0) });
    const draws = el('input', { name: 'totalDraws', type: 'number', min: '0', step: '1', value: String(rec.totalDraws ?? 0) });
    const eliminated = select('eliminated', [['', '—'], ['true', 'Yes / はい'], ['false', 'No / いいえ']], rec.eliminated || '');
    const addField = (label, input) => { const l = el('label'); l.append(text('span', label), input); form.append(l); };
    addField('大会 / Tournament', tournamentInput); addField('選手 / Player', playerInput);
    addField('勝利 / Wins', wins); addField('敗北 / Losses', losses); addField('引分 / Draws', draws); addField('敗退 / Eliminated', eliminated);
    [tournamentInput, playerInput, wins, losses, draws, eliminated].forEach(input => { input.disabled = readOnly; });
    if (!readOnly) {
      const actions = el('div', { className: 'admin-editor-actions' });
      actions.append(button('SAVE / 保存', () => { if (confirm(record ? 'Submit this progress change? / この進捗の変更を申請しますか？' : 'Submit this new progress? / 新規進捗を申請しますか？')) form.requestSubmit(); }, 'primary'));
      form.append(actions);
      form.onsubmit = event => {
        event.preventDefault(); const next = record ? { ...rec, ...Object.fromEntries(new FormData(form)) } : Object.fromEntries(new FormData(form));
        next.totalWins = Number(next.totalWins); next.totalLosses = Number(next.totalLosses); next.totalDraws = Number(next.totalDraws);
        next.tournamentProgressId = record?.tournamentProgressId || newEntityId('tournamentProgress');
        submitChange('tournamentProgress', next.tournamentProgressId, next, record ? 'update' : 'create').then(loadWorkspace).catch(error => { actions.append(text('span', `${error.message} / 保存できませんでした`, 'admin-status')); });
      };
    }
    editor.append(form);
    if (record) {
      const pending = findPendingChange('tournamentProgress', record.tournamentProgressId);
      if (pending) editor.append(renderPendingInfo(pending));
      renderRecordHistory('tournamentProgress', record.tournamentProgressId).then(history => { if (history.childNodes.length) editor.append(history); });
    }
  }

  function select(name, options, value) { const node = el('select', { name }); options.forEach(option => { const val = typeof option === 'object' ? option.id : option; const txt = typeof option === 'object' ? (option.name || option.id) : option; node.append(el('option', { value: val, textContent: txt })); }); node.value = value; return node; }
  function playerSelect(name, value) {
    const activeStatuses = new Set(['Active', 'ST-001']);
    const activePlayers = players.filter(p => activeStatuses.has(p.status)).sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'));
    const allPlayers = [...activePlayers, ...(entityData.externalOpponents || [])];
    const clubName = cid => { const c = (entityData.clubs || []).find(cl => cl.clubId === cid); return c ? (c.nameJa || c.name || '') : ''; };
    const playerLabel = p => { const parts = [p.displayName]; if (p.englishName) parts.push(p.englishName); parts.push(p.playerId || p.externalOpponentId); const cn = clubName(p.clubId); if (cn) parts.push(cn); return parts.join(' · '); };
    const selected = allPlayers.find(p => (p.playerId || p.externalOpponentId) === value);
    const hidden = el('input', { name, type: 'hidden', value: value || '' });
    const input = el('input', { type: 'text', className: 'player-combobox-input', value: selected ? playerLabel(selected) : '', autocomplete: 'off', placeholder: '選手名で検索 / Type to search players...' });
    const dropdown = el('div', { className: 'player-combobox-dropdown' });
    dropdown.style.display = 'none';
    let highlighted = -1;
    let originalValue = value || '';
    let originalLabel = selected ? playerLabel(selected) : '';
    let justSelected = false;
    const renderDropdown = (query) => {
      dropdown.replaceChildren();
      const q = (query || '').toLowerCase();
      const matches = q ? allPlayers.filter(p => {
        const hay = `${p.displayName} ${p.englishName || ''} ${p.playerId || p.externalOpponentId || ''} ${clubName(p.clubId)}`.toLowerCase();
        return hay.includes(q);
      }) : allPlayers;
      if (!matches.length) { dropdown.style.display = 'none'; return; }
      highlighted = -1;
      matches.forEach((p) => {
        const item = el('div', { className: 'player-combobox-item' });
        const nameSpan = el('span', { className: 'player-combobox-name' });
        nameSpan.textContent = p.displayName;
        if (p.englishName) nameSpan.append(el('small', { textContent: ` ${p.englishName}` }));
        const idSpan = el('span', { className: 'player-combobox-id' });
        idSpan.textContent = p.playerId || p.externalOpponentId;
        item.append(nameSpan, idSpan);
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const pid = p.playerId || p.externalOpponentId;
          hidden.value = pid;
          input.value = playerLabel(p);
          originalValue = pid;
          originalLabel = playerLabel(p);
          justSelected = true;
          dropdown.style.display = 'none';
        });
        dropdown.append(item);
      });
      dropdown.style.display = '';
    };
    const restoreOriginal = () => {
      hidden.value = originalValue;
      input.value = originalLabel;
      dropdown.style.display = 'none';
    };
    input.addEventListener('input', () => { justSelected = false; renderDropdown(input.value); hidden.value = ''; });
    input.addEventListener('focus', () => { justSelected = false; input.select(); renderDropdown(''); });
    input.addEventListener('blur', () => { setTimeout(() => { if (!justSelected && hidden.value !== originalValue) restoreOriginal(); dropdown.style.display = 'none'; }, 150); });
    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.player-combobox-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); highlighted = Math.min(highlighted + 1, items.length - 1); items.forEach((it, i) => it.classList.toggle('highlighted', i === highlighted)); if (items[highlighted]) items[highlighted].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlighted = Math.max(highlighted - 1, 0); items.forEach((it, i) => it.classList.toggle('highlighted', i === highlighted)); if (items[highlighted]) items[highlighted].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && highlighted >= 0 && items[highlighted]) { e.preventDefault(); items[highlighted].dispatchEvent(new Event('mousedown')); }
      else if (e.key === 'Escape') { restoreOriginal(); input.blur(); }
    });
    const wrapper = el('span', { className: 'player-combobox-wrapper' });
    wrapper.append(hidden, input, dropdown);
    Object.defineProperty(wrapper, 'value', { get() { return hidden.value; }, set(v) { hidden.value = v; originalValue = v; const p = allPlayers.find(pl => (pl.playerId || pl.externalOpponentId) === v); originalLabel = p ? playerLabel(p) : ''; input.value = originalLabel; } });
    Object.defineProperty(wrapper, 'onchange', { set(fn) { input.onchange = fn; }, get() { return input.onchange; } });
    Object.defineProperty(wrapper, 'disabled', { set(v) { input.disabled = v; }, get() { return input.disabled; } });
    return wrapper;
  }
  function tournamentSelect(name, value) {
    const tourns = (entityData.tournaments || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const tournLabel = t => { const parts = [t.name]; if (t.nameJa) parts.push(t.nameJa); if (t.date) parts.push(t.date); parts.push(t.tournamentId); return parts.join(' · '); };
    const selected = tourns.find(t => t.tournamentId === value);
    const hidden = el('input', { name, type: 'hidden', value: value || '' });
    const input = el('input', { type: 'text', className: 'player-combobox-input', value: selected ? tournLabel(selected) : '', autocomplete: 'off', placeholder: '大会名で検索 / Type to search tournaments...' });
    const dropdown = el('div', { className: 'player-combobox-dropdown' });
    dropdown.style.display = 'none';
    let highlighted = -1;
    let originalValue = value || '';
    let originalLabel = selected ? tournLabel(selected) : '';
    let justSelected = false;
    const renderDropdown = (query) => {
      dropdown.replaceChildren();
      const q = (query || '').toLowerCase();
      const matches = q ? tourns.filter(t => {
        const hay = `${t.name} ${t.nameJa || ''} ${t.tournamentId} ${t.date || ''} ${t.location || ''}`.toLowerCase();
        return hay.includes(q);
      }) : tourns;
      if (!matches.length) { dropdown.style.display = 'none'; return; }
      highlighted = -1;
      matches.forEach((t) => {
        const item = el('div', { className: 'player-combobox-item' });
        const nameSpan = el('span', { className: 'player-combobox-name' });
        nameSpan.textContent = t.name;
        if (t.date) nameSpan.append(el('small', { textContent: ` ${t.date}` }));
        const idSpan = el('span', { className: 'player-combobox-id' });
        idSpan.textContent = t.tournamentId;
        item.append(nameSpan, idSpan);
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          hidden.value = t.tournamentId;
          input.value = tournLabel(t);
          originalValue = t.tournamentId;
          originalLabel = tournLabel(t);
          justSelected = true;
          dropdown.style.display = 'none';
        });
        dropdown.append(item);
      });
      dropdown.style.display = '';
    };
    const restoreOriginal = () => { hidden.value = originalValue; input.value = originalLabel; dropdown.style.display = 'none'; };
    input.addEventListener('input', () => { justSelected = false; renderDropdown(input.value); hidden.value = ''; });
    input.addEventListener('focus', () => { justSelected = false; input.select(); renderDropdown(''); });
    input.addEventListener('blur', () => { setTimeout(() => { if (!justSelected && hidden.value !== originalValue) restoreOriginal(); dropdown.style.display = 'none'; }, 150); });
    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.player-combobox-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); highlighted = Math.min(highlighted + 1, items.length - 1); items.forEach((it, i) => it.classList.toggle('highlighted', i === highlighted)); if (items[highlighted]) items[highlighted].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlighted = Math.max(highlighted - 1, 0); items.forEach((it, i) => it.classList.toggle('highlighted', i === highlighted)); if (items[highlighted]) items[highlighted].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && highlighted >= 0 && items[highlighted]) { e.preventDefault(); items[highlighted].dispatchEvent(new Event('mousedown')); }
      else if (e.key === 'Escape') { restoreOriginal(); input.blur(); }
    });
    const wrapper = el('span', { className: 'player-combobox-wrapper' });
    wrapper.append(hidden, input, dropdown);
    Object.defineProperty(wrapper, 'value', { get() { return hidden.value; }, set(v) { hidden.value = v; originalValue = v; const t = tourns.find(tr => tr.tournamentId === v); originalLabel = t ? tournLabel(t) : ''; input.value = originalLabel; } });
    Object.defineProperty(wrapper, 'onchange', { set(fn) { input.onchange = fn; }, get() { return input.onchange; } });
    Object.defineProperty(wrapper, 'disabled', { set(v) { input.disabled = v; }, get() { return input.disabled; } });
    return wrapper;
  }
  function newMatch() { return { matchDate: new Date().toISOString().slice(0, 10), event: 'Club Training', division: '', format: 'Singles', player1Id: '', player1Name: '', player1Sets: 0, player2Id: '', player2Name: '', player2Sets: 0, winnerId: '', winnerName: '', score: '0-0', resultStatus: completedStatusId }; }
  function newMatchId() { const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14); let sequence = 1; let id; do { id = `LK-T-${stamp}-${String(sequence++).padStart(3, '0')}`; } while (trainingMatches.some(match => match.matchId === id)); return id; }
  function newEntityId(type) {
    const existing = entityData[entityStorageKey[type]] || [];
    const idField = entityIdKey[type];
    const prefix = { club: 'CLUB', externalOpponent: 'EXT', tournament: 'TOURN', tournamentMatch: 'TM', tournamentProgress: 'TP' }[type] || 'ID';
    let seq = existing.length;
    let id;
    do { seq++; id = `${prefix}-${String(seq).padStart(4, '0')}`; } while (existing.some(r => r[idField] === id));
    return id;
  }

  function renderPlayers() {
    const isExtTab = activePlayerSubTab === 'extPlayers';
    const workspace = el('section', { className: 'admin-workspace' }); const listPanel = el('section', { className: 'admin-panel admin-list-panel' });
    const listHeader = el('div', { className: 'admin-list-header' }); const heading = el('div');
    const extCount = (entityData.externalOpponents || []).length;
    heading.append(text('p', 'PLAYERS / 選手', 'eyebrow'), text('h2', isExtTab ? `${extCount} external / 外部選手` : `${players.length} players / 選手`));
    const search = el('input', { type: 'search', placeholder: '名前・ID・カテゴリ等で検索 / Search by name, ID, category, equipment...', ariaLabel: 'Search players' }); listHeader.append(heading, search);
    // Sub-tabs
    const subTabs = el('div', { className: 'admin-sub-tabs' });
    const subTab = (id, label) => { const node = button(label, () => { activePlayerSubTab = id; selectedId = ''; renderWorkspace(); }, `admin-sub-tab${activePlayerSubTab === id ? ' active' : ''}`); return node; };
    subTabs.append(subTab('ourPlayers', 'OUR PLAYERS / リトルキングス'), subTab('extPlayers', 'OTHER PLAYERS / 外部選手'));
    listPanel.append(listHeader, subTabs);
    const addBtn = isExtTab
      ? button('+ ADD EXT. OPPONENT / 外部選手追加', () => showExternalOpponentEditor(), 'primary')
      : button('+ ADD PLAYER / 選手追加', () => showPlayerEditor(null), 'primary');
    const rolloverBtn = isExtTab ? null : button('APRIL ROLLOVER / 4月繰り上げ', () => { if (confirm(language === 'en' ? 'Submit grade advancement for all students for approval?\n\nEach change will require approval before taking effect.' : '全選手の学年繰り上げを承認申請しますか？\n\n各変更は承認後に反映されます。')) { AprilRollover(); } }, 'secondary');
    listPanel.append(listHeader, addBtn);
    if (rolloverBtn) listPanel.append(rolloverBtn);
    const list = el('div', { className: 'admin-player-list' }); listPanel.append(list); const editor = el('section', { className: 'admin-panel admin-editor-panel' }); workspace.append(listPanel, editor); app.append(workspace);
    allPlayersList = isExtTab
      ? (entityData.externalOpponents || []).map(p => ({ ...p, _entityType: 'externalOpponent' }))
      : players.map(p => ({ ...p, _entityType: 'player' }));
    const allPlayers = allPlayersList;
    // Calculate match stats for each player
    const stats = {};
    allPlayers.forEach(p => { const id = p.playerId || p.externalOpponentId; stats[id] = { played: 0, wins: 0, losses: 0 }; });
    (trainingMatches || []).forEach(m => {
      if (isIncompleteStatus(m.resultStatus)) return;
      const s1 = stats[m.player1Id]; const s2 = stats[m.player2Id];
      if (s1) s1.played++;
      if (s2) s2.played++;
      if (m.winnerId) {
        if (stats[m.winnerId]) stats[m.winnerId].wins++;
        const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
        if (stats[loserId]) stats[loserId].losses++;
      }
    });
    const updateList = () => { empty(list); const query = search.value.trim().toLowerCase(); allPlayers.filter(player => `${player.playerId || player.externalOpponentId || ''} ${player.displayName} ${player.englishName || ''} ${player.notebookName || ''} ${player.clubId || ''} ${player.gender || ''} ${player.schoolLevel || ''} ${player.grade || ''} ${player.playingHand || ''} ${player.grip || ''} ${player.playingStyle || ''} ${player.blade || ''} ${rubberName(player.forehandRubber)} ${rubberName(player.backhandRubber)} ${player.forehandRubberType || ''} ${player.backhandRubberType || ''} ${player.status || ''}`.toLowerCase().includes(query)).sort((a, b) => { const idA = a.playerId || a.externalOpponentId; const idB = b.playerId || b.externalOpponentId; return (stats[idB]?.played || 0) - (stats[idA]?.played || 0) || idA.localeCompare(idB); }).forEach(player => { const row = el('button', { type: 'button', className: `admin-player-row${(player.playerId || player.externalOpponentId) === selectedId ? ' selected' : ''}` }); const names = el('span'); const id = player.playerId || player.externalOpponentId; const gradeTag = player.grade ? ` · ${player.grade}` : ''; const s = stats[id] || { played: 0, wins: 0, losses: 0 }; const statsTag = s.played > 0 ? ` · ${s.played}G ${s.wins}W ${s.losses}L` : ''; names.append(text('b', player.displayName || 'No display name'), text('small', `${id} · ${player.englishName || '-'}${player.notebookName ? ' · 📝' + player.notebookName : ''}${gradeTag}${statsTag}`)); row.append(names, text('i', player.status || 'Active')); row.onclick = () => { selectedId = id; updateList(); showPlayerEditor(player); }; list.append(row); }); };
    search.oninput = updateList; window.adminPlayerListUpdate = updateList; updateList(); showPlayerEditor(allPlayers[0] || null);
  }
  function showPlayerEditor(player) {
    const editor = document.querySelector('.admin-editor-panel'); if (!editor) return; empty(editor);
    const isExternal = player?._entityType === 'externalOpponent' || (player && !player.playerId && player.externalOpponentId);
    const entityType = isExternal ? 'externalOpponent' : 'player';
    const idField = isExternal ? 'externalOpponentId' : 'playerId';
    const record = player ? { ...player } : newPlayer();
    const recordId = record[idField] || record.playerId || record.externalOpponentId || '';
    editor.append(text('p', player ? `EDIT ${isExternal ? 'EXT. OPPONENT' : 'PLAYER'} / ${isExternal ? '外部選手編集' : '選手編集'}` : 'NEW PLAYER / 新規選手', 'eyebrow'), text('h2', player ? (record.displayName || recordId) : 'Add player / 選手を追加'));
    const form = el('form', { className: 'admin-player-form' });
    let schoolLevelInput, gradeInput, gradeBirthHelper;
    const rubberInputs = {};
    playerFields.forEach(([key, label, type, required, options]) => {
      if (key === 'grade') return;
      const actualKey = (key === 'playerId' && isExternal) ? 'externalOpponentId' : key;
      const actualLabel = (key === 'playerId' && isExternal) ? '外部選手ID / External opponent ID' : label;
      const labelNode = el('label');
      let input;
      if (actualKey === 'clubId') {
        const clubSelect = el('select', { name: actualKey });
        clubSelect.append(el('option', { value: '', textContent: '' }));
        (entityData.clubs || []).forEach(c => clubSelect.append(el('option', { value: c.clubId, textContent: c.name ? `${c.name} (${c.clubId})` : c.clubId })));
        clubSelect.value = record[actualKey] || record[key] || '';
        input = clubSelect;
      } else if (key === 'forehandRubber' || key === 'backhandRubber') {
        const typeKey = key === 'forehandRubber' ? 'forehandRubberType' : 'backhandRubberType';
        const currentType = record[typeKey] || '';
        const rubbers = currentType ? ((window.RUBBER_DB || {})[currentType] || []) : (window.RUBBERS || []);
        const rubberSelect = el('select', { name: actualKey });
        rubberSelect.append(el('option', { value: '', textContent: '' }));
        rubbers.forEach(r => rubberSelect.append(el('option', { value: r.rubberId, textContent: r.name })));
        rubberSelect.value = rubberIdByName(record[actualKey] || record[key]) || '';
        input = rubberSelect;
        rubberInputs[actualKey] = { input, typeKey };
      } else {
        const fieldTable = { gender: 'genders', schoolLevel: 'schoolLevels', playingHand: 'playingHands', grip: 'grips', playingStyle: 'playingStyles', status: 'statuses', grade: 'grades', round: 'tournamentRounds', result: 'tournamentResults', resultStatus: 'resultStatuses' }[actualKey];
        const resolvedValue = fieldTable ? resolveFieldValue(fieldTable, record[actualKey] || record[key]) : (record[actualKey] || record[key] || '');
        input = type === 'select' ? select(actualKey, options, resolvedValue) : el('input', { name: actualKey, type: 'text', value: record[actualKey] || record[key] || '' });
      }
      input.required = (actualKey === 'status' && isExternal) ? false : Boolean(required);
      input.readOnly = (actualKey === 'playerId' || actualKey === 'externalOpponentId') && Boolean(player);
      if (key === 'schoolLevel') schoolLevelInput = input;
      labelNode.append(text('span', actualLabel), input);
      form.append(labelNode);
    });
    const gradeLabelNode = el('label');
    gradeInput = select('grade', [], '');
    gradeInput.required = false;
    const resolveSchoolLevelText = slId => {
      if (!slId) return '';
      const entry = (S.schoolLevels || []).find(x => x.id === slId);
      return entry ? (entry.nameJa || entry.name || slId) : slId;
    };
    const updateGradeOptions = (slValue, preserveGrade) => {
      const slText = resolveSchoolLevelText(slValue);
      const opts = gradeOptions[slText] || gradeOptions[slValue] || [];
      const savedGrade = preserveGrade ? gradeInput.value : '';
      gradeInput.replaceChildren();
      gradeInput.append(el('option', { value: '', textContent: '' }));
      opts.forEach(opt => gradeInput.append(el('option', { value: opt, textContent: opt })));
      if (savedGrade && opts.includes(savedGrade)) gradeInput.value = savedGrade;
      else gradeInput.value = '';
      gradeLabelNode.style.display = opts.length > 0 ? '' : 'none';
      updateBirthHelper();
    };
    gradeBirthHelper = text('small', '', 'admin-derived');
    gradeBirthHelper.style.display = 'none';
    const updateBirthHelper = () => {
      const sl = resolveSchoolLevelText(schoolLevelInput.value);
      const gr = gradeInput.value;
      if (gr && gradeBirthYears[sl] && gradeBirthYears[sl][gr]) { gradeBirthHelper.textContent = `出生年 / Birth year: ${gradeBirthYears[sl][gr]}`; gradeBirthHelper.style.display = ''; } else { gradeBirthHelper.textContent = ''; gradeBirthHelper.style.display = 'none'; }
    };
    gradeLabelNode.append(text('span', '学年 / Grade'), gradeInput, gradeBirthHelper);
    form.append(gradeLabelNode);
    updateGradeOptions(record.schoolLevel || '', false);
    if (record.grade && (gradeOptions[resolveSchoolLevelText(record.schoolLevel)] || gradeOptions[record.schoolLevel] || []).includes(record.grade)) gradeInput.value = record.grade;
    schoolLevelInput.onchange = () => { updateGradeOptions(schoolLevelInput.value, false); };
    gradeInput.onchange = updateBirthHelper;
    Object.entries(rubberInputs).forEach(([rubberKey, { input, typeKey }]) => {
      const typeSelect = form.querySelector(`[name="${typeKey}"]`);
      const updateRubberOptions = () => {
        const rubberType = typeSelect?.value || '';
        const rubbers = rubberType ? ((window.RUBBER_DB || {})[rubberType] || []) : (window.RUBBERS || []);
        const currentRubberId = rubberIdByName(input.value);
        input.replaceChildren();
        input.append(el('option', { value: '', textContent: '' }));
        rubbers.forEach(r => input.append(el('option', { value: r.rubberId, textContent: r.name })));
        if (rubbers.some(r => r.rubberId === currentRubberId)) input.value = currentRubberId;
        else input.value = '';
      };
      if (typeSelect) typeSelect.onchange = updateRubberOptions;
    });
    if (player && record.gradeHistory && record.gradeHistory.length) {
      const histSection = el('div', { className: 'admin-derived' });
      histSection.append(text('p', '学年履歴 / Grade history'));
      const histList = el('ul');
      record.gradeHistory.forEach(h => { histList.append(el('li', { textContent: `${h.date || ''} ${h.schoolLevel || ''} ${h.grade || ''}` })); });
      histSection.append(histList);
      form.append(histSection);
    }
    const actions = el('div', { className: 'admin-editor-actions' });
    actions.append(button('SUBMIT FOR APPROVAL / 承認申請', () => { if (confirm(player ? 'Submit this player change for approval? / この選手の変更を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。' : 'Submit this new player for approval? / 新規選手を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。')) form.requestSubmit(); }, 'primary'));
    actions.append(button(player ? 'RESET / リセット' : 'CLEAR / クリア', () => { if (player) { Object.keys(record).forEach(key => { const el = form.elements[key]; if (el) el.value = record[key] ?? ''; }); updateGradeOptions(record.schoolLevel, false); } else { form.reset(); updateGradeOptions(schoolLevelInput.value, false); } }, 'secondary'));
    form.append(actions);
    form.onsubmit = event => {
      event.preventDefault(); const next = player ? { ...record, ...Object.fromEntries(new FormData(form)) } : Object.fromEntries(new FormData(form));
      const submitEntityType = isExternal ? 'externalOpponent' : 'player';
      const submitIdField = isExternal ? 'externalOpponentId' : 'playerId';
      const submitId = next[submitIdField] || next.playerId || next.externalOpponentId;
      if (player && (next.schoolLevel !== record.schoolLevel || next.grade !== record.grade)) {
        if (!next.gradeHistory) next.gradeHistory = record.gradeHistory || [];
        next.gradeHistory = [...next.gradeHistory, { date: new Date().toISOString().slice(0, 10), schoolLevel: record.schoolLevel || '', grade: record.grade || '' }];
      }
      submitChange(submitEntityType, submitId, next, player ? 'update' : 'create').then(async () => {
        await loadWorkspace();
        // Stay on the same player after submit
        const stayId = submitId;
        if (stayId && window.adminPlayerListUpdate) {
          selectedId = stayId;
          window.adminPlayerListUpdate();
          const refreshed = allPlayersList.find(p => (p.playerId || p.externalOpponentId) === stayId);
          if (refreshed) showPlayerEditor(refreshed);
        }
      }).catch(error => { actions.append(text('span', `${error.message} / 保存できませんでした`, 'admin-status')); });
    };
    editor.append(form);
    if (player) {
      const pending = findPendingChange(entityType, recordId);
      if (pending) editor.append(renderPendingInfo(pending));
      renderRecordHistory(entityType, recordId).then(history => { if (history.childNodes.length) editor.append(history); });
    }
  }
  function newExternalOpponent() {
    const ext = entityData.externalOpponents || [];
    const next = Math.max(0, ...ext.map(p => Number((p.externalOpponentId || '').match(/\d+$/)?.[0]) || 0)) + 1;
    const record = { _entityType: 'externalOpponent' };
    playerFields.forEach(([key]) => { record[key] = key === 'externalOpponentId' ? `EXT-${String(next).padStart(4, '0')}` : ''; });
    delete record.playerId;
    record.clubId = (entityData.clubs || [])[1]?.clubId || '';
    return record;
  }
  function showExternalOpponentEditor() {
    showPlayerEditor(newExternalOpponent());
  }
  function newPlayer() { const next = Math.max(0, ...players.map(player => Number((player.playerId || '').match(/\d+$/)?.[0]) || 0)) + 1; const record = Object.fromEntries(playerFields.map(([key]) => [key, key === 'playerId' ? `LK-${String(next).padStart(4, '0')}` : key === 'status' ? 'Active' : ''])); record.clubId = (entityData.clubs || [])[0]?.clubId || 'CLUB-0001'; return record; }
  function AprilRollover() {
    const gradeProgression = { '1年生':'2年生', '2年生':'3年生', '3年生':'4年生', '4年生':'5年生', '5年生':'6年生' };
    const schoolProgression = { '小学生':'中学生', '中学生':'高校生', '高校生':'' };
    const today = new Date().toISOString().slice(0,10);
    const toUpdate = [];
    players.forEach(player => {
      if (!player.schoolLevel || player.schoolLevel === '一般') return;
      const oldSchool = player.schoolLevel, oldGrade = player.grade || '';
      let newSchool = player.schoolLevel, newGrade = '';
      if (player.grade && gradeProgression[player.grade]) {
        newGrade = gradeProgression[player.grade];
      } else if (player.schoolLevel !== '高校生') {
        newSchool = schoolProgression[player.schoolLevel] || player.schoolLevel;
        newGrade = '1年生';
      } else {
        newSchool = '一般'; newGrade = '';
      }
      if (newSchool !== oldSchool || newGrade !== oldGrade) {
        if (!player.gradeHistory) player.gradeHistory = [];
        player.gradeHistory.push({ date: today, schoolLevel: oldSchool, grade: oldGrade });
        player.schoolLevel = newSchool;
        player.grade = newGrade;
        toUpdate.push(player);
      }
    });
    if (!toUpdate.length) { alert(language === 'en' ? 'No student players to advance.' : '繰り上げ対象の選手がいません。'); return; }
    (async () => {
      for (const player of toUpdate) { await submitChange('player', player.playerId, player, 'update'); }
      alert(language === 'en' ? `Updated ${toUpdate.length} player grades.` : `${toUpdate.length}選手の学年を更新しました。`);
      await loadWorkspace();
    })().catch(error => { alert(`${error.message} / 更新に失敗しました`); });
  }

  function renderEntity(type) {
    const records = entityData[type] || [];
    const idField = entityIdKey[type]; const storageKey = entityStorageKey[type]; const label = entityLabel[type];
    const workspace = el('section', { className: 'admin-workspace' });
    const listPanel = el('section', { className: 'admin-panel admin-list-panel' });
    const listHeader = el('div', { className: 'admin-list-header' });
    const heading = el('div'); heading.append(text('p', `${label} / 管理`, 'eyebrow'), text('h2', `${records.length} records / レコード`));
    const search = el('input', { type: 'search', placeholder: 'ID・名前で検索 / Search by ID or name', ariaLabel: `Search ${label}` });
    listHeader.append(heading, search); listPanel.append(listHeader);
    if (currentRole === 'admin') listPanel.append(button(`+ ADD / ${label.split(' / ')[0]}追加`, () => showEntityEditor(type, null), 'primary'));
    const list = el('div', { className: 'admin-player-list' }); listPanel.append(list);
    const editor = el('section', { className: 'admin-panel admin-editor-panel' });
    workspace.append(listPanel, editor); app.append(workspace);
    const updateList = () => {
      empty(list); const query = search.value.trim().toLowerCase();
      const results = records.filter(record => `${record[idField] || ''} ${record.displayName || record.name || record.matchDate || ''}`.toLowerCase().includes(query));
      if (!results.length) list.append(text('p', '該当するレコードがありません / No records found.', 'admin-empty'));
      results.forEach(record => {
        const row = el('button', { type: 'button', className: `admin-player-row${record[idField] === selectedId ? ' selected' : ''}` });
        const names = el('span');
        const mainLabel = type === 'clubs' ? (record.nameJa || record.name || record[idField]) : (record[idField] || 'Unnamed');
        const subLabel = type === 'clubs' ? `${record.clubId || ''} · ${record.name || ''}` : (record.displayName || record.name || record.matchDate || '');
        names.append(text('b', mainLabel), text('small', subLabel));
        row.append(names); row.onclick = () => { selectedId = record[idField]; updateList(); showEntityEditor(type, record); }; list.append(row);
      });
    };
    search.oninput = updateList; updateList(); showEntityEditor(type, records.find(record => record[idField] === selectedId) || records[0] || null);
  }

  function showEntityEditor(type, record) {
    const editor = document.querySelector('.admin-editor-panel'); if (!editor) return; empty(editor);
    const fields = entityFields[type]; const idField = entityIdKey[type];
    const newId = record ? null : newEntityId(type);
    editor.append(text('p', record ? `EDIT ${entityLabel[type]}` : `NEW ${entityLabel[type]}`, 'eyebrow'), text('h2', record ? (record.displayName || record.name || record[idField] || 'Record') : 'Add new record / 新規レコードを追加'));
    const form = el('form', { className: 'admin-player-form' });
    const entityRubberInputs = {};
    fields.forEach(([key, label, type, required, options]) => {
      const labelNode = el('label');
      let input;
      if (key === idField && !record) {
        input = el('input', { name: key, type: 'text', value: newId });
        input.readOnly = true;
      } else if (key === 'clubId' && key !== idField) {
        const clubSelect = el('select', { name: key });
        clubSelect.append(el('option', { value: '', textContent: '' }));
        (entityData.clubs || []).forEach(c => clubSelect.append(el('option', { value: c.clubId, textContent: c.name ? `${c.name} (${c.clubId})` : c.clubId })));
        clubSelect.value = record?.[key] || '';
        input = clubSelect;
      } else if (key === 'forehandRubber' || key === 'backhandRubber') {
        const typeKey = key === 'forehandRubber' ? 'forehandRubberType' : 'backhandRubberType';
        const currentType = record?.[typeKey] || '';
        const rubbers = currentType ? ((window.RUBBER_DB || {})[currentType] || []) : (window.RUBBERS || []);
        const rubberSelect = el('select', { name: key });
        rubberSelect.append(el('option', { value: '', textContent: '' }));
        rubbers.forEach(r => rubberSelect.append(el('option', { value: r.rubberId, textContent: r.name })));
        rubberSelect.value = rubberIdByName(record?.[key]) || '';
        input = rubberSelect;
        entityRubberInputs[key] = { input, typeKey };
      } else if (type === 'player') {
        input = playerSelect(key, record?.[key] || '');
      } else if (type === 'tournament') {
        input = tournamentSelect(key, record?.[key] || '');
      } else {
        const fieldTable = { gender: 'genders', schoolLevel: 'schoolLevels', playingHand: 'playingHands', grip: 'grips', playingStyle: 'playingStyles', round: 'tournamentRounds', result: 'tournamentResults', resultStatus: 'resultStatuses' }[key];
        const resolvedValue = fieldTable ? resolveFieldValue(fieldTable, record?.[key]) : (record?.[key] || '');
        input = type === 'select' ? select(key, options, resolvedValue) : el('input', { name: key, type: type === 'number' ? 'number' : 'text', value: record?.[key] || '' });
      }
      input.required = Boolean(required);
      if (key === idField && record) input.readOnly = true;
      if (type === 'number') { input.min = '0'; input.step = '1'; }
      labelNode.append(text('span', label), input);
      form.append(labelNode);
    });
    Object.entries(entityRubberInputs).forEach(([rubberKey, { input, typeKey }]) => {
      const typeSelect = form.querySelector(`[name="${typeKey}"]`);
      const updateRubberOptions = () => {
        const rubberType = typeSelect?.value || '';
        const rubbers = rubberType ? ((window.RUBBER_DB || {})[rubberType] || []) : (window.RUBBERS || []);
        const currentRubberId = rubberIdByName(input.value);
        input.replaceChildren();
        input.append(el('option', { value: '', textContent: '' }));
        rubbers.forEach(r => input.append(el('option', { value: r.rubberId, textContent: r.name })));
        if (rubbers.some(r => r.rubberId === currentRubberId)) input.value = currentRubberId;
        else input.value = '';
      };
      if (typeSelect) typeSelect.onchange = updateRubberOptions;
    });
    const actions = el('div', { className: 'admin-editor-actions' });
    const entityType = entityTypeKey[type] || type;
    if (currentRole === 'admin') {
      actions.append(button('SUBMIT FOR APPROVAL / 承認申請', () => { if (confirm(record ? `Submit this ${entityLabel[type]} change for approval? / この${entityLabel[type]}の変更を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。` : `Submit this new ${entityLabel[type]} for approval? / 新規${entityLabel[type]}を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。`)) form.requestSubmit(); }, 'primary'));
      actions.append(button(record ? 'RESET / リセット' : 'CLEAR / クリア', () => { if (record) { Object.keys(record).forEach(key => { const el = form.elements[key]; if (el) el.value = record[key] ?? ''; }); } else { form.reset(); } }, 'secondary'));
    }
    form.append(actions);
    form.onsubmit = event => {
      event.preventDefault(); const next = record ? { ...record, ...Object.fromEntries(new FormData(form)) } : Object.fromEntries(new FormData(form));
      Object.keys(next).forEach(key => { if (next[key] === '' && fields.find(f => f[0] === key && f[2] === 'number')) next[key] = 0; });
      submitChange(entityType, next[idField], next, record ? 'update' : 'create').then(loadWorkspace).catch(error => { actions.append(text('span', `${error.message} / 保存できませんでした`, 'admin-status')); });
    };
    editor.append(form);
    if (record) {
      const pending = findPendingChange(entityType, record[idField]);
      if (pending) editor.append(renderPendingInfo(pending));
      renderRecordHistory(entityType, record[idField]).then(history => { if (history.childNodes.length) editor.append(history); });
    }
  }

  async function submitChange(entityType, targetId, after, action) { return window.LKData.request('/api/change', { method: 'POST', body: JSON.stringify({ entityType, targetId, after, action }) }); }

  async function renderRecordHistory(entityType, targetId) {
    const container = el('div', { className: 'admin-record-history' });
    try {
      const result = await window.LKData.request('/api/pending');
      const all = (result.changes || []).filter(c => c.entityType === entityType && c.targetId === targetId);
      if (!all.length) return container;
      const pending = all.filter(c => c.status === 'pending');
      const processed = all.filter(c => c.status === 'accepted' || c.status === 'rejected');
      if (pending.length) {
        const section = el('div', { className: 'admin-record-history-section' });
        section.append(text('p', `PENDING / 承認待ち (${pending.length})`, 'admin-record-history-title'));
        pending.forEach(c => section.append(renderPendingInfo(c)));
        container.append(section);
      }
      if (processed.length) {
        const section = el('div', { className: 'admin-record-history-section' });
        section.append(text('p', `HISTORY / 履歴 (${processed.length})`, 'admin-record-history-title'));
        processed.sort((a, b) => (b.reviewedAt || '').localeCompare(a.reviewedAt || ''));
        processed.forEach(c => {
          const card = el('article', { className: `admin-history-card ${c.status}` });
          const cardHeader = el('div', { className: 'admin-history-card-header' });
          const actionLabels = { create: 'NEW / 新規', update: 'MODIFIED / 変更', delete: 'DELETE / 削除' };
          cardHeader.append(text('span', actionLabels[c.action] || c.action, `admin-pending-badge ${c.action}`), text('span', c.status === 'accepted' ? '✓ ACCEPTED / 承認済み' : '✗ REJECTED / 却下済み', `admin-history-status ${c.status}`), text('span', formatPendingDate(c.reviewedAt), 'admin-pending-date'));
          card.append(cardHeader);
          const diff = computeDiff(c);
          if (diff.length) {
            const table = el('table', { className: 'admin-pending-table' }); const thead = el('thead'); const thr = el('tr'); thead.append(thr); table.append(thead);
            thr.append(text('th', 'Field'), text('th', 'Before'), text('th', 'After'));
            const tbody = el('tbody'); table.append(tbody);
            diff.forEach(d => { const row = el('tr'); row.className = 'admin-pending-diff-row'; row.append(text('td', d.field), text('td', d.before === '' || d.before == null ? '—' : String(d.before)), text('td', d.after === '' || d.after == null ? '—' : String(d.after))); tbody.append(row); });
            const diffSection = el('div', { className: 'admin-pending-diff' }); diffSection.append(table); card.append(diffSection);
          }
          section.append(card);
        });
        container.append(section);
      }
    } catch {}
    return container;
  }

  function renderManage() {
    const workspace = el('section', { className: 'admin-workspace' });
    const panel = el('section', { className: 'admin-panel admin-pending-panel' });
    const subTabs = el('div', { className: 'admin-sub-tabs' });
    const subTab = (id, label) => { const node = button(label, () => { activeManageSubTab = id; renderWorkspace(); }, `admin-sub-tab${activeManageSubTab === id ? ' active' : ''}`); return node; };
    subTabs.append(subTab('pending', 'PENDING / 承認待ち'), subTab('history', 'HISTORY / 履歴'));
    panel.append(text('p', 'MANAGE / 管理', 'eyebrow'), subTabs);
    workspace.append(panel); app.append(workspace);
    if (activeManageSubTab === 'pending') renderPendingContent(panel);
    else renderHistoryContent(panel);
  }

  async function renderPendingContent(panel) {
    try {
      const result = await window.LKData.request('/api/pending'); const changes = (result.changes || []).filter(change => change.status === 'pending');
      if (!changes.length) { panel.append(text('p', 'No pending changes. / 承認待ちの変更はありません。', 'admin-empty')); return; }
      const summary = text('p', `${changes.length} change${changes.length > 1 ? 's' : ''} awaiting review / 承認待ち`, 'admin-pending-summary'); panel.append(summary);
      if (currentRole === 'approver') {
        const bulkActions = el('div', { className: 'admin-pending-bulk-actions' });
        const bulkStatus = text('span', '', 'admin-pending-action-status');
        const handleBulk = async (decision) => {
          const label = decision === 'accept' ? 'approve' : 'reject';
          if (!confirm(`Are you sure you want to ${label} ALL ${changes.length} pending changes? / 保留中の変更をすべて${label === 'accept' ? '承認' : '却下'}しますか？\n\nThis cannot be undone. / 元に戻せません。`)) return;
          bulkStatus.textContent = `Processing ${changes.length} changes... / ${changes.length}件の変更を処理中...`;
          let done = 0, failed = 0;
          for (const change of changes) {
            try {
              await window.LKData.request('/api/approve', { method: 'POST', body: JSON.stringify({ changeId: change.changeId, decision }) });
              done++;
              bulkStatus.textContent = `${done + failed}/${changes.length} processed... / 処理中...`;
            } catch { failed++; }
          }
          bulkStatus.textContent = `Done: ${done} ${label}d, ${failed} failed. / 完了: ${done}件${label === 'accept' ? '承認' : '却下'}、${failed}件失敗。`;
          await loadWorkspace();
        };
        bulkActions.append(button('APPROVE ALL / すべて承認', () => handleBulk('accept'), 'primary'), button('REJECT ALL / すべて却下', () => handleBulk('reject'), 'danger'), bulkStatus);
        panel.append(bulkActions);
      }
      if (currentRole !== 'approver') {
        const loginHint = el('div', { className: 'admin-pending-login-hint' });
        loginHint.append(text('p', 'Sign in as approver to accept or reject changes. / 承認者としてログインすると変更の承認・却下ができます。'));
        loginHint.append(button('APPROVER LOGIN / 承認者ログイン', () => showApproverLogin(), 'primary'));
        panel.append(loginHint);
      }
      changes.forEach(change => {
        const card = el('article', { className: 'admin-pending-card' });
        const actionLabels = { create: 'NEW / 新規', update: 'MODIFIED / 変更', delete: 'DELETE / 削除' };
        const actionClass = { create: 'create', update: 'update', delete: 'delete' };
        const header = el('div', { className: 'admin-pending-card-header' });
        header.append(text('span', actionLabels[change.action] || change.action, `admin-pending-badge ${actionClass[change.action] || ''}`), text('h3', change.summary || `${change.entityType} · ${change.targetId}`), text('span', formatPendingDate(change.createdAt), 'admin-pending-date'));
        const meta = el('div', { className: 'admin-pending-meta' });
        meta.append(text('span', `${change.entityType} · ${change.targetId} · Submitted by: / 申請者: ${change.createdBy}`, 'admin-pending-by'));
        card.append(header, meta);
        if (change.action === 'delete' && change.before) {
          const deleted = el('div', { className: 'admin-pending-deleted' }); deleted.append(text('p', 'Record to be deleted / 削除対象レコード', 'admin-pending-section-title'));
          const table = el('table', { className: 'admin-pending-table' }); const thead1 = el('thead'); const thr1 = el('tr'); thead1.append(thr1); table.append(thead1);
          thr1.append(text('th', 'Field'), text('th', 'Value'));
          const tbody = el('tbody'); table.append(tbody);
          Object.entries(change.before).forEach(([key, value]) => { if (value === '' || value === null || value === undefined) return; const row = el('tr'); row.append(text('td', key), text('td', String(value))); tbody.append(row); });
          deleted.append(table); card.append(deleted);
        } else if (change.after) {
          const diff = computeDiff(change);
          if (diff.length) {
            const diffSection = el('div', { className: 'admin-pending-diff' }); diffSection.append(text('p', 'Changes / 変更内容', 'admin-pending-section-title'));
            const table = el('table', { className: 'admin-pending-table' }); const thead2 = el('thead'); const thr2 = el('tr'); thead2.append(thr2); table.append(thead2);
            thr2.append(text('th', 'Field'), text('th', 'Before'), text('th', 'After'));
            const tbody = el('tbody'); table.append(tbody);
            diff.forEach(d => {
              const row = el('tr'); row.className = 'admin-pending-diff-row';
              row.append(text('td', d.field), text('td', d.before === '' || d.before == null ? '—' : displayValue(d.field, d.before)), text('td', d.after === '' || d.after == null ? '—' : displayValue(d.field, d.after)));
              tbody.append(row);
            });
            diffSection.append(table); card.append(diffSection);
          } else if (change.action === 'create') {
            const detail = el('div', { className: 'admin-pending-detail' }); detail.append(text('p', 'New record / 新規レコード', 'admin-pending-section-title'));
            const table = el('table', { className: 'admin-pending-table' }); const thead3 = el('thead'); const thr3 = el('tr'); thead3.append(thr3); table.append(thead3);
            thr3.append(text('th', 'Field'), text('th', 'Value'));
            const tbody = el('tbody'); table.append(tbody);
            Object.entries(change.after).forEach(([key, value]) => {
              if (value === '' || value === null || value === undefined) return;
              const row = el('tr'); row.append(text('td', key), text('td', displayValue(key, value))); tbody.append(row);
            });
            detail.append(table); card.append(detail);
          } else {
            card.append(text('p', 'No changes detected. / 変更は検出されませんでした。', 'admin-empty'));
          }
        }
        if (currentRole === 'approver') {
          const actions = el('div', { className: 'admin-pending-actions' });
          const status = text('span', '', 'admin-pending-action-status');
          const handleDecision = async (decision, btnA, btnB) => {
            btnA.disabled = true; btnB.disabled = true; status.textContent = 'Processing... / 処理中...';
            try {
              await window.LKData.request('/api/approve', { method: 'POST', body: JSON.stringify({ changeId: change.changeId, decision }) });
              await loadWorkspace();
            } catch (error) {
              status.textContent = `${error.message} / 操作に失敗しました`;
              btnA.disabled = false; btnB.disabled = false;
            }
          };
          const acceptBtn = button('ACCEPT / 承認', () => { if (!confirm(`Accept this ${change.entityType} change? / この${change.entityType}の変更を承認しますか？\n\nThe change will be applied immediately. / 変更は即座に反映されます。`)) return; handleDecision('accept', acceptBtn, rejectBtn); }, 'primary');
          const rejectBtn = button('REJECT / 却下', () => { if (!confirm(`Reject this ${change.entityType} change? / この${change.entityType}の変更を却下しますか？\n\nThe change will be discarded. / 変更は破棄されます。`)) return; handleDecision('reject', acceptBtn, rejectBtn); }, 'danger');
          actions.append(acceptBtn, rejectBtn, status);
          card.append(actions);
        } else {
          card.append(text('p', 'Awaiting approval / 承認待ち', 'admin-pending-read-only'));
        }
        panel.append(card);
      });
    } catch (error) { panel.append(text('p', `${error.message} / 読み込みに失敗しました`, 'admin-load-error')); }
  }
  function formatPendingDate(iso) { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

  async function renderHistoryContent(panel) {
    try {
      const result = await window.LKData.request('/api/pending');
      const processed = (result.changes || []).filter(change => change.status === 'accepted' || change.status === 'rejected');
      if (!processed.length) { panel.append(text('p', 'No processed changes yet. / 処理済みの変更はありません。', 'admin-empty')); return; }
      const controls = el('div', { className: 'admin-history-controls' });
      const search = el('input', { type: 'search', placeholder: 'ID・種類で検索 / Search by ID or type', ariaLabel: 'Search history' });
      const statusFilter = el('select', { ariaLabel: 'Filter by status' });
      ['all', 'accepted', 'rejected'].forEach(v => statusFilter.append(el('option', { value: v, textContent: v === 'all' ? 'ALL / すべて' : v === 'accepted' ? 'ACCEPTED / 承認' : 'REJECTED / 却下' })));
      const typeFilter = el('select', { ariaLabel: 'Filter by entity type' });
      const entityTypes = [...new Set(processed.map(c => c.entityType))];
      typeFilter.append(el('option', { value: 'all', textContent: 'ALL TYPES / すべての種類' }));
      entityTypes.forEach(t => typeFilter.append(el('option', { value: t, textContent: t })));
      controls.append(search, statusFilter, typeFilter); panel.append(controls);
      if (currentRole === 'approver') {
        const clearHistory = button('CLEAR PROCESSED HISTORY / 処理済み履歴を削除', async () => {
          if (!confirm('Delete all accepted and rejected UAT history records? Pending changes will be kept. / UATの承認・却下済み履歴をすべて削除しますか？承認待ちの変更は保持されます。')) return;
          try {
            const result = await window.LKData.request('/api/clear-history', { method: 'POST' });
            alert(`${result.deleted} history record(s) deleted. / ${result.deleted}件の履歴を削除しました。`);
            renderWorkspace();
          } catch (error) { alert(`${error.message} / 削除できませんでした`); }
        }, 'secondary');
        panel.append(clearHistory);
      }
      const list = el('div', { className: 'admin-history-list' }); panel.append(list);
      const renderList = () => {
        empty(list); const query = search.value.trim().toLowerCase();
        const filtered = processed.filter(c => {
          if (statusFilter.value !== 'all' && c.status !== statusFilter.value) return false;
          if (typeFilter.value !== 'all' && c.entityType !== typeFilter.value) return false;
          if (query && !`${c.targetId} ${c.entityType} ${c.changeId}`.toLowerCase().includes(query)) return false;
          return true;
        });
        filtered.sort((a, b) => (b.reviewedAt || '').localeCompare(a.reviewedAt || ''));
        if (!filtered.length) { list.append(text('p', '該当する履歴がありません / No matching history.', 'admin-empty')); return; }
        const grouped = {};
        filtered.forEach(c => { const day = (c.reviewedAt || '').slice(0, 10); if (!grouped[day]) grouped[day] = []; grouped[day].push(c); });
        Object.entries(grouped).forEach(([day, items]) => {
          const group = el('div', { className: 'admin-history-group' });
          const groupHeader = el('div', { className: 'admin-history-group-header' });
          const d = day ? new Date(day + 'T00:00:00') : null;
          const dateLabel = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} (${(language === 'ja' ? ['日','月','火','水','木','金','土'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[d.getDay()]})` : day;
          groupHeader.append(text('h3', dateLabel), text('span', `${items.length} change${items.length > 1 ? 's' : ''} / 件`, 'admin-history-count'));
          group.append(groupHeader);
          items.forEach(c => {
            const card = el('article', { className: `admin-history-card ${c.status}` });
            const cardHeader = el('div', { className: 'admin-history-card-header' });
            const actionLabels = { create: 'NEW / 新規', update: 'MODIFIED / 変更', delete: 'DELETE / 削除' };
            cardHeader.append(text('span', actionLabels[c.action] || c.action, `admin-pending-badge ${c.action}`), text('h4', c.summary || `${c.entityType} · ${c.targetId}`), text('span', c.status === 'accepted' ? '✓ ACCEPTED / 承認済み' : '✗ REJECTED / 却下済み', `admin-history-status ${c.status}`), text('span', formatPendingDate(c.reviewedAt), 'admin-pending-date'));
            const meta = el('div', { className: 'admin-pending-meta' });
            meta.append(text('span', `${c.entityType} · ${c.targetId} · Submitted: / 申請者: ${c.createdBy} · Reviewed: / 確認者: ${c.reviewedBy || '-'}`, 'admin-pending-by'));
            card.append(cardHeader, meta);
            const diff = computeDiff(c);
            if (diff.length) {
              const diffSection = el('div', { className: 'admin-pending-diff' });
              const table = el('table', { className: 'admin-pending-table' }); const thead = el('thead'); const thr = el('tr'); thead.append(thr); table.append(thead);
              thr.append(text('th', 'Field'), text('th', 'Before'), text('th', 'After'));
              const tbody = el('tbody'); table.append(tbody);
            diff.forEach(d => { const row = el('tr'); row.className = 'admin-pending-diff-row'; row.append(text('td', d.field), text('td', d.before === '' || d.before == null ? '—' : displayValue(d.field, d.before)), text('td', d.after === '' || d.after == null ? '—' : displayValue(d.field, d.after))); tbody.append(row); });
              diffSection.append(table); card.append(diffSection);
            }
            group.append(card);
          });
          list.append(group);
        });
      };
      search.oninput = renderList; statusFilter.onchange = renderList; typeFilter.onchange = renderList; renderList();
    } catch (error) { panel.append(text('p', `${error.message} / 読み込みに失敗しました`, 'admin-load-error')); }
  }

  if (document.querySelector('#admin-app')) shell();
})();
