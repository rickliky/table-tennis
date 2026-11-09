(() => {
  'use strict';
  // This separate page deliberately loads no analytics, third-party scripts,
  // general member data or AI provider. Private text stays in page memory.
  const app = document.querySelector('#opponent-prep-app');
  const model = window.LKOpponentPrep, Rich = window.LKNotebookRich;
  const params = new URLSearchParams(location.search);
  const playerId = params.get('player') || '', opponentId = params.get('opponent') || '';
  const candidateDates = [...new Set(params.getAll('date').filter(model.validDate))].sort().reverse().slice(0, model.maxDates);
  const validContext = /^LK-\d{4}$/.test(playerId) && /^[A-Za-z0-9_-]{1,64}$/.test(opponentId) && playerId !== opponentId && candidateDates.length > 0;
  const environment = /\/uat(?:\/|$)/i.test(location.pathname) || ['localhost', '127.0.0.1'].includes(location.hostname) ? 'uat' : 'prod';
  const storageKey = `lk-private-reflection-session-${environment}`;
  let language = localStorage.getItem('lk-language') === 'en' ? 'en' : 'ja';
  let state = 'ready', message = '', token = '', records = [], generation = 0, controller = null;

  const words = {
    en: {
      title: 'Private Match Preparation', eyebrow: 'YOUR NOTEBOOK · YOUR NEXT MATCH', back: '← Opponent insight',
      intro: 'Review your own reflections for the selected opponent and choose a focus for your next meeting.',
      private: 'Private: only the signed-in player can open this preparation. Club administrators can read the notebook in their existing viewer; other members and Approvers cannot.',
      limits: 'Only match notes for this opponent from up to 12 latest recorded meeting dates are checked, including incomplete matches and tournaments. Up to 30 excerpt cards are shown. Daily and coach notes are not attributed to a specific opponent.',
      local: 'This is not AI or a coach evaluation. The page selects short excerpts from the named translation section in your notes, on this device. Nothing is sent to a translation or AI service.',
      open: 'Open my private preparation', hide: 'Hide private preparation', cancel: 'Cancel', loading: 'Checking your own notes…',
      signIn: 'Sign in to your notebook', password: 'Player password', submit: 'Sign in and review',
      loginHint: 'Use the notebook password for this player. A sign-in made here is kept only on this page.',
      invalid: 'Could not sign in. Check your password or try again later.', rate: 'Too many sign-in attempts. Please wait 15 minutes.',
      mismatch: 'The remembered notebook belongs to another player. Sign in as the player whose profile you opened.',
      expired: 'Your notebook session expired or was revoked. Sign in again.',
      unavailable: 'Could not load the private preparation. Please try again; no notes were changed.',
      badContext: 'Open this page from a player’s Opponent Insight and select an opponent with a recorded match.',
      next: 'A simple plan for your next match', step1: 'Choose one useful action from your own notes below.',
      step2: 'Practise or discuss that action with your coach before the next match.',
      step3: 'During the match, notice whether it helps and adjust when needed. No outcome is guaranteed.',
      focus: 'A possible focus from your notes', noFocus: 'No explicit next-step phrase was detected. Choose a focus with your coach.',
      takeaways: 'Past takeaways · excerpts from your notes', method: 'Excerpts are selected with simple keywords; they may be incomplete. Open the original note for context.',
      noNotes: 'No “English Back-Translation” section was found in match notes for these meetings. The original or another language is not substituted.',
      training: 'Training', tournament: 'Tournament', incomplete: 'Incomplete', fieldEn: 'English field', fieldJa: 'Japanese field',
      source: 'Open this notebook date', owner: 'Notebook owner', selected: 'Selected opponent', section: 'English Back-Translation', retry: 'Try again'
    },
    ja: {
      title: '自分だけの対戦準備', eyebrow: '自分のノート · 次の試合へ', back: '← 対戦相手分析',
      intro: '選択した相手との自分の振り返りを読み返し、次の対戦で意識することを選びます。',
      private: 'プライベート：本人のノートでログインした選手だけがこの準備を開けます。クラブ管理者は従来の閲覧画面でノートを読めますが、他のメンバーや承認者は読めません。',
      limits: 'この相手との登録済み対戦日の新しい順に最大12日分の試合メモだけを確認し、抜粋は最大30件表示します。未完了試合と大会も含みます。1日の振り返りやコーチのアドバイスを特定の相手の内容と決めつけません。',
      local: 'AIやコーチ本人の評価ではありません。端末上で、ノート内の指定された翻訳欄から短い文章を抜き出します。翻訳・AIサービスには送信しません。',
      open: '自分の対戦準備を開く', hide: '対戦準備を非表示', cancel: 'キャンセル', loading: '自分のノートを確認中…',
      signIn: '自分のノートにログイン', password: '選手パスワード', submit: 'ログインして確認',
      loginHint: 'この選手のノートパスワードを入力してください。ここでのログインはこのページ内にのみ保持されます。',
      invalid: 'ログインできませんでした。パスワードを確認するか、時間をおいて試してください。', rate: 'ログイン試行が多すぎます。15分お待ちください。',
      mismatch: '保存されたノートは別の選手のものです。開いているプロフィールの選手としてログインしてください。',
      expired: 'ノートのログイン期限が切れたか、アクセスが無効になりました。再度ログインしてください。',
      unavailable: '対戦準備を読み込めませんでした。もう一度お試しください。ノートは変更されていません。',
      badContext: '選手の対戦相手分析から、登録済みの対戦相手を選んでこのページを開いてください。',
      next: '次の試合に向けたシンプルなプラン', step1: '下にある自分のメモから、役立ちそうな行動を1つ選びます。',
      step2: '次の試合までに、その行動を練習するかコーチと相談します。',
      step3: '試合中に役立っているか確かめ、必要に応じて調整します。結果を保証するものではありません。',
      focus: '自分のノートから選んだ次の課題候補', noFocus: '次の課題を示す文章が見つかりませんでした。コーチと相談して選んでください。',
      takeaways: '過去の気づき · 自分のノートからの抜粋', method: '簡単なキーワードで抜粋しています。全文ではないため、元のノートも確認してください。',
      noNotes: 'この対戦の試合メモに「Japanese Translation（日本語訳）」の欄が見つかりませんでした。原文や別の言語で代用しません。',
      training: '練習試合', tournament: '大会', incomplete: '未完了', fieldEn: '英語欄', fieldJa: '日本語欄',
      source: 'この日付のノートを開く', owner: 'ノートの選手', selected: '選択した対戦相手', section: 'Japanese Translation（日本語訳）', retry: 'もう一度試す'
    }
  };
  const t = key => words[language][key];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);

  function renderCards() {
    const cards = []; let focus = null;
    for (const record of records) {
      for (const section of model.matchSections(record.fields, record.key, language, Rich.text)) {
        const snippets = model.takeaways(section.text, language);
        if (!snippets.length) continue;
        const name = language === 'en' && record.opponentEnglishName ? record.opponentEnglishName : record.opponentName || opponentId;
        const link = `feedback.html?${new URLSearchParams({ player: playerId, date: record.date })}`;
        const possibleFocus = model.nextFocus(section.text, language);
        if (!focus && possibleFocus) focus = { text:possibleFocus, date:record.date, link };
        cards.push(`<article class="opponent-prep-card"><header><div><strong>${escape(name)}</strong><small>${escape(record.date)} · ${t(record.source)}${record.score ? ` · ${escape(record.score)}` : ''}${record.result === 'incomplete' ? ` · ${t('incomplete')}` : ''}</small></div><a href="${escape(link)}">${t('source')}</a></header><p>${t('section')} · ${t(section.fieldLanguage === 'en' ? 'fieldEn' : 'fieldJa')}</p><ul>${snippets.map(snippet => `<li>${escape(snippet)}</li>`).join('')}</ul></article>`);
        if (cards.length >= model.maxCards) return { cards, focus };
      }
    }
    return { cards, focus };
  }

  function render() {
    document.documentElement.lang = language;
    const toggle = document.querySelector('#language-toggle');
    toggle.textContent = language === 'en' ? '日本語' : 'ENGLISH';
    toggle.setAttribute('aria-label', language === 'en' ? 'Switch language' : '言語を切り替える');
    const back = document.querySelector('#prep-back');
    back.textContent = t('back');
    back.href = /^LK-\d{4}$/.test(playerId) ? `player.html?id=${encodeURIComponent(playerId)}#opponents` : 'index.html#players';
    const { cards, focus } = state === 'results' ? renderCards() : { cards:[], focus:null };
    app.innerHTML = `<header class="feedback-hero"><div><p class="eyebrow">${t('eyebrow')}</p><h1>${t('title')}</h1><p>${t('intro')}</p><p class="opponent-prep-selected">${t('owner')}: ${escape(playerId)} · ${t('selected')}: ${escape(opponentId)}</p><a class="opponent-prep-back" href="${escape(back.href)}">${t('back')}</a></div></header>
      <section class="opponent-prep-notice"><p>${t('private')}</p><p>${t('limits')}</p><p>${t('local')}</p></section>
      ${!validContext ? `<p class="opponent-prep-message" role="alert">${t('badContext')}</p>` : state === 'loading' ? `<section class="opponent-prep-access"><p role="status">${t('loading')}</p><button type="button" id="prep-cancel">${t('cancel')}</button></section>` : state === 'login' ? `<section class="opponent-prep-access"><h2>${t('signIn')}</h2><p>${t('loginHint')}</p>${message ? `<p role="alert">${t(message)}</p>` : ''}<form id="prep-login"><input type="hidden" name="username" value="${escape(playerId)}" autocomplete="username"><label>${t('password')}<input name="password" type="password" autocomplete="current-password" maxlength="128" required></label><button class="gold-button" type="submit">${t('submit')}</button></form></section>` : state === 'results' ? `<section class="opponent-prep-actions"><button type="button" id="prep-hide">${t('hide')}</button></section>${cards.length ? `<section class="opponent-prep-plan"><h2>${t('next')}</h2>${focus ? `<div class="opponent-prep-focus"><strong>${t('focus')}</strong><p>${escape(focus.text)}</p><a href="${escape(focus.link)}">${escape(focus.date)} · ${t('source')}</a></div>` : `<p>${t('noFocus')}</p>`}<ol><li>${t('step1')}</li><li>${t('step2')}</li><li>${t('step3')}</li></ol></section><section class="opponent-prep-evidence"><h2>${t('takeaways')}</h2><p>${t('method')}</p>${cards.join('')}</section>` : `<p class="opponent-prep-message" role="status">${t('noNotes')}</p>`}` : `<section class="opponent-prep-access">${message ? `<p role="alert">${t(message)}</p>` : ''}<button class="gold-button" type="button" id="prep-open">${t(message ? 'retry' : 'open')}</button></section>`}`;
    app.querySelector('#prep-open')?.addEventListener('click', open);
    app.querySelector('#prep-cancel')?.addEventListener('click', clearPrivate);
    app.querySelector('#prep-hide')?.addEventListener('click', clearPrivate);
    app.querySelector('#prep-login')?.addEventListener('submit', signIn);
  }

  function begin() {
    generation += 1;
    controller?.abort();
    controller = new AbortController();
    state = 'loading'; message = ''; render();
    return { id: generation, signal: controller.signal };
  }
  function check(run) {
    if (run.id !== generation || run.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  }
  function clearPrivate() {
    generation += 1; controller?.abort(); controller = null;
    token = ''; records = []; state = 'ready'; message = ''; render();
  }
  async function request(path, run, options = {}) {
    check(run);
    const url = new URL(`${window.LK_API_BASE.replace(/\/$/, '')}${path}`);
    url.searchParams.set('environment', environment);
    if (options.date) url.searchParams.set('date', options.date);
    const requestController = new AbortController(), abort = () => requestController.abort();
    run.signal.addEventListener('abort', abort, { once:true });
    const timeout = setTimeout(abort, 25000);
    try {
      const response = await fetch(url, { method: options.method || 'GET', cache: 'no-store', signal: requestController.signal,
        headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
      const result = await response.json(); check(run);
      if (!response.ok || !result.ok) throw Object.assign(new Error('Private request failed'), { status: response.status });
      return result;
    } finally { clearTimeout(timeout); run.signal.removeEventListener('abort', abort); }
  }
  async function verify(candidate, run) {
    const result = await request('/api/reflections/session', run, { token: candidate });
    if (result.player?.playerId !== playerId) throw Object.assign(new Error('Different player'), { status: 403 });
  }
  function handleFailure(error, run, attemptedToken = '') {
    if (run.id !== generation || run.signal.aborted) return;
    controller?.abort(); controller = null; token = ''; records = [];
    if (error.status === 401 || error.status === 403 || error.status === 429) {
      if (error.status === 401 && attemptedToken && localStorage.getItem(storageKey) === attemptedToken) localStorage.removeItem(storageKey);
      state = 'login'; message = error.status === 403 ? 'mismatch' : error.status === 429 ? 'rate' : attemptedToken ? 'expired' : 'invalid';
    } else { state = 'ready'; message = 'unavailable'; }
    render();
  }
  async function open() {
    if (!validContext) return;
    const remembered = localStorage.getItem(storageKey) || '';
    if (!remembered) { state = 'login'; message = ''; render(); return; }
    const run = begin();
    try { await verify(remembered, run); token = remembered; await load(run); }
    catch (error) { handleFailure(error, run, remembered); }
  }
  async function signIn(event) {
    event.preventDefault();
    const input = event.currentTarget.elements.password, password = input.value; input.value = '';
    const run = begin();
    try {
      const result = await request('/api/reflections/login', run, { method: 'POST', body: { playerId, password } });
      if (result.player?.playerId !== playerId || typeof result.token !== 'string') throw Object.assign(new Error('Different player'), { status: 403 });
      token = result.token; await verify(token, run); await load(run);
    } catch (error) { handleFailure(error, run); }
  }
  async function load(run) {
    const history = await request('/api/reflections/dates', run, { token });
    if (!Array.isArray(history.dates)) throw new Error('Invalid response');
    const saved = new Set(history.dates), dates = candidateDates.filter(date => saved.has(date));
    const byDate = new Array(dates.length); let next = 0;
    const worker = async () => {
      while (next < dates.length) {
        const index = next++, date = dates[index];
        const day = await request('/api/reflections/day', run, { token, date });
        if (day.date !== date || !Array.isArray(day.matches) || !day.document?.fields) throw new Error('Invalid response');
        byDate[index] = day.matches.filter(match => match.opponentId === opponentId && ['training', 'tournament'].includes(match.source) && typeof match.key === 'string' && match.key.startsWith(`${match.source}:`) && /^(?:training|tournament):[A-Za-z0-9_-]+$/.test(match.key)).map(match => ({
          date, key: match.key, source: match.source, result: match.result,
          score: /^\d+\s*-\s*\d+$/.test(String(match.score || '')) ? match.score : '',
          opponentName: match.opponentName || opponentId, opponentEnglishName: match.opponentEnglishName || '',
          // Keep only this owner's selected match fields in memory, never the full day.
          fields: Object.fromEntries(['en', 'ja'].map(lang => [`match.${match.key}.${lang}`, day.document.fields[`match.${match.key}.${lang}`]]))
        }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, dates.length) }, worker)); check(run);
    records = byDate.flat(); state = 'results'; controller = null; render();
  }
  document.querySelector('#language-toggle').addEventListener('click', async () => {
    language = language === 'en' ? 'ja' : 'en'; localStorage.setItem('lk-language', language);
    if (state !== 'results' || !token) { if (state === 'loading') clearPrivate(); else render(); return; }
    // Hide old text while the server revalidates the player before a language switch.
    const candidate = token, run = begin();
    try { await verify(candidate, run); check(run); state = 'results'; controller = null; render(); }
    catch (error) { handleFailure(error, run, candidate); }
  });
  window.addEventListener('pagehide', clearPrivate);
  window.addEventListener('pageshow', event => { if (event.persisted) clearPrivate(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearPrivate(); });
  window.addEventListener('storage', event => { if (event.key === storageKey && event.oldValue !== event.newValue) clearPrivate(); });
  render();
})();
