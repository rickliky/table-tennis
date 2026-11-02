// Shared preview state only. Callers must supply the request and apply
// functions; this module never accesses the network or browser storage.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./notebook-rich-text.js'));
  else root.LKNotebookTranslation = factory(root.LKNotebookRich);
})(globalThis, Rich => {
  'use strict';
  const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const copy = value => structuredClone(value);
  // A plain translation can retain whole-line bold/italic and list formatting
  // only when line/blank boundaries are unchanged. Mixed inline formatting
  // cannot be mapped safely across languages; reject rather than flatten it.
  function preserveLineFormatting(source, result) {
    if (typeof source === 'string' || typeof result !== 'string') return result;
    if (result.includes('\r')) return null;
    const lines = []; let line = '', style = null;
    for (const op of source.ops) {
      const pieces = op.insert.split('\n');
      const nextStyle = { ...(op.attributes?.bold ? { bold: true } : {}), ...(op.attributes?.italic ? { italic: true } : {}) };
      for (let index = 0; index < pieces.length; index++) {
        if (pieces[index]) {
          if (style && !equal(style, nextStyle)) return null;
          style = nextStyle; line += pieces[index];
        }
        if (index < pieces.length - 1) {
          lines.push({ text: line, style: style || {}, list: op.attributes?.list });
          line = ''; style = null;
        }
      }
    }
    const translated = result.split('\n');
    if (lines.length !== translated.length || lines.some((item, index) => Boolean(item.text.trim()) !== Boolean(translated[index].trim()))) return null;
    const ops = [];
    lines.forEach((item, index) => {
      if (translated[index]) ops.push({ insert: translated[index], ...(Object.keys(item.style).length ? { attributes: item.style } : {}) });
      ops.push({ insert: '\n', ...(item.list ? { attributes: { list: item.list } } : {}) });
    });
    const candidate = { format: Rich.format, ops };
    return Rich.valid(candidate) ? candidate : null;
  }
  function create({ read, context, request, apply }) {
    if (![read, context, request, apply].every(value => typeof value === 'function')) throw new TypeError('Translation callbacks required');
    let generation = 0, candidate = null, pending = null;
    function cancel() {
      generation++; candidate = null;
      const previous = pending; pending = null;
      previous?.abort();
    }
    function canAccept() {
      if (!candidate) return false;
      try {
        return equal(context(), candidate.context) && equal(read(candidate.sourceKey) || '', candidate.source) && equal(read(candidate.targetKey) || '', candidate.target);
      } catch { return false; }
    }
    async function preview({ sourceKey, targetKey, direction } = {}) {
      cancel();
      const current = generation;
      if (typeof sourceKey !== 'string' || typeof targetKey !== 'string' || !sourceKey || !targetKey || sourceKey === targetKey || !['en-ja', 'ja-en'].includes(direction)) return { status: 'invalid' };
      let source, target, currentContext;
      try {
        source = copy(read(sourceKey) || ''); target = copy(read(targetKey) || ''); currentContext = copy(context());
        if (!Rich.valid(source) || !Rich.valid(target) || !Rich.text(source).trim()) return { status: 'invalid' };
      } catch { return { status: 'invalid' }; }
      const controller = new AbortController(); pending = controller;
      let onAbort;
      const cancelled = new Promise(resolve => { onAbort = () => resolve({ cancelled: true }); controller.signal.addEventListener('abort', onAbort, { once: true }); });
      let operation;
      // Only text/direction are request data; the signal is local control, not
      // notebook context. A callback can ignore abort, so also reject late results.
      try { operation = Promise.resolve(request({ text: Rich.text(source), direction }, { signal: controller.signal })).then(value => ({ value }), () => ({ error: true })); }
      catch { operation = Promise.resolve({ error: true }); }
      const outcome = await Promise.race([operation, cancelled]);
      controller.signal.removeEventListener('abort', onAbort);
      if (pending === controller) pending = null;
      if (current !== generation || outcome.cancelled) return { status: 'cancelled' };
      if (outcome.error) return { status: 'error' };
      let result = outcome.value;
      try {
        if (!equal(context(), currentContext) || !equal(read(sourceKey) || '', source) || !equal(read(targetKey) || '', target)) return { status: 'stale' };
        if (!Rich.valid(result) || !Rich.text(result).trim()) return { status: 'invalid' };
        result = preserveLineFormatting(source, result);
        if (result === null) return { status: 'format-unavailable' };
        candidate = { sourceKey, targetKey, source, target, context: currentContext, result: copy(result) };
        return { status: 'ready', value: copy(result) };
      } catch { return { status: 'invalid' }; }
    }
    function accept() {
      if (!canAccept()) { cancel(); return { status: 'stale' }; }
      const { targetKey, result } = candidate;
      cancel();
      try { apply(targetKey, copy(result)); return { status: 'applied' }; }
      catch { return { status: 'error' }; }
    }
    return Object.freeze({ preview, canAccept, accept, cancel });
  }
  return Object.freeze({ create });
});
