import assert from 'node:assert/strict';
import Translation from '../notebook-translation.js';
import Rich from '../notebook-rich-text.js';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const request = { sourceKey: 'daily.en', targetKey: 'daily.ja', direction: 'en-ja' };
function fixture(provider) {
  const values = { 'daily.en': 'Synthetic source', 'daily.ja': 'Existing target' }, calls = [], controls = [], writes = [];
  let day = '2026-10-10';
  const session = Translation.create({
    read: key => values[key], context: () => day,
    request: (value, options) => { calls.push(value); controls.push(options); return provider(value, options); },
    apply: (key, value) => { writes.push({ key, value }); values[key] = value; }
  });
  return { values, calls, controls, writes, session, setDay: value => { day = value; } };
}
const rich = { format: 'lk-rich-v1', ops: [{ insert: 'Synthetic translated title', attributes: { bold: true } }, { insert: '\n', attributes: { list: 'bullet' } }] };

{
  const f = fixture(async () => rich);
  assert.deepEqual(await f.session.preview(request), { status: 'ready', value: rich });
  assert.deepEqual(f.calls, [{ text: 'Synthetic source', direction: 'en-ja' }]);
  assert.ok(f.controls[0].signal instanceof AbortSignal); assert.equal(f.controls[0].signal.aborted, false);
  assert.deepEqual(f.writes, []); assert.equal(f.values['daily.ja'], 'Existing target');
  assert.equal(f.session.canAccept(), true); assert.deepEqual(f.session.accept(), { status: 'applied' });
  assert.deepEqual(f.values['daily.ja'], rich); assert.equal(f.values['daily.en'], 'Synthetic source');
  assert.equal(f.session.canAccept(), false); assert.deepEqual(f.session.accept(), { status: 'stale' });
}
{
  const source = { format: 'lk-rich-v1', ops: [
    { insert: 'Synthetic heading', attributes: { bold: true } }, { insert: '\n' },
    { insert: 'Synthetic bullet', attributes: { italic: true } }, { insert: '\n', attributes: { list: 'bullet' } },
    { insert: '\n', attributes: { list: 'bullet' } },
    { insert: 'Synthetic numbered item' }, { insert: '\n', attributes: { list: 'ordered' } }
  ] };
  const f = fixture(async () => '見出し\n<script>合成</script>\n\n番号付き');
  f.values['daily.en'] = structuredClone(source);
  const result = await f.session.preview(request);
  assert.equal(result.status, 'ready'); assert.equal(Rich.valid(result.value), true);
  assert.deepEqual(result.value.ops, [
    { insert: '見出し', attributes: { bold: true } }, { insert: '\n' },
    { insert: '<script>合成</script>', attributes: { italic: true } }, { insert: '\n', attributes: { list: 'bullet' } },
    { insert: '\n', attributes: { list: 'bullet' } },
    { insert: '番号付き' }, { insert: '\n', attributes: { list: 'ordered' } }
  ]);
  assert.match(Rich.html(result.value), /&lt;script&gt;/); assert.ok(!Rich.html(result.value).includes('<script>'));
  assert.deepEqual(f.values['daily.en'], source); assert.equal(f.values['daily.ja'], 'Existing target');
  assert.deepEqual(f.writes, []); assert.deepEqual(f.session.accept(), { status: 'applied' });
  assert.deepEqual(f.values['daily.ja'], result.value); assert.deepEqual(f.values['daily.en'], source);
}
for (const output of ['One translated line', 'One\nTwo\nUnexpected blank replacement\nFour', 'One\nTwo\n\nFour\nExtra']) {
  const f = fixture(async () => output);
  f.values['daily.en'] = { format: 'lk-rich-v1', ops: [{ insert: 'Heading\nBullet\n\nNumbered\n' }] };
  assert.deepEqual(await f.session.preview(request), { status: 'format-unavailable' });
  assert.equal(f.session.canAccept(), false); assert.deepEqual(f.writes, []);
}
{
  const f = fixture(async () => '合成の翻訳');
  f.values['daily.en'] = { format: 'lk-rich-v1', ops: [{ insert: 'Bold', attributes: { bold: true } }, { insert: ' and unstyled\n' }] };
  assert.deepEqual(await f.session.preview(request), { status: 'format-unavailable' }, 'Mixed inline styles must not be flattened silently');
  assert.deepEqual(f.writes, []);
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
  assert.equal(f.controls[0].signal.aborted, true, 'A newer preview cancels the earlier request');
  assert.deepEqual(await older, { status: 'cancelled' });
  second.resolve('Newer result'); assert.equal((await newer).status, 'ready');
  first.resolve('Older result');
  assert.deepEqual(f.session.accept(), { status: 'applied' }); assert.equal(f.values['daily.ja'], 'Newer result');
}
{
  const pending = deferred(), f = fixture(() => pending.promise), result = f.session.preview(request);
  f.session.cancel(); assert.equal(f.controls[0].signal.aborted, true);
  assert.deepEqual(await result, { status: 'cancelled' }, 'Cancellation settles even if a callback ignores its signal');
  pending.resolve('Cancelled result'); await Promise.resolve();
  assert.equal(f.session.canAccept(), false); assert.deepEqual(f.writes, []);
}
{
  let aborted = false;
  const f = fixture((value, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('Synthetic upstream detail')); }, { once: true })));
  const result = f.session.preview(request); f.session.cancel();
  assert.equal(aborted, true); assert.deepEqual(await result, { status: 'cancelled' });
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
