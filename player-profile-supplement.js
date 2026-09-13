const SURVEY_API_URL = 'https://script.google.com/macros/s/AKfycbx6IaN9YT2a4bv_8W76qtNwkFCjZ_-mODBEMTK9IiJlSi91UCIgJ56MQ4WJqeKK3TiUvA/exec';
const surveyForm = document.querySelector('#equipment-survey');
const surveyStatus = document.querySelector('#survey-status');

fetch(`${SURVEY_API_URL}?action=publicData`).then(response => response.json()).then(data => {
  document.querySelector('#player-names').innerHTML = data.players.map(player => `<option value="${player.displayName}"></option>`).join('');
}).catch(() => {});

document.querySelectorAll('[data-other-for]').forEach(field => {
  const select = surveyForm.elements[field.dataset.otherFor];
  const input = field.querySelector('input');
  const update = () => { const isOther = select.value === 'Other'; field.hidden = !isOther; input.required = isOther; if (!isOther) input.value = ''; };
  select.addEventListener('change', update); update();
});

surveyForm.addEventListener('submit', async event => {
  event.preventDefault();
  const body = new URLSearchParams(new FormData(surveyForm));
  ['playingStyle', 'forehandModel', 'backhandModel'].forEach(field => {
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
