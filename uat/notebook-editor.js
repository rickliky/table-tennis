(() => {
  'use strict';
  const Rich = window.LKNotebookRich;
  const words = {
    en: { bold: 'Bold', italic: 'Italic', bullet: 'Bullet list', ordered: 'Numbered list', undo: 'Undo', redo: 'Redo', toolbar: 'Formatting', limit: 'Up to 8,000 characters and limited formatting. The last change was not inserted.', paste: 'Paste keeps supported formatting if available. Plain text and Markdown stay plain. Images and attachments are not supported.' },
    ja: { bold: '太字', italic: '斜体', bullet: '箇条書き', ordered: '番号付きリスト', undo: '元に戻す', redo: 'やり直す', toolbar: '書式', limit: '8,000文字まで、対応する書式のみです。直前の変更は挿入されませんでした。', paste: '対応する書式を貼り付けできます。プレーンテキストやMarkdownはそのままの文字になります。画像・添付ファイルは使えません。' }
  };
  // Inert template parsing: no clipboard HTML is ever inserted into the editor,
  // and no image/iframe/resource URLs are handed to Quill's default converter.
  function pastedDelta(html, plain, editorContent = false) {
    if (!html) return { ops: [{ insert: plain.replace(/\r\n?/g, '\n') }] };
    const template = document.createElement('template'); template.innerHTML = html;
    const ops = [], blocks = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TR', 'TD', 'TH', 'SECTION', 'ARTICLE']);
    const forbidden = new Set(['SCRIPT', 'STYLE', 'SVG', 'MATH', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'VIDEO', 'AUDIO', 'SOURCE', 'LINK', 'META', 'TEMPLATE', 'NOSCRIPT', 'INPUT', 'BUTTON']);
    const endsLine = () => ops.at(-1)?.insert.endsWith('\n');
    const add = (insert, attributes = {}) => { if (insert) ops.push({ insert, ...(Object.keys(attributes).length ? { attributes } : {}) }); };
    function walk(node, inherited = {}, list = '', depth = 0) {
      if (depth > 64 || ops.length > 4096) throw new Error('Clipboard content is too complex');
      if (node.nodeType === Node.TEXT_NODE) { if (/^\s+$/.test(node.textContent) && node.textContent.includes('\n') && node.parentElement?.tagName !== 'PRE' && [...(node.parentElement?.children || [])].some(child => blocks.has(child.tagName) || child.tagName === 'LI')) return; add(node.textContent.replace(/\r\n?/g, '\n'), inherited); return; }
      if (node.nodeType !== Node.ELEMENT_NODE || forbidden.has(node.tagName)) return;
      const tag = node.tagName, attrs = { ...inherited };
      if (['STRONG', 'B'].includes(tag) || /^(bold|[6-9]00)$/.test(node.style.fontWeight)) attrs.bold = true;
      if (['EM', 'I'].includes(tag) || node.style.fontStyle === 'italic') attrs.italic = true;
      if (tag === 'BR') { add('\n'); return; }
      if ((blocks.has(tag) || tag === 'LI') && ops.length && !endsLine()) add('\n');
      const before = ops.length;
      const childList = tag === 'OL' ? 'ordered' : tag === 'UL' ? 'bullet' : list;
      [...node.childNodes].forEach(child => walk(child, attrs, childList, depth + 1));
      if (tag === 'LI') {
        const type = editorContent && ['bullet', 'ordered'].includes(node.dataset.list) ? node.dataset.list : list || 'bullet';
        if (endsLine()) ops.at(-1).attributes = { list: type };
        else add('\n', { list: type });
      } else if (blocks.has(tag) && (!endsLine() || ops.length === before)) add('\n');
    }
    [...template.content.childNodes].forEach(node => walk(node));
    return { ops };
  }
  function mount({ host, value, label, language, field, attribute = 'data-field', onChange }) {
    const copy = words[language], listeners = new AbortController();
    let composing = false, suppress = false, disposed = false, range = null, last = Rich.delta(value);
    host.classList.add('notebook-rich-editor');
    const toolbar = document.createElement('div'); toolbar.className = 'notebook-rich-toolbar'; toolbar.setAttribute('role', 'toolbar'); toolbar.setAttribute('aria-label', `${label} — ${copy.toolbar}`);
    const container = document.createElement('div'), message = document.createElement('p');
    message.className = 'notebook-editor-message'; message.setAttribute('role', 'status');
    host.append(toolbar, container, message);
    const quill = new window.Quill(container, { theme: null, formats: ['bold', 'italic', 'list'], modules: { toolbar: false, history: { delay: 500, maxStack: 100, userOnly: true } } });
    quill.setContents(last, 'silent'); quill.history.clear(); last = structuredClone(quill.getContents());
    const root = quill.root;
    root.setAttribute(attribute, field); root.setAttribute('role', 'textbox'); root.setAttribute('aria-multiline', 'true'); root.setAttribute('aria-label', label); root.setAttribute('spellcheck', 'true');
    const buttons = {};
    function selection() { return quill.getSelection() || range || { index: Math.max(0, quill.getLength() - 1), length: 0 }; }
    function updateButtons() {
      const current = quill.getFormat(selection());
      for (const action of ['bold', 'italic', 'bullet', 'ordered']) buttons[action]?.setAttribute('aria-pressed', String(action === 'bold' || action === 'italic' ? !!current[action] : current.list === action));
      if (buttons.undo) buttons.undo.disabled = !quill.history.stack.undo.length;
      if (buttons.redo) buttons.redo.disabled = !quill.history.stack.redo.length;
    }
    for (const [action, symbol] of [['bold', 'B'], ['italic', 'I'], ['bullet', '•'], ['ordered', '1.'], ['undo', '↶'], ['redo', '↷']]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = symbol; button.title = copy[action]; button.setAttribute('aria-label', copy[action]); button.dataset.richAction = action;
      if (['bold', 'italic', 'bullet', 'ordered'].includes(action)) button.setAttribute('aria-pressed', 'false');
      button.addEventListener('pointerdown', event => event.preventDefault(), { signal: listeners.signal });
      button.addEventListener('click', () => {
        if (composing || host.closest('[inert]')) return;
        const selected = selection(); quill.focus({ preventScroll: true }); quill.setSelection(selected, 'silent');
        if (action === 'undo' || action === 'redo') quill.history[action]();
        else {
          quill.history.cutoff();
          const current = quill.getFormat(selected);
          if (action === 'bold' || action === 'italic') quill.format(action, !current[action], 'user');
          else quill.formatLine(selected.index, selected.length || 1, 'list', current.list === action ? false : action, 'user');
          quill.history.cutoff();
        }
        updateButtons();
      }, { signal: listeners.signal });
      toolbar.append(button); buttons[action] = button;
    }
    function changed() {
      if (disposed || suppress || composing) return;
      const next = Rich.fromDelta(quill.getContents());
      if (!Rich.valid(next)) {
        suppress = true; quill.setContents(last, 'silent'); quill.history.clear(); suppress = false; message.textContent = copy.limit; updateButtons(); return;
      }
      message.textContent = '';
      const contents = quill.getContents();
      if (JSON.stringify(contents) !== JSON.stringify(last)) { last = structuredClone(contents); onChange(next); }
      updateButtons();
    }
    const selectionChanged = selected => { if (disposed) return; if (selected) range = selected; updateButtons(); };
    quill.on('text-change', changed); quill.on('selection-change', selectionChanged);
    root.addEventListener('compositionstart', () => { composing = true; }, { signal: listeners.signal });
    root.addEventListener('compositionend', () => { composing = false; queueMicrotask(changed); }, { signal: listeners.signal });
    root.addEventListener('paste', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      if (composing || host.closest('[inert]') || event.clipboardData?.files.length) return;
      const selected = selection(), html = event.clipboardData?.getData('text/html') || '', plain = event.clipboardData?.getData('text/plain') || '';
      if (html.length > 250000 || (!html && plain.length > 8000)) { message.textContent = copy.limit; return; }
      const Delta = window.Quill.import('delta');
      let pasted;
      try { pasted = pastedDelta(html, plain); } catch { message.textContent = copy.limit; return; }
      if (!pasted.ops.length) return;
      quill.history.cutoff(); quill.updateContents(new Delta().retain(selected.index).delete(selected.length).concat(new Delta(pasted.ops)), 'user');
      quill.setSelection(Math.min(selected.index + new Delta(pasted.ops).length(), quill.getLength() - 1), 0, 'silent'); quill.history.cutoff();
    }, { capture: true, signal: listeners.signal });
    root.addEventListener('drop', event => { event.preventDefault(); event.stopImmediatePropagation(); }, { capture: true, signal: listeners.signal });
    function capture() {
      if (!composing) { quill.update(); changed(); return; }
      // Quill batches DOM mutations during IME composition, so getContents()
      // can still be stale. Snapshot the current DOM ONLY for in-memory recovery
      // before freezing/hiding it; never submit an unfinished composition here.
      const snapshot = root.cloneNode(true);
      snapshot.querySelectorAll('.ql-ui').forEach(node => node.remove());
      snapshot.querySelectorAll('.ql-cursor').forEach(node => node.replaceWith(document.createTextNode(node.textContent.replace(/\uFEFF/g, ''))));
      const next = Rich.fromDelta(pastedDelta(snapshot.innerHTML, '', true));
      if (Rich.valid(next) && JSON.stringify(next) !== JSON.stringify(Rich.fromDelta(last))) { last = Rich.delta(next); onChange(next); }
    }
    updateButtons();
    return { root, quill, capture, get composing() { return composing; }, dispose() { disposed = true; listeners.abort(); quill.off('text-change', changed); quill.off('selection-change', selectionChanged); quill.history.clear(); range = null; last = null; } };
  }
  window.LKNotebookEditor = Object.freeze({ mount, pastedDelta, hint: language => words[language].paste });
})();
