const categoryOrder = ['小学生', '中学生', '高校生', '一般'];
const list = document.querySelector('#supplement-list');

fetch('./player-profile-supplements.json').then(response => response.ok ? response.json() : Promise.reject()).then(data => {
  const entries = data.entries || [];
  const groups = new Map(categoryOrder.map(category => [category, []]));
  entries.forEach(entry => {
    const category = groups.has(entry.playerCategory) ? entry.playerCategory : 'Unassigned';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(entry);
  });
  list.innerHTML = [...groups.entries()].filter(([, entries]) => entries.length).map(([category, entries]) => `<section><h2>🏆 ${category}</h2><div>${entries.sort((left, right) => left.kanjiName.localeCompare(right.kanjiName, 'ja')).map(entry => `<article><header><h3>${entry.kanjiName}</h3><span>${entry.romanizedName?.toUpperCase() || ''}</span></header><dl><div><dt>利き手 / Hand</dt><dd>${entry.playingHand === '右' ? '右 / Right' : '左 / Left'}</dd></div>${entry.grip ? `<div><dt>グリップ / Grip</dt><dd>${entry.grip}</dd></div>` : ''}<div><dt>戦型 / Style</dt><dd>${entry.playingStyle}</dd></div><div><dt>フォア / Forehand</dt><dd>${entry.forehandType} · ${entry.forehandModel}</dd></div><div><dt>バック / Backhand</dt><dd>${entry.backhandType} · ${entry.backhandModel}</dd></div></dl></article>`).join('')}</div></section>`).join('') || '<p class="loading">登録済みの入力はありません。 / No submissions yet.</p>';
}).catch(() => { list.innerHTML = '<p class="loading">入力内容を読み込めませんでした。 / Submissions could not load.</p>'; });
