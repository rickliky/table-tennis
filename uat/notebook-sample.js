(() => {
  'use strict';
  // Standalone, fictional examples. No API client, authentication, or notebook
  // storage is used here; only the shared interface-language preference persists.
  const app = document.querySelector('#notebook-sample-app');
  const Rich = window.LKNotebookRich;
  const Translation = window.LKNotebookTranslation;
  let editors = [];
  let language = localStorage.getItem('lk-language') === 'en' ? 'en' : 'ja', mode = 'read', day = 'daily';
  const words = {
    en: {
      title: 'Sample Player Notebook', badge: 'MOCK DATA ONLY', intro: 'Explore daily reflections, match notes, and coach advice with a fictional player.',
      warning: 'Demo only — changes are not saved. Please do not enter personal or private information.',
      back: 'Player notebooks', player: 'Sample Player', sampleDay: 'Sample day', dailyDay: '2026-10-10 (Saturday) — daily practice', matchDay: '2026-10-11 (Sunday) — match practice', restDay: '2026-10-09 (Friday) — rest day',
      mode: 'Notebook mode', write: 'Write', read: 'Read', readHint: 'Read-only view. Choose Write to try the expanding text boxes.', reset: 'Reset examples',
      daily: 'Daily reflection', matches: 'Recorded matches', coach: 'Coach feedback', coachHint: 'Advice received from the coach. This is a fictional example, not a verified coach evaluation.',
      english: 'English original', japanese: 'Japanese version', coachJapanese: 'Japanese original', coachEnglish: 'English version',
      activity: 'Activity', blank: 'Not written', opponentA: 'Sample Opponent A', opponentB: 'Sample Opponent B', training: 'Training · fictional match', win: 'Win', loss: 'Loss',
      rest: 'Friday — no practice or reflection needed.', privacyTitle: 'How real notebooks work', privacy: 'A real notebook requires the player’s own password. The player and club administrators can read it; other members and Approvers cannot. This preview contains only mock data.',
      manual: 'Language versions are entered manually. This preview does not use a translation service.', invitation: 'Want to try private reflections? Setup is easy — just let Jacelyn and Kaitlyn’s daddy know.',
      demoNotice: 'Translation preview: fixed fictional examples only. This is not AI translation; nothing is sent or saved. Do not enter private information.',
      demoJapanese: 'Demo: preview Japanese', demoEnglish: 'Demo: preview English', demoReview: 'Fictional translation preview',
      demoReviewHint: 'This is a prewritten example, not a translation of your typing. Using it replaces this sample language version; the original stays unchanged.',
      demoApply: 'Use this example', demoCancel: 'Cancel', demoStale: 'The source or destination changed. Cancel and preview again before replacing it.',
      demoResetSource: 'This fixed example requires the original sample text. Reset the examples to try it again.', demoApplied: 'Example applied in this preview only. Nothing was sent or saved.'
    },
    ja: {
      title: '選手ノートのサンプル', badge: '架空のデータのみ', intro: '架空の選手の例で、1日の振り返り・試合メモ・コーチのアドバイスを体験できます。',
      warning: 'デモ専用 — 変更は保存されません。個人情報やプライベートな内容は入力しないでください。',
      back: 'ノート一覧', player: 'サンプル選手', sampleDay: 'サンプルの日付', dailyDay: '2026-10-10（土曜日）— 通常練習', matchDay: '2026-10-11（日曜日）— 試合練習', restDay: '2026-10-09（金曜日）— お休み',
      mode: 'ノートの表示', write: '書く', read: '読む', readHint: '閲覧専用です。「書く」で文章に合わせて広がる入力欄を試せます。', reset: 'サンプルをリセット',
      daily: '1日の振り返り', matches: '登録済み試合', coach: 'コーチのアドバイス', coachHint: 'コーチから受けたアドバイスの欄です。これは架空の例で、確認済みのコーチ評価ではありません。',
      english: '英語の原文', japanese: '日本語版', coachJapanese: '日本語の原文', coachEnglish: '英語版',
      activity: '活動内容', blank: '未記入', opponentA: 'サンプル対戦相手A', opponentB: 'サンプル対戦相手B', training: '練習 · 架空の試合', win: '勝ち', loss: '負け',
      rest: '金曜日 — 練習・振り返りはお休みです。', privacyTitle: '実際のノートの使い方', privacy: '実際のノートには本人の選手パスワードが必要です。本人とクラブ管理者が読めます。他のメンバーや承認者は読めません。このサンプルは架空のデータだけを使っています。',
      manual: '各言語の文章は手入力です。このサンプルは翻訳サービスを使いません。', invitation: 'プライベートな振り返りを試してみませんか？設定は簡単です。ジェイスとケイツのお父さんに声をかけてください。',
      demoNotice: '翻訳プレビューは、あらかじめ用意した架空の例だけです。AI翻訳ではなく、送信・保存もされません。個人情報は入力しないでください。',
      demoJapanese: 'デモ：日本語の例を見る', demoEnglish: 'デモ：英語の例を見る', demoReview: '架空の翻訳プレビュー',
      demoReviewHint: 'これは事前に用意した例で、入力した文章の翻訳ではありません。「この例を使う」とサンプルの言語版を置き換えます。原文は変わりません。',
      demoApply: 'この例を使う', demoCancel: 'キャンセル', demoStale: '原文または翻訳先が変更されました。キャンセルしてから、もう一度プレビューしてください。',
      demoResetSource: 'この例を使うには、元のサンプル文章が必要です。サンプルをリセットして再度お試しください。', demoApplied: 'このプレビュー内で例を適用しました。送信・保存はされていません。'
    }
  };
  const examples = {
    daily: {
      'daily.en': Rich.practiceTemplate('LK-0080', '2026-10-10'),
      'daily.ja': '今日はバックからフォアへの切り替えを練習しました。先に足を動かすと、次のボールを打ちやすくなりました。\n\n次の練習では、1球打つごとに基本姿勢に戻ることを意識したいです。',
      'coach.ja': { format: 'lk-rich-v1', ops: [{ insert: '基本姿勢', attributes: { bold: true } }, { insert: '：ボールを打った後、すぐに戻りましょう。' }, { insert: '\n', attributes: { list: 'ordered' } }, { insert: '焦らず、小さな足の動きで次のボールに備えましょう。' }, { insert: '\n', attributes: { list: 'ordered' } }] },
      'coach.en': { format: 'lk-rich-v1', ops: [{ insert: 'Ready position', attributes: { bold: true } }, { insert: ': return soon after hitting the ball.' }, { insert: '\n', attributes: { list: 'ordered' } }, { insert: 'Stay calm', attributes: { italic: true } }, { insert: ' and use small steps to prepare for the next ball.' }, { insert: '\n', attributes: { list: 'ordered' } }] }
    },
    matches: {
      'daily.en': 'I tried to remember my ready position between points.', 'daily.ja': 'ポイントの間に、基本姿勢を意識しました。',
      'match.a.en': 'I returned short serves more carefully in this match. I sometimes rushed when the score was close.\n\nNext time, I want to take one calm breath before receiving.',
      'match.a.ja': 'この試合では短いサーブを丁寧に返せました。競った場面では、少し焦ることがありました。\n\n次はレシーブの前に、一度落ち着いて呼吸したいです。',
      'match.b.en': Rich.matchTemplate({ englishName: 'Sample Player' }, { opponentEnglishName: 'Sample Opponent B', score: '1-3' }),
      'match.b.ja': '長いサーブのレシーブが難しかったです。相手が打つ瞬間をよく見ると、うまく返せました。\n\n次の練習で、長いサーブのレシーブを練習したいです。',
      'coach.ja': '1. サーブの長さをよく見て、足を動かしましょう。\n\n2. 競った場面でも、いつもの準備を大切にしましょう。',
      'coach.en': '1. Watch the length of the serve and move your feet.\n\n2. Keep your usual preparation routine, even when the score is close.'
    },
    rest: {}
  };
  // Canned outputs are available only for their unchanged, fictional sources.
  // This demo never calls a translator or sends the text entered in an editor.
  const demoPairs = {
    daily: { 'coach.en': 'coach.ja' },
    matches: { 'daily.ja': 'daily.en', 'match.a.ja': 'match.a.en', 'coach.en': 'coach.ja' }
  };
  let documents = structuredClone(examples), translationPreview = null, translationSession = null;
  const t = key => words[language][key];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  function demoControl(key) {
    if (!demoPairs[day]?.[key]) return '';
    return `<div class="notebook-translation-demo" data-demo-translation="${escapeHtml(key)}"><button type="button" data-demo-preview="${escapeHtml(key)}">${t(key.endsWith('.ja') ? 'demoJapanese' : 'demoEnglish')}</button><p data-demo-message role="status" aria-live="polite"></p><div data-demo-review hidden></div></div>`;
  }
  function field(key, label) {
    const value = documents[day][key] || '';
    return mode === 'write'
      ? `<section class="notebook-field"><span>${t(label)}</span><div data-sample-host="${key}" data-rich-label="${t(label)}"></div>${demoControl(key)}</section>`
      : `<section class="notebook-read-field"><h3>${t(label)}</h3>${typeof value === 'string' ? `<p data-sample-read="${key}">${escapeHtml(value || t('blank'))}</p>` : `<div data-sample-read="${key}" class="notebook-rich-content">${Rich.html(value)}</div>`}</section>`;
  }
  const reflection = prefix => `<div class="notebook-bilingual">${field(`${prefix}.en`, 'english')}${field(`${prefix}.ja`, 'japanese')}</div>`;
  function closeTranslationPreview() {
    translationSession?.cancel(); translationSession = null;
    translationPreview = null;
    app.querySelectorAll('[data-demo-review]').forEach(node => { node.hidden = true; node.replaceChildren(); });
  }
  function refreshTranslationPreview() {
    if (!translationPreview) return;
    const { container } = translationPreview;
    const stale = !translationSession?.canAccept();
    container.querySelector('[data-demo-stale]').textContent = stale ? t('demoStale') : '';
    container.querySelector('[data-demo-apply]').disabled = stale;
  }
  function bindTranslationPreview() {
    app.querySelectorAll('[data-demo-preview]').forEach(button => button.onclick = async () => {
      if (editors.some(editor => editor.composing)) return;
      const target = button.dataset.demoPreview, source = demoPairs[day]?.[target], container = button.parentElement;
      closeTranslationPreview();
      app.querySelectorAll('[data-demo-message]').forEach(node => { node.textContent = ''; });
      if (!source || !equal(documents[day][source], examples[day][source])) {
        container.querySelector('[data-demo-message]').textContent = t('demoResetSource'); return;
      }
      const fixtureDay = day, direction = target.endsWith('.ja') ? 'en-ja' : 'ja-en';
      const session = translationSession = Translation.create({
        read: key => documents[day][key] || '', context: () => `${day}:${mode}`,
        request: async request => {
          if (day !== fixtureDay || request.direction !== direction || !equal(documents[day][source], examples[day][source]) || request.text !== Rich.text(examples[day][source])) throw new Error('Only unchanged fictional examples are available');
          return structuredClone(examples[day][target]);
        },
        apply: (targetKey, candidate) => {
          const editor = editors.find(item => item.root.getAttribute('data-sample-field') === targetKey);
          if (!editor) throw new Error('Sample editor unavailable');
          editor.quill.history.cutoff(); editor.quill.setContents(Rich.delta(candidate), 'user'); editor.quill.history.cutoff();
        }
      });
      const result = await session.preview({ sourceKey: source, targetKey: target, direction });
      if (session !== translationSession || !container.isConnected || result.status === 'cancelled') return;
      if (result.status !== 'ready') { container.querySelector('[data-demo-message]').textContent = t(result.status === 'stale' ? 'demoStale' : 'demoResetSource'); return; }
      translationPreview = { candidate: result.value, container };
      const review = container.querySelector('[data-demo-review]');
      review.innerHTML = `<section class="notebook-translation-review" role="region" aria-label="${t('demoReview')}"><h4>${t('demoReview')}</h4><p>${t('demoReviewHint')}</p><div class="notebook-rich-content">${Rich.html(translationPreview.candidate)}</div><p data-demo-stale role="status" aria-live="polite"></p><div class="notebook-translation-actions"><button type="button" data-demo-apply>${t('demoApply')}</button><button type="button" data-demo-cancel>${t('demoCancel')}</button></div></section>`;
      review.hidden = false;
      container.querySelector('[data-demo-cancel]').onclick = () => { closeTranslationPreview(); button.focus({ preventScroll: true }); };
      container.querySelector('[data-demo-apply]').onclick = () => {
        if (!translationPreview || editors.some(editor => editor.composing)) return;
        refreshTranslationPreview();
        if (container.querySelector('[data-demo-apply]').disabled) return;
        if (session.accept().status !== 'applied') return;
        closeTranslationPreview();
        container.querySelector('[data-demo-message]').textContent = t('demoApplied'); button.focus({ preventScroll: true });
      };
      container.querySelector('[data-demo-apply]').focus({ preventScroll: true });
    });
  }
  function render() {
    translationSession?.cancel(); translationSession = null;
    translationPreview = null;
    editors.forEach(editor => editor.dispose()); editors = [];
    document.documentElement.lang = language;
    document.querySelector('#language-toggle').textContent = language === 'en' ? '日本語' : 'ENGLISH';
    document.querySelector('#sample-back').textContent = t('back');
    app.innerHTML = `<header class="feedback-hero"><div><p class="eyebrow">${t('badge')}</p><h1>${t('title')}</h1><p>${t('intro')}</p></div><details open class="notebook-privacy"><summary>${t('privacyTitle')}</summary><p>${t('privacy')}</p></details></header>
      <div class="notebook-identity"><strong>${t('player')}</strong><button type="button" id="sample-reset">${t('reset')}</button></div><p class="notebook-notice">${t('manual')} ${window.LKNotebookEditor.hint(language)}</p><p class="notebook-translation-notice">${t('demoNotice')}</p>
      <div class="notebook-dates"><label>${t('sampleDay')}<select id="sample-day">${['daily', 'matches', 'rest'].map(value => `<option value="${value}" ${value === day ? 'selected' : ''}>${t(value === 'daily' ? 'dailyDay' : value === 'matches' ? 'matchDay' : 'restDay')}</option>`).join('')}</select></label></div>
      <div class="notebook-modes" role="group" aria-label="${t('mode')}">${['write', 'read'].map(value => `<button type="button" data-sample-mode="${value}" aria-pressed="${mode === value}">${t(value)}</button>`).join('')}</div>${mode === 'read' ? `<p class="notebook-read-hint">${t('readHint')}</p>` : ''}
      <div class="notebook-savebar notebook-demo-warning" role="status">${t('warning')}</div><section class="notebook-day">${day === 'rest' ? `<section class="notebook-entry"><h2>${t('rest')}</h2></section>` : `
      <section id="sample-daily" class="notebook-entry"><h2>${t('daily')}</h2>${reflection('daily')}</section>
      ${day === 'matches' ? `<section class="notebook-matches"><h2>${t('matches')} · 2</h2>${['a', 'b'].map((value, index) => `<article class="notebook-match"><header class="notebook-match-heading"><small>${t('training')}</small>${window.LKNotebookMatch.render({ score: index ? '1-3' : '3-2', result: index ? 'loss' : 'win', opponentName: words.ja[index ? 'opponentB' : 'opponentA'], opponentEnglishName: words.en[index ? 'opponentB' : 'opponentA'] }, { displayName: words.ja.player, englishName: words.en.player }, language)}</header>${reflection(`match.${value}`)}</article>`).join('')}</section>` : ''}
      <section class="notebook-entry"><h2>${t('coach')}</h2><p>${t('coachHint')}</p><div class="notebook-bilingual">${field('coach.ja', 'coachJapanese')}${field('coach.en', 'coachEnglish')}</div></section>`}</section>
      <aside class="notebook-invitation"><h2>${t('invitation')}</h2><a class="notebook-preview-link" href="feedback.html">${t('back')} <span aria-hidden="true">→</span></a></aside>`;
    app.querySelectorAll('[data-sample-host]').forEach(host => {
      const key = host.dataset.sampleHost;
      editors.push(window.LKNotebookEditor.mount({ host, label: host.dataset.richLabel, language, field: key, attribute: 'data-sample-field', value: documents[day][key] || '', onChange: value => { documents[day][key] = value; refreshTranslationPreview(); } }));
    });
    bindTranslationPreview();
    app.querySelector('#sample-day').onchange = event => { if (editors.some(editor => editor.composing)) { event.target.value = day; return; } day = event.target.value; render(); };
    app.querySelectorAll('[data-sample-mode]').forEach(button => button.onclick = () => { if (editors.some(editor => editor.composing)) return; mode = button.dataset.sampleMode; render(); app.querySelector(`[data-sample-mode="${mode}"]`).focus({ preventScroll: true }); });
    app.querySelector('#sample-reset').onclick = () => { documents = structuredClone(examples); render(); app.querySelector('#sample-reset').focus({ preventScroll: true }); };
    chromeObserver.disconnect(); chromeObserver.observe(document.querySelector('.site-header')); chromeObserver.observe(app.querySelector('.notebook-savebar'));
  }
  const chromeObserver = new ResizeObserver(entries => entries.forEach(entry => app.style.setProperty(entry.target.classList.contains('site-header') ? '--notebook-header-height' : '--notebook-savebar-height', `${Math.ceil(entry.target.getBoundingClientRect().height)}px`)));
  document.querySelector('#language-toggle').onclick = () => { if (editors.some(editor => editor.composing)) return; language = language === 'en' ? 'ja' : 'en'; localStorage.setItem('lk-language', language); render(); };
  render();
})();
