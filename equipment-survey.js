const SURVEY_API_URL = 'https://script.google.com/macros/s/AKfycbx6IaN9YT2a4bv_8W76qtNwkFCjZ_-mODBEMTK9IiJlSi91UCIgJ56MQ4WJqeKK3TiUvA/exec';
const surveyForm = document.querySelector('#equipment-survey');
const surveyStatus = document.querySelector('#survey-status');

surveyForm.addEventListener('submit', async event => {
  event.preventDefault();
  const body = new URLSearchParams(new FormData(surveyForm));
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
