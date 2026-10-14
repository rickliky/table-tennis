const { expect } = require('@playwright/test');
const expectWriting = (locator, text) => expect.poll(() => locator.evaluate(element => window.Quill.find(element.parentElement).getText().slice(0, -1))).toBe(text);
async function paste(locator, html = '', text = '') {
  await locator.focus();
  await locator.evaluate((element, { html, text }) => {
    const clipboardData = new DataTransfer();
    if (html) clipboardData.setData('text/html', html);
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  }, { html, text });
}
module.exports = { expectWriting, paste };
