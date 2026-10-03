(() => {
  'use strict';

  const app = document.querySelector('#feedback-app');
  const params = new URLSearchParams(location.search);
  let data;
  let language = localStorage.getItem('lk-language') || 'ja';
  let selectedMode = params.get('mode') === 'match' ? 'match' : 'session';
  let selectedPlayerId = params.get('player') || '';
  let selectedDate = params.get('date') || '';
  let selectedMatchType = params.get('matchType') === 'tournament' ? 'tournament' : 'training';
  let selectedMatchId = params.get('matchId') || '';

  const words = {
    en: {
      eyebrow:'PLAYER VOICE', title:'Player Reflection', subtitle:'Capture one honest learning point after training or competition.', notice:'Self-reflection is written by the player. It is not a coach evaluation, official score, or attendance record.', sessionMode:'Session reflection', matchMode:'Match reflection', player:'Your name', date:'Training date', effort:'Effort', confidence:'Confidence', low:'Low', high:'High', wentWell:'What went well?', wentPlaceholder:'One thing you did well or understood better.', nextFocus:'What will you focus on next?', focusPlaceholder:'Choose one clear action for the next training session.', note:'Anything else?', notePlaceholder:'Optional note, question, or feeling.', submit:'Submit for approval', update:'Update reflection', pending:'Submitting...', success:'Your reflection was submitted for approval. It will appear after review.', failure:'The reflection could not be submitted.', login:'Your access session has expired. Sign in again to submit.', reauth:'Sign in again', recentSession:'Approved session reflections', recentMatch:'Approved match reflections', noFeedback:'No approved reflections yet.', select:'Select your name', members:'Approved reflections are visible to all club members.', scale:'1 = low · 5 = high', sessionEditHint:'Selecting an approved player/date reflection lets you submit an update for approval.', matches:'recorded matches', unverified:'Individual identity is not verified; please select only your own name.', matchType:'Match type', training:'Training match', tournament:'Tournament match', chooseMatch:'Choose match', selectPlayerFirst:'Select your name first', noMatches:'No recorded matches are available for this player.', whatWorked:'What worked?', workedPlaceholder:'Which serve, receive, placement, or pattern worked?', challenge:'Main difficulty', challengePlaceholder:'What caused the most difficulty in this match?', adjustment:'Adjustment attempted', adjustmentPlaceholder:'Optional: what did you change during the match?', nextPlan:'Next-match plan', planPlaceholder:'Choose one tactical action to try next time.', matchEditHint:'One approved reflection is stored per player and match. Selecting it again submits an update for approval.', vs:'vs', round:'Round', result:'Result', approved:'Approved', reflections:'reflections'
    },
    ja: {
      eyebrow:'選手の声', title:'選手振り返り', subtitle:'練習や大会の後に、正直な学びを1つ残しましょう。', notice:'自己振り返りは選手本人が書く内容です。コーチ評価・公式スコア・出席記録ではありません。', sessionMode:'セッション振り返り', matchMode:'試合振り返り', player:'自分の名前', date:'練習日', effort:'がんばり度', confidence:'自信', low:'低い', high:'高い', wentWell:'うまくできたこと', wentPlaceholder:'できたこと、前より分かったことを1つ書いてください。', nextFocus:'次に意識すること', focusPlaceholder:'次の練習で行うことを1つ決めてください。', note:'その他', notePlaceholder:'任意のメモ、質問、気持ちなど。', submit:'承認申請する', update:'振り返りを更新申請', pending:'送信中…', success:'振り返りを承認申請しました。確認後に表示されます。', failure:'振り返りを送信できませんでした。', login:'アクセス認証の期限が切れました。再ログインして送信してください。', reauth:'再ログイン', recentSession:'承認済みセッション振り返り', recentMatch:'承認済み試合振り返り', noFeedback:'承認済みの振り返りはまだありません。', select:'自分の名前を選択', members:'承認された振り返りはクラブメンバー全員に表示されます。', scale:'1 = 低い · 5 = 高い', sessionEditHint:'承認済みの選手・日付を選ぶと、更新を承認申請できます。', matches:'登録試合', unverified:'本人確認機能はありません。必ず自分の名前だけを選んでください。', matchType:'試合種別', training:'練習試合', tournament:'大会試合', chooseMatch:'試合を選択', selectPlayerFirst:'先に自分の名前を選んでください', noMatches:'この選手の登録済み試合はありません。', whatWorked:'機能したこと', workedPlaceholder:'サーブ、レシーブ、コース、戦術など、機能したことは？', challenge:'一番難しかったこと', challengePlaceholder:'この試合で一番難しかったことは？', adjustment:'試した修正', adjustmentPlaceholder:'任意：試合中に何を変えましたか？', nextPlan:'次の対戦プラン', planPlaceholder:'次回試す戦術を1つ決めてください。', matchEditHint:'選手・試合ごとに承認済み振り返りを1件保存します。再選択すると更新申請できます。', vs:'対', round:'ラウンド', result:'結果', approved:'承認済み', reflections:'件'
    }
  };

  Object.assign(words.en, {
    notice:'Self-reflection is written by the player. An administrator publishes it for member visibility; publishing is not approval, a coach evaluation, an official score, or an attendance record.',
    submit:'Submit for publishing',
    update:'Submit update for publishing',
    success:'Your reflection was sent to an administrator for publishing. It will appear after it is published.',
    recentSession:'Published session reflections',
    recentMatch:'Published match reflections',
    noFeedback:'No published reflections yet.',
    members:'Published reflections are visible to all club members.',
    sessionEditHint:'Selecting a published player/date reflection lets you submit an update for publishing.',
    matchEditHint:'One published reflection is stored per player and match. Selecting it again lets you submit an update for publishing.',
    approved:'Published'
  });
  Object.assign(words.ja, {
    notice:'自己振り返りは選手本人が書く内容です。管理者がメンバー向けに公開しますが、公開は内容の承認、コーチ評価、公式スコア、出席記録を意味しません。',
    submit:'公開を依頼する',
    update:'更新内容の公開を依頼する',
    success:'管理者へ公開依頼を送信しました。公開後に表示されます。',
    recentSession:'公開済みセッション振り返り',
    recentMatch:'公開済み試合振り返り',
    noFeedback:'公開済みの振り返りはまだありません。',
    members:'公開済みの振り返りはクラブメンバー全員に表示されます。',
    sessionEditHint:'公開済みの選手・日付を選ぶと、更新内容の公開を依頼できます。',
    matchEditHint:'選手・試合ごとに公開済み振り返りを1件保存します。再選択すると更新内容の公開を依頼できます。',
    approved:'公開済み'
  });
  const t = key => words[language][key];
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
  const players = () => [...(data.players || [])].sort((a,b)=>(a.displayName||'').localeCompare(b.displayName||'','ja'));
  const people = () => new Map([...(data.players || []).map(person => [person.playerId, person]), ...(data.externalOpponents || []).map(person => [person.externalOpponentId, person])]);
  const playerName = id => people().get(id)?.displayName || id;
  const trainingMatches = () => (data.matches || []).filter(match => /club|training|練習/i.test(`${match.event || ''} ${match.division || ''}`));
  const tournamentMatches = () => data.tournamentMatches || [];
  const sessionFeedback = () => data.sessionFeedback || [];
  const matchFeedback = () => data.matchFeedback || [];
  const dates = () => [...new Set(trainingMatches().map(match => match.matchDate).filter(Boolean))].sort().reverse();
  const matchIdOf = (match,type) => type === 'training' ? match.matchId : match.tournamentMatchId;
  const matchSource = type => type === 'training' ? trainingMatches() : tournamentMatches();
  const matchFor = (type,id) => matchSource(type).find(match => matchIdOf(match,type) === id);
  const tournamentName = id => (data.tournaments || []).find(item => item.tournamentId === id)?.name || id || '';
  const opponentFor = (match,playerId) => {
    const first = match.player1Id === playerId;
    const id = first ? match.player2Id : match.player1Id;
    return { id, name:(first ? match.player2Name : match.player1Name) || playerName(id), ownSets:Number(first ? match.player1Sets : match.player2Sets), opponentSets:Number(first ? match.player2Sets : match.player1Sets) };
  };
  const resultFor = (match,playerId) => match.winnerId ? (match.winnerId === playerId ? 'win' : 'loss') : 'incomplete';
  const resultLabel = value => language === 'en' ? ({win:'Win',loss:'Loss',incomplete:'Incomplete'}[value] || value) : ({win:'勝ち',loss:'負け',incomplete:'未完了'}[value] || value);
  const matchesForPlayer = (playerId,type) => matchSource(type).filter(match => match.player1Id === playerId || match.player2Id === playerId).sort((a,b) => `${b.matchDate||''}${matchIdOf(b,type)||''}`.localeCompare(`${a.matchDate||''}${matchIdOf(a,type)||''}`));
  const sessionFeedbackId = (playerId,date) => `FB-${String(date).replace(/-/g,'')}-${playerId}`;
  const matchFeedbackId = (playerId,type,matchId) => `MRF-${type === 'training' ? 'T' : 'O'}-${matchId}-${playerId}`;
  const rating = (name,label,value=0) => `<fieldset class="feedback-rating"><legend>${label}<small>${t('scale')}</small></legend><div>${[1,2,3,4,5].map(score => `<label><input type="radio" name="${name}" value="${score}" ${Number(value)===score?'checked':''} required><span>${score}</span></label>`).join('')}</div><p><span>${t('low')}</span><span>${t('high')}</span></p></fieldset>`;
  const textarea = (name,label,placeholder,value='',required=true) => `<label class="feedback-text"><span>${label}</span><textarea name="${name}" maxlength="500" ${required?'required':''} placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea></label>`;

  function normalizeSelection() {
    if (!players().some(player => player.playerId === selectedPlayerId)) selectedPlayerId = '';
    if (selectedMode === 'session') {
      if (!dates().includes(selectedDate)) selectedDate = dates()[0] || '';
      return;
    }
    if (selectedMatchId && !matchFor(selectedMatchType,selectedMatchId)) {
      const alternateType = selectedMatchType === 'training' ? 'tournament' : 'training';
      if (matchFor(alternateType,selectedMatchId)) selectedMatchType = alternateType;
      else selectedMatchId = '';
    }
    const selectedMatch = matchFor(selectedMatchType,selectedMatchId);
    if (!selectedPlayerId && selectedMatch) selectedPlayerId = [selectedMatch.player1Id,selectedMatch.player2Id].find(id => players().some(player => player.playerId === id)) || '';
    const available = matchesForPlayer(selectedPlayerId,selectedMatchType);
    if (!available.some(match => matchIdOf(match,selectedMatchType) === selectedMatchId)) selectedMatchId = available[0] ? matchIdOf(available[0],selectedMatchType) : '';
  }

  function updateUrl() {
    const values = selectedMode === 'session'
      ? { ...(selectedPlayerId?{player:selectedPlayerId}:{}), ...(selectedDate?{date:selectedDate}:{}) }
      : { mode:'match', matchType:selectedMatchType, ...(selectedPlayerId?{player:selectedPlayerId}:{}), ...(selectedMatchId?{matchId:selectedMatchId}:{}) };
    history.replaceState(null,'',`feedback.html${Object.keys(values).length?`?${new URLSearchParams(values)}`:''}`);
  }

  function matchLabel(match,type,playerId) {
    const opponent = opponentFor(match,playerId), context = type === 'training' ? (match.event || match.division || t('training')) : [tournamentName(match.tournamentId),match.round].filter(Boolean).join(' · ');
    return `${match.matchDate || ''} · ${t('vs')} ${opponent.name} · ${opponent.ownSets}-${opponent.opponentSets}${context?` · ${context}`:''}`;
  }

  function historyHtml() {
    if (selectedMode === 'session') {
      const records = [...sessionFeedback()].filter(item => !selectedPlayerId || item.playerId === selectedPlayerId).sort((a,b) => `${b.sessionDate}${b.updatedAt||''}`.localeCompare(`${a.sessionDate}${a.updatedAt||''}`)).slice(0,12);
      return records.map(item => `<article class="feedback-card"><header><div><a href="player.html?id=${encodeURIComponent(item.playerId)}">${escapeHtml(item.playerName || playerName(item.playerId))}</a><small>${escapeHtml(item.sessionDate)}</small></div><span><b>${item.effort}</b><small>${t('effort')}</small></span><span><b>${item.confidence}</b><small>${t('confidence')}</small></span></header><section><div><small>${t('wentWell')}</small><p>${escapeHtml(item.wentWell)}</p></div><div><small>${t('nextFocus')}</small><p>${escapeHtml(item.nextFocus)}</p></div>${item.note?`<div><small>${t('note')}</small><p>${escapeHtml(item.note)}</p></div>`:''}</section></article>`).join('') || `<p class="empty">${t('noFeedback')}</p>`;
    }
    const records = [...matchFeedback()].filter(item => !selectedPlayerId || item.playerId === selectedPlayerId).sort((a,b) => `${b.matchDate}${b.updatedAt||''}`.localeCompare(`${a.matchDate}${a.updatedAt||''}`)).slice(0,12);
    return records.map(item => `<article class="feedback-card match-feedback-card"><header><div><a href="player.html?id=${encodeURIComponent(item.playerId)}">${escapeHtml(item.playerName || playerName(item.playerId))}</a><small>${escapeHtml(item.matchDate)} · ${item.matchType==='tournament'?t('tournament'):t('training')}</small></div><span class="feedback-match-score"><b>${escapeHtml(item.score)}</b><small>${escapeHtml(resultLabel(item.result))}</small></span></header><p class="feedback-opponent">${t('vs')} ${escapeHtml(item.opponentName || playerName(item.opponentId))}</p><section><div><small>${t('whatWorked')}</small><p>${escapeHtml(item.whatWorked)}</p></div><div><small>${t('challenge')}</small><p>${escapeHtml(item.challenge)}</p></div>${item.adjustment?`<div><small>${t('adjustment')}</small><p>${escapeHtml(item.adjustment)}</p></div>`:''}<div><small>${t('nextPlan')}</small><p>${escapeHtml(item.nextPlan)}</p></div></section></article>`).join('') || `<p class="empty">${t('noFeedback')}</p>`;
  }

  function commonHeader() {
    return `<section class="feedback-hero"><div><p class="eyebrow">${t('eyebrow')}</p><h1>${t('title')}</h1><span>${t('subtitle')}</span></div><aside>${t('notice')}</aside></section><nav class="feedback-mode-tabs" aria-label="${escapeHtml(t('title'))}"><button type="button" data-feedback-mode="session" class="${selectedMode==='session'?'active':''}" aria-pressed="${selectedMode==='session'}">${t('sessionMode')}</button><button type="button" data-feedback-mode="match" class="${selectedMode==='match'?'active':''}" aria-pressed="${selectedMode==='match'}">${t('matchMode')}</button></nav>`;
  }

  function commonNotices() {
    return `<p class="feedback-visibility">${t('members')}</p><p class="feedback-identity-note">${t('unverified')}</p>`;
  }

  function playerOptions() {
    return `<option value="">${t('select')}</option>${players().map(player=>`<option value="${player.playerId}" ${player.playerId===selectedPlayerId?'selected':''}>${escapeHtml(player.displayName)}${player.englishName?` · ${escapeHtml(player.englishName)}`:''}</option>`).join('')}`;
  }

  function renderSessionForm() {
    const existing = sessionFeedback().find(item => item.feedbackId === sessionFeedbackId(selectedPlayerId,selectedDate));
    return `<form id="feedback-form" class="feedback-form" data-reflection-kind="session">${commonNotices()}<div class="feedback-selectors"><label><span>${t('player')}</span><select name="playerId" required>${playerOptions()}</select></label><label><span>${t('date')}</span><select name="sessionDate" required>${dates().map(date=>`<option value="${date}" ${date===selectedDate?'selected':''}>${date}</option>`).join('')}</select><small id="feedback-recorded-context">${selectedPlayerId&&selectedDate?`${trainingMatches().filter(match=>match.matchDate===selectedDate&&(match.player1Id===selectedPlayerId||match.player2Id===selectedPlayerId)).length} ${t('matches')}`:''}</small></label></div><div class="feedback-rating-grid">${rating('effort',t('effort'),existing?.effort)}${rating('confidence',t('confidence'),existing?.confidence)}</div>${textarea('wentWell',t('wentWell'),t('wentPlaceholder'),existing?.wentWell)}${textarea('nextFocus',t('nextFocus'),t('focusPlaceholder'),existing?.nextFocus)}<label class="feedback-text"><span>${t('note')}</span><textarea name="note" maxlength="1000" placeholder="${escapeHtml(t('notePlaceholder'))}">${escapeHtml(existing?.note||'')}</textarea></label><p class="feedback-edit-hint">${t('sessionEditHint')}</p>${submitHtml(existing)}</form>`;
  }

  function renderMatchForm() {
    const available = matchesForPlayer(selectedPlayerId,selectedMatchType), match = matchFor(selectedMatchType,selectedMatchId), existing = matchFeedback().find(item => item.matchFeedbackId === matchFeedbackId(selectedPlayerId,selectedMatchType,selectedMatchId));
    const opponent = match && selectedPlayerId ? opponentFor(match,selectedPlayerId) : null, result = match ? resultFor(match,selectedPlayerId) : '';
    const matchOptions = available.length ? available.map(item=>`<option value="${escapeHtml(matchIdOf(item,selectedMatchType))}" ${matchIdOf(item,selectedMatchType)===selectedMatchId?'selected':''}>${escapeHtml(matchLabel(item,selectedMatchType,selectedPlayerId))}</option>`).join('') : `<option value="">${selectedPlayerId?t('noMatches'):t('selectPlayerFirst')}</option>`;
    const context = match && opponent ? `<article class="feedback-match-context"><div><span class="badge ${selectedMatchType==='tournament'?'tournament':'training'}">${selectedMatchType==='tournament'?t('tournament'):t('training')}</span><small>${escapeHtml(match.matchDate||'')}</small></div><h3>${escapeHtml(playerName(selectedPlayerId))} <b>${opponent.ownSets}-${opponent.opponentSets}</b> ${escapeHtml(opponent.name)}</h3><p>${escapeHtml(selectedMatchType==='tournament'?[tournamentName(match.tournamentId),match.round].filter(Boolean).join(' · '):(match.event||match.division||''))} · ${resultLabel(result)}</p></article>` : '';
    return `<form id="feedback-form" class="feedback-form" data-reflection-kind="match">${commonNotices()}<div class="feedback-selectors match-feedback-selectors"><label><span>${t('player')}</span><select name="playerId" required>${playerOptions()}</select></label><label><span>${t('matchType')}</span><select name="matchType"><option value="training" ${selectedMatchType==='training'?'selected':''}>${t('training')}</option><option value="tournament" ${selectedMatchType==='tournament'?'selected':''}>${t('tournament')}</option></select></label><label class="feedback-match-selector"><span>${t('chooseMatch')}</span><select name="matchId" required ${available.length?'':'disabled'}>${matchOptions}</select><small>${available.length} ${t('matches')}</small></label></div>${context}${textarea('whatWorked',t('whatWorked'),t('workedPlaceholder'),existing?.whatWorked)}${textarea('challenge',t('challenge'),t('challengePlaceholder'),existing?.challenge)}${textarea('adjustment',t('adjustment'),t('adjustmentPlaceholder'),existing?.adjustment,false)}${textarea('nextPlan',t('nextPlan'),t('planPlaceholder'),existing?.nextPlan)}<p class="feedback-edit-hint">${t('matchEditHint')}</p>${submitHtml(existing,!match)}</form>`;
  }

  function submitHtml(existing,disabled=false) {
    return `<div class="feedback-submit"><button class="gold-button" type="submit" ${disabled?'disabled':''}>${existing?t('update'):t('submit')}</button><button id="feedback-reauth" class="ghost-button" type="button" hidden>${t('reauth')}</button><p id="feedback-status" role="status"></p></div>`;
  }

  async function submitSession(form,status,submit) {
    const values = Object.fromEntries(new FormData(form));
    if (!values.playerId || !values.sessionDate) return;
    const id = sessionFeedbackId(values.playerId,values.sessionDate), current = sessionFeedback().find(item => item.feedbackId === id), now = new Date().toISOString();
    const record = { feedbackId:id, playerId:values.playerId, playerName:playerName(values.playerId), sessionDate:values.sessionDate, sessionId:`LKS-${values.sessionDate.replace(/-/g,'')}`, effort:Number(values.effort), confidence:Number(values.confidence), wentWell:String(values.wentWell||'').trim(), nextFocus:String(values.nextFocus||'').trim(), note:String(values.note||'').trim(), visibility:'members', createdAt:current?.createdAt||now, updatedAt:now };
    await sendChange('sessionFeedback',id,current,record,status,submit);
  }

  async function submitMatch(form,status,submit) {
    const values = Object.fromEntries(new FormData(form)), match = matchFor(values.matchType,values.matchId);
    if (!values.playerId || !match) return;
    const opponent = opponentFor(match,values.playerId), result = resultFor(match,values.playerId), id = matchFeedbackId(values.playerId,values.matchType,values.matchId), current = matchFeedback().find(item => item.matchFeedbackId === id), now = new Date().toISOString();
    const record = { matchFeedbackId:id, matchType:values.matchType, matchId:values.matchId, playerId:values.playerId, playerName:playerName(values.playerId), opponentId:opponent.id, opponentName:(match.player1Id===values.playerId?match.player2Name:match.player1Name)||playerName(opponent.id), matchDate:match.matchDate, tournamentId:values.matchType==='tournament'?(match.tournamentId||''):'', eventName:values.matchType==='tournament'?tournamentName(match.tournamentId):(match.event||match.division||''), round:values.matchType==='tournament'?(match.round||''):'', score:`${opponent.ownSets}-${opponent.opponentSets}`, result, whatWorked:String(values.whatWorked||'').trim(), challenge:String(values.challenge||'').trim(), adjustment:String(values.adjustment||'').trim(), nextPlan:String(values.nextPlan||'').trim(), visibility:'members', createdAt:current?.createdAt||now, updatedAt:now };
    await sendChange('matchFeedback',id,current,record,status,submit);
  }

  async function sendChange(entityType,id,current,record,status,submit) {
    const reauth = document.querySelector('#feedback-reauth');
    submit.disabled = true; status.textContent = t('pending'); reauth.hidden = true;
    try {
      await window.LKData.request('/api/change',{method:'POST',body:JSON.stringify({entityType,targetId:id,action:current?'update':'create',after:record})});
      status.textContent = t('success');
    } catch (error) {
      const expired = /Authentication|required|session/i.test(error.message);
      status.textContent = expired ? t('login') : `${t('failure')} ${error.message}`;
      reauth.hidden = !expired;
    } finally { submit.disabled = false; }
  }

  function bindForm() {
    document.querySelectorAll('[data-feedback-mode]').forEach(button => button.onclick = () => { selectedMode=button.dataset.feedbackMode; render(); });
    const form = document.querySelector('#feedback-form');
    form.elements.playerId.onchange = event => { selectedPlayerId=event.target.value; if(selectedMode==='match')selectedMatchId=''; render(); };
    if (selectedMode === 'session') form.elements.sessionDate.onchange = event => { selectedDate=event.target.value; render(); };
    else {
      form.elements.matchType.onchange = event => { selectedMatchType=event.target.value; selectedMatchId=''; render(); };
      form.elements.matchId.onchange = event => { selectedMatchId=event.target.value; render(); };
    }
    document.querySelector('#feedback-reauth').onclick = () => { localStorage.removeItem('lk-internal-access-until'); localStorage.removeItem('lk-site-session'); location.reload(); };
    form.onsubmit = event => { event.preventDefault(); const status=document.querySelector('#feedback-status'),submit=form.querySelector('[type="submit"]'); if(selectedMode==='session')submitSession(form,status,submit);else submitMatch(form,status,submit); };
  }

  function render() {
    normalizeSelection(); updateUrl();
    document.documentElement.lang = language;
    document.querySelector('#language-toggle').textContent = language === 'en' ? '日本語' : 'ENGLISH';
    document.querySelector('#feedback-nav-home').textContent = language === 'en' ? 'Home' : 'ホーム';
    document.querySelector('#feedback-nav-players').textContent = language === 'en' ? 'Players' : '選手';
    document.querySelector('#feedback-nav-sessions').textContent = language === 'en' ? 'Sessions' : 'セッション';
    app.innerHTML = `${commonHeader()}<section class="feedback-layout">${selectedMode==='session'?renderSessionForm():renderMatchForm()}<section class="feedback-history"><div class="section-title"><div><p>${t('eyebrow')}</p><h2>${selectedMode==='session'?t('recentSession'):t('recentMatch')}</h2></div></div><div id="feedback-history-list">${historyHtml()}</div></section></section>`;
    bindForm();
  }

  document.querySelector('#language-toggle').onclick = () => { language = language === 'en' ? 'ja' : 'en'; localStorage.setItem('lk-language',language); render(); };
  document.querySelector('#menu-toggle').onclick = event => { const nav=document.querySelector('.site-header nav'),open=nav.classList.toggle('open');event.currentTarget.setAttribute('aria-expanded',String(open)); };
  window.LKData.loadPublicData().then(result => { data=result; render(); }).catch(() => { app.innerHTML='<p class="empty">振り返りを読み込めませんでした。 / Could not load player reflection.</p>'; });
})();
