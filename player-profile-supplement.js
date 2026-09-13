const SURVEY_API_URL = 'https://script.google.com/macros/s/AKfycbx6IaN9YT2a4bv_8W76qtNwkFCjZ_-mODBEMTK9IiJlSi91UCIgJ56MQ4WJqeKK3TiUvA/exec';
const surveyForm = document.querySelector('#equipment-survey');
const surveyStatus = document.querySelector('#survey-status');

fetch(`${SURVEY_API_URL}?action=publicData`).then(response => response.ok ? response.json() : Promise.reject()).catch(() => fetch('./public-data.json').then(response => response.ok ? response.json() : Promise.reject())).then(data => {
  const select = document.querySelector('#player-names');
  const activePlayers = data.players.filter(player => player.status === 'Active' && player.displayName);
  select.innerHTML = activePlayers.length ? '<option value="">選手名を選択 / Select player name</option>' + activePlayers.sort((left, right) => left.displayName.localeCompare(right.displayName, 'ja')).map(player => `<option value="${player.displayName}">${player.displayName}</option>`).join('') + '<option value="Other">その他 / Other</option>' : '<option value="Other">登録中の有効な選手が見つかりません / No active players found</option>';
}).catch(() => { document.querySelector('#player-names').innerHTML = '<option value="Other">選手一覧を読み込めませんでした / Player list could not load</option>'; });

document.querySelectorAll('[data-other-for]').forEach(field => {
  const select = surveyForm.elements[field.dataset.otherFor];
  const input = field.querySelector('input');
  const update = () => { const isOther = select.value === 'Other'; field.hidden = !isOther; input.required = isOther; if (!isOther) input.value = ''; };
  select.addEventListener('change', update); update();
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
