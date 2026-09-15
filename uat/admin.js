(() => {
  'use strict';

  const app = document.querySelector('#admin-app');
  const isUat = /\/uat(?:\/|$)/i.test(location.pathname);
  const fields = [
    ['playerId', '選手ID / Player ID', 'text', true],
    ['displayName', '表示名 / Display name', 'text', true],
    ['englishName', 'ローマ字表記 / Romanized name', 'text'],
    ['gender', '性別 / Gender', 'select', false, ['','Male','Female','Other']],
    ['schoolLevel', 'カテゴリ / School level', 'select', false, ['','小学生','中学生','高校生','一般']],
    ['playingHand', '利き手 / Playing hand', 'text'],
    ['grip', 'グリップ / Grip', 'text'],
    ['playingStyle', '戦型 / Playing style', 'text'],
    ['blade', 'ラケット / Blade', 'text'],
    ['forehandRubber', 'フォア面ラバー / Forehand rubber', 'text'],
    ['backhandRubber', 'バック面ラバー / Backhand rubber', 'text'],
    ['forehandRubberType', 'フォア面種類 / Forehand type', 'text'],
    ['backhandRubberType', 'バック面種類 / Backhand type', 'text'],
    ['rating', 'レーティング / Rating', 'text'],
    ['status', '状態 / Status', 'select', true, ['Active','Inactive']]
  ];
  let players = [];
  let currentRole = '';
  let selectedId = '';

  const el = (tag, options = {}) => Object.assign(document.createElement(tag), options);
  const text = (tag, value, className) => { const node = el(tag, { textContent: value }); if (className) node.className = className; return node; };
  const empty = node => { node.replaceChildren(); return node; };

  function renderRefusal() {
    app.append(el('section', { className: 'admin-refusal' }), text('p', 'UAT ONLY', 'eyebrow'), text('h1', 'UAT workspace unavailable'), text('p', 'この管理画面は /uat/ 環境でのみ動作します。This workspace refuses to run outside /uat/.'));
  }

  function shell() {
    empty(app);
    const header = el('header', { className: 'admin-header' });
    const brand = el('div', { className: 'admin-brand' });
    brand.append(text('p', 'LITTLE KINGS', 'eyebrow'), text('h1', 'PLAYER ADMIN'), text('span', '選手管理ワークスペース / Player admin workspace'));
    header.append(brand, text('span', 'UAT ONLY', 'admin-uat-badge'));
    const warning = el('aside', { className: 'admin-warning' });
    warning.append(text('strong', 'UAT bootstrap credentials are deliberately client-side.'), text('span', '実運用UATの前に必ず変更してください / Change them before real UAT.'));
    const login = el('section', { className: 'admin-login admin-panel' });
    login.append(text('p', 'ROLE SIGN-IN / ロールログイン', 'eyebrow'), text('h2', 'UAT access'));
    const guide = el('p', { className: 'admin-credentials' });
    guide.append('Bootstrap: ', el('code', { textContent: 'admin / change-me-admin' }), ' · ', el('code', { textContent: 'match-entry / change-me-entry' }), ' · ', el('code', { textContent: 'reviewer / change-me-review' }));
    const form = el('form', { className: 'admin-login-form' });
    const role = el('select', { name: 'role', ariaLabel: 'Role' });
    ['admin','match-entry','reviewer'].forEach(value => role.append(el('option', { value, textContent: value })));
    const password = el('input', { name: 'password', type: 'password', required: true, autocomplete: 'current-password', placeholder: 'Password / パスワード' });
    const submit = el('button', { type: 'submit', className: 'admin-button primary', textContent: 'SIGN IN / ログイン' });
    const status = el('p', { className: 'admin-status', role: 'status' });
    form.append(role, password, submit); login.append(guide, form, status); app.append(header, warning, login);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      status.textContent = 'Verifying locally... / ローカルで確認中...';
      try {
        const roles = await fetchJson('uat-roles.json');
        const match = roles.roles.find(item => item.role === role.value);
        if (!match || await sha256(password.value) !== match.passwordHash) throw new Error('invalid');
        currentRole = match.role;
        await loadWorkspace();
      } catch {
        status.textContent = 'Sign-in failed. Check the UAT role and password. / ロールまたはパスワードを確認してください。';
      }
    });
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return response.json();
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function loadWorkspace() {
    try {
      players = await fetchJson('admin-players.json');
      renderWorkspace();
    } catch {
      empty(app).append(text('p', 'Could not load data/players.json. / 選手データを読み込めませんでした。', 'admin-load-error'));
    }
  }

  function renderWorkspace() {
    empty(app);
    const header = el('header', { className: 'admin-header' });
    const brand = el('div', { className: 'admin-brand' });
    brand.append(text('p', 'LITTLE KINGS', 'eyebrow'), text('h1', 'PLAYER ADMIN'), text('span', `${currentRole} / ${roleLabel(currentRole)}`));
    const actions = el('div', { className: 'admin-header-actions' });
    const exportButton = el('button', { className: 'admin-button primary', type: 'button', textContent: 'EXPORT players.json' });
    const signOut = el('button', { className: 'admin-button', type: 'button', textContent: 'SIGN OUT / ログアウト' });
    if (currentRole === 'admin') actions.append(exportButton);
    actions.append(signOut); header.append(brand, actions, text('span', 'UAT ONLY', 'admin-uat-badge'));
    const warning = el('aside', { className: 'admin-warning' });
    warning.append(text('strong', 'UAT-only client-side access. Repository JSON roles and bootstrap hashes are not production security.'), text('span', '変更はブラウザ内のみです。Export後、GitHub Desktopで data/players.json を置き換え、commit・pushしてください。'));
    app.append(header, warning);
    signOut.onclick = shell;
    exportButton.onclick = exportPlayers;
    if (currentRole === 'match-entry') return renderMatchEntry();
    renderPlayers();
  }

  function roleLabel(role) {
    return ({ admin: '管理者', 'match-entry': '試合入力', reviewer: '閲覧者' })[role];
  }

  function renderMatchEntry() {
    const panel = el('section', { className: 'admin-panel admin-coming-soon' });
    panel.append(text('p', 'MATCH ENTRY / 試合入力', 'eyebrow'), text('h2', 'Match submission comes next'), text('p', '試合入力機能は次のUAT作業で追加予定です。This role has no player-management actions yet.'));
    app.append(panel);
  }

  function renderPlayers() {
    const workspace = el('section', { className: 'admin-workspace' });
    const listPanel = el('section', { className: 'admin-panel admin-list-panel' });
    const listHeader = el('div', { className: 'admin-list-header' });
    const heading = el('div'); heading.append(text('p', 'PLAYER DIRECTORY / 選手一覧', 'eyebrow'), text('h2', `${players.length} players`));
    const search = el('input', { type: 'search', placeholder: '名前・IDで検索 / Search name or ID', ariaLabel: 'Search players' });
    listHeader.append(heading, search); listPanel.append(listHeader);
    if (currentRole === 'admin') {
      const add = el('button', { className: 'admin-button primary', type: 'button', textContent: '+ ADD PLAYER / 選手追加' });
      add.onclick = () => showEditor(null); listPanel.append(add);
    }
    const list = el('div', { className: 'admin-player-list' }); listPanel.append(list);
    const editor = el('section', { className: 'admin-panel admin-editor-panel' });
    workspace.append(listPanel, editor); app.append(workspace);
    const updateList = () => {
      empty(list);
      const query = search.value.trim().toLowerCase();
      const results = players.filter(player => `${player.playerId} ${player.displayName} ${player.englishName || ''}`.toLowerCase().includes(query));
      if (!results.length) list.append(text('p', '該当する選手がいません / No players found.', 'admin-empty'));
      results.sort((a, b) => a.playerId.localeCompare(b.playerId)).forEach(player => {
        const button = el('button', { type: 'button', className: `admin-player-row${player.playerId === selectedId ? ' selected' : ''}` });
        const names = el('span'); names.append(text('b', player.displayName || 'No display name'), text('small', `${player.playerId} · ${player.englishName || '-'}`));
        button.append(names, text('i', player.status || 'Active', player.status === 'Inactive' ? 'inactive' : 'active'));
        button.onclick = () => { selectedId = player.playerId; updateList(); showEditor(player); };
        list.append(button);
      });
    };
    search.oninput = updateList;
    window.adminPlayerListUpdate = updateList;
    updateList();
    showEditor(players[0] || null);
  }

  function showEditor(player) {
    const editor = document.querySelector('.admin-editor-panel');
    if (!editor) return;
    empty(editor);
    const readOnly = currentRole !== 'admin';
    editor.append(text('p', readOnly ? 'VIEW ONLY / 閲覧専用' : player ? 'EDIT PLAYER / 選手編集' : 'NEW PLAYER / 新規選手', 'eyebrow'), text('h2', player ? (player.displayName || player.playerId) : 'Add player'));
    if (!player && readOnly) { editor.append(text('p', '選手データは閲覧専用です。Player data is view-only for reviewers.')); return; }
    const form = el('form', { className: 'admin-player-form' });
    const record = player ? { ...player } : newPlayer();
    fields.forEach(([key, label, type, required, options]) => {
      const labelNode = el('label'); labelNode.append(text('span', label));
      const input = type === 'select' ? el('select', { name: key }) : el('input', { name: key, type: 'text' });
      if (options) options.forEach(option => input.append(el('option', { value: option, textContent: option || '選択 / Select' })));
      input.value = record[key] || '';
      input.required = Boolean(required);
      input.disabled = readOnly;
      input.readOnly = key === 'playerId' && Boolean(player);
      labelNode.append(input); form.append(labelNode);
    });
    if (!readOnly) {
      const actions = el('div', { className: 'admin-editor-actions' });
      const save = el('button', { className: 'admin-button primary', type: 'submit', textContent: 'SAVE IN WORKSPACE / 保存' });
      actions.append(save);
      if (player && player.status !== 'Inactive') {
        const deactivate = el('button', { className: 'admin-button danger', type: 'button', textContent: 'DEACTIVATE / 無効化' });
        deactivate.onclick = () => { record.status = 'Inactive'; updatePlayer(record); showEditor(record); };
        actions.append(deactivate);
      }
      form.append(actions);
      form.onsubmit = event => { event.preventDefault(); const next = Object.fromEntries(new FormData(form)); updatePlayer(next); selectedId = next.playerId; showEditor(next); };
    }
    editor.append(form);
  }

  function newPlayer() {
    const nextNumber = Math.max(0, ...players.map(player => Number((player.playerId || '').match(/\d+$/)?.[0]) || 0)) + 1;
    return Object.fromEntries(fields.map(([key]) => [key, key === 'playerId' ? `LK-${String(nextNumber).padStart(4, '0')}` : key === 'status' ? 'Active' : '']));
  }

  function updatePlayer(next) {
    const index = players.findIndex(player => player.playerId === next.playerId);
    if (index >= 0) players[index] = { ...players[index], ...next };
    else players.push(next);
    window.adminPlayerListUpdate?.();
  }

  function exportPlayers() {
    const blob = new Blob([`${JSON.stringify(players, null, 2)}\n`], { type: 'application/json' });
    const link = el('a', { href: URL.createObjectURL(blob), download: 'players.json' });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  if (!isUat) renderRefusal();
  else shell();
})();
