(() => {
  'use strict';
  const words = {
    en: { winner: '勝ち / Win', loser: '負け / Loss', incomplete: '未完了 / Incomplete — 勝敗は未確定 / no winner recorded', romanizedMissing: 'ローマ字名未登録 / Romanized name not recorded' },
    ja: { winner: '勝ち / Win', loser: '負け / Loss', incomplete: '未完了 / Incomplete — 勝敗は未確定 / no winner recorded', romanizedMissing: 'ローマ字名未登録 / Romanized name not recorded' }
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  function render(match, player, language) {
    const copy = words[language], completed = ['win', 'loss'].includes(match.result);
    const side = (name, romanizedName, won) => `<div class="notebook-match-side ${completed ? won ? 'is-winner' : 'is-loser' : ''}"><strong>${escapeHtml(name)}</strong><small class="notebook-romanized-name">${escapeHtml(romanizedName || copy.romanizedMissing)}</small>${completed ? `<small class="notebook-result-label">${copy[won ? 'winner' : 'loser']}</small>` : ''}</div>`;
    return `<div class="notebook-match-evidence">${side(player.displayName || player.playerId, player.englishName, match.result === 'win')}<b class="notebook-match-score">${escapeHtml(match.score)}</b>${side(match.opponentName || match.opponentId, match.opponentEnglishName, match.result === 'loss')}</div>${completed ? '' : `<p class="notebook-match-incomplete">${copy.incomplete}</p>`}`;
  }
  window.LKNotebookMatch = Object.freeze({ render });
})();
