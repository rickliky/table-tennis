(() => {
  'use strict';

  const app = document.querySelector('#admin-app');
  const playerFields = [['playerId', '選手ID / Player ID', 'text', true], ['displayName', '表示名 / Display name', 'text', true], ['englishName', 'ローマ字表記 / Romanized name', 'text'], ['gender', '性別 / Gender', 'select', false, ['', 'Male', 'Female', 'Other']], ['schoolLevel', 'カテゴリ / School level', 'select', false, ['', '小学生', '中学生', '高校生', '一般']], ['playingHand', '利き手 / Playing hand', 'text'], ['grip', 'グリップ / Grip', 'text'], ['playingStyle', '戦型 / Playing style', 'text'], ['blade', 'ラケット / Blade', 'text'], ['forehandRubber', 'フォア面ラバー / Forehand rubber', 'text'], ['backhandRubber', 'バック面ラバー / Backhand rubber', 'text'], ['forehandRubberType', 'フォア面種類 / Forehand type', 'text'], ['backhandRubberType', 'バック面種類 / Backhand type', 'text'], ['rating', 'レーティング / Rating', 'text'], ['status', '状態 / Status', 'select', true, ['Active', 'Inactive']]];
  let players = [];
  let trainingMatches = [];
  let entityData = {};
  let currentRole = '';
  let activeTab = 'matches';
  let selectedId = '';

  const el = (tag, options = {}) => Object.assign(document.createElement(tag), options);
  const text = (tag, value, className) => { const node = el(tag, { textContent: value }); if (className) node.className = className; return node; };
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
      entityData = { clubs: data.clubs || [], externalOpponents: data.externalOpponents || [], tournaments: data.tournaments || [], tournamentMatches: data.tournamentMatches || [] };
      renderWorkspace();
    } catch { empty(app).append(text('p', 'Could not load UAT admin data. / UAT管理データを読み込めませんでした。', 'admin-load-error')); }
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
    if (currentRole === 'admin') tabs.append(tab('players', 'PLAYERS / 選手'));
    if (currentRole === 'admin') {
      tabs.append(tab('clubs', 'CLUBS / クラブ'), tab('externalOpponents', 'EXT. OPPONENTS / 外部選手'), tab('tournaments', 'TOURNAMENTS / 大会'), tab('tournamentMatches', 'TOURNAMENT RESULTS / 大会結果'));
    }
    if (currentRole === 'approver') tabs.append(tab('pending', 'PENDING CHANGES / 承認待ち'));
    app.append(header, tabs);
    activeTab = activeTab === 'players' && currentRole !== 'admin' ? 'matches' : activeTab;
    if (activeTab === 'players') renderPlayers(); else if (activeTab === 'pending') renderPending(); else if (activeTab === 'matches') renderMatches(); else renderEntity(activeTab);
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
    addField('日付 / Date', date); addField('イベント / Event', event); addField('部門（任意）/ Division (optional)', division); addField('形式 / Format', format); addField('選手1 / Player 1', player1); addField('選手2 / Player 2', player2); addField('選手1 セット / Player 1 sets', sets1); addField('選手2 セット / Player 2 sets', sets2); addField('結果ステータス / Result status', resultStatus);
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
      actions.append(button('SAVE IN WORKSPACE / 保存', () => form.requestSubmit(), 'primary'));
       if (match) actions.append(button('DELETE / 削除', async () => { if (confirm(`Delete ${match.matchId}? / この試合を削除しますか？`)) { await submitChange('match', match.matchId, null, 'delete'); await loadWorkspace(); } }, 'danger'));
      form.append(actions);
      form.onsubmit = event => {
        event.preventDefault(); const next = Object.fromEntries(new FormData(form));
        if (!next.player1Id || !next.player2Id || next.player1Id === next.player2Id) { derived.textContent = 'Choose two different players. / 異なる2名の選手を選択してください。'; return; }
        next.player1Sets = Number(next.player1Sets); next.player2Sets = Number(next.player2Sets); next.player1Name = playerName(next.player1Id); next.player2Name = playerName(next.player2Id); next.score = `${next.player1Sets}-${next.player2Sets}`;
        if (next.resultStatus === 'Incomplete' || next.player1Sets === next.player2Sets) { next.winnerId = ''; next.winnerName = ''; } else { next.winnerId = next.player1Sets > next.player2Sets ? next.player1Id : next.player2Id; next.winnerName = playerName(next.winnerId); }
        next.matchId = match?.matchId || newMatchId(); const index = trainingMatches.findIndex(item => item.matchId === next.matchId);
         submitChange('match', next.matchId, next, match ? 'update' : 'create').then(loadWorkspace).catch(error => { derived.textContent = `${error.message} / 保存できませんでした`; });
      };
    }
    editor.append(form);
  }
  function select(name, options, value) { const node = el('select', { name }); options.forEach(option => node.append(el('option', { value: option, textContent: option }))); node.value = value; return node; }
  function playerSelect(name, value) { const node = el('select', { name, required: true }); node.append(el('option', { value: '', textContent: '選択 / Select' })); players.filter(player => player.status === 'Active').sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja')).forEach(player => node.append(el('option', { value: player.playerId, textContent: `${player.displayName} (${player.playerId})` }))); node.value = value || ''; return node; }
  function newMatch() { return { matchDate: new Date().toISOString().slice(0, 10), event: 'Club Training', division: '', format: 'Singles', player1Id: '', player1Name: '', player1Sets: 0, player2Id: '', player2Name: '', player2Sets: 0, winnerId: '', winnerName: '', score: '0-0', resultStatus: 'Completed' }; }
  function newMatchId() { const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14); let sequence = 1; let id; do { id = `LK-T-${stamp}-${String(sequence++).padStart(3, '0')}`; } while (trainingMatches.some(match => match.matchId === id)); return id; }

  function renderPlayers() {
    const workspace = el('section', { className: 'admin-workspace' }); const listPanel = el('section', { className: 'admin-panel admin-list-panel' });
    const listHeader = el('div', { className: 'admin-list-header' }); const heading = el('div'); heading.append(text('p', 'PLAYER DIRECTORY / 選手一覧', 'eyebrow'), text('h2', `${players.length} players`));
    const search = el('input', { type: 'search', placeholder: '名前・IDで検索 / Search name or ID', ariaLabel: 'Search players' }); listHeader.append(heading, search); listPanel.append(listHeader, button('+ ADD PLAYER / 選手追加', () => showPlayerEditor(null), 'primary'));
    const list = el('div', { className: 'admin-player-list' }); listPanel.append(list); const editor = el('section', { className: 'admin-panel admin-editor-panel' }); workspace.append(listPanel, editor); app.append(workspace);
    const updateList = () => { empty(list); const query = search.value.trim().toLowerCase(); players.filter(player => `${player.playerId} ${player.displayName} ${player.englishName || ''}`.toLowerCase().includes(query)).sort((a, b) => a.playerId.localeCompare(b.playerId)).forEach(player => { const row = el('button', { type: 'button', className: `admin-player-row${player.playerId === selectedId ? ' selected' : ''}` }); const names = el('span'); names.append(text('b', player.displayName || 'No display name'), text('small', `${player.playerId} · ${player.englishName || '-'}`)); row.append(names, text('i', player.status || 'Active')); row.onclick = () => { selectedId = player.playerId; updateList(); showPlayerEditor(player); }; list.append(row); }); };
    search.oninput = updateList; window.adminPlayerListUpdate = updateList; updateList(); showPlayerEditor(players[0] || null);
  }
  function showPlayerEditor(player) {
    const editor = document.querySelector('.admin-editor-panel'); if (!editor) return; empty(editor); const record = player ? { ...player } : newPlayer(); editor.append(text('p', player ? 'EDIT PLAYER / 選手編集' : 'NEW PLAYER / 新規選手', 'eyebrow'), text('h2', player ? (record.displayName || record.playerId) : 'Add player'));
    const form = el('form', { className: 'admin-player-form' }); playerFields.forEach(([key, label, type, required, options]) => { const labelNode = el('label'); const input = type === 'select' ? select(key, options, record[key] || '') : el('input', { name: key, type: 'text', value: record[key] || '' }); input.required = Boolean(required); input.readOnly = key === 'playerId' && Boolean(player); labelNode.append(text('span', label), input); form.append(labelNode); });
     const actions = el('div', { className: 'admin-editor-actions' }); actions.append(button('SUBMIT FOR APPROVAL / 承認申請', () => form.requestSubmit(), 'primary')); form.append(actions); form.onsubmit = event => { event.preventDefault(); const next = Object.fromEntries(new FormData(form)); submitChange('player', next.playerId, next, player ? 'update' : 'create').then(loadWorkspace).catch(error => { actions.append(text('span', `${error.message} / 保存できませんでした`, 'admin-status')); }); }; editor.append(form);
  }
  function newPlayer() { const next = Math.max(0, ...players.map(player => Number((player.playerId || '').match(/\d+$/)?.[0]) || 0)) + 1; return Object.fromEntries(playerFields.map(([key]) => [key, key === 'playerId' ? `LK-${String(next).padStart(4, '0')}` : key === 'status' ? 'Active' : ''])); }
  function renderEntity(type) {
    const records = entityData[type] || [], idField = { clubs:'clubId', externalOpponents:'externalOpponentId', tournaments:'tournamentId', tournamentMatches:'tournamentMatchId' }[type];
    const panel = el('section', { className: 'admin-panel admin-entity-panel' }); panel.append(text('p', `${type.toUpperCase()} / 管理`, 'eyebrow'), text('h2', `${records.length} records`));
    const list = el('div', { className:'admin-player-list' }); records.forEach(record => { const row = el('button', { type:'button', className:'admin-player-row' }); row.append(text('b', record[idField] || 'Unnamed'), text('small', record.name || record.displayName || record.matchDate || '')); row.onclick = () => showEntityEditor(panel, type, record); list.append(row); }); panel.append(button('+ ADD / 追加', () => showEntityEditor(panel, type, null), 'primary'), list); app.append(panel); if (records[0]) showEntityEditor(panel, type, records[0]);
  }
  function showEntityEditor(panel, type, record) {
    panel.querySelector('.admin-entity-editor')?.remove(); const idField = { clubs:'clubId', externalOpponents:'externalOpponentId', tournaments:'tournamentId', tournamentMatches:'tournamentMatchId' }[type]; const editor = el('form', { className:'admin-entity-editor' }); const input = el('textarea', { name:'record', rows:14, required:true, value:JSON.stringify(record || { [idField]: `${type.toUpperCase()}-${Date.now()}` }, null, 2) }); input.value = JSON.stringify(record || { [idField]: `${type.toUpperCase()}-${Date.now()}` }, null, 2); editor.append(text('p', 'JSON RECORD / レコード', 'eyebrow'), input); const actions = el('div', { className:'admin-editor-actions' }); actions.append(button('SUBMIT FOR APPROVAL / 承認申請', () => editor.requestSubmit(), 'primary')); if (record) actions.append(button('DELETE / 削除', () => submitChange(type === 'externalOpponents' ? 'externalOpponent' : type === 'tournamentMatches' ? 'tournamentMatch' : type.slice(0, -1), record[idField], null, 'delete').then(loadWorkspace).catch(error => alert(error.message)), 'danger')); editor.append(actions); editor.onsubmit = event => { event.preventDefault(); try { const next = JSON.parse(input.value); const entityType = type === 'externalOpponents' ? 'externalOpponent' : type === 'tournamentMatches' ? 'tournamentMatch' : type.slice(0, -1); submitChange(entityType, next[idField], next, record ? 'update' : 'create').then(loadWorkspace).catch(error => alert(error.message)); } catch { alert('Invalid JSON / JSON形式が正しくありません'); } }; panel.append(editor);
  }
  async function submitChange(entityType, targetId, after, action) { return window.LKData.request('/api/change', { method: 'POST', body: JSON.stringify({ entityType, targetId, after, action }) }); }
  async function renderPending() {
    const panel = el('section', { className: 'admin-panel admin-pending-panel' }); panel.append(text('p', 'PENDING CHANGES / 承認待ち', 'eyebrow'), text('h2', 'Review changes / 変更を確認'));
    try { const result = await window.LKData.request('/api/pending'); const changes = (result.changes || []).filter(change => change.status === 'pending'); if (!changes.length) panel.append(text('p', 'No pending changes. / 承認待ちの変更はありません。', 'admin-empty')); changes.forEach(change => { const row = el('article', { className: 'admin-pending-row' }); row.append(text('h3', `${change.entityType} · ${change.targetId}`), text('small', `${change.createdBy} · ${change.createdAt}`), text('pre', JSON.stringify(change.diff, null, 2))); row.append(button('ACCEPT / 承認', () => window.LKData.request('/api/approve', { method:'POST', body:JSON.stringify({ changeId:change.changeId, decision:'accept' }) }).then(renderWorkspace), 'primary'), button('REJECT / 却下', () => window.LKData.request('/api/approve', { method:'POST', body:JSON.stringify({ changeId:change.changeId, decision:'reject' }) }).then(renderWorkspace, error => alert(error.message)), 'danger')); panel.append(row); }); } catch (error) { panel.append(text('p', `${error.message} / 読み込みに失敗しました`, 'admin-load-error')); }
    app.append(panel);
  }
  if (document.querySelector('#admin-app')) shell();
})();
