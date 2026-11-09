// Local, extractive preparation from the notebook owner's own match notes.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LKOpponentPrep = factory();
})(globalThis, () => {
  'use strict';

  const maxDates = 12, maxCards = 30;
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '2000-01-01' && value <= '2100-12-31' && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

  // Only named translation sections are eligible. Unmarked originals are not
  // guessed to be translations or silently substituted for a missing language.
  function heading(line) {
    const clean = line.normalize('NFKC').trim().replace(/^#{1,6}\s*/, '').replace(/^[^\p{L}\p{N}]+/u, '').replace(/^\d+[.)]\s*/, '').replace(/\*{1,3}/g, '').trim();
    const english = clean.match(/^english\s+back[\s\-\u2010-\u2015]*translation(?:\s*\([^)]{0,40}\))?\s*(?:[:\u2013\u2014-]\s*(.*))?$/iu);
    if (english) return { language: 'en', inline: english[1] || '' };
    const japanese = clean.match(/^(?:japanese\s+translation(?:\s*\(\s*日本語訳\s*\))?|日本語訳)\s*(?:[:\u2013\u2014-]\s*(.*))?$/iu);
    if (japanese) return { language: 'ja', inline: japanese[1] || '' };
    return null;
  }

  function otherHeading(line) {
    const value = line.normalize('NFKC').trim();
    const clean = value.replace(/^[^\p{L}\p{N}]+/u, '').replace(/^\d+[.)]\s*/, '').replace(/\*{1,3}/g, '').replace(/\s*:\s*$/, '').trim();
    const subheading = /^(?:what\s+i\s+did\s+well|things\s+to\s+improve|next(?:\s+match|\s+time|\s+focus)?|よかったこと|改善点|次(?:の試合|に向けて))$/iu.test(clean);
    if (subheading) return false;
    if (/^(?:#{1,6}\s+|[-=_]{3,}\s*$)/u.test(value)) return true;
    if (/^(?:(?:original|polished|refined|revised|improved)\s+english|english\s+(?:original|version|reflection|translation)|japanese\s+(?:original|version|reflection)|coach(?:'s)?\s+(?:feedback|advice|analysis)|original\s+reflection|コーチ(?:の)?(?:アドバイス|コメント)|英語の原文|日本語の原文)$/iu.test(clean)) return true;
    // Markdown headings mark the end, except common subheadings inside the
    // translated reflection itself. Rich-text emphasis is preserved as text.
    if (/^\*\*[^*\n]{1,100}\*\*\s*:?\s*$/u.test(value)) {
      if (/[.!?。！？]$/u.test(clean)) return false;
      return true;
    }
    if (/^.{1,100}:\s*$/u.test(value)) return true;
    return false;
  }

  function sections(value, language) {
    if (typeof value !== 'string' || !['en', 'ja'].includes(language)) return [];
    const found = [];
    let selected = false, current = [];
    const finish = () => { const text = current.join('\n').trim(); if (selected && text) found.push(text); selected = false; current = []; };
    for (const line of value.replace(/\r\n?/g, '\n').split('\n')) {
      const marker = heading(line);
      if (marker) { finish(); selected = marker.language === language; if (selected && marker.inline) current.push(marker.inline); continue; }
      if (selected && otherHeading(line)) { finish(); continue; }
      if (selected) current.push(line);
    }
    finish();
    return found;
  }

  function sectionText(value, toText) {
    if (typeof value === 'string') return value;
    const plain = toText(value);
    if (!plain || value?.format !== 'lk-rich-v1' || !Array.isArray(value.ops)) return plain || '';
    const lines = []; let line = '', allBold = true, hasText = false;
    for (const op of value.ops) {
      const pieces = op.insert.split('\n');
      pieces.forEach((piece, index) => {
        line += piece;
        if (piece.trim()) { hasText = true; if (!op.attributes?.bold) allBold = false; }
        if (index < pieces.length - 1) {
          lines.push(hasText && allBold && !op.attributes?.list && line.trim().length <= 100 ? `**${line}**` : line);
          line = ''; allBold = true; hasText = false;
        }
      });
    }
    if (line) lines.push(line);
    return lines.join('\n');
  }

  function matchSections(fields, key, language, toText = () => '') {
    if (!fields || !/^(?:training|tournament):[A-Za-z0-9_-]+$/.test(key) || !['en', 'ja'].includes(language)) return [];
    const seen = new Set(), output = [];
    for (const fieldLanguage of language === 'en' ? ['en', 'ja'] : ['ja', 'en']) {
      const value = fields[`match.${key}.${fieldLanguage}`];
      const text = sectionText(value, toText);
      for (const section of sections(text, language)) {
        if (seen.has(section)) continue;
        seen.add(section); output.push({ text: section, fieldLanguage });
      }
    }
    return output;
  }

  const isFocus = (value, language) => (language === 'ja' ? /次|練習|改善|意識|課題|目標|したい|ように/u : /\b(?:next|focus|practi[cs]e|improv\w*|try|aim|should|need|want|will)\b/iu).test(value);
  function takeaways(text, language) {
    const fragments = String(text).split(/\n+/u).flatMap(line => line.match(/[^.!?。！？]+(?:[.!?。！？]+|$)/gu) || [])
      .map(line => line.trim().replace(/^#{1,6}\s*/u, '').replace(/^(?:[-*•]\s+|\d+[.)]\s+)/u, '').replace(/^\*\*|\*\*$/gu, '').trim())
      .filter(line => line && !/^(?:what\s+i\s+did\s+well|things\s+to\s+improve|next(?:\s+match|\s+time|\s+focus)?|よかったこと|改善点|次(?:の試合|に向けて))\s*[:：]?$/iu.test(line));
    const selected = fragments.map((value, index) => ({ value, index, priority: isFocus(value, language) ? 1 : 0 }))
      .sort((a, b) => b.priority - a.priority || a.index - b.index).slice(0, 3).sort((a, b) => a.index - b.index);
    return selected.map(({ value }) => value.length > 400 ? `${value.slice(0, 400).trimEnd()}…` : value);
  }

  const nextFocus = (text, language) => takeaways(text, language).find(value => isFocus(value, language)) || '';
  return Object.freeze({ maxDates, maxCards, validDate, sections, matchSections, takeaways, nextFocus });
});
