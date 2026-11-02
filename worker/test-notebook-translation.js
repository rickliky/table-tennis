import assert from 'node:assert/strict';
import Translation from '../notebook-translation.js';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const request = { sourceKey: 'daily.en', targetKey: 'daily.ja', direction: 'en-ja' };
function fixture(provider) {
  const values = { 'daily.en': 'Synthetic source', 'daily.ja': 'Existing target' }, calls = [], writes = [];
  let day = '2026-10-10';
  const session = Translation.create({
    read: key => values[key], context: () => day,
    request: async value => { calls.push(value); return provider(value); },
    apply: (key, value) => { writes.push({ key, value }); values[key] = value; }
  });
  return { values, calls, writes, session, setDay: value => { day = value; } };
}
const rich = { format: 'lk-rich-v1', ops: [{ insert: 'Synthetic translated title', attributes: { bold: true } }, { insert: '\n', attributes: { list: 'bullet' } }] };

{
  const f = fixture(async () => rich);
  assert.deepEqual(await f.session.preview(request), { status: 'ready', value: rich });
  assert.deepEqual(f.calls, [{ text: 'Synthetic source', direction: 'en-ja' }]);
  assert.deepEqual(f.writes, []); assert.equal(f.values['daily.ja'], 'Existing target');
  assert.equal(f.session.canAccept(), true); assert.deepEqual(f.session.accept(), { status: 'applied' });
  assert.deepEqual(f.values['daily.ja'], rich); assert.equal(f.values['daily.en'], 'Synthetic source');
  assert.equal(f.session.canAccept(), false); assert.deepEqual(f.session.accept(), { status: 'stale' });
}
for (const change of ['source', 'target', 'context']) {
  const pending = deferred(), f = fixture(() => pending.promise);
  const result = f.session.preview(request);
  if (change === 'source') f.values['daily.en'] = 'Changed source';
  if (change === 'target') f.values['daily.ja'] = 'Changed target';
  if (change === 'context') f.setDay('2026-10-11');
  pending.resolve('Synthetic result');
  assert.deepEqual(await result, { status: 'stale' }); assert.deepEqual(f.writes, []);
}
for (const change of ['source', 'target', 'context']) {
  const f = fixture(async () => 'Synthetic result');
  assert.equal((await f.session.preview(request)).status, 'ready');
  if (change === 'source') f.values['daily.en'] = 'Changed source';
  if (change === 'target') f.values['daily.ja'] = 'Changed target';
  if (change === 'context') f.setDay('2026-10-11');
  assert.equal(f.session.canAccept(), false); assert.deepEqual(f.session.accept(), { status: 'stale' }); assert.deepEqual(f.writes, []);
}
{
  const first = deferred(), second = deferred(); let count = 0;
  const f = fixture(() => (++count === 1 ? first.promise : second.promise));
  const older = f.session.preview(request), newer = f.session.preview(request);
  second.resolve('Newer result'); assert.equal((await newer).status, 'ready');
  first.resolve('Older result'); assert.deepEqual(await older, { status: 'cancelled' });
  assert.deepEqual(f.session.accept(), { status: 'applied' }); assert.equal(f.values['daily.ja'], 'Newer result');
}
{
  const pending = deferred(), f = fixture(() => pending.promise), result = f.session.preview(request);
  f.session.cancel(); pending.resolve('Cancelled result'); assert.deepEqual(await result, { status: 'cancelled' });
  assert.equal(f.session.canAccept(), false); assert.deepEqual(f.writes, []);
}
for (const result of ['', 'x'.repeat(8001), { html: '<img src=x>' }]) {
  const f = fixture(async () => result); assert.deepEqual(await f.session.preview(request), { status: 'invalid' }); assert.deepEqual(f.writes, []);
}
{
  const f = fixture(async () => { throw new Error('Synthetic private data and provider credentials must not be returned'); });
  assert.deepEqual(await f.session.preview(request), { status: 'error' }); assert.deepEqual(f.writes, []);
  f.values['daily.en'] = '';
  assert.deepEqual(await f.session.preview(request), { status: 'invalid' }); assert.equal(f.calls.length, 1);
  assert.deepEqual(await f.session.preview({ ...request, targetKey: request.sourceKey }), { status: 'invalid' });
}
console.log('Notebook translation preview: synthetic cancellation, stale-result and explicit-apply safeguards passed.');
