import assert from 'node:assert/strict';
import Rich from '../notebook-rich-text.js';

const value = { format: 'lk-rich-v1', ops: [{ insert: '\n\n' }, { insert: 'Synthetic <unsafe> text', attributes: { bold: true, italic: true } }, { insert: '\n', attributes: { list: 'bullet' } }, { insert: 'Next item' }, { insert: '\n', attributes: { list: 'ordered' } }] };
for (const [id, headings] of [
  ['LK-0080', ['Things to Improve', 'What I Practised Today', 'What I Noticed or Learned Today']],
  ['LK-0002', ['What I Did Well', 'Things to Improve']]
]) {
  const template = Rich.practiceTemplate(id, '2026-10-13');
  assert.ok(Rich.valid(template));
  assert.equal(Rich.text(template), `13 October 2026 (Tuesday)\n\n${headings.map(heading => `${heading}\n`).join('\n\n')}`);
  assert.equal(template.ops.filter(op => op.attributes?.list === 'bullet').length, headings.length);
  assert.deepEqual(template.ops.filter(op => op.attributes?.bold).map(op => op.insert), headings);
  assert.ok(Rich.text(Rich.practiceTemplate(id, '2027-01-02')).startsWith('2 January 2027 (Saturday)\n\n'));
}
assert.equal(Rich.practiceTemplate('LK-0003', '2026-10-13'), '');
assert.equal(Rich.practiceTemplate('LK-0002', '2026-02-30'), '');
const matchTemplate = Rich.matchTemplate({ englishName: 'Player A' }, { opponentEnglishName: 'Player B', score: '3-1' });
assert.ok(Rich.valid(matchTemplate));
assert.equal(Rich.text(matchTemplate), 'Match: Player A 3 - 1 Player B\n\nWhat I Did Well:\n\n\nThings to Improve:\n');
assert.deepEqual(matchTemplate.ops.filter(op => op.attributes?.bold).map(op => op.insert), ['What I Did Well:', 'Things to Improve:']);
assert.equal(matchTemplate.ops.filter(op => op.attributes?.list === 'bullet').length, 2);
assert.ok(Rich.text(Rich.matchTemplate({ displayName: '合成選手' }, { opponentId: 'EXT-SYNTHETIC', score: '0-3' })).startsWith('Match: 合成選手 0 - 3 EXT-SYNTHETIC\n'));
assert.ok(Rich.text(Rich.matchTemplate({ englishName: 'Player A' }, { opponentName: 'Incomplete opponent', score: '1-2' })).includes('1 - 2'));
assert.ok(!Rich.html(Rich.matchTemplate({ englishName: '<img src=x>' }, { opponentName: '<script>synthetic</script>', score: '3-0' })).includes('<script>'));
for (const match of [{ opponentName: 'Opponent' }, { score: '3-1' }, { opponentName: 'Opponent', score: 'unknown' }]) assert.equal(Rich.matchTemplate({ englishName: 'Player A' }, match), '');
assert.equal(Rich.matchTemplate({}, { opponentName: 'Opponent', score: '3-1' }), '');
assert.equal(Rich.matchTemplate({ englishName: 'x'.repeat(8000) }, { opponentName: 'Opponent', score: '3-1' }), '');
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
