const SURVEY_API_URL = 'https://script.google.com/macros/s/AKfycbx6IaN9YT2a4bv_8W76qtNwkFCjZ_-mODBEMTK9IiJlSi91UCIgJ56MQ4WJqeKK3TiUvA/exec';
const surveyForm = document.querySelector('#equipment-survey');
const surveyStatus = document.querySelector('#survey-status');
const RUBBER_MODELS = {
  '裏ソフト': [
    'Butterfly テナジー05 / Tenergy 05', 'Butterfly テナジー05FX / Tenergy 05 FX', 'Butterfly テナジー64 / Tenergy 64', 'Butterfly ディグニクス05 / Dignics 05', 'Butterfly ディグニクス09C / Dignics 09C', 'Butterfly ロゼナ / Rozena',
    'Nittaku ファスタークG-1 / Fastarc G-1', 'Nittaku ファスタークC-1 / Fastarc C-1', 'Nittaku ハモンドZ2 / Hammond Z2',
    'Yasaka ラクザ7 / Rakza 7', 'Yasaka ラクザX / Rakza X', 'Yasaka ラクザZ / Rakza Z',
    'XIOM ヴェガプロ / Vega Pro', 'XIOM ヴェガX / Vega X', 'XIOM ヴェガヨーロッパ / Vega Europe',
    'Victas V>15 Extra', 'Victas V>15 Limber', 'Tibhar エボリューションMX-P / Evolution MX-P', 'Tibhar エボリューションEL-P / Evolution EL-P',
    'Donic ブルースターA1 / Bluestar A1', 'andro ラザンターR47 / Rasanter R47', 'Stiga DNA Platinum XH', 'DHS キョウヒョウ3 NEO / Hurricane 3 Neo', '729 バトルII / Battle II'
  ],
  '表ソフト': [
    'Butterfly インパーシャルXS / Impartial XS', 'Butterfly スペクトルS1 / Spectol S1', 'Nittaku モリストSP / Moristo SP', 'Nittaku ハモンドFA / Hammond FA',
    'Victas VO>102', 'Victas VO>103', 'Victas スピンピップスD3 / Spinpips D3', 'Yasaka ラクザPO / Rakza PO', 'TSP スペクトル / Spectol'
  ],
  '粒高': [
    'Butterfly フェイントロングIII / Feint Long III', 'Nittaku P-1R', 'Victas カールP1V / Curl P1V', 'Victas カールP4V / Curl P4V', 'DHS C8', 'Dawei 388D-1'
  ],
  'アンチ': [
    'Butterfly スーパーアンチ / Super Anti', 'Yasaka アンチパワー / Anti Power', 'Dr. Neubauer ゴリラ / Gorilla', 'Dr. Neubauer バッファロー+ / Buffalo+', 'Der Materialspezialist エレンディル / Ellen DEF'
  ],
  '一枚': [
    'Nittaku P-1R OX', 'Victas カールP1V OX / Curl P1V OX', 'Victas カールP4V OX / Curl P4V OX', 'TSP スペクトル OX / Spectol OX'
  ]
};

fetch('./public-data.json').then(response => response.ok ? response.json() : Promise.reject()).then(data => {
  const select = document.querySelector('#player-names');
  const activePlayers = data.players.filter(player => player.status === 'Active' && player.displayName);
  select.innerHTML = activePlayers.length ? '<option value="">選手名を選択 / Select player name</option>' + activePlayers.sort((left, right) => left.displayName.localeCompare(right.displayName, 'ja')).map(player => `<option value="${player.displayName}">${player.displayName}</option>`).join('') + '<option value="Other">その他 / Other</option>' : '<option value="Other">登録中の有効な選手が見つかりません / No active players found</option>';
}).catch(() => { document.querySelector('#player-names').innerHTML = '<option value="Other">選手一覧を読み込めませんでした / Player list could not load</option>'; });

document.querySelectorAll('[data-other-for]').forEach(field => {
  const select = surveyForm.elements[field.dataset.otherFor];
  const input = field.querySelector('input');
  const update = () => { const isOther = select.value === 'Other'; field.hidden = !isOther; input.disabled = !isOther; input.required = isOther; if (!isOther) input.value = ''; };
  select.addEventListener('change', update); update();
});

['forehand', 'backhand'].forEach(side => {
  const type = surveyForm.elements[`${side}Type`];
  const model = surveyForm.elements[`${side}Model`];
  type.addEventListener('change', () => {
    const models = RUBBER_MODELS[type.value] || [];
    model.innerHTML = `<option value="">${type.value ? 'モデルを選択 / Select model' : '先に種類を選択 / Select type first'}</option>${models.map(name => `<option>${name}</option>`).join('')}<option value="Other">その他 / Other</option>`;
    model.dispatchEvent(new Event('change'));
  });
  type.dispatchEvent(new Event('change'));
});

surveyForm.addEventListener('submit', async event => {
  event.preventDefault();
  const body = new URLSearchParams(new FormData(surveyForm));
  ['kanjiName', 'playingStyle', 'forehandModel', 'backhandModel'].forEach(field => {
    if (body.get(field) === 'Other') body.set(field, body.get(`${field}Other`));
    body.delete(`${field}Other`);
  });
  body.set('action', 'submitEquipmentSurvey');
  surveyStatus.textContent = '送信中… / Sending…';

  try {
    await fetch(SURVEY_API_URL, { method: 'POST', mode: 'no-cors', body });
    surveyForm.reset();
    surveyStatus.textContent = '送信しました。ありがとうございます。 / Submitted. Thank you.';
  } catch {
    surveyStatus.textContent = '送信できませんでした。もう一度お試しください。 / Submission failed. Please try again.';
  }
});
