// Opt-in integration check for the actual Lua transaction, not a mock.
// Uses four unique synthetic UAT-test keys; never touches live accounts/journals.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { privateRedis, SAVE_SCRIPT } from './src/private-reflections.js';

if (!process.argv.includes('--live')) throw new Error('Pass --live to test the configured Upstash database using isolated synthetic keys');
const env = { ...process.env };
if ((!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) && fs.existsSync('upstash.env')) {
  for (const line of fs.readFileSync('upstash.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(UPSTASH_REDIS_REST_URL|UPSTASH_REDIS_REST_TOKEN)\s*=\s*["']?(.*?)["']?\s*$/);
    if (match) env[match[1]] = match[2];
  }
}
if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) throw new Error('Configure the Upstash REST environment variables or gitignored upstash.env');
const redis = privateRedis(env), prefix = `uat:private-reflection-test:${crypto.randomUUID()}:`;
const keys = ['accounts', 'day', 'dates', 'session'].map(type => `${prefix}${type}`);
try {
  await redis('HSET', keys[0], 'LK-TEST', JSON.stringify({ enabled: true, version: 1 }));
  await redis('EXPIRE', keys[0], 300);
  await redis('SET', keys[3], 'synthetic-session', 'EX', 300);
  const save = (revision, patch, version = 1) => redis('EVAL', SAVE_SCRIPT, 4, ...keys, 'LK-TEST', version, revision, JSON.stringify(patch), '2026-10-13T00:00:00Z', 20991231, '2099-12-31');
  const concurrent = await Promise.all(['one', 'two', 'three'].map(text => save(0, { 'daily.en': `Synthetic transaction test ${text}` })));
  assert.equal(concurrent.filter(value => value[0] === 'saved').length, 1);
  assert.equal(concurrent.filter(value => value[0] === 'conflict').length, 2);
  assert.equal((await save(1, { 'coach.ja': '合成テストのみ' }))[0], 'saved');
  const day = JSON.parse(await redis('GET', keys[1]));
  assert.equal(day.revision, 2);
  assert.ok(day.fields['daily.en'].startsWith('Synthetic transaction test'));
  assert.equal(day.fields['coach.ja'], '合成テストのみ');
  assert.deepEqual(await redis('ZREVRANGE', keys[2], 0, -1), ['2099-12-31']);
  const rich = { format: 'lk-rich-v1', ops: [{ insert: '\n\n' }, { insert: 'Synthetic bold <not HTML>', attributes: { bold: true } }, { insert: '\n', attributes: { list: 'bullet' } }, { insert: '合成の斜体', attributes: { italic: true } }, { insert: '\n', attributes: { list: 'ordered' } }] };
  assert.equal((await save(2, { 'daily.en': rich }))[0], 'saved');
  const formattedDay = JSON.parse(await redis('GET', keys[1]));
  assert.deepEqual(formattedDay.fields['daily.en'], rich);
  assert.equal(formattedDay.fields['coach.ja'], day.fields['coach.ja']);
  assert.equal((await save(2, { 'daily.en': 'Stale synthetic rich revision' }))[0], 'conflict');
  assert.equal((await save(3, { 'daily.en': 'Must not be saved' }, 2))[0], 'unauthorized');
  await redis('DEL', keys[3]);
  assert.equal((await save(3, { 'daily.en': 'Must not be saved' }))[0], 'unauthorized');
  console.log('Live Redis Lua atomic plain/rich save, exact structured round-trip, field preservation, date index and revocation checks passed.');
} finally {
  await redis('DEL', ...keys);
  console.log('Isolated synthetic test keys removed. No live player data touched.');
}
