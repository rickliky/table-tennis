// Shared, DOM-free storage schema and safe renderer. Browser + Worker/Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LKNotebookRich = factory();
})(globalThis, () => {
  'use strict';
  const format = 'lk-rich-v1', maxOps = 2048;
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const keysOnly = (value, keys) => Object.keys(value).every(key => keys.includes(key));
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  function valid(value, limit = 8000) {
    if (typeof value === 'string') return value.length <= limit;
    if (!object(value) || !keysOnly(value, ['format', 'ops']) || value.format !== format || !Array.isArray(value.ops) || !value.ops.length || value.ops.length > maxOps) return false;
    let length = 0;
    for (const op of value.ops) {
      if (!object(op) || !keysOnly(op, ['insert', 'attributes']) || typeof op.insert !== 'string' || !op.insert.length || op.insert.includes('\r')) return false;
      length += op.insert.length;
      if (op.attributes !== undefined) {
        const attrs = op.attributes;
        if (!object(attrs) || !Object.keys(attrs).length || !keysOnly(attrs, ['bold', 'italic', 'list'])) return false;
        if (attrs.bold !== undefined && attrs.bold !== true || attrs.italic !== undefined && attrs.italic !== true) return false;
        if (attrs.list !== undefined && (!['bullet', 'ordered'].includes(attrs.list) || op.insert !== '\n' || attrs.bold || attrs.italic)) return false;
        if ((attrs.bold || attrs.italic) && op.insert.includes('\n')) return false;
      }
    }
    return length - 1 <= limit && value.ops.at(-1).insert.endsWith('\n') && JSON.stringify(value).length <= 60000;
  }
  function text(value) {
    if (typeof value === 'string') return value;
    return valid(value) ? value.ops.map(op => op.insert).join('').slice(0, -1) : '';
  }
  function delta(value) {
    return typeof value === 'string' ? { ops: [{ insert: `${value}\n` }] } : valid(value) ? { ops: structuredClone(value.ops) } : { ops: [{ insert: '\n' }] };
  }
  function fromDelta(value) {
    const ops = [];
    const append = (insert, attributes) => {
      if (!insert) return;
      const previous = ops.at(-1), attrs = Object.keys(attributes).length ? attributes : undefined;
      if (previous && JSON.stringify(previous.attributes) === JSON.stringify(attrs) && !attrs?.list) previous.insert += insert;
      else ops.push({ insert, ...(attrs ? { attributes: attrs } : {}) });
    };
    for (const op of value.ops || []) {
      if (typeof op.insert !== 'string') continue; // Never retain embeds.
      const attrs = op.attributes || {}, inline = { ...(attrs.bold === true ? { bold: true } : {}), ...(attrs.italic === true ? { italic: true } : {}) };
      const pieces = op.insert.replace(/\r\n?/g, '\n').split('\n');
      pieces.forEach((piece, index) => {
        append(piece, inline);
        if (index < pieces.length - 1) append('\n', ['bullet', 'ordered'].includes(attrs.list) ? { list: attrs.list } : {});
      });
    }
    if (!ops.length || !ops.at(-1).insert.endsWith('\n')) append('\n', {});
    const result = { format, ops };
    // Unformatted edits remain legacy strings; opening a note never rewrites it.
    return ops.some(op => op.attributes) ? result : ops.map(op => op.insert).join('').slice(0, -1);
  }
  function html(value) {
    if (typeof value === 'string') return escapeHtml(value);
    if (!valid(value)) return '';
    let output = '', line = '', list = '';
    const finish = type => {
      const tag = type === 'ordered' ? 'ol' : type === 'bullet' ? 'ul' : '';
      if (list && list !== tag) { output += `</${list}>`; list = ''; }
      if (tag && !list) { output += `<${tag}>`; list = tag; }
      output += tag ? `<li>${line || '<br>'}</li>` : `<p>${line || '<br>'}</p>`;
      line = '';
    };
    for (const op of value.ops) {
      const attrs = op.attributes || {}, pieces = op.insert.split('\n');
      pieces.forEach((piece, index) => {
        let escaped = escapeHtml(piece);
        if (attrs.bold) escaped = `<strong>${escaped}</strong>`;
        if (attrs.italic) escaped = `<em>${escaped}</em>`;
        line += escaped;
        if (index < pieces.length - 1) finish(attrs.list);
      });
    }
    if (list) output += `</${list}>`;
    return output;
  }
  function practiceTemplate() {
    const headings = ['Things to Improve', 'What I Practised Today', 'What I Noticed or Learned Today'];
    return { format, ops: headings.flatMap((heading, index) => [
      ...(index ? [{ insert: '\n' }] : []),
      { insert: heading, attributes: { bold: true } }, { insert: '\n' },
      { insert: '\n', attributes: { list: 'bullet' } }
    ]) };
  }
  return Object.freeze({ format, valid, text, delta, fromDelta, html, practiceTemplate });
});
