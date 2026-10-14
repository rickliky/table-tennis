(() => {
  'use strict';
  const app = document.querySelector('#feedback-app');
  const params = new URLSearchParams(location.search);
  const environment = /\/uat(?:\/|$)/i.test(location.pathname) || ['localhost', '127.0.0.1'].includes(location.hostname) ? 'uat' : 'prod';
  const storageKey = `lk-private-reflection-session-${environment}`;
  let token = localStorage.getItem(storageKey) || '', player = null, directory = [], dates = [];
  let rememberSession = Boolean(token);
  let language = localStorage.getItem('lk-language') || 'ja';
  let date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : defaultDate();
  let documentValue = { revision: 0, fields: {} }, matches = [], dirty = new Map(), timer, saving = null;
  let conflict = null, requiresLogin = false, busy = false, statusKey = 'ready', savedAt = '';
  let viewMode = 'write', historyMonth = '';
  let directoryPlayerId = params.get('player') || '', directoryQuery = '', directoryLimit = 12;
  const Rich = window.LKNotebookRich;
  let editors = [];
  const disposeEditors = () => { editors.forEach(editor => editor.dispose()); editors = []; };
  const words = {
    en: {
      title: 'Private Player Notebook', eyebrow: 'YOUR PRIVATE REFLECTION', invitation: 'Want to try private reflections? Setup is easy — just let Jacelyn and Kaitlyn’s daddy know.',
      preview: 'See a sample notebook', previewHint: 'Mock examples only. No real player notes.', directoryTitle: 'Choose your notebook', directoryHint: 'Select your own player card, then sign in with your player password.', directorySearch: 'Find your player — Japanese name, Romanized name, or ID', directoryEnabled: 'Notebook enabled', signInTitle: 'Open your notebook', changePlayer: 'Choose another player', noPlayerMatch: 'No matching players. Try another name or clear your search.', clearSearch: 'Clear search', showMorePlayers: 'Show more players', playerCount: '{shown} of {total} players',
      privacy: 'You and club administrators can read your notebook. Other players, club members, and Approvers cannot read it. It is not published.',
      privacyTitle: 'Who can read this?',
      password: 'Player password', login: 'Open my notebook', remember: 'Remember me on this browser for eight weeks', shared: 'Use only your own account. Do not remember access on a shared device.',
      invalid: 'Could not sign in. Check the password or try again later.', unavailable: 'The notebook service is unavailable. Please try again.', retry: 'Try again', lock: 'Lock / sign out',
      date: 'Notebook date', previous: 'Previous notebook day (skip Friday)', next: 'Next notebook day (skip Friday)', history: 'Your saved dates', choose: 'Choose a date', activity: 'Activity (optional)',
      mode: 'Notebook mode', write: 'Write', read: 'Read', readHint: 'Read-only view. Choose Write to edit your notebook.', reading: 'Read-only — your writing cannot be changed here.', blank: 'Not written', month: 'Saved month', allMonths: 'All months', latest: 'Latest saved note', noSavedDates: 'No saved notes yet.',
      schedule: 'Friday is a rest day. Date arrows skip Fridays.', rest: 'Friday — no practice or reflection needed.', restHint: 'Choose another date to write your reflection. Existing Friday notes remain available in your saved dates.', fridaySaved: 'Friday is a rest day. This previously saved note is kept for your reference.',
      reflection: 'My reflection', reflectionHint: 'What happened, what did you learn, and what will you focus on next?', english: 'English original', japanese: 'Japanese version (manual)',
      coach: 'Coach feedback — entered by the player', coachHint: 'Advice received from the coach, not a coach-authenticated evaluation. Preserve paragraphs and numbered points.',
      coachJapanese: 'Japanese original', coachEnglish: 'English version (manual)', translation: 'Translation is manual. Write or paste each language version below.',
      daily: 'Daily reflection', recorded: 'Recorded matches', matchHint: 'All entries are open. Text boxes grow with your writing. Match order follows record IDs, not verified play order.', jump: 'Go to',
      matchReadHint: 'All entries are open. Match order follows record IDs, not verified play order.',
      noMatches: 'No recorded matches for this date yet. You can write a daily note below.', training: 'Training', tournament: 'Tournament', win: 'Win', loss: 'Loss', incomplete: 'Incomplete',
      ready: 'Write freely — changes autosave.', unsaved: 'Unsaved changes', saving: 'Saving…', saved: 'Saved', offline: 'Offline — not synced. Keep this page open.', failed: 'Save failed — your writing is still here. Keep this page open and retry.',
      expired: 'Your player session expired or was reset. Sign in again below; your unsaved writing stays on this page.',
      conflict: 'Another tab or device saved a newer version. Your unsaved writing has not been overwritten. Compare before choosing.', server: 'Saved version', mine: 'Your unsaved version',
      useServer: 'Use saved version (discard unsaved changes)', useMine: 'Save my changed fields over the newer version', discard: 'Discard your unsaved changes and load the saved version?',
      missing: 'Previously saved match note — current match record unavailable', leave: 'Writing has not synced. Stay on this page and retry before leaving.', loading: 'Loading your notebook…',
      home: 'Home', players: 'Players', sessions: 'Sessions', emptyDirectory: 'No player accounts are enabled yet.', rate: 'Too many sign-in attempts. Please wait 15 minutes.',
      retention: 'Writing is saved to the server, not stored as a local draft. Unsynced text exists only on this open page; closing it can lose that text.'
    },
    ja: {
      title: '選手のプライベートノート', eyebrow: '自分だけの振り返り', invitation: 'プライベートな振り返りを試してみませんか？設定は簡単です。ジェイスとケイツのお父さんに声をかけてください。',
      preview: 'サンプルノートを見る', previewHint: '架空の例です。実際の選手のノートは使っていません。', directoryTitle: '自分のノートを選ぶ', directoryHint: '自分の選手カードを選び、選手パスワードでログインしてください。', directorySearch: '選手を検索 — 日本語名・ローマ字・ID', directoryEnabled: 'ノート利用可能', signInTitle: '自分のノートを開く', changePlayer: '別の選手を選ぶ', noPlayerMatch: '該当する選手がいません。別の名前で検索するか、検索をクリアしてください。', clearSearch: '検索をクリア', showMorePlayers: '選手をもっと表示', playerCount: '{total}人中{shown}人を表示',
      privacy: '本人とクラブ管理者がノートを読めます。他の選手、クラブメンバー、承認者は読めません。公開はされません。',
      privacyTitle: 'プライバシーについて',
      password: '選手パスワード', login: '自分のノートを開く', remember: 'このブラウザで8週間ログインを保持する', shared: '必ず自分のアカウントを使ってください。共用端末ではログインを保持しないでください。',
      invalid: 'ログインできませんでした。パスワードを確認するか、時間をおいて試してください。', unavailable: 'ノートサービスを利用できません。もう一度試してください。', retry: 'もう一度試す', lock: 'ロック・ログアウト',
      date: 'ノートの日付', previous: '前のノート日（金曜日を除く）', next: '次のノート日（金曜日を除く）', history: '自分の保存済み日付', choose: '日付を選ぶ', activity: '活動内容（任意）',
      mode: 'ノートの表示', write: '書く', read: '読む', readHint: '閲覧専用です。編集するには「書く」を選んでください。', reading: '閲覧専用 — この表示では文章は変更されません。', blank: '未記入', month: '保存済み月', allMonths: 'すべての月', latest: '最新の保存済みノート', noSavedDates: '保存済みノートはまだありません。',
      schedule: '金曜日は練習がお休みです。日付の矢印は金曜日を飛ばします。', rest: '金曜日 — 練習・振り返りはお休みです。', restHint: '別の日付を選んで振り返りを書きましょう。以前保存した金曜日のノートは保存済み日付から開けます。', fridaySaved: '金曜日はお休みです。この以前保存したノートは、そのまま参照できます。',
      reflection: '自分の振り返り', reflectionHint: '起きたこと、学んだこと、次に意識したいことを書きましょう。', english: '英語の原文', japanese: '日本語版（手入力）',
      coach: 'コーチのアドバイス — 選手が入力', coachHint: 'コーチから受けたアドバイスです。コーチ本人のログインや評価ではありません。段落や番号をそのまま残せます。',
      coachJapanese: '日本語の原文', coachEnglish: '英語版（手入力）', translation: '翻訳は手入力です。各言語の文章を入力・貼り付けできます。',
      daily: '1日の振り返り', recorded: '登録済み試合', matchHint: 'すべての欄を開いて表示します。入力欄は文章に合わせて広がります。記録ID順で、実際の試合順とは限りません。', jump: '移動',
      matchReadHint: 'すべての欄を開いて表示します。記録ID順で、実際の試合順とは限りません。',
      noMatches: 'この日付の試合はまだ登録されていません。下に1日のメモを書けます。', training: '練習試合', tournament: '大会', win: '勝ち', loss: '負け', incomplete: '未完了',
      ready: '自由に書いてください。変更は自動保存されます。', unsaved: '未保存の変更', saving: '保存中…', saved: '保存済み', offline: 'オフライン — 未同期です。このページを開いたままにしてください。', failed: '保存できませんでした。文章はこのページに残っています。ページを閉じずに再試行してください。',
      expired: '選手ログインの期限が切れたか、リセットされました。下から再ログインしてください。未保存の文章はこのページに残ります。',
      conflict: '別のタブや端末で新しい内容が保存されました。未保存の文章は上書きされていません。比較してから選んでください。', server: '保存済みの内容', mine: '自分の未保存の内容',
      useServer: '保存済みを使う（未保存の変更を破棄）', useMine: '変更した欄を新しい保存済み内容へ上書きする', discard: '未保存の変更を破棄し、保存済み内容を読み込みますか？',
      missing: '保存済み試合メモ — 現在の試合記録を参照できません', leave: '文章がまだ同期されていません。移動する前にこのページで再試行してください。', loading: '自分のノートを読み込み中…',
      home: 'ホーム', players: '選手', sessions: 'セッション', emptyDirectory: '利用可能な選手アカウントはまだありません。', rate: 'ログイン試行が多すぎます。15分お待ちください。',
      retention: '文章はサーバーに保存され、端末には下書き保存されません。未同期の文章は開いているページにのみ残り、閉じると失われる場合があります。'
    }
  };
  const t = key => words[language][key];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  function today() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  function weekdayOf(value) { return new Date(`${value}T12:00:00Z`).getUTCDay(); }
  function stepDate(value, step) {
    const next = new Date(`${value}T12:00:00Z`);
    do { next.setUTCDate(next.getUTCDate() + step); } while (next.getUTCDay() === 5);
    return next.toISOString().slice(0, 10);
  }
  function defaultDate() { const value = today(); return weekdayOf(value) === 5 ? stepDate(value, -1) : value; }
  function dateLabel(value) {
    const weekday = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ja-JP', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
    return `${value} (${weekday})`;
  }
  function monthLabel(value) { return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ja-JP', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`)); }
  function historyDates() { return dates.filter(value => !historyMonth || value.startsWith(`${historyMonth}-`)); }
  function renderHistoryControls() {
    const monthSelect = app.querySelector('#notebook-history-month'), dateSelect = app.querySelector('#notebook-history');
    if (!monthSelect || !dateSelect) return;
    const months = [...new Set(dates.map(value => value.slice(0, 7)))];
    if (!months.includes(historyMonth)) historyMonth = '';
    monthSelect.replaceChildren(new Option(t('allMonths'), ''));
    months.forEach(value => monthSelect.add(new Option(monthLabel(value), value))); monthSelect.value = historyMonth;
    dateSelect.replaceChildren(new Option(t('choose'), ''));
    historyDates().forEach(value => dateSelect.add(new Option(dateLabel(value), value)));
    dateSelect.value = historyDates().includes(date) ? date : '';
    app.querySelector('#notebook-history-empty').hidden = Boolean(dates.length);
    updateControls();
  }
  function updateControls() {
    app.querySelectorAll('.notebook-dates input, .notebook-dates button, .notebook-modes button').forEach(control => { control.disabled = busy; });
    const monthSelect = app.querySelector('#notebook-history-month'), dateSelect = app.querySelector('#notebook-history'), latest = app.querySelector('#notebook-latest');
    if (monthSelect) monthSelect.disabled = busy || !dates.length;
    if (dateSelect) dateSelect.disabled = busy || !historyDates().length;
    if (latest) latest.disabled = busy || !dates.length;
  }
  const name = person => language === 'en' ? person.englishName || person.displayName : person.displayName;

  async function request(path, { method = 'GET', body, authenticated = true } = {}) {
    const url = new URL(`${window.LK_API_BASE}${path}`);
    url.searchParams.set('environment', environment);
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, { method, cache: 'no-store', signal: controller.signal, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const value = await response.json();
      if (!response.ok || !value.ok) throw Object.assign(new Error(value.error || 'Request failed'), { status: response.status, value });
      return value;
    } finally { clearTimeout(timeout); }
  }

  function header() {
    return `<section class="feedback-hero"><div><p class="eyebrow">${t('eyebrow')}</p><h1>${t('title')}</h1></div><details open class="notebook-privacy"><summary>${t('privacyTitle')}</summary><p>${t('privacy')}</p></details></section>`;
  }
  function updateLanguage() {
    document.documentElement.lang = language;
    document.querySelector('#language-toggle').textContent = language === 'en' ? '日本語' : 'ENGLISH';
    for (const key of ['home', 'players', 'sessions']) document.querySelector(`#feedback-nav-${key}`).textContent = t(key);
  }
  function loginForm(person, reauth = false) {
    return `<form class="notebook-login" data-player="${escapeHtml(person.playerId)}"><h2>${escapeHtml(name(person))}</h2><input type="hidden" name="username" autocomplete="username" value="${escapeHtml(person.playerId)}"><label>${t('password')}<input type="password" name="password" autocomplete="current-password" maxlength="128" required></label><label class="notebook-remember"><input type="checkbox" name="remember" ${!reauth || rememberSession ? 'checked' : ''}> ${t('remember')}</label><p>${t('shared')}</p><button class="gold-button" type="submit">${t('login')}</button><p class="notebook-login-status" role="status"></p></form>`;
  }
  function bindLogins() {
    app.querySelectorAll('.notebook-login').forEach(form => form.onsubmit = async event => {
      event.preventDefault();
      const button = form.querySelector('button'), message = form.querySelector('[role=status]');
      button.disabled = true;
      try {
        const result = await request('/api/reflections/login', { method: 'POST', body: { playerId: form.dataset.player, password: form.elements.password.value }, authenticated: false });
        token = result.token; player = result.player;
        rememberSession = form.elements.remember.checked;
        if (form.elements.remember.checked) localStorage.setItem(storageKey, token); else localStorage.removeItem(storageKey);
        form.elements.password.value = '';
        if (requiresLogin) {
          requiresLogin = false; app.querySelector('#notebook-reauth').replaceChildren(); await flush(); renderNotebook();
        } else {
          // A direct match link only selects a date after ownership authentication.
          if (params.get('player') && params.get('player') !== player.playerId) params.delete('matchId');
          viewMode = 'write'; historyMonth = '';
          await openDay(date);
        }
      } catch (error) { message.textContent = error.status === 429 ? t('rate') : t('invalid'); }
      finally { button.disabled = false; }
    });
  }
  function renderDirectory() {
    disposeEditors();
    updateLanguage();
    app.classList.add('notebook-landing');
    const selected = directory.find(person => person.playerId === directoryPlayerId);
    app.innerHTML = `<header class="notebook-landing-hero"><p class="eyebrow">${t('eyebrow')}</p><h1>${t('title')}</h1><p class="notebook-invitation">${t('invitation')}</p><a class="notebook-preview-link" href="notebook-sample.html">${t('preview')} <span aria-hidden="true">→</span></a><p class="notebook-preview-note">${t('previewHint')}</p></header>
      ${selected ? `<section id="notebook-signin" class="notebook-signin"><div class="notebook-signin-heading"><p class="eyebrow">${t('signInTitle')}</p><button id="notebook-change-player" type="button">${t('changePlayer')}</button></div><div class="notebook-signin-layout">${directoryPortrait(selected)}${loginForm(selected)}</div></section>` : ''}
      <section class="notebook-directory-section" aria-labelledby="notebook-directory-title"><h2 id="notebook-directory-title">${t('directoryTitle')}</h2><p>${t('directoryHint')}</p><div class="notebook-directory-search"><label>${t('directorySearch')}<input id="notebook-player-search" type="search" value="${escapeHtml(directoryQuery)}" autocomplete="off"></label><button type="button" id="notebook-clear-search">${t('clearSearch')}</button></div><p id="notebook-directory-count" role="status"></p><div class="notebook-directory"></div><button id="notebook-more-players" type="button">${t('showMorePlayers')}</button></section>
      <details open class="notebook-privacy"><summary>${t('privacyTitle')}</summary><p>${t('privacy')}</p></details>`;
    app.querySelector('#notebook-player-search').oninput = event => { directoryQuery = event.target.value; directoryLimit = 12; renderDirectoryCards(); };
    app.querySelector('#notebook-clear-search').onclick = () => { directoryQuery = ''; directoryLimit = 12; app.querySelector('#notebook-player-search').value = ''; renderDirectoryCards(); app.querySelector('#notebook-player-search').focus(); };
    app.querySelector('#notebook-more-players').onclick = () => { directoryLimit += 12; renderDirectoryCards(); };
    const change = app.querySelector('#notebook-change-player');
    if (change) change.onclick = () => { directoryPlayerId = ''; params.delete('player'); renderDirectory(); app.querySelector('#notebook-player-search').focus({ preventScroll: true }); };
    renderDirectoryCards();
    bindLogins();
  }
  function directoryPortrait(person) {
    return `<img class="notebook-player-portrait" src="${escapeHtml(window.lkProfileImage(person.playerId))}" alt="" width="80" height="80" loading="lazy" decoding="async">`;
  }
  function renderDirectoryCards() {
    const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
    const query = normalize(directoryQuery), compactQuery = query.replace(/\s/g, '');
    const people = [...directory].sort((a, b) => name(a).localeCompare(name(b), language === 'en' ? 'en' : 'ja')).filter(person => {
      const haystack = normalize([person.displayName, person.englishName, person.playerId].join(' '));
      return !query || haystack.replace(/\s/g, '').includes(compactQuery) || query.split(' ').every(word => haystack.includes(word));
    });
    app.querySelector('.notebook-directory').innerHTML = people.slice(0, directoryLimit).map(person => {
      const secondary = language === 'en' ? person.displayName : person.englishName;
      return `<button type="button" class="notebook-player-card" data-notebook-player="${escapeHtml(person.playerId)}" aria-pressed="${person.playerId === directoryPlayerId}">${directoryPortrait(person)}<span class="notebook-player-card-text"><strong>${escapeHtml(name(person))}</strong>${secondary && secondary !== name(person) ? `<span>${escapeHtml(secondary)}</span>` : ''}<small>${escapeHtml(person.playerId)}</small><span class="notebook-player-enabled">${t('directoryEnabled')}</span></span><span class="notebook-player-arrow" aria-hidden="true">→</span></button>`;
    }).join('') || `<p class="notebook-directory-empty">${t(directory.length ? 'noPlayerMatch' : 'emptyDirectory')}</p>`;
    app.querySelector('#notebook-directory-count').textContent = t('playerCount').replace('{shown}', Math.min(people.length, directoryLimit)).replace('{total}', people.length);
    app.querySelector('#notebook-more-players').hidden = people.length <= directoryLimit;
    app.querySelector('#notebook-clear-search').disabled = !directoryQuery;
    app.querySelectorAll('[data-notebook-player]').forEach(button => button.onclick = () => {
      directoryPlayerId = button.dataset.notebookPlayer; params.set('player', directoryPlayerId); renderDirectory();
      app.querySelector('.notebook-login input[type=password]').focus();
    });
    app.querySelectorAll('.notebook-player-portrait').forEach(image => { image.onerror = () => { image.onerror = null; image.src = 'img/NoProfilePic.jpg'; }; });
  }
  function field(key, label, hint = '') {
    const value = dirty.has(key) ? dirty.get(key) : documentValue.fields[key] || '';
    if (viewMode === 'read') return readField(key, label, value);
    return `<section class="notebook-field"><span>${escapeHtml(label)}</span>${hint ? `<small>${hint}</small>` : ''}<div data-rich-field="${escapeHtml(key)}" data-rich-label="${escapeHtml(label)}"></div></section>`;
  }
  function readField(key, label, value) {
    return `<section class="notebook-read-field"><h3>${escapeHtml(label)}</h3>${typeof value === 'string' ? `<p data-read-field="${escapeHtml(key)}" ${value ? '' : 'class="empty"'}>${escapeHtml(value || t('blank'))}</p>` : `<div data-read-field="${escapeHtml(key)}" class="notebook-rich-content">${Rich.html(value)}</div>`}</section>`;
  }
  function reflectionFields(prefix) {
    return player.bilingual ? `<div class="notebook-bilingual">${field(`${prefix}.en`, t('english'), t('reflectionHint'))}${field(`${prefix}.ja`, t('japanese'))}</div>` : field(`${prefix}.ja`, t('reflection'), t('reflectionHint'));
  }
  function renderNotebook() {
    disposeEditors();
    updateLanguage();
    app.classList.remove('notebook-landing');
    const weekday = weekdayOf(date), matchDay = [0, 4].includes(weekday);
    const friday = weekday === 5, restDay = friday && !Object.values(documentValue.fields).some(value => Rich.text(value).trim()) && !dirty.size;
    const activity = dirty.has('activity') ? dirty.get('activity') : documentValue.fields.activity || '';
    const orphanKeys = [...new Set(Object.keys(documentValue.fields).concat([...dirty.keys()]).filter(key => key.startsWith('match.')).map(key => key.slice(6, -3)))].filter(key => !matches.some(match => match.key === key));
    const matchCards = matches.map(match => {
      const prefix = `match.${match.key}`;
      return `<article class="notebook-match"><header class="notebook-match-heading"><span><small>${t(match.source)} · ${t(match.result)}</small><b>${escapeHtml(name(player))} <em>${escapeHtml(match.score)}</em> ${escapeHtml(match.opponentName)}</b><small>${escapeHtml([match.eventName, match.round].filter(Boolean).join(' · '))}</small></span></header><div>${reflectionFields(prefix)}</div></article>`;
    }).join('');
    app.innerHTML = `${header()}<div class="notebook-identity"><strong>${escapeHtml(name(player))}</strong><button id="notebook-lock" type="button">${t('lock')}</button></div><p class="notebook-notice">${player.bilingual ? t('translation') : ''} ${t('retention')} ${window.LKNotebookEditor.hint(language)}</p>
      <nav class="notebook-dates" ${requiresLogin ? 'hidden' : ''} aria-label="${t('date')}"><button type="button" data-step="-1" aria-label="${t('previous')}">←</button><label>${t('date')}<span id="notebook-date-label" class="notebook-date-label">${escapeHtml(dateLabel(date))}</span><input id="notebook-date" type="date" min="2000-01-01" max="2100-12-31" aria-describedby="notebook-date-label" value="${date}"></label><button type="button" data-step="1" aria-label="${t('next')}">→</button></nav>
      <section class="notebook-tools" ${requiresLogin ? 'hidden' : ''}><div class="notebook-modes" role="group" aria-label="${t('mode')}">${['write', 'read'].map(mode => `<button type="button" data-mode="${mode}" aria-pressed="${mode === viewMode}">${t(mode)}</button>`).join('')}</div>${viewMode === 'read' ? `<p class="notebook-read-hint">${t('readHint')}</p>` : ''}<div class="notebook-history-tools"><label>${t('month')}<select id="notebook-history-month"></select></label><label>${t('history')}<select id="notebook-history"></select></label><button type="button" id="notebook-latest">${t('latest')}</button></div><p id="notebook-history-empty">${t('noSavedDates')}</p></section>
      <div class="notebook-savebar"><p id="notebook-status" role="status" aria-live="polite"></p><button id="notebook-retry" type="button">${t('retry')}</button></div><section id="notebook-reauth">${requiresLogin ? loginForm(player, true) : ''}</section><section id="notebook-conflict"></section>
      <section class="notebook-day" ${requiresLogin ? 'hidden' : ''}><p class="notebook-schedule">${t('schedule')}</p>${restDay ? `<section class="notebook-entry notebook-rest"><h2>${t('rest')}</h2><p>${t('restHint')}</p></section>` : `${friday ? `<p class="notebook-schedule">${t('fridaySaved')}</p>` : ''}<nav class="notebook-jump" aria-label="${t('jump')}"><a href="#notebook-daily">${t('daily')}</a>${matches.length ? `<a href="#notebook-matches">${t('recorded')}</a>` : ''}<a href="#notebook-coach">${t('coach')}</a></nav>${viewMode === 'read' ? readField('activity', t('activity'), activity) : `<label class="notebook-field"><span>${t('activity')}</span><input data-field="activity" maxlength="160" value="${escapeHtml(activity)}"></label>`}
      ${matchDay && matches.length ? '' : `<section id="notebook-daily" class="notebook-entry"><h2>${t('daily')}</h2>${matchDay ? `<p>${t('noMatches')}</p>` : ''}${reflectionFields('daily')}</section>`}
      ${matches.length ? `<section id="notebook-matches" class="notebook-matches"><h2>${t('recorded')} · ${matches.length}</h2><p>${t(viewMode === 'read' ? 'matchReadHint' : 'matchHint')}</p>${matchCards}</section>` : ''}
      ${matchDay && matches.length ? `<section id="notebook-daily" class="notebook-entry"><h2>${t('daily')}</h2>${reflectionFields('daily')}</section>` : ''}
      ${orphanKeys.map(key => `<article class="notebook-match"><h3>${t('missing')} · ${escapeHtml(key)}</h3><div>${reflectionFields(`match.${key}`)}</div></article>`).join('')}
      <section id="notebook-coach" class="notebook-entry"><h2>${t('coach')}</h2><p>${t('coachHint')}</p>${player.bilingual ? `<div class="notebook-bilingual">${field('coach.ja', t('coachJapanese'))}${field('coach.en', t('coachEnglish'))}</div>` : field('coach.ja', t('coachJapanese'))}</section>`}</section>`;
    updateStatus(); renderConflict(); bindLogins();
    function edited(key, value) {
      dirty.set(key, value); statusKey = 'unsaved'; updateStatus(); if (conflict) renderConflict(); clearTimeout(timer); timer = setTimeout(flush, 1000);
    }
    app.querySelectorAll('[data-rich-field]').forEach(host => {
      const key = host.dataset.richField;
      const editor = window.LKNotebookEditor.mount({ host, label: host.dataset.richLabel, language, field: key, value: dirty.has(key) ? dirty.get(key) : documentValue.fields[key] || '', onChange: value => edited(key, value) });
      editor.root.addEventListener('blur', () => { if (dirty.size) flush(); });
      editors.push(editor);
    });
    app.querySelectorAll('input[data-field]').forEach(input => {
      // Activity remains an ordinary plain-text input.
      input.value = dirty.has(input.dataset.field) ? dirty.get(input.dataset.field) : documentValue.fields[input.dataset.field] || '';
      input.oninput = () => edited(input.dataset.field, input.value);
      input.onblur = () => { if (dirty.size) flush(); };
    });
    chromeObserver.disconnect();
    chromeObserver.observe(document.querySelector('.site-header'));
    chromeObserver.observe(app.querySelector('.notebook-savebar'));
    app.querySelector('#notebook-retry').onclick = () => { if (!conflict) flush(); };
    app.querySelector('#notebook-date').onchange = event => navigate(event.target.value);
    app.querySelector('#notebook-history').onchange = event => { if (event.target.value) navigate(event.target.value); };
    app.querySelector('#notebook-history-month').onchange = event => { historyMonth = event.target.value; renderHistoryControls(); };
    app.querySelector('#notebook-latest').onclick = () => { if (dates.length) navigate(dates[0], ''); };
    app.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => switchMode(button.dataset.mode));
    renderHistoryControls();
    app.querySelectorAll('[data-step]').forEach(button => button.onclick = () => navigate(stepDate(date, Number(button.dataset.step))));
    app.querySelector('#notebook-lock').onclick = async () => {
      if (busy) return;
      busy = true; updateControls(); app.querySelector('.notebook-day').inert = true;
      try {
        if (!await flush()) { alert(t('leave')); return; }
        await request('/api/reflections/logout', { method: 'POST' });
        localStorage.removeItem(storageKey); token = ''; player = null; dates = []; matches = []; dirty.clear(); documentValue = { revision: 0, fields: {} }; conflict = null; historyMonth = ''; viewMode = 'write'; directoryPlayerId = ''; directoryQuery = ''; directoryLimit = 12;
        history.replaceState(null, '', 'feedback.html'); params.delete('player'); params.delete('matchId'); renderDirectory();
      } catch { statusKey = 'failed'; updateStatus(); }
      finally { busy = false; updateControls(); const day = app.querySelector('.notebook-day'); if (day) day.inert = false; }
    };
  }
  async function switchMode(nextMode) {
    if (busy || nextMode === viewMode || requiresLogin) return;
    busy = true; updateControls(); app.querySelector('.notebook-day').inert = true;
    try {
      if (conflict || !await flush() || requiresLogin) { alert(t('leave')); return; }
      viewMode = nextMode; renderNotebook();
    } finally {
      busy = false; updateControls(); const day = app.querySelector('.notebook-day'); if (day) day.inert = false;
      if (viewMode === nextMode && !requiresLogin) app.querySelector(`[data-mode="${nextMode}"]`)?.focus({ preventScroll: true });
    }
  }
  const chromeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const key = entry.target.classList.contains('site-header') ? '--notebook-header-height' : '--notebook-savebar-height';
      app.style.setProperty(key, `${Math.ceil(entry.target.getBoundingClientRect().height)}px`);
    }
  });
  function updateStatus() {
    const node = app.querySelector('#notebook-status');
    if (node) node.textContent = `${t(requiresLogin ? 'expired' : conflict ? 'conflict' : viewMode === 'read' && statusKey === 'ready' ? 'reading' : statusKey)}${statusKey === 'saved' && savedAt ? ` · ${new Date(savedAt).toLocaleTimeString(language === 'en' ? 'en-GB' : 'ja-JP')}` : ''}`;
    app.querySelector('#notebook-retry')?.toggleAttribute('hidden', !dirty.size || !!conflict || requiresLogin);
  }
  function renderConflict() {
    const target = app.querySelector('#notebook-conflict');
    if (!target || !conflict || requiresLogin) return;
    target.innerHTML = `<h2>${t('conflict')}</h2>${[...dirty].map(([key, value]) => `<article><strong>${escapeHtml(key)}</strong><div class="notebook-bilingual"><section><small>${t('server')}</small><div class="notebook-rich-content">${Rich.html(conflict.fields[key] || '')}</div></section><section><small>${t('mine')}</small><div class="notebook-rich-content">${Rich.html(value)}</div></section></div></article>`).join('')}<button id="notebook-use-server" type="button">${t('useServer')}</button><button id="notebook-use-mine" type="button">${t('useMine')}</button>`;
    target.querySelector('#notebook-use-server').onclick = () => { if (!confirm(t('discard'))) return; documentValue = conflict; conflict = null; dirty.clear(); statusKey = 'ready'; renderNotebook(); };
    target.querySelector('#notebook-use-mine').onclick = async () => { documentValue = conflict; conflict = null; await flush(); renderNotebook(); };
  }
  async function flush() {
    clearTimeout(timer);
    if (editors.some(editor => editor.composing)) return false;
    if (saving) { const success = await saving; if (!success) return false; return dirty.size ? flush() : true; }
    if (!dirty.size) return true;
    if (conflict || requiresLogin || !player) return false;
    if (!navigator.onLine) { statusKey = 'offline'; updateStatus(); return false; }
    const patch = Object.fromEntries(dirty), revision = documentValue.revision;
    statusKey = 'saving'; updateStatus();
    saving = (async () => {
      try {
        const result = await request(`/api/reflections/day?date=${date}`, { method: 'POST', body: { revision, patch } });
        documentValue = { revision: result.revision, fields: { ...documentValue.fields, ...patch }, updatedAt: result.updatedAt };
        for (const [key, value] of Object.entries(patch)) if (dirty.get(key) === value) dirty.delete(key);
        if (!dates.includes(date)) { dates.push(date); dates.sort().reverse(); }
        renderHistoryControls();
        savedAt = result.updatedAt; statusKey = dirty.size ? 'unsaved' : 'saved';
        return true;
      } catch (error) {
        if (error.status === 409) { conflict = error.value.document; renderConflict(); }
        else if (error.status === 401) {
          requiresLogin = true; token = ''; localStorage.removeItem(storageKey);
          app.querySelector('#notebook-reauth').innerHTML = loginForm(player, true); bindLogins();
          app.querySelector('.notebook-day').hidden = true;
          app.querySelector('.notebook-dates').hidden = true;
          app.querySelector('.notebook-tools').hidden = true;
        }
        statusKey = navigator.onLine ? 'failed' : 'offline';
        return false;
      } finally { updateStatus(); }
    })();
    const success = await saving; saving = null;
    // Retry only newer edits after a successful request, never a failing loop.
    return success && dirty.size ? flush() : success;
  }
  async function openDay(nextDate, nextMonth = historyMonth) {
    const [result, historyResult] = await Promise.all([request(`/api/reflections/day?date=${encodeURIComponent(nextDate)}`), request('/api/reflections/dates')]);
    date = result.date; documentValue = result.document; matches = result.matches; dates = historyResult.dates;
    historyMonth = nextMonth;
    statusKey = weekdayOf(date) === 5 && !Object.values(documentValue.fields).some(value => Rich.text(value).trim()) ? 'rest' : 'ready'; conflict = null; savedAt = ''; dirty.clear();
    history.replaceState(null, '', `feedback.html?${new URLSearchParams({ player: player.playerId, date })}`);
    renderNotebook();
  }
  async function navigate(nextDate, nextMonth = historyMonth) {
    if (busy) return;
    busy = true;
    updateControls();
    try {
      if (!await flush()) { alert(t('leave')); return; }
      app.querySelector('.notebook-day').inert = true;
      await openDay(nextDate, nextMonth);
    } catch (error) {
      if (error.status === 401) { requiresLogin = true; token = ''; localStorage.removeItem(storageKey); renderNotebook(); }
      else { statusKey = 'failed'; updateStatus(); }
    } finally { busy = false; renderHistoryControls(); const picker = app.querySelector('#notebook-date'); if (picker) picker.value = date; const day = app.querySelector('.notebook-day'); if (day) day.inert = false; }
  }
  document.querySelector('#language-toggle').onclick = () => {
    if (busy || editors.some(editor => editor.composing)) return;
    language = language === 'en' ? 'ja' : 'en'; localStorage.setItem('lk-language', language);
    if (player) renderNotebook(); else renderDirectory();
  };
  document.querySelector('#menu-toggle').onclick = event => { const open = document.querySelector('.site-header nav').classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', String(open)); };
  window.addEventListener('beforeunload', event => { if (dirty.size || saving || editors.some(editor => editor.composing)) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('online', () => { if (dirty.size) flush(); });
  window.addEventListener('offline', () => { if (dirty.size) { statusKey = 'offline'; updateStatus(); } });
  // Browser Back can restore a frozen page without re-running start(). Hide
  // private DOM before caching and revalidate before displaying it again.
  window.addEventListener('pagehide', () => { editors.forEach(editor => editor.capture()); app.style.visibility = 'hidden'; app.inert = true; });
  window.addEventListener('pageshow', async event => {
    if (!event.persisted) return;
    try {
      if (player && token) {
        const result = await request('/api/reflections/session');
        if (result.player.playerId !== player.playerId) throw Object.assign(new Error('Identity changed'), { status: 401 });
        renderNotebook();
      } else if (player) renderNotebook();
      else renderDirectory();
    } catch (error) {
      if (error.status === 401) { requiresLogin = true; token = ''; localStorage.removeItem(storageKey); }
      else { requiresLogin = true; token = ''; statusKey = 'failed'; }
      if (player) renderNotebook(); else renderDirectory();
    } finally { app.style.visibility = ''; app.inert = false; }
  });
  // Another tab locking or changing the remembered account must not leave text
  // visible under a different identity. In-memory non-remembered sessions stay local.
  window.addEventListener('storage', event => {
    if (event.key === storageKey && player && token && event.newValue !== token && event.oldValue === token) {
      editors.forEach(editor => editor.capture());
      requiresLogin = true; token = '';
      if (dirty.size) { renderNotebook(); } else { player = null; documentValue = { revision: 0, fields: {} }; matches = []; dates = []; renderDirectory(); }
    }
  });
  async function start() {
    updateLanguage();
    try {
      directory = (await request('/api/reflections/directory', { authenticated: false })).players;
      if (token) {
        try {
          const result = await request('/api/reflections/session'); player = result.player;
          if (!params.get('player') || params.get('player') === player.playerId) { await openDay(date); return; }
          player = null; token = ''; // Keep the remembered session, but require the selected player's password.
        } catch (error) {
          if (error.status !== 401) throw error;
          token = ''; player = null; localStorage.removeItem(storageKey);
        }
      }
      renderDirectory();
    } catch {
      app.innerHTML = `${header()}<p role="alert">${t('unavailable')}</p><button id="notebook-start-retry" type="button">${t('retry')}</button>`;
      app.querySelector('button').onclick = start;
    }
  }
  start();
})();
