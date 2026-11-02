// Shared preview state only. Callers must supply the request and apply
// functions; this module never accesses the network or browser storage.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./notebook-rich-text.js'));
  else root.LKNotebookTranslation = factory(root.LKNotebookRich);
})(globalThis, Rich => {
  'use strict';
  const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const copy = value => structuredClone(value);
  function create({ read, context, request, apply }) {
    if (![read, context, request, apply].every(value => typeof value === 'function')) throw new TypeError('Translation callbacks required');
    let generation = 0, candidate = null;
    function cancel() { generation++; candidate = null; }
    function canAccept() {
      if (!candidate) return false;
      try {
        return equal(context(), candidate.context) && equal(read(candidate.sourceKey) || '', candidate.source) && equal(read(candidate.targetKey) || '', candidate.target);
      } catch { return false; }
    }
    async function preview({ sourceKey, targetKey, direction } = {}) {
      const current = ++generation; candidate = null;
      if (typeof sourceKey !== 'string' || typeof targetKey !== 'string' || !sourceKey || !targetKey || sourceKey === targetKey || !['en-ja', 'ja-en'].includes(direction)) return { status: 'invalid' };
      let source, target, currentContext;
      try {
        source = copy(read(sourceKey) || ''); target = copy(read(targetKey) || ''); currentContext = copy(context());
        if (!Rich.valid(source) || !Rich.valid(target) || !Rich.text(source).trim()) return { status: 'invalid' };
      } catch { return { status: 'invalid' }; }
      let result;
      // Do not pass field keys or notebook context to the provider callback.
      try { result = await request({ text: Rich.text(source), direction }); }
      catch { return { status: current === generation ? 'error' : 'cancelled' }; }
      if (current !== generation) return { status: 'cancelled' };
      try {
        if (!equal(context(), currentContext) || !equal(read(sourceKey) || '', source) || !equal(read(targetKey) || '', target)) return { status: 'stale' };
        if (!Rich.valid(result) || !Rich.text(result).trim()) return { status: 'invalid' };
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
