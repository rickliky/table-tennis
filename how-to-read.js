(() => {
  'use strict';

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  })[character]);

  const labelsFor = language => language === 'en' ? {
    eyebrow:'HOW TO READ & USE',
    summary:'How to read & use',
    read:'1 · READ THE DATA',
    action:'2 · USE IT FOR',
    limit:'3 · DO NOT CONCLUDE',
    close:'Close how-to-read guide'
  } : {
    eyebrow:'見方・使い方ガイド',
    summary:'見方・使い方',
    read:'1 · データの読み方',
    action:'2 · 活用方法',
    limit:'3 · 判断できないこと',
    close:'見方・使い方ガイドを閉じる'
  };

  const normalize = (guide, language) => {
    if (!guide) return null;
    const labels = labelsFor(language);
    if (Array.isArray(guide)) {
      return {
        title:guide[0],
        intro:language === 'en' ? 'Use the recorded evidence as a starting point for review.' : '登録された情報を振り返りの出発点として使います。',
        read:[guide[1]],
        action:language === 'en' ? 'Open the underlying matches and choose one practical question or next action.' : '元の試合を確認し、実行できる問いや次の行動を1つ選んでください。',
        limit:language === 'en' ? 'Do not use this view alone to grade ability, explain a cause, or predict a future result.' : 'この画面だけで実力を評価したり、原因を断定したり、今後の結果を予測したりしないでください。'
      };
    }
    const points = Array.isArray(guide.read) ? guide.read : Array.isArray(guide.points) ? guide.points : [];
    return {
      title:guide.title || labels.summary,
      intro:guide.intro || '',
      read:points,
      action:guide.action || (language === 'en' ? 'Use the evidence to choose one practical next action.' : '記録をもとに、実行できる次の行動を1つ選んでください。'),
      limit:guide.limit || (language === 'en' ? 'Do not treat this view alone as a complete evaluation or prediction.' : 'この画面だけを完全な評価や予測として扱わないでください。')
    };
  };

  const content = (guide, language) => {
    const item = normalize(guide, language);
    if (!item) return '';
    const labels = labelsFor(language);
    return `<div class="guide-content"><header class="guide-intro"><p class="eyebrow">${labels.eyebrow}</p><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.intro)}</p></header><section class="guide-read"><h3>${labels.read}</h3><ul>${item.read.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul></section><section class="guide-action"><h3>${labels.action}</h3><p>${escapeHtml(item.action)}</p></section><section class="guide-limit"><h3>${labels.limit}</h3><p>${escapeHtml(item.limit)}</p></section></div>`;
  };

  const details = (guide, language, className = '') => {
    const labels = labelsFor(language);
    return `<details class="data-guide ${className}"><summary><span aria-hidden="true">▣</span>${labels.summary}</summary>${content(guide, language)}</details>`;
  };

  const showDialog = (dialog, guide, language) => {
    if (!dialog) return;
    const labels = labelsFor(language);
    const target = dialog.querySelector('[id$="-content"]') || dialog.querySelector('.how-to-read-content');
    if (!target) return;
    target.innerHTML = content(guide, language);
    const close = dialog.querySelector('.modal-close');
    if (close) close.setAttribute('aria-label', labels.close);
    dialog.showModal();
  };

  const toggleInline = (container, guide, language) => {
    if (!container) return;
    let panel = container.querySelector(':scope > .inline-how-to-read');
    if (panel) { panel.hidden = !panel.hidden; return; }
    panel = document.createElement('section');
    panel.className = 'inline-how-to-read';
    panel.innerHTML = content(guide, language);
    container.append(panel);
  };

  window.LKHowToRead = { content, details, labelsFor, normalize, showDialog, toggleInline };
})();
