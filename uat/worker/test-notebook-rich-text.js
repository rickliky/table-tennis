import assert from 'node:assert/strict';
import Rich from '../notebook-rich-text.js';

const value = { format: 'lk-rich-v1', ops: [{ insert: '\n\n' }, { insert: 'Synthetic <unsafe> text', attributes: { bold: true, italic: true } }, { insert: '\n', attributes: { list: 'bullet' } }, { insert: 'Next item' }, { insert: '\n', attributes: { list: 'ordered' } }] };
assert.ok(Rich.valid(value));
assert.equal(Rich.text(value), '\n\nSynthetic <unsafe> text\nNext item');
assert.ok(Rich.html(value).includes('<ul><li><em><strong>Synthetic &lt;unsafe&gt; text</strong></em></li></ul>'));
assert.ok(Rich.html(value).includes('<ol><li>Next item</li></ol>'));
for (const plain of ['', '\n\nLeading blank lines\n\n', '日本語とemoji 🏓', '<script>not HTML</script>']) {
  assert.equal(Rich.fromDelta(Rich.delta(plain)), plain);
  assert.ok(Rich.valid(plain));
}
assert.ok(Rich.valid('x'.repeat(8000)));
assert.ok(!Rich.valid('x'.repeat(8001)));
for (const invalid of [
  null, [], { format: 'html', ops: value.ops }, { ...value, html: '<b>unsafe</b>' },
  { format: 'lk-rich-v1', ops: [] },
  { format: 'lk-rich-v1', ops: [{ insert: 'Missing terminal newline' }] },
  { format: 'lk-rich-v1', ops: [{ insert: { image: 'https://bad.test' } }] },
  { format: 'lk-rich-v1', ops: [{ insert: '\n', retain: 1 }] },
  { format: 'lk-rich-v1', ops: [{ insert: 'x', attributes: { link: 'javascript:alert(1)' } }, { insert: '\n' }] },
  { format: 'lk-rich-v1', ops: [{ insert: 'x', attributes: { color: 'red' } }, { insert: '\n' }] },
  { format: 'lk-rich-v1', ops: [{ insert: 'x', attributes: { bold: 'true' } }, { insert: '\n' }] },
  { format: 'lk-rich-v1', ops: [{ insert: 'x\n', attributes: { bold: true } }] },
  { format: 'lk-rich-v1', ops: [{ insert: 'x', attributes: { list: 'bullet' } }, { insert: '\n' }] },
  { format: 'lk-rich-v1', ops: [{ insert: '\n', attributes: { list: 'check' } }] },
  { format: 'lk-rich-v1', ops: [{ insert: 'x'.repeat(8001) + '\n' }] },
  { format: 'lk-rich-v1', ops: Array.from({ length: 2049 }, () => ({ insert: '\n' })) }
]) { assert.equal(Rich.valid(invalid), false); }
assert.equal(Rich.html('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
console.log('Restricted notebook rich-text schema, exact plain-text compatibility and escaped rendering tests passed.');
