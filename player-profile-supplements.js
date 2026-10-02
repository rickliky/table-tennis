(() => {
  'use strict';

  const list = document.querySelector('#supplement-list');
  const search = document.querySelector('#supplement-search');
  const language = localStorage.getItem('lk-language') || 'ja';
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
  const lookupValue = (table, value) => {
    if (!value) return '';
    const item = (window.LK_STATIC?.[table] || []).find(entry => entry.id === value || entry.name === value || entry.nameJa === value || entry.nameEn === value);
    return item ? (language === 'en' ? item.nameEn : item.nameJa) : value;
  };
  const rubberName = (rubbers, value) => rubbers.find(item => item.rubberId === value)?.name || value || '';
  const statusIsActive = value => ['ST-001', 'Active', '有効'].includes(value);

  const render = (players, rubbers) => {
    const query = search.value.trim().toLowerCase();
    const filtered = players.filter(player => `${player.playerId} ${player.displayName} ${player.englishName || ''}`.toLowerCase().includes(query));
    const groups = new Map();
    filtered.forEach(player => {
      const category = lookupValue('schoolLevels', player.schoolLevel) || (language === 'en' ? 'Unassigned' : '未設定');
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(player);
    });
    list.innerHTML = [...groups.entries()].map(([category, entries]) => `<section><h2>🏓 ${escapeHtml(category)}</h2><div>${entries.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'ja')).map(player => {
      const facts = [
        [language === 'en' ? 'Player ID' : '選手ID', player.playerId],
        [language === 'en' ? 'Hand' : '利き手', lookupValue('playingHands', player.playingHand)],
        [language === 'en' ? 'Grip' : 'グリップ', lookupValue('grips', player.grip)],
        [language === 'en' ? 'Style' : '戦型', lookupValue('playingStyles', player.playingStyle)],
        [language === 'en' ? 'Forehand' : 'フォア', [lookupValue('rubberTypes', player.forehandRubberType), rubberName(rubbers, player.forehandRubber)].filter(Boolean).join(' / ')],
        [language === 'en' ? 'Backhand' : 'バック', [lookupValue('rubberTypes', player.backhandRubberType), rubberName(rubbers, player.backhandRubber)].filter(Boolean).join(' / ')]
      ].filter(([, value]) => value);
      return `<article><header><h3><a href="player.html?id=${encodeURIComponent(player.playerId)}">${escapeHtml(player.displayName || player.playerId)}</a></h3><span>${escapeHtml(player.englishName?.toUpperCase() || '')}</span></header><dl>${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><a class="supplement-edit" href="admin.html?tab=players&editPlayer=${encodeURIComponent(player.playerId)}">${language === 'en' ? 'Request profile update' : 'プロフィール変更を申請'}</a></article>`;
    }).join('')}</div></section>`).join('') || `<p class="loading">${language === 'en' ? 'No matching players.' : '該当する選手がいません。'}</p>`;
  };

  window.LKData.loadPublicData().then(data => {
    const players = (data.players || []).filter(player => statusIsActive(player.status));
    const rubbers = data.rubbers || [];
    render(players, rubbers);
    search.addEventListener('input', () => render(players, rubbers));
  }).catch(() => {
    list.innerHTML = '<p class="loading">選手情報を読み込めませんでした。 / Unable to load player data.</p>';
  });
})();
