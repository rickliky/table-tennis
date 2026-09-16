(() => {
  'use strict';

  const app = document.querySelector('#admin-app');
  const playerFields = [['playerId', '選手ID / Player ID', 'text', true], ['clubId', 'クラブID / Club ID', 'select', true], ['displayName', '表示名 / Display name', 'text', true], ['englishName', 'ローマ字表記 / Romanized name', 'text'], ['gender', '性別 / Gender', 'select', false, ['', 'Male', 'Female', 'Other']], ['schoolLevel', 'カテゴリ / School level', 'select', false, ['', '小学生', '中学生', '高校生', '一般']], ['grade', '学年 / Grade', 'select', false, []], ['playingHand', '利き手 / Playing hand', 'select', false, ['', '右', '左']], ['grip', 'グリップ / Grip', 'select', false, ['', 'シェークハンド / Shakehand', 'ペンホルダー / Penhold']], ['playingStyle', '戦型 / Playing style', 'select', false, ['', 'ドライブ攻撃型 / Topspin attacker', 'カット主戦型 / Defensive chopper', '攻守兼備型 / All-rounder', '平台攻撃型 / Close-to-table attacker']], ['blade', 'ラケット / Blade', 'text'], ['forehandRubber', 'フォア面ラバー / Forehand rubber', 'text'], ['backhandRubber', 'バック面ラバー / Backhand rubber', 'text'], ['forehandRubberType', 'フォア面種類 / Forehand type', 'select', false, ['', '裏ソフト', '表ソフト', '粒高', 'アンチ', '一枚']], ['backhandRubberType', 'バック面種類 / Backhand type', 'select', false, ['', '裏ソフト', '表ソフト', '粒高', 'アンチ', '一枚']], ['rating', 'レーティング / Rating', 'text'], ['status', '状態 / Status', 'select', true, ['Active', 'Inactive']]];
  const gradeOptions = { '小学生': ['1年生','2年生','3年生','4年生','5年生','6年生'], '中学生': ['1年生','2年生','3年生'], '高校生': ['1年生','2年生','3年生'] };
  const gradeBirthYears = { '小学生': { '1年生':'2019–2020', '2年生':'2018–2019', '3年生':'2017–2018', '4年生':'2016–2017', '5年生':'2015–2016', '6年生':'2014–2015' }, '中学生': { '1年生':'2013–2014', '2年生':'2012–2013', '3年生':'2011–2012' }, '高校生': { '1年生':'2010–2011', '2年生':'2009–2010', '3年生':'2008–2009' } };
  const entityFields = {
    club: [['name', '名前 / Name', 'text', true], ['nameJa', '日本語名 / Japanese name', 'text', true], ['logoUrl', 'ロゴURL / Logo URL', 'text']],
    externalOpponent: [['externalOpponentId', '外部選手ID / External opponent ID', 'text', true], ['clubId', 'クラブID / Club ID', 'select', false], ['displayName', '表示名 / Display name', 'text', true], ['englishName', 'ローマジ / Romanized name', 'text'], ['gender', '性別 / Gender', 'select', false, ['', 'Male', 'Female', 'Other']], ['schoolLevel', 'カテゴリ / Category', 'select', false, ['', '小学生', '中学生', '高校生', '一般']], ['playingHand', '利き手 / Playing hand', 'select', false, ['', '右', '左']], ['grip', 'グリップ / Grip', 'select', false, ['', 'シェークハンド / Shakehand', 'ペンホルダー / Penhold']], ['playingStyle', '戦型 / Playing style', 'select', false, ['', 'ドライブ攻撃型 / Topspin attacker', 'カット主戦型 / Defensive chopper', '攻守兼備型 / All-rounder', '平台攻撃型 / Close-to-table attacker']], ['affiliation', '所属 / Affiliation', 'text']],
    tournament: [['tournamentId', '大会ID / Tournament ID', 'text', true], ['name', '大会名 / Tournament name', 'text', true], ['nameJa', '日本語名 / Japanese name', 'text'], ['date', '日付 / Date', 'text'], ['location', '会場 / Location', 'text'], ['category', 'カテゴリ / Category', 'text'], ['format', '形式 / Format', 'text']],
    tournamentMatch: [['tournamentMatchId', '大会試合ID / Tournament match ID', 'text', true], ['tournamentId', '大会ID / Tournament ID', 'text', true], ['matchDate', '日付 / Date', 'text', true], ['round', 'ラウンド / Round', 'text'], ['format', '形式 / Format', 'text'], ['player1Name', '選手1 / Player 1', 'text', true], ['player1Sets', '選手1セット / Player 1 sets', 'number'], ['player2Name', '選手2 / Player 2', 'text', true], ['player2Sets', '選手2セット / Player 2 sets', 'number'], ['winnerName', '勝者 / Winner', 'text'], ['score', 'スコア / Score', 'text'], ['resultStatus', '結果ステータス / Result status', 'select', false, ['', 'Completed', 'Incomplete', 'Void']]],
    tournamentProgress: [['tournamentProgressId', '進捗ID / Progress ID', 'text', true], ['tournamentId', '大会ID / Tournament ID', 'text', true], ['playerId', '選手ID / Player ID', 'text'], ['playerName', '選手名 / Player name', 'text'], ['round', 'ラウンド / Round', 'text'], ['result', '結果 / Result', 'text']]
  };
  entityFields.clubs = entityFields.club;
  entityFields.externalOpponents = entityFields.externalOpponent;
  entityFields.tournaments = entityFields.tournament;
  entityFields.tournamentMatches = entityFields.tournamentMatch;
  entityFields.tournamentProgress = entityFields.tournamentProgress;
  const entityIdKey = { club: 'name', clubs: 'name', externalOpponent: 'externalOpponentId', externalOpponents: 'externalOpponentId', tournament: 'tournamentId', tournaments: 'tournamentId', tournamentMatch: 'tournamentMatchId', tournamentMatches: 'tournamentMatchId', tournamentProgress: 'tournamentProgressId' };
  const entityStorageKey = { club: 'clubs', clubs: 'clubs', externalOpponent: 'external-opponents', externalOpponents: 'external-opponents', tournament: 'tournaments', tournaments: 'tournaments', tournamentMatch: 'tournament-matches', tournamentMatches: 'tournament-matches', tournamentProgress: 'tournament-progress' };
  const entityLabel = { club: 'CLUB / クラブ', clubs: 'CLUB / クラブ', externalOpponent: 'EXTERNAL OPPONENT / 外部選手', externalOpponents: 'EXTERNAL OPPONENT / 外部選手', tournament: 'TOURNAMENT / 大会', tournaments: 'TOURNAMENT / 大会', tournamentMatch: 'TOURNAMENT MATCH / 大会試合', tournamentMatches: 'TOURNAMENT MATCH / 大会試合', tournamentProgress: 'TOURNAMENT PROGRESS / 大会進捗' };
  const entityTypeKey = { clubs: 'club', externalOpponents: 'externalOpponent', tournaments: 'tournament', tournamentMatches: 'tournamentMatch', tournamentProgress: 'tournamentProgress' };
  let players = [];
  let trainingMatches = [];
  let entityData = {};
  let pendingChanges = [];
  let currentRole = '';
  let activeTab = 'matches';
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
    meta.append(text('span', `Submitted by: ${change.createdBy} · ${formatPendingDate(change.createdAt)}`));
    box.append(meta);
    const diff = computeDiff(change);
    if (diff.length) {
      const table = el('table', { className: 'admin-pending-table' });
      const thead = el('thead'); const thr = el('tr'); thr.append(text('th', 'Field'), text('th', 'Before'), text('th', 'After')); thead.append(thr); table.append(thead);
      const tbody = el('tbody'); table.append(tbody);
      diff.forEach(d => { const row = el('tr'); row.className = 'admin-pending-diff-row'; row.append(text('td', d.field), text('td', d.before === '' || d.before == null ? '—' : String(d.before)), text('td', d.after === '' || d.after == null ? '—' : String(d.after))); tbody.append(row); });
      box.append(table);
    } else if (change.action === 'create' && change.after) {
      const table = el('table', { className: 'admin-pending-table' });
      const thead = el('thead'); const thr = el('tr'); thr.append(text('th', 'Field'), text('th', 'Value')); thead.append(thr); table.append(thead);
      const tbody = el('tbody'); table.append(tbody);
      Object.entries(change.after).forEach(([key, value]) => { if (value === '' || value === null || value === undefined || key === 'gradeHistory') return; const row = el('tr'); row.append(text('td', key), text('td', String(value))); tbody.append(row); });
      box.append(table);
    } else if (change.action === 'delete') {
      box.append(text('p', 'Record will be deleted upon approval. / 承認後にレコードが削除されます。', 'admin-pending-info-note'));
    }
    return box;
  }
  const empty = node => { node.replaceChildren(); return node; };
  const canEditMatches = () => currentRole === 'admin';
  const playerName = id => players.find(player => player.playerId === id)?.displayName || '';

  function shell() {
    empty(app);
    const header = el('header', { className: 'admin-header' });
    const brand = el('div', { className: 'admin-brand' });
    brand.append(text('p', 'LITTLE KINGS', 'eyebrow'), text('h1', 'ADMIN'), text('span', '管理画面 / Administration'));
    const login = el('section', { className: 'admin-login admin-panel' });
    login.append(text('p', 'ROLE SIGN-IN / ロールログイン', 'eyebrow'), text('h2', 'Secure access / セキュアアクセス'));
    const form = el('form', { className: 'admin-login-form' });
    const role = el('select', { name: 'role', ariaLabel: 'Role' });
    const password = el('input', { name: 'password', type: 'password', required: true, autocomplete: 'current-password', placeholder: 'Password / パスワード' });
    const submit = el('button', { type: 'submit', className: 'admin-button primary', textContent: 'SIGN IN / ログイン' });
    const status = el('p', { className: 'admin-status', role: 'status' });
    ['admin', 'approver'].forEach(value => role.append(el('option', { value, textContent: value === 'admin' ? '管理者 / Admin' : '承認者 / Approver' })));
    form.append(role, password, submit); login.append(form, status); app.append(header, login);
    form.addEventListener('submit', async event => {
      event.preventDefault(); status.textContent = 'Verifying... / 確認中...';
      try {
        const result = await window.LKData.request('/api/login', { method: 'POST', body: JSON.stringify({ role: role.value, password: password.value }) });
        localStorage.setItem('lk-admin-session', result.token); currentRole = result.role; await loadWorkspace();
      } catch { status.textContent = 'Sign-in failed. Check your role and password. / ロールまたはパスワードを確認してください。'; }
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
    const header = el('header', { className: 'admin-header' });
    const brand = el('div', { className: 'admin-brand' });
    brand.append(text('p', 'LITTLE KINGS', 'eyebrow'), text('h1', 'ADMIN'), text('span', `${currentRole} / ${roleLabel(currentRole)}`));
    const actions = el('div', { className: 'admin-header-actions' });
    actions.append(button('SIGN OUT / ログアウト', () => { localStorage.removeItem('lk-admin-session'); shell(); }));
    header.append(brand, actions);
    const tabs = el('nav', { className: 'admin-tabs', ariaLabel: 'Admin sections' });
    tabs.append(tab('matches', 'TRAINING MATCHES / 練習試合'));
    if (currentRole === 'admin') {
      tabs.append(tab('players', 'PLAYERS / 選手'), tab('clubs', 'CLUBS / クラブ'), tab('externalOpponents', 'EXT. OPPONENTS / 外部選手'), tab('tournaments', 'TOURNAMENTS / 大会'), tab('tournamentMatches', 'TOURNAMENT RESULTS / 大会結果'), tab('tournamentProgress', 'TOURNAMENT PROGRESS / 大会進捗'));
    }
    tabs.append(tab('pending', 'PENDING CHANGES / 承認待ち'));
    tabs.append(tab('history', 'HISTORY / 変更履歴'));
    app.append(header, tabs);
    activeTab = activeTab === 'players' && currentRole !== 'admin' ? 'matches' : activeTab;
    if (activeTab === 'players') renderPlayers(); else if (activeTab === 'pending') renderPending(); else if (activeTab === 'history') renderHistory(); else if (activeTab === 'matches') renderMatches(); else renderEntity(activeTab);
  }
  function button(label, onclick, className = '') { const node = el('button', { className: `admin-button ${className}`.trim(), type: 'button', textContent: label }); node.onclick = onclick; return node; }
  function tab(id, label) { const node = button(label, () => { activeTab = id; selectedId = ''; renderWorkspace(); }, `admin-tab${activeTab === id ? ' active' : ''}`); return node; }
  function roleLabel(role) { return ({ admin: '管理者', approver: '承認者' })[role] || role; }

  function renderMatches() {
    const workspace = el('section', { className: 'admin-workspace' });
    const listPanel = el('section', { className: 'admin-panel admin-list-panel' });
    const listHeader = el('div', { className: 'admin-list-header' });
    const heading = el('div'); heading.append(text('p', 'TRAINING MATCHES / 練習試合一覧', 'eyebrow'), text('h2', `${trainingMatches.length} matches`));
    const search = el('input', { type: 'search', placeholder: '日付・選手名・IDで検索 / Search date, player or ID', ariaLabel: 'Search training matches' });
    listHeader.append(heading, search); listPanel.append(listHeader);
    if (canEditMatches()) listPanel.append(button('+ ADD MATCH / 試合追加', () => showMatchEditor(null), 'primary'));
    const list = el('div', { className: 'admin-player-list admin-match-list' }); listPanel.append(list);
    const editor = el('section', { className: 'admin-panel admin-editor-panel' }); workspace.append(listPanel, editor); app.append(workspace);
    const updateList = () => {
      empty(list); const query = search.value.trim().toLowerCase();
      const results = trainingMatches.filter(match => `${match.matchId} ${match.matchDate} ${match.player1Name} ${match.player2Name}`.toLowerCase().includes(query));
      if (!results.length) list.append(text('p', '該当する試合がありません / No matches found.', 'admin-empty'));
      results.sort((a, b) => `${b.matchDate}${b.matchId}`.localeCompare(`${a.matchDate}${a.matchId}`)).forEach(match => {
        const row = el('button', { type: 'button', className: `admin-player-row${match.matchId === selectedId ? ' selected' : ''}` });
        const details = el('span'); details.append(text('b', `${match.player1Name || match.player1Id} vs ${match.player2Name || match.player2Id}`), text('small', `${match.matchDate} · ${match.score || '-'} · ${match.resultStatus || '-'}`));
        row.append(details, text('i', match.event || 'Club Training')); row.onclick = () => { selectedId = match.matchId; updateList(); showMatchEditor(match); }; list.append(row);
      });
    };
    search.oninput = updateList; window.adminMatchListUpdate = updateList; updateList(); showMatchEditor(trainingMatches.find(match => match.matchId === selectedId) || trainingMatches[0] || null);
  }

  function showMatchEditor(match) {
    const editor = document.querySelector('.admin-editor-panel'); if (!editor) return; empty(editor);
    const readOnly = !canEditMatches(); const record = match ? { ...match } : newMatch();
    editor.append(text('p', readOnly ? 'VIEW ONLY / 閲覧専用' : match ? 'EDIT TRAINING MATCH / 練習試合編集' : 'NEW TRAINING MATCH / 新規練習試合', 'eyebrow'), text('h2', match ? `${record.player1Name || record.player1Id} vs ${record.player2Name || record.player2Id}` : 'Add training match'));
    const form = el('form', { className: 'admin-player-form admin-match-form' });
    const addField = (label, input) => { const labelNode = el('label'); labelNode.append(text('span', label), input); form.append(labelNode); };
    const date = el('input', { name: 'matchDate', type: 'date', required: true, value: record.matchDate || '' });
    const event = el('input', { name: 'event', type: 'text', required: true, value: record.event || 'Club Training' });
    const division = el('input', { name: 'division', type: 'text', value: record.division || '' });
    const format = select('format', ['Singles'], record.format || 'Singles');
    const player1 = playerSelect('player1Id', record.player1Id); const player2 = playerSelect('player2Id', record.player2Id);
    const sets1 = el('input', { name: 'player1Sets', type: 'number', min: '0', step: '1', required: true, value: String(record.player1Sets ?? 0) });
    const sets2 = el('input', { name: 'player2Sets', type: 'number', min: '0', step: '1', required: true, value: String(record.player2Sets ?? 0) });
     const resultStatus = select('resultStatus', ['Completed', 'Incomplete', 'Void', 'Transcribed - review'], record.resultStatus || 'Completed');
    const p1sl = el('input', { name: 'player1SchoolLevel', type: 'hidden', value: record.player1SchoolLevel || '' });
    const p1gr = el('input', { name: 'player1Grade', type: 'hidden', value: record.player1Grade || '' });
    const p2sl = el('input', { name: 'player2SchoolLevel', type: 'hidden', value: record.player2SchoolLevel || '' });
    const p2gr = el('input', { name: 'player2Grade', type: 'hidden', value: record.player2Grade || '' });
    const snapshotFromPlayer = (pid, slInput, grInput) => { const p = players.find(pl => pl.playerId === pid); if (p) { slInput.value = p.schoolLevel || ''; grInput.value = p.grade || ''; } else { slInput.value = ''; grInput.value = ''; } };
    player1.onchange = () => snapshotFromPlayer(player1.value, p1sl, p1gr);
    player2.onchange = () => snapshotFromPlayer(player2.value, p2sl, p2gr);
    if (record.player1Id) snapshotFromPlayer(record.player1Id, p1sl, p1gr);
    if (record.player2Id) snapshotFromPlayer(record.player2Id, p2sl, p2gr);
    addField('日付 / Date', date); addField('イベント / Event', event); addField('部門（任意）/ Division (optional)', division); addField('形式 / Format', format); addField('選手1 / Player 1', player1); addField('選手2 / Player 2', player2); addField('選手1 セット / Player 1 sets', sets1); addField('選手2 セット / Player 2 sets', sets2); addField('結果ステータス / Result status', resultStatus);
    form.append(p1sl, p1gr, p2sl, p2gr);
    [date, event, division, format, player1, player2, sets1, sets2, resultStatus].forEach(input => { input.disabled = readOnly; });
    const derived = text('p', '', 'admin-derived'); form.append(derived);
    const updateDerived = () => {
      const one = Number(sets1.value); const two = Number(sets2.value); const incomplete = resultStatus.value === 'Incomplete';
      derived.textContent = `Score: ${Number.isFinite(one) ? one : 0}-${Number.isFinite(two) ? two : 0} · Winner: ${incomplete || one === two ? 'なし / None' : playerName(one > two ? player1.value : player2.value) || 'Select players'}`;
      [...player1.options].forEach(option => { option.disabled = option.value && option.value === player2.value; });
      [...player2.options].forEach(option => { option.disabled = option.value && option.value === player1.value; });
    };
    [player1, player2, sets1, sets2, resultStatus].forEach(input => input.oninput = updateDerived); updateDerived();
    if (!readOnly) {
      const actions = el('div', { className: 'admin-editor-actions' });
      actions.append(button('SAVE / 保存', () => { if (confirm(match ? 'Submit this match change for approval? / この試合の変更を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。' : 'Submit this new match for approval? / 新規試合を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。')) form.requestSubmit(); }, 'primary'));
      actions.append(button(match ? 'RESET / リセット' : 'CLEAR / クリア', () => { form.reset(); updateDerived(); }, 'secondary'));
      if (match) actions.append(button('DELETE / 削除', async () => { if (confirm(`Submit deletion of ${match.matchId} for approval? / ${match.matchId}の削除を承認申請しますか？\n\nDeletion takes effect after approval. / 削除は承認後に反映されます。`)) { await submitChange('match', match.matchId, null, 'delete'); await loadWorkspace(); } }, 'danger'));
      form.append(actions);
      form.onsubmit = event => {
        event.preventDefault(); const next = match ? { ...record, ...Object.fromEntries(new FormData(form)) } : Object.fromEntries(new FormData(form));
        if (!next.player1Id || !next.player2Id || next.player1Id === next.player2Id) { derived.textContent = 'Choose two different players. / 異なる2名の選手を選択してください。'; return; }
        next.player1Sets = Number(next.player1Sets); next.player2Sets = Number(next.player2Sets); next.player1Name = playerName(next.player1Id); next.player2Name = playerName(next.player2Id); next.score = `${next.player1Sets}-${next.player2Sets}`;
        if (next.resultStatus === 'Incomplete' || next.player1Sets === next.player2Sets) { next.winnerId = ''; next.winnerName = ''; } else { next.winnerId = next.player1Sets > next.player2Sets ? next.player1Id : next.player2Id; next.winnerName = playerName(next.winnerId); }
        next.matchId = match?.matchId || newMatchId();
        submitChange('match', next.matchId, next, match ? 'update' : 'create').then(loadWorkspace).catch(error => { derived.textContent = `${error.message} / 保存できませんでした`; });
      };
    }
    editor.append(form);
    if (match) { const pending = findPendingChange('match', match.matchId); if (pending) editor.append(renderPendingInfo(pending)); }
  }
  function select(name, options, value) { const node = el('select', { name }); options.forEach(option => node.append(el('option', { value: option, textContent: option }))); node.value = value; return node; }
  function playerSelect(name, value) { const node = el('select', { name, required: true }); node.append(el('option', { value: '', textContent: '選択 / Select' })); players.filter(player => player.status === 'Active').sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja')).forEach(player => node.append(el('option', { value: player.playerId, textContent: `${player.displayName} (${player.playerId})` }))); node.value = value || ''; return node; }
  function newMatch() { return { matchDate: new Date().toISOString().slice(0, 10), event: 'Club Training', division: '', format: 'Singles', player1Id: '', player1Name: '', player1Sets: 0, player2Id: '', player2Name: '', player2Sets: 0, winnerId: '', winnerName: '', score: '0-0', resultStatus: 'Completed' }; }
  function newMatchId() { const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14); let sequence = 1; let id; do { id = `LK-T-${stamp}-${String(sequence++).padStart(3, '0')}`; } while (trainingMatches.some(match => match.matchId === id)); return id; }

  function renderPlayers() {
    const workspace = el('section', { className: 'admin-workspace' }); const listPanel = el('section', { className: 'admin-panel admin-list-panel' });
    const listHeader = el('div', { className: 'admin-list-header' }); const heading = el('div'); heading.append(text('p', 'PLAYER DIRECTORY / 選手一覧', 'eyebrow'), text('h2', `${players.length} players`));
    const search = el('input', { type: 'search', placeholder: '名前・IDで検索 / Search name or ID', ariaLabel: 'Search players' }); listHeader.append(heading, search);
    const addBtn = button('+ ADD PLAYER / 選手追加', () => showPlayerEditor(null), 'primary');
    const rolloverBtn = button('APRIL ROLLOVER / 4月繰り上げ', () => { if (confirm(language === 'en' ? 'Submit grade advancement for all students for approval?\n\nEach change will require approval before taking effect.' : '全選手の学年繰り上げを承認申請しますか？\n\n各変更は承認後に反映されます。')) { AprilRollover(); } }, 'secondary');
    listPanel.append(listHeader, addBtn, rolloverBtn);
    const list = el('div', { className: 'admin-player-list' }); listPanel.append(list); const editor = el('section', { className: 'admin-panel admin-editor-panel' }); workspace.append(listPanel, editor); app.append(workspace);
    const updateList = () => { empty(list); const query = search.value.trim().toLowerCase(); players.filter(player => `${player.playerId} ${player.displayName} ${player.englishName || ''}`.toLowerCase().includes(query)).sort((a, b) => a.playerId.localeCompare(b.playerId)).forEach(player => { const row = el('button', { type: 'button', className: `admin-player-row${player.playerId === selectedId ? ' selected' : ''}` }); const names = el('span'); const gradeTag = player.grade ? ` · ${player.grade}` : ''; names.append(text('b', player.displayName || 'No display name'), text('small', `${player.playerId} · ${player.englishName || '-'}${gradeTag}`)); row.append(names, text('i', player.status || 'Active')); row.onclick = () => { selectedId = player.playerId; updateList(); showPlayerEditor(player); }; list.append(row); }); };
    search.oninput = updateList; window.adminPlayerListUpdate = updateList; updateList(); showPlayerEditor(players[0] || null);
  }
  function showPlayerEditor(player) {
    const editor = document.querySelector('.admin-editor-panel'); if (!editor) return; empty(editor); const record = player ? { ...player } : newPlayer(); editor.append(text('p', player ? 'EDIT PLAYER / 選手編集' : 'NEW PLAYER / 新規選手', 'eyebrow'), text('h2', player ? (record.displayName || record.playerId) : 'Add player'));
    const form = el('form', { className: 'admin-player-form' });
    let schoolLevelInput, gradeInput, gradeBirthHelper;
    playerFields.forEach(([key, label, type, required, options]) => {
      if (key === 'grade') return;
      const labelNode = el('label');
      let input;
      if (key === 'clubId') {
        const clubOptions = ['', ...(entityData.clubs || []).map(c => c.name)];
        input = select(key, clubOptions, record[key] || '');
      } else {
        input = type === 'select' ? select(key, options, record[key] || '') : el('input', { name: key, type: 'text', value: record[key] || '' });
      }
      input.required = Boolean(required);
      input.readOnly = key === 'playerId' && Boolean(player);
      if (key === 'schoolLevel') schoolLevelInput = input;
      labelNode.append(text('span', label), input); form.append(labelNode);
    });
    const gradeLabelNode = el('label');
    gradeInput = select('grade', [], '');
    gradeInput.required = false;
    const updateGradeOptions = (slValue, preserveGrade) => {
      const opts = gradeOptions[slValue] || [];
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
      const sl = schoolLevelInput.value;
      const gr = gradeInput.value;
      if (gr && gradeBirthYears[sl] && gradeBirthYears[sl][gr]) { gradeBirthHelper.textContent = `出生年 / Birth year: ${gradeBirthYears[sl][gr]}`; gradeBirthHelper.style.display = ''; } else { gradeBirthHelper.textContent = ''; gradeBirthHelper.style.display = 'none'; }
    };
    gradeLabelNode.append(text('span', '学年 / Grade'), gradeInput, gradeBirthHelper);
    form.append(gradeLabelNode);
    updateGradeOptions(record.schoolLevel || '', false);
    if (record.grade && gradeOptions[record.schoolLevel]?.includes(record.grade)) gradeInput.value = record.grade;
    schoolLevelInput.onchange = () => { updateGradeOptions(schoolLevelInput.value, false); };
    gradeInput.onchange = updateBirthHelper;
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
    actions.append(button(player ? 'RESET / リセット' : 'CLEAR / クリア', () => { form.reset(); updateGradeOptions(schoolLevelInput.value, false); if (record.grade && gradeOptions[record.schoolLevel]?.includes(record.grade)) gradeInput.value = record.grade; }, 'secondary'));
    if (player) actions.append(button('DELETE / 削除', async () => { if (confirm(`Submit deletion of ${record.playerId} (${record.displayName}) for approval? / ${record.playerId}（${record.displayName}）の削除を承認申請しますか？\n\nDeletion takes effect after approval. / 削除は承認後に反映されます。`)) { await submitChange('player', record.playerId, null, 'delete'); await loadWorkspace(); } }, 'danger'));
    form.append(actions);
    form.onsubmit = event => {
      event.preventDefault(); const next = player ? { ...record, ...Object.fromEntries(new FormData(form)) } : Object.fromEntries(new FormData(form));
      if (player && (next.schoolLevel !== record.schoolLevel || next.grade !== record.grade)) {
        if (!next.gradeHistory) next.gradeHistory = record.gradeHistory || [];
        next.gradeHistory = [...next.gradeHistory, { date: new Date().toISOString().slice(0, 10), schoolLevel: record.schoolLevel || '', grade: record.grade || '' }];
      }
      submitChange('player', next.playerId, next, player ? 'update' : 'create').then(loadWorkspace).catch(error => { actions.append(text('span', `${error.message} / 保存できませんでした`, 'admin-status')); });
    };
    editor.append(form);
    if (player) { const pending = findPendingChange('player', player.playerId); if (pending) editor.append(renderPendingInfo(pending)); }
  }
  function newPlayer() { const next = Math.max(0, ...players.map(player => Number((player.playerId || '').match(/\d+$/)?.[0]) || 0)) + 1; const record = Object.fromEntries(playerFields.map(([key]) => [key, key === 'playerId' ? `LK-${String(next).padStart(4, '0')}` : key === 'status' ? 'Active' : ''])); record.clubId = 'Little Kings'; return record; }
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
    const heading = el('div'); heading.append(text('p', `${label} / 管理`, 'eyebrow'), text('h2', `${records.length} records`));
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
        const names = el('span'); names.append(text('b', record[idField] || 'Unnamed'), text('small', record.displayName || record.name || record.matchDate || ''));
        row.append(names); row.onclick = () => { selectedId = record[idField]; updateList(); showEntityEditor(type, record); }; list.append(row);
      });
    };
    search.oninput = updateList; updateList(); showEntityEditor(type, records.find(record => record[idField] === selectedId) || records[0] || null);
  }

  function showEntityEditor(type, record) {
    const editor = document.querySelector('.admin-editor-panel'); if (!editor) return; empty(editor);
    const fields = entityFields[type]; const idField = entityIdKey[type];
    editor.append(text('p', record ? `EDIT ${entityLabel[type]}` : `NEW ${entityLabel[type]}`, 'eyebrow'), text('h2', record ? (record.displayName || record.name || record[idField] || 'Record') : 'Add new record'));
    const form = el('form', { className: 'admin-player-form' });
    fields.forEach(([key, label, type, required, options]) => {
      const labelNode = el('label');
      let input;
      if (key === 'clubId') {
        const clubOptions = ['', ...(entityData.clubs || []).map(c => c.name)];
        input = select(key, clubOptions, record?.[key] || '');
      } else {
        input = type === 'select' ? select(key, options, record?.[key] || '') : el('input', { name: key, type: type === 'number' ? 'number' : 'text', value: record?.[key] || '' });
      }
      input.required = Boolean(required);
      if (key === idField && record) input.readOnly = true;
      if (type === 'number') { input.min = '0'; input.step = '1'; }
      labelNode.append(text('span', label), input); form.append(labelNode);
    });
    const actions = el('div', { className: 'admin-editor-actions' });
    const entityType = entityTypeKey[type] || type;
    if (currentRole === 'admin') {
      actions.append(button('SUBMIT FOR APPROVAL / 承認申請', () => { if (confirm(record ? `Submit this ${entityLabel[type]} change for approval? / この${entityLabel[type]}の変更を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。` : `Submit this new ${entityLabel[type]} for approval? / 新規${entityLabel[type]}を承認申請しますか？\n\nChanges take effect after approval. / 変更は承認後に反映されます。`)) form.requestSubmit(); }, 'primary'));
      actions.append(button(record ? 'RESET / リセット' : 'CLEAR / クリア', () => form.reset(), 'secondary'));
      if (record) actions.append(button('DELETE / 削除', async () => { if (confirm(`Submit deletion of ${record[idField]} for approval? / ${record[idField]}の削除を承認申請しますか？\n\nDeletion takes effect after approval. / 削除は承認後に反映されます。`)) { await submitChange(entityType, record[idField], null, 'delete'); await loadWorkspace(); } }, 'danger'));
    }
    form.append(actions);
    form.onsubmit = event => {
      event.preventDefault(); const next = record ? { ...record, ...Object.fromEntries(new FormData(form)) } : Object.fromEntries(new FormData(form));
      Object.keys(next).forEach(key => { if (next[key] === '' && fields.find(f => f[0] === key && f[2] === 'number')) next[key] = 0; });
      submitChange(entityType, next[idField], next, record ? 'update' : 'create').then(loadWorkspace).catch(error => { actions.append(text('span', `${error.message} / 保存できませんでした`, 'admin-status')); });
    };
    editor.append(form);
    if (record) { const pending = findPendingChange(entityType, record[idField]); if (pending) editor.append(renderPendingInfo(pending)); }
  }

  async function submitChange(entityType, targetId, after, action) { return window.LKData.request('/api/change', { method: 'POST', body: JSON.stringify({ entityType, targetId, after, action }) }); }

  async function renderPending() {
    const panel = el('section', { className: 'admin-panel admin-pending-panel' }); panel.append(text('p', 'PENDING CHANGES / 承認待ち', 'eyebrow'), text('h2', 'Review changes / 変更を確認'));
    try {
      const result = await window.LKData.request('/api/pending'); const changes = (result.changes || []).filter(change => change.status === 'pending');
      if (!changes.length) { panel.append(text('p', 'No pending changes. / 承認待ちの変更はありません。', 'admin-empty')); app.append(panel); return; }
      const summary = text('p', `${changes.length} change${changes.length > 1 ? 's' : ''} awaiting review`, 'admin-pending-summary'); panel.append(summary);
      changes.forEach(change => {
        const card = el('article', { className: 'admin-pending-card' });
        const actionLabels = { create: 'NEW / 新規', update: 'MODIFIED / 変更', delete: 'DELETE / 削除' };
        const actionClass = { create: 'create', update: 'update', delete: 'delete' };
        const header = el('div', { className: 'admin-pending-card-header' });
        header.append(text('span', actionLabels[change.action] || change.action, `admin-pending-badge ${actionClass[change.action] || ''}`), text('h3', change.summary || `${change.entityType} · ${change.targetId}`), text('span', formatPendingDate(change.createdAt), 'admin-pending-date'));
        const meta = el('div', { className: 'admin-pending-meta' });
        meta.append(text('span', `${change.entityType} · ${change.targetId} · Submitted by: ${change.createdBy}`, 'admin-pending-by'));
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
              row.append(text('td', d.field), text('td', d.before === '' || d.before == null ? '—' : String(d.before)), text('td', d.after === '' || d.after == null ? '—' : String(d.after)));
              tbody.append(row);
            });
            diffSection.append(table); card.append(diffSection);
          } else if (change.action === 'create') {
            const detail = el('div', { className: 'admin-pending-detail' }); detail.append(text('p', 'New record / 新規レコード', 'admin-pending-section-title'));
            const table = el('table', { className: 'admin-pending-table' }); const thead3 = el('thead'); const thr3 = el('tr'); thead3.append(thr3); table.append(thead3);
            thr3.append(text('th', 'Field'), text('th', 'Value'));
            const tbody = el('tbody'); table.append(tbody);
            Object.entries(change.after).forEach(([key, value]) => { if (value === '' || value === null || value === undefined) return; const row = el('tr'); row.append(text('td', key), text('td', String(value))); tbody.append(row); });
            detail.append(table); card.append(detail);
          } else {
            card.append(text('p', 'No changes detected. / 変更は検出されませんでした。', 'admin-empty'));
          }
        }
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
        if (currentRole === 'approver') {
          const acceptBtn = button('ACCEPT / 承認', () => { if (!confirm(`Accept this ${change.entityType} change? / この${change.entityType}の変更を承認しますか？\n\nThe change will be applied immediately. / 変更は即座に反映されます。`)) return; handleDecision('accept', acceptBtn, rejectBtn); }, 'primary');
          const rejectBtn = button('REJECT / 却下', () => { if (!confirm(`Reject this ${change.entityType} change? / この${change.entityType}の変更を却下しますか？\n\nThe change will be discarded. / 変更は破棄されます。`)) return; handleDecision('reject', acceptBtn, rejectBtn); }, 'danger');
          actions.append(acceptBtn, rejectBtn, status);
        } else {
          actions.append(status);
        }
        card.append(actions); panel.append(card);
      });
    } catch (error) { panel.append(text('p', `${error.message} / 読み込みに失敗しました`, 'admin-load-error')); }
    app.append(panel);
  }
  function formatPendingDate(iso) { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

  async function renderHistory() {
    const panel = el('section', { className: 'admin-panel admin-history-panel' }); panel.append(text('p', 'CHANGE HISTORY / 変更履歴', 'eyebrow'), text('h2', 'Processed changes / 処理済み変更'));
    try {
      const result = await window.LKData.request('/api/pending');
      const processed = (result.changes || []).filter(change => change.status === 'accepted' || change.status === 'rejected');
      if (!processed.length) { panel.append(text('p', 'No processed changes yet. / 処理済みの変更はありません。', 'admin-empty')); app.append(panel); return; }
      const controls = el('div', { className: 'admin-history-controls' });
      const search = el('input', { type: 'search', placeholder: 'ID・種類で検索 / Search by ID or type', ariaLabel: 'Search history' });
      const statusFilter = el('select', { ariaLabel: 'Filter by status' });
      ['all', 'accepted', 'rejected'].forEach(v => statusFilter.append(el('option', { value: v, textContent: v === 'all' ? 'ALL / すべて' : v === 'accepted' ? 'ACCEPTED / 承認' : 'REJECTED / 却下' })));
      const typeFilter = el('select', { ariaLabel: 'Filter by entity type' });
      const entityTypes = [...new Set(processed.map(c => c.entityType))];
      typeFilter.append(el('option', { value: 'all', textContent: 'ALL TYPES / すべての種類' }));
      entityTypes.forEach(t => typeFilter.append(el('option', { value: t, textContent: t })));
      controls.append(search, statusFilter, typeFilter); panel.append(controls);
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
          const dateLabel = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]})` : day;
          groupHeader.append(text('h3', dateLabel), text('span', `${items.length} change${items.length > 1 ? 's' : ''}`, 'admin-history-count'));
          group.append(groupHeader);
          items.forEach(c => {
            const card = el('article', { className: `admin-history-card ${c.status}` });
            const cardHeader = el('div', { className: 'admin-history-card-header' });
            const actionLabels = { create: 'NEW', update: 'MODIFIED', delete: 'DELETE' };
            cardHeader.append(text('span', actionLabels[c.action] || c.action, `admin-pending-badge ${c.action}`), text('h4', c.summary || `${c.entityType} · ${c.targetId}`), text('span', c.status === 'accepted' ? '✓ ACCEPTED' : '✗ REJECTED', `admin-history-status ${c.status}`), text('span', formatPendingDate(c.reviewedAt), 'admin-pending-date'));
            const meta = el('div', { className: 'admin-pending-meta' });
            meta.append(text('span', `${c.entityType} · ${c.targetId} · Submitted: ${c.createdBy} · Reviewed: ${c.reviewedBy || '-'}`, 'admin-pending-by'));
            card.append(cardHeader, meta);
            const diff = computeDiff(c);
            if (diff.length) {
              const diffSection = el('div', { className: 'admin-pending-diff' });
              const table = el('table', { className: 'admin-pending-table' }); const thead = el('thead'); const thr = el('tr'); thead.append(thr); table.append(thead);
              thr.append(text('th', 'Field'), text('th', 'Before'), text('th', 'After'));
              const tbody = el('tbody'); table.append(tbody);
              diff.forEach(d => { const row = el('tr'); row.className = 'admin-pending-diff-row'; row.append(text('td', d.field), text('td', d.before === '' || d.before == null ? '—' : String(d.before)), text('td', d.after === '' || d.after == null ? '—' : String(d.after))); tbody.append(row); });
              diffSection.append(table); card.append(diffSection);
            }
            group.append(card);
          });
          list.append(group);
        });
      };
      search.oninput = renderList; statusFilter.onchange = renderList; typeFilter.onchange = renderList; renderList();
    } catch (error) { panel.append(text('p', `${error.message} / 読み込みに失敗しました`, 'admin-load-error')); }
    app.append(panel);
  }

  if (document.querySelector('#admin-app')) shell();
})();
