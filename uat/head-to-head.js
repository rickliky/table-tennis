(() => {
  'use strict';

  const copy = {
    en: {
      eyebrow: 'HEAD TO HEAD', select: 'Select Little Kings player', combined: 'Combined', training: 'Training', tournament: 'Tournament',
      winRate: 'Win rate', setDifference: 'Set differential', closeMatches: 'Close matches', sets: 'sets', noMatches: 'No documented matches',
      history: 'Meeting history', order: 'Oldest to newest', incomplete: 'Incomplete', close: 'Close'
    },
    ja: {
      eyebrow: '直接対決', select: 'リトルキングス選手を選択', combined: '合計', training: '練習', tournament: '大会',
      winRate: '勝率', setDifference: 'セット差', closeMatches: '接戦', sets: 'セット', noMatches: '登録済み試合なし',
      history: '対戦履歴', order: '古い順から新しい順', incomplete: '未完了', close: '閉じる'
    }
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
  const idFor = person => person?.playerId || person?.externalOpponentId || '';
  const nameFor = (person, language) => !person ? '' : language === 'en' && person.englishName ? `${person.displayName} (${person.englishName})` : person.displayName || idFor(person);
  const profileImage = playerId => window.lkProfileImage ? window.lkProfileImage(playerId) : `img/${playerId}.jpg`;
  const initials = person => (person?.displayName || '?').replace(/[\s()（）]/g, '').slice(0, 2);
  const scoreFor = (match, playerId) => match.player1Id === playerId
    ? { own:Number(match.player1Sets) || 0, other:Number(match.player2Sets) || 0 }
    : { own:Number(match.player2Sets) || 0, other:Number(match.player1Sets) || 0 };

  function buildModel(data, playerId, opponentId) {
    const records = [
      ...(data.matches || []).map(match => ({ ...match, evidenceSource:'training', evidenceId:match.matchId })),
      ...(data.tournamentMatches || []).map(match => ({ ...match, evidenceSource:'tournament', evidenceId:match.tournamentMatchId }))
    ].filter(match => (match.player1Id === playerId && match.player2Id === opponentId) || (match.player1Id === opponentId && match.player2Id === playerId))
      .sort((left, right) => `${left.matchDate || ''}${left.evidenceId || ''}`.localeCompare(`${right.matchDate || ''}${right.evidenceId || ''}`));
    const summarize = matches => {
      const decided = matches.filter(match => match.winnerId);
      const wins = decided.filter(match => match.winnerId === playerId).length;
      const sets = decided.reduce((total, match) => { const score = scoreFor(match, playerId); return { own:total.own + score.own, other:total.other + score.other }; }, { own:0, other:0 });
      const close = decided.filter(match => { const score = scoreFor(match, playerId); return Math.abs(score.own - score.other) === 1; });
      return { matches, decided, wins, losses:decided.length - wins, setsWon:sets.own, setsLost:sets.other, setDiff:sets.own - sets.other, close, closeWins:close.filter(match => match.winnerId === playerId).length, winRate:decided.length ? Math.round(wins / decided.length * 100) : 0 };
    };
    return {
      records,
      training:summarize(records.filter(match => match.evidenceSource === 'training')),
      tournament:summarize(records.filter(match => match.evidenceSource === 'tournament')),
      combined:summarize(records)
    };
  }

  function ensureDialog() {
    let dialog = document.querySelector('#lk-shared-h2h-dialog');
    if (dialog) return dialog;
    document.body.insertAdjacentHTML('beforeend', '<dialog id="lk-shared-h2h-dialog" class="tournament-intelligence-dialog tournament-h2h-dialog"><button class="modal-close" type="button">×</button><div></div></dialog>');
    dialog = document.querySelector('#lk-shared-h2h-dialog');
    dialog.querySelector('.modal-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open'); });
    return dialog;
  }

  function open(options) {
    const data = options.data || {};
    const language = options.language === 'en' ? 'en' : 'ja';
    const labels = copy[language];
    const people = new Map([...(data.players || []), ...(data.externalOpponents || [])].map(person => [idFor(person), person]));
    const player = people.get(options.playerId);
    const opponent = people.get(options.opponentId);
    if (!player || !opponent) return false;
    const model = buildModel(data, options.playerId, options.opponentId);
    const dialog = ensureDialog();
    const sourceCard = (label, stats) => `<article><small>${label}</small><b>${stats.wins}-${stats.losses}</b><span>${stats.setsWon}-${stats.setsLost} ${labels.sets} · ${stats.setDiff > 0 ? '+' : ''}${stats.setDiff}</span><em>${stats.close.length ? `${stats.closeWins}-${stats.close.length - stats.closeWins} ${labels.closeMatches}` : labels.noMatches}</em></article>`;
    const portrait = person => idFor(person).startsWith('LK-')
      ? `<img src="${escapeHtml(profileImage(idFor(person)))}" alt="${escapeHtml(nameFor(person, language))}">`
      : `<i class="opponent-monogram" aria-hidden="true">${escapeHtml(initials(person))}</i>`;
    const eventNames = new Map((data.tournaments || []).map(tournament => [tournament.tournamentId, tournament.name || tournament.nameJa || tournament.tournamentId]));
    const timeline = model.records.map(match => {
      const score = scoreFor(match, options.playerId);
      const decided = Boolean(match.winnerId);
      const won = decided && match.winnerId === options.playerId;
      const source = match.evidenceSource === 'training' ? labels.training : labels.tournament;
      const context = match.evidenceSource === 'tournament' ? eventNames.get(match.tournamentId) : match.event;
      return `<li class="${decided ? (won ? 'win' : 'loss') : 'incomplete'}"><span><b>${escapeHtml(match.matchDate || '')}</b><small>${escapeHtml(source)}${context ? ` · ${escapeHtml(context)}` : ''}</small></span><strong>${decided ? (won ? 'W' : 'L') : labels.incomplete} ${score.own}-${score.other}</strong></li>`;
    }).join('') || `<li class="empty">${labels.noMatches}</li>`;
    const playerOptions = (data.players || []).map(person => `<option value="${escapeHtml(person.playerId)}" ${person.playerId === options.playerId ? 'selected' : ''}>${escapeHtml(nameFor(person, language))}</option>`).join('');
    dialog.querySelector(':scope > div').innerHTML = `<section class="tournament-h2h"><header><p class="eyebrow">${labels.eyebrow}</p><label><span>${labels.select}</span><select id="lk-shared-h2h-player">${playerOptions}</select></label></header><div class="tournament-h2h-identity"><figure>${portrait(player)}<figcaption>${escapeHtml(nameFor(player, language))}</figcaption></figure><span>VS</span><figure>${portrait(opponent)}<figcaption>${escapeHtml(nameFor(opponent, language))}</figcaption></figure></div><div class="tournament-h2h-overall"><span><small>${labels.combined}</small><b>${model.combined.wins}-${model.combined.losses}</b></span><span><small>${labels.winRate}</small><b>${model.combined.decided.length ? `${model.combined.winRate}%` : '—'}</b></span><span><small>${labels.setDifference}</small><b>${model.combined.setDiff > 0 ? '+' : ''}${model.combined.setDiff}</b></span><span><small>${labels.closeMatches}</small><b>${model.combined.close.length ? `${model.combined.closeWins}-${model.combined.close.length - model.combined.closeWins}` : '—'}</b></span></div><div class="tournament-h2h-sources">${sourceCard(labels.training, model.training)}${sourceCard(labels.tournament, model.tournament)}</div><section class="tournament-h2h-history"><header><h3>${labels.history}</h3><small>${labels.order}</small></header><ol>${timeline}</ol></section></section>`;
    const selector = dialog.querySelector('#lk-shared-h2h-player');
    selector.addEventListener('change', event => open({ ...options, playerId:event.target.value }));
    dialog.querySelector('.modal-close').setAttribute('aria-label', labels.close);
    document.body.classList.add('modal-open');
    if (!dialog.open) dialog.showModal();
    return true;
  }

  window.LKHeadToHead = Object.freeze({ buildModel, open });
})();
