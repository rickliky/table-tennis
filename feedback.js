(() => {
  'use strict';
  const app = document.querySelector('#feedback-app');
  const params = new URLSearchParams(location.search);
  const environment = /\/uat(?:\/|$)/i.test(location.pathname) || ['localhost', '127.0.0.1'].includes(location.hostname) ? 'uat' : 'prod';
  const storageKey = `lk-private-reflection-session-${environment}`;
  let token = localStorage.getItem(storageKey) || '', player = null, directory = [], dates = [];
  let rememberSession = Boolean(token);
  let language = localStorage.getItem('lk-language') || 'ja';
  let date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : today();
  let documentValue = { revision: 0, fields: {} }, matches = [], dirty = new Map(), timer, saving = null;
  let conflict = null, requiresLogin = false, busy = false, statusKey = 'ready', savedAt = '';
  const words = {
    en: {
      title: 'Private Player Notebook', eyebrow: 'YOUR PRIVATE REFLECTION', invitation: 'To use private reflections, please speak to Jacelyn and Kaitlyn’s daddy.',
      privacy: 'Only your player login can open this notebook. It is not published to club members or normal Admin/Approver accounts. Infrastructure operators can technically access stored data; this is not end-to-end encryption.',
      password: 'Player password', login: 'Open my notebook', remember: 'Remember me on this browser for eight weeks', shared: 'Use only your own account. Do not remember access on a shared device.',
      invalid: 'Could not sign in. Check the password or try again later.', unavailable: 'The notebook service is unavailable. Please try again.', retry: 'Try again', lock: 'Lock / sign out',
      date: 'Notebook date', previous: 'Previous day', next: 'Next day', history: 'Your saved dates', choose: 'Choose a date', activity: 'Activity (optional)',
      reflection: 'My reflection', reflectionHint: 'What happened, what did you learn, and what will you focus on next?', english: 'English original', japanese: 'Japanese version (manual)',
      coach: 'Coach feedback — entered by the player', coachHint: 'Advice received from the coach, not a coach-authenticated evaluation. Preserve paragraphs and numbered points.',
      coachJapanese: 'Japanese original', coachEnglish: 'English version (manual)', translation: 'Automatic translation is on hold. Both language fields can be edited manually.',
      daily: 'Daily reflection', recorded: 'Recorded matches', matchHint: 'Cards are ordered by record ID, not verified play order. Unwritten cards may be left closed.',
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
      title: '選手のプライベートノート', eyebrow: '自分だけの振り返り', invitation: 'この振り返り機能を使いたい選手は、ジェイスとケイツのお父さんに声をかけてください。',
      privacy: 'このノートは本人の選手ログインでのみ開けます。クラブメンバーや通常の管理者・承認者には公開されません。ただし、システム運営者は保存データへ技術的にアクセスできます。エンドツーエンド暗号化ではありません。',
      password: '選手パスワード', login: '自分のノートを開く', remember: 'このブラウザで8週間ログインを保持する', shared: '必ず自分のアカウントを使ってください。共用端末ではログインを保持しないでください。',
      invalid: 'ログインできませんでした。パスワードを確認するか、時間をおいて試してください。', unavailable: 'ノートサービスを利用できません。もう一度試してください。', retry: 'もう一度試す', lock: 'ロック・ログアウト',
      date: 'ノートの日付', previous: '前の日', next: '次の日', history: '自分の保存済み日付', choose: '日付を選ぶ', activity: '活動内容（任意）',
      reflection: '自分の振り返り', reflectionHint: '起きたこと、学んだこと、次に意識したいことを書きましょう。', english: '英語の原文', japanese: '日本語版（手入力）',
      coach: 'コーチのアドバイス — 選手が入力', coachHint: 'コーチから受けたアドバイスです。コーチ本人のログインや評価ではありません。段落や番号をそのまま残せます。',
      coachJapanese: '日本語の原文', coachEnglish: '英語版（手入力）', translation: '自動翻訳は保留中です。両言語の欄を手入力で編集できます。',
      daily: '1日の振り返り', recorded: '登録済み試合', matchHint: '記録ID順で表示しています。実際の試合順とは限りません。未記入のカードは閉じたままで構いません。',
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
    return `<section class="feedback-hero"><div><p class="eyebrow">${t('eyebrow')}</p><h1>${t('title')}</h1></div><aside>${t('privacy')}</aside></section>`;
  }
  function updateLanguage() {
    document.documentElement.lang = language;
    document.querySelector('#language-toggle').textContent = language === 'en' ? '日本語' : 'ENGLISH';
    for (const key of ['home', 'players', 'sessions']) document.querySelector(`#feedback-nav-${key}`).textContent = t(key);
  }
  function loginForm(person, reauth = false) {
    return `<form class="notebook-login" data-player="${escapeHtml(person.playerId)}"><h2>${escapeHtml(name(person))}</h2><label>${t('password')}<input type="password" name="password" autocomplete="current-password" maxlength="128" required></label><label class="notebook-remember"><input type="checkbox" name="remember" ${!reauth || rememberSession ? 'checked' : ''}> ${t('remember')}</label><p>${t('shared')}</p><button class="gold-button" type="submit">${t('login')}</button><p class="notebook-login-status" role="status"></p></form>`;
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
          await openDay(date);
        }
      } catch (error) { message.textContent = error.status === 429 ? t('rate') : t('invalid'); }
      finally { button.disabled = false; }
    });
  }
  function renderDirectory() {
    updateLanguage();
    const selected = params.get('player');
    app.innerHTML = `${header()}<p class="notebook-invitation">${t('invitation')}</p><section class="notebook-directory">${directory.map(person => `<details ${person.playerId === selected ? 'open' : ''}><summary>${escapeHtml(name(person))}</summary>${loginForm(person)}</details>`).join('') || `<p>${t('emptyDirectory')}</p>`}</section>`;
    bindLogins();
  }
  function field(key, label, hint = '') {
    const value = dirty.has(key) ? dirty.get(key) : documentValue.fields[key] || '';
    return `<label class="notebook-field"><span>${escapeHtml(label)}</span>${hint ? `<small>${hint}</small>` : ''}<textarea data-field="${escapeHtml(key)}" maxlength="8000" rows="6">${escapeHtml(value)}</textarea></label>`;
  }
  function reflectionFields(prefix) {
    return player.bilingual ? `<div class="notebook-bilingual">${field(`${prefix}.en`, t('english'), t('reflectionHint'))}${field(`${prefix}.ja`, t('japanese'))}</div>` : field(`${prefix}.ja`, t('reflection'), t('reflectionHint'));
  }
  function renderNotebook() {
    updateLanguage();
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(), matchDay = [0, 4].includes(weekday);
    const activity = dirty.has('activity') ? dirty.get('activity') : documentValue.fields.activity || '';
    const orphanKeys = [...new Set(Object.keys(documentValue.fields).concat([...dirty.keys()]).filter(key => key.startsWith('match.')).map(key => key.slice(6, -3)))].filter(key => !matches.some(match => match.key === key));
    const matchCards = matches.map(match => {
      const prefix = `match.${match.key}`, written = ['en', 'ja'].some(lang => dirty.get(`${prefix}.${lang}`) || documentValue.fields[`${prefix}.${lang}`]);
      const targeted = match.key === `${params.get('matchType') || 'training'}:${params.get('matchId')}`;
      return `<details class="notebook-match" ${written || targeted ? 'open' : ''}><summary><span><small>${t(match.source)} · ${t(match.result)}</small><b>${escapeHtml(name(player))} <em>${escapeHtml(match.score)}</em> ${escapeHtml(match.opponentName)}</b><small>${escapeHtml([match.eventName, match.round].filter(Boolean).join(' · '))}</small></span></summary><div>${reflectionFields(prefix)}</div></details>`;
    }).join('');
    app.innerHTML = `${header()}<div class="notebook-identity"><strong>${escapeHtml(name(player))}</strong><button id="notebook-lock" type="button">${t('lock')}</button></div><p class="notebook-notice">${player.bilingual ? t('translation') : ''} ${t('retention')}</p>
      <nav class="notebook-dates" aria-label="${t('date')}"><button type="button" data-step="-1" aria-label="${t('previous')}">←</button><label>${t('date')}<input id="notebook-date" type="date" min="2000-01-01" max="2100-12-31" value="${date}"></label><button type="button" data-step="1" aria-label="${t('next')}">→</button><label>${t('history')}<select id="notebook-history"><option value="">${t('choose')}</option>${dates.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select></label></nav>
      <div class="notebook-savebar"><p id="notebook-status" role="status" aria-live="polite"></p><button id="notebook-retry" type="button">${t('retry')}</button></div><section id="notebook-reauth">${requiresLogin ? loginForm(player, true) : ''}</section><section id="notebook-conflict"></section>
      <section class="notebook-day" ${requiresLogin ? 'hidden' : ''}><label class="notebook-field"><span>${t('activity')}</span><input data-field="activity" maxlength="160" value="${escapeHtml(activity)}"></label>
      ${matchDay && matches.length ? '' : `<section class="notebook-entry"><h2>${t('daily')}</h2>${matchDay ? `<p>${t('noMatches')}</p>` : ''}${reflectionFields('daily')}</section>`}
      ${matches.length ? `<section class="notebook-matches"><h2>${t('recorded')} · ${matches.length}</h2><p>${t('matchHint')}</p>${matchCards}</section>` : ''}
      ${matchDay && matches.length ? `<details class="notebook-match"><summary>${t('daily')}</summary><div>${reflectionFields('daily')}</div></details>` : ''}
      ${orphanKeys.map(key => `<details class="notebook-match"><summary>${t('missing')} · ${escapeHtml(key)}</summary><div>${reflectionFields(`match.${key}`)}</div></details>`).join('')}
      <section class="notebook-entry"><h2>${t('coach')}</h2><p>${t('coachHint')}</p>${player.bilingual ? `<div class="notebook-bilingual">${field('coach.ja', t('coachJapanese'))}${field('coach.en', t('coachEnglish'))}</div>` : field('coach.ja', t('coachJapanese'))}</section></section>`;
    updateStatus(); renderConflict(); bindLogins();
    app.querySelectorAll('[data-field]').forEach(input => {
      input.oninput = () => { dirty.set(input.dataset.field, input.value); statusKey = 'unsaved'; updateStatus(); if (conflict) renderConflict(); clearTimeout(timer); timer = setTimeout(flush, 1000); };
      input.onblur = () => { if (dirty.size) flush(); };
    });
    app.querySelector('#notebook-retry').onclick = () => { if (!conflict) flush(); };
    app.querySelector('#notebook-date').onchange = event => navigate(event.target.value);
    app.querySelector('#notebook-history').onchange = event => { if (event.target.value) navigate(event.target.value); };
    app.querySelectorAll('[data-step]').forEach(button => button.onclick = () => { const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + Number(button.dataset.step)); navigate(next.toISOString().slice(0, 10)); });
    app.querySelector('#notebook-lock').onclick = async () => {
      if (busy) return;
      if (!await flush()) { alert(t('leave')); return; }
      busy = true; app.querySelector('.notebook-day').inert = true;
      try {
        await request('/api/reflections/logout', { method: 'POST' });
        localStorage.removeItem(storageKey); token = ''; player = null; dates = []; matches = []; dirty.clear(); documentValue = { revision: 0, fields: {} }; conflict = null;
        history.replaceState(null, '', 'feedback.html'); params.delete('player'); params.delete('matchId'); renderDirectory();
      } catch { statusKey = 'failed'; updateStatus(); }
      finally { busy = false; const day = app.querySelector('.notebook-day'); if (day) day.inert = false; }
    };
  }
  function updateStatus() {
    const node = app.querySelector('#notebook-status');
    if (node) node.textContent = `${t(requiresLogin ? 'expired' : conflict ? 'conflict' : statusKey)}${statusKey === 'saved' && savedAt ? ` · ${new Date(savedAt).toLocaleTimeString(language === 'en' ? 'en-GB' : 'ja-JP')}` : ''}`;
    app.querySelector('#notebook-retry')?.toggleAttribute('hidden', !dirty.size || !!conflict || requiresLogin);
  }
  function renderConflict() {
    const target = app.querySelector('#notebook-conflict');
    if (!target || !conflict) return;
    target.innerHTML = `<h2>${t('conflict')}</h2>${[...dirty].map(([key, value]) => `<article><strong>${escapeHtml(key)}</strong><div class="notebook-bilingual"><section><small>${t('server')}</small><pre>${escapeHtml(conflict.fields[key] || '')}</pre></section><section><small>${t('mine')}</small><pre>${escapeHtml(value)}</pre></section></div></article>`).join('')}<button id="notebook-use-server" type="button">${t('useServer')}</button><button id="notebook-use-mine" type="button">${t('useMine')}</button>`;
    target.querySelector('#notebook-use-server').onclick = () => { if (!confirm(t('discard'))) return; documentValue = conflict; conflict = null; dirty.clear(); statusKey = 'ready'; renderNotebook(); };
    target.querySelector('#notebook-use-mine').onclick = async () => { documentValue = conflict; conflict = null; await flush(); renderNotebook(); };
  }
  async function flush() {
    clearTimeout(timer);
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
        savedAt = result.updatedAt; statusKey = dirty.size ? 'unsaved' : 'saved';
        return true;
      } catch (error) {
        if (error.status === 409) { conflict = error.value.document; renderConflict(); }
        else if (error.status === 401) {
          requiresLogin = true; token = ''; localStorage.removeItem(storageKey);
          app.querySelector('#notebook-reauth').innerHTML = loginForm(player, true); bindLogins();
          app.querySelector('.notebook-day').hidden = true;
        }
        statusKey = navigator.onLine ? 'failed' : 'offline';
        return false;
      } finally { updateStatus(); }
    })();
    const success = await saving; saving = null;
    // Retry only newer edits after a successful request, never a failing loop.
    return success && dirty.size ? flush() : success;
  }
  async function openDay(nextDate) {
    const [result, historyResult] = await Promise.all([request(`/api/reflections/day?date=${encodeURIComponent(nextDate)}`), request('/api/reflections/dates')]);
    date = result.date; documentValue = result.document; matches = result.matches; dates = historyResult.dates;
    statusKey = 'ready'; conflict = null; savedAt = ''; dirty.clear();
    history.replaceState(null, '', `feedback.html?${new URLSearchParams({ player: player.playerId, date })}`);
    renderNotebook();
  }
  async function navigate(nextDate) {
    if (busy) return;
    busy = true;
    try {
      if (!await flush()) { alert(t('leave')); return; }
      app.querySelector('.notebook-day').inert = true;
      await openDay(nextDate);
    } catch (error) {
      if (error.status === 401) { requiresLogin = true; token = ''; localStorage.removeItem(storageKey); renderNotebook(); }
      else { statusKey = 'failed'; updateStatus(); }
    } finally { busy = false; const picker = app.querySelector('#notebook-date'); if (picker) picker.value = date; const day = app.querySelector('.notebook-day'); if (day) day.inert = false; }
  }
  document.querySelector('#language-toggle').onclick = () => {
    if (busy) return;
    language = language === 'en' ? 'ja' : 'en'; localStorage.setItem('lk-language', language);
    if (player) renderNotebook(); else renderDirectory();
  };
  document.querySelector('#menu-toggle').onclick = event => { const open = document.querySelector('.site-header nav').classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', String(open)); };
  window.addEventListener('beforeunload', event => { if (dirty.size || saving) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('online', () => { if (dirty.size) flush(); });
  window.addEventListener('offline', () => { if (dirty.size) { statusKey = 'offline'; updateStatus(); } });
  // Another tab locking or changing the remembered account must not leave text
  // visible under a different identity. In-memory non-remembered sessions stay local.
  window.addEventListener('storage', event => {
    if (event.key === storageKey && player && token && event.newValue !== token && event.oldValue === token) {
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
