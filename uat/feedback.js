(() => {
  'use strict';

  const app = document.querySelector('#feedback-app');
  let data;
  let language = localStorage.getItem('lk-language') || 'ja';
  const params = new URLSearchParams(location.search);
  let selectedPlayerId = params.get('player') || '';
  let selectedDate = params.get('date') || '';
  const words = {
    en: {
      eyebrow:'PLAYER VOICE', title:'Player Reflection', subtitle:'Capture one honest learning point after club training.', notice:'Self-feedback is the player’s own reflection, not a coach evaluation, official score, or attendance record.', player:'Your name', date:'Training date', effort:'Effort', confidence:'Confidence', low:'Low', high:'High', wentWell:'What went well?', wentPlaceholder:'One thing you did well or understood better.', nextFocus:'What will you focus on next?', focusPlaceholder:'Choose one clear action for the next training session.', note:'Anything else?', notePlaceholder:'Optional note, question, or feeling.', submit:'Submit for approval', update:'Update reflection', pending:'Submitting...', success:'Your reflection was submitted for approval. It will appear after review.', failure:'The reflection could not be submitted.', login:'Your access session has expired. Sign in again to submit.', reauth:'Sign in again', recent:'Approved reflections', noFeedback:'No approved reflections yet.', select:'Select your name', members:'Approved reflections are visible to all club members.', scale:'1 = low · 5 = high', editHint:'Selecting an approved player/date reflection lets you submit an update for approval.', matches:'recorded matches', unverified:'Individual identity is not verified; please select only your own name.'
    },
    ja: {
      eyebrow:'選手の声', title:'選手振り返り', subtitle:'クラブ練習後に、正直な学びを1つ残しましょう。', notice:'自己振り返りは選手本人の感想です。コーチ評価・公式スコア・出席記録ではありません。', player:'自分の名前', date:'練習日', effort:'がんばり度', confidence:'自信', low:'低い', high:'高い', wentWell:'うまくできたこと', wentPlaceholder:'できたこと、前より分かったことを1つ書いてください。', nextFocus:'次に意識すること', focusPlaceholder:'次の練習で行うことを1つ決めてください。', note:'その他', notePlaceholder:'任意のメモ、質問、気持ちなど。', submit:'承認申請する', update:'振り返りを更新申請', pending:'送信中…', success:'振り返りを承認申請しました。確認後に表示されます。', failure:'振り返りを送信できませんでした。', login:'アクセス認証の期限が切れました。再ログインして送信してください。', reauth:'再ログイン', recent:'承認済み振り返り', noFeedback:'承認済みの振り返りはまだありません。', select:'自分の名前を選択', members:'承認された振り返りはクラブメンバー全員に表示されます。', scale:'1 = 低い · 5 = 高い', editHint:'承認済みの選手・日付を選ぶと、更新を承認申請できます。', matches:'登録試合', unverified:'本人確認機能はありません。必ず自分の名前だけを選んでください。'
    }
  };
  const t = key => words[language][key];
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
  const trainingMatches = () => (data.matches || []).filter(match => /club|training|練習/i.test(`${match.event || ''} ${match.division || ''}`));
  const dates = () => [...new Set(trainingMatches().map(match => match.matchDate).filter(Boolean))].sort().reverse();
  const feedback = () => data.sessionFeedback || [];
  const playerName = id => (data.players || []).find(player => player.playerId === id)?.displayName || id;
  const feedbackId = (playerId,date) => `FB-${String(date).replace(/-/g,'')}-${playerId}`;
  const rating = (name,label,value=0) => `<fieldset class="feedback-rating"><legend>${label}<small>${t('scale')}</small></legend><div>${[1,2,3,4,5].map(score => `<label><input type="radio" name="${name}" value="${score}" ${Number(value)===score?'checked':''} required><span>${score}</span></label>`).join('')}</div><p><span>${t('low')}</span><span>${t('high')}</span></p></fieldset>`;

  function renderHistory() {
    const target = document.querySelector('#feedback-history-list');
    if (!target) return;
    const records = [...feedback()].filter(item => !selectedPlayerId || item.playerId === selectedPlayerId).sort((a,b) => `${b.sessionDate}${b.updatedAt || b.submittedAt || ''}`.localeCompare(`${a.sessionDate}${a.updatedAt || a.submittedAt || ''}`)).slice(0,12);
    target.innerHTML = records.map(item => `<article class="feedback-card"><header><div><a href="player.html?id=${encodeURIComponent(item.playerId)}">${escapeHtml(item.playerName || playerName(item.playerId))}</a><small>${escapeHtml(item.sessionDate)}</small></div><span><b>${item.effort}</b><small>${t('effort')}</small></span><span><b>${item.confidence}</b><small>${t('confidence')}</small></span></header><section><div><small>${t('wentWell')}</small><p>${escapeHtml(item.wentWell)}</p></div><div><small>${t('nextFocus')}</small><p>${escapeHtml(item.nextFocus)}</p></div>${item.note?`<div><small>${t('note')}</small><p>${escapeHtml(item.note)}</p></div>`:''}</section></article>`).join('') || `<p class="empty">${t('noFeedback')}</p>`;
  }

  function syncForm() {
    const form = document.querySelector('#feedback-form');
    selectedPlayerId = form.elements.playerId.value;
    selectedDate = form.elements.sessionDate.value;
    const existing = feedback().find(item => item.feedbackId === feedbackId(selectedPlayerId,selectedDate));
    ['effort','confidence'].forEach(field => form.querySelectorAll(`[name="${field}"]`).forEach(input => { input.checked = Number(existing?.[field]) === Number(input.value); }));
    form.elements.wentWell.value = existing?.wentWell || '';
    form.elements.nextFocus.value = existing?.nextFocus || '';
    form.elements.note.value = existing?.note || '';
    form.querySelector('[type="submit"]').textContent = existing ? t('update') : t('submit');
    form.dataset.action = existing ? 'update' : 'create';
    document.querySelector('#feedback-recorded-context').textContent = selectedPlayerId && selectedDate ? `${trainingMatches().filter(match => match.matchDate===selectedDate&&(match.player1Id===selectedPlayerId||match.player2Id===selectedPlayerId)).length} ${t('matches')}` : '';
    history.replaceState(null,'',`feedback.html${selectedPlayerId||selectedDate?`?${new URLSearchParams({...(selectedPlayerId?{player:selectedPlayerId}:{}),...(selectedDate?{date:selectedDate}:{})})}`:''}`);
    renderHistory();
  }

  function render() {
    document.documentElement.lang = language;
    document.querySelector('#language-toggle').textContent = language === 'en' ? '日本語' : 'ENGLISH';
    document.querySelector('#feedback-nav-home').textContent = language === 'en' ? 'Home' : 'ホーム';
    document.querySelector('#feedback-nav-players').textContent = language === 'en' ? 'Players' : '選手';
    document.querySelector('#feedback-nav-sessions').textContent = language === 'en' ? 'Sessions' : 'セッション';
    const players = [...(data.players || [])].sort((a,b)=>(a.displayName||'').localeCompare(b.displayName||'','ja'));
    const dateOptions = dates();
    if (!dateOptions.includes(selectedDate)) selectedDate = dateOptions[0] || '';
    if (!players.some(player => player.playerId === selectedPlayerId)) selectedPlayerId = '';
    const existing = feedback().find(item => item.feedbackId === feedbackId(selectedPlayerId,selectedDate));
    app.innerHTML = `<section class="feedback-hero"><div><p class="eyebrow">${t('eyebrow')}</p><h1>${t('title')}</h1><span>${t('subtitle')}</span></div><aside>${t('notice')}</aside></section><section class="feedback-layout"><form id="feedback-form" class="feedback-form" data-action="${existing?'update':'create'}"><p class="feedback-visibility">${t('members')}</p><p class="feedback-identity-note">${t('unverified')}</p><div class="feedback-selectors"><label><span>${t('player')}</span><select name="playerId" required><option value="">${t('select')}</option>${players.map(player=>`<option value="${player.playerId}" ${player.playerId===selectedPlayerId?'selected':''}>${escapeHtml(player.displayName)}${player.englishName?` · ${escapeHtml(player.englishName)}`:''}</option>`).join('')}</select></label><label><span>${t('date')}</span><select name="sessionDate" required>${dateOptions.map(date=>`<option value="${date}" ${date===selectedDate?'selected':''}>${date}</option>`).join('')}</select><small id="feedback-recorded-context"></small></label></div><div class="feedback-rating-grid">${rating('effort',t('effort'),existing?.effort)}${rating('confidence',t('confidence'),existing?.confidence)}</div><label class="feedback-text"><span>${t('wentWell')}</span><textarea name="wentWell" maxlength="500" required placeholder="${t('wentPlaceholder')}">${escapeHtml(existing?.wentWell||'')}</textarea></label><label class="feedback-text"><span>${t('nextFocus')}</span><textarea name="nextFocus" maxlength="500" required placeholder="${t('focusPlaceholder')}">${escapeHtml(existing?.nextFocus||'')}</textarea></label><label class="feedback-text"><span>${t('note')}</span><textarea name="note" maxlength="1000" placeholder="${t('notePlaceholder')}">${escapeHtml(existing?.note||'')}</textarea></label><p class="feedback-edit-hint">${t('editHint')}</p><div class="feedback-submit"><button class="gold-button" type="submit">${existing?t('update'):t('submit')}</button><button id="feedback-reauth" class="ghost-button" type="button" hidden>${t('reauth')}</button><p id="feedback-status" role="status"></p></div></form><section class="feedback-history"><div class="section-title"><div><p>${t('eyebrow')}</p><h2>${t('recent')}</h2></div></div><div id="feedback-history-list"></div></section></section>`;
    const form = document.querySelector('#feedback-form'), status = document.querySelector('#feedback-status'), submit = form.querySelector('[type="submit"]'), reauth = document.querySelector('#feedback-reauth');
    form.elements.playerId.onchange = syncForm; form.elements.sessionDate.onchange = syncForm;
    reauth.onclick = () => { localStorage.removeItem('lk-internal-access-until'); localStorage.removeItem('lk-site-session'); location.reload(); };
    form.onsubmit = async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      if (!values.playerId || !values.sessionDate) return;
      const id = feedbackId(values.playerId,values.sessionDate), current = feedback().find(item => item.feedbackId === id), now = new Date().toISOString();
      const record = { feedbackId:id, playerId:values.playerId, playerName:playerName(values.playerId), sessionDate:values.sessionDate, sessionId:`LKS-${values.sessionDate.replace(/-/g,'')}`, effort:Number(values.effort), confidence:Number(values.confidence), wentWell:String(values.wentWell||'').trim(), nextFocus:String(values.nextFocus||'').trim(), note:String(values.note||'').trim(), visibility:'members', createdAt:current?.createdAt||now, updatedAt:now };
      submit.disabled = true; status.textContent = t('pending'); reauth.hidden = true;
      try {
        await window.LKData.request('/api/change',{method:'POST',body:JSON.stringify({entityType:'sessionFeedback',targetId:id,action:current?'update':'create',after:record})});
        status.textContent = t('success');
      } catch (error) {
        const expired = /Authentication|required|session/i.test(error.message);
        status.textContent = expired ? t('login') : `${t('failure')} ${error.message}`;
        reauth.hidden = !expired;
      } finally { submit.disabled = false; }
    };
    syncForm();
  }

  document.querySelector('#language-toggle').onclick = () => { language = language === 'en' ? 'ja' : 'en'; localStorage.setItem('lk-language',language); render(); };
  document.querySelector('#menu-toggle').onclick = event => { const nav=document.querySelector('.site-header nav'),open=nav.classList.toggle('open');event.currentTarget.setAttribute('aria-expanded',String(open)); };
  window.LKData.loadPublicData().then(result => { data=result; render(); }).catch(() => { app.innerHTML='<p class="empty">振り返りを読み込めませんでした。 / Could not load player reflection.</p>'; });
})();
