(() => {
  'use strict';
  const words = {
    en: { winner: 'Winner', loser: 'Loser', incomplete: 'Incomplete — no winner recorded' },
    ja: { winner: '勝者', loser: '敗者', incomplete: '未完了 — 勝敗は未確定' }
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  function render(match, player, language) {
    const copy = words[language], completed = ['win', 'loss'].includes(match.result);
    const playerName = language === 'en' ? player.englishName || player.displayName || player.playerId : player.displayName || player.englishName || player.playerId;
    const opponentName = language === 'en' ? match.opponentEnglishName || match.opponentName || match.opponentId : match.opponentName || match.opponentEnglishName || match.opponentId;
    const side = (name, won) => `<div class="notebook-match-side ${completed ? won ? 'is-winner' : 'is-loser' : ''}"><strong>${escapeHtml(name)}</strong>${completed ? `<small class="notebook-result-label">${copy[won ? 'winner' : 'loser']}</small>` : ''}</div>`;
    return `<div class="notebook-match-evidence">${side(playerName, match.result === 'win')}<b class="notebook-match-score">${escapeHtml(match.score)}</b>${side(opponentName, match.result === 'loss')}</div>${completed ? '' : `<p class="notebook-match-incomplete">${copy.incomplete}</p>`}`;
  }
  window.LKNotebookMatch = Object.freeze({ render });
})();
