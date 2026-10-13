// All fixtures are synthetic. --live additionally exercises the real Redis Lua
// against isolated UUID-scoped test namespaces, removed afterward.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { IDS, SNAPSHOT_SCRIPT, PROMOTE_SCRIPT, validateSnapshot, configuredRedis, encryptedBackup } = require('./promote-private-notebooks');
const fixture = () => ['ok', IDS.map(id => [id, JSON.stringify({ playerId: id, enabled: true, version: 1, salt: 'a'.repeat(64), hash: 'b'.repeat(64) }), ['2099-12-31', '20991231'], ['2099-12-31', JSON.stringify({ revision: 2, fields: { 'daily.en': '\n\nSynthetic migration test.\n\nSecond paragraph.', 'coach.ja': '合成テストのみ' } })]])];
async function main() {
  const snapshot = validateSnapshot(fixture());
  assert.equal(snapshot.length, 2);
  for (const mutate of [
    raw => { raw[1].pop(); },
    raw => { raw[1][0][0] = 'LK-9999'; },
    raw => { raw[1][0][1] = '{}'; },
    raw => { raw[1][0][2][1] = '1'; },
    raw => { raw[1][0][2][0] = '2099-02-31'; },
    raw => { raw[1][0][3] = []; },
    raw => { raw[1][0][3][1] = JSON.stringify({ revision: 2, fields: { secret: 'synthetic' } }); }
  ]) { const raw = fixture(); mutate(raw); assert.throws(() => validateSnapshot(raw), /validation failed/); }
  console.log('Private notebook promotion snapshot validation tests passed.');
  if (!process.argv.includes('--live')) return;
  if (process.platform === 'win32') {
    const filename = encryptedBackup(snapshot);
    try {
      const backup = JSON.parse(fs.readFileSync(filename, 'utf8'));
      const unwrap = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))"], { input: backup.wrappedKey, encoding: 'utf8' });
      assert.equal(unwrap.status, 0);
      const key = Buffer.from(unwrap.stdout.trim(), 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(backup.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(backup.tag, 'base64'));
      const restored = JSON.parse(Buffer.concat([decipher.update(Buffer.from(backup.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
      key.fill(0);
      assert.deepEqual(restored.entries, snapshot);
      assert.ok(!fs.readFileSync(filename, 'utf8').includes('Synthetic migration test'));
      console.log('Synthetic encrypted backup recovery round-trip passed.');
    } finally { fs.unlinkSync(filename); }
  }
  const redis = configuredRedis(), prefix = `uat:private-reflection-migration-test:${crypto.randomUUID()}:`, source = `${prefix}source:`, target = `${prefix}target:`;
  try {
    for (const entry of snapshot) {
      await redis('HSET', `${source}accounts`, entry.id, entry.account);
      await redis('SET', `${source}day:${entry.id}:2099-12-31`, entry.days[0].value, 'EX', 300);
      await redis('ZADD', `${source}dates:${entry.id}`, 20991231, '2099-12-31');
      await redis('EXPIRE', `${source}dates:${entry.id}`, 300);
    }
    await redis('EXPIRE', `${source}accounts`, 300);
    await redis('SET', `${source}session:synthetic-token`, 'synthetic session must not migrate', 'EX', 300);
    const actual = validateSnapshot(await redis('EVAL', SNAPSHOT_SCRIPT, 1, `${source}accounts`, source, ...IDS));
    assert.deepEqual(actual, snapshot);
    const apply = () => redis('EVAL', PROMOTE_SCRIPT, 2, `${source}accounts`, `${target}accounts`, source, target, JSON.stringify(actual));
    await redis('SET', `${source}day:${IDS[0]}:2099-12-31`, 'changed-synthetic-source', 'EX', 300);
    assert.equal((await apply())[0], 'source-changed');
    assert.equal((await redis('KEYS', `${target}*`)).length, 0);
    await redis('SET', `${source}day:${IDS[0]}:2099-12-31`, actual[0].days[0].value, 'EX', 300);
    await redis('SET', `${source}day:${IDS[0]}:2099-12-30`, 'new-unindexed-synthetic-day', 'EX', 300);
    assert.equal((await apply())[0], 'source-changed');
    await redis('DEL', `${source}day:${IDS[0]}:2099-12-30`);
    await redis('SET', `${target}unrelated`, 'existing-synthetic-production', 'EX', 300);
    assert.equal((await apply())[0], 'destination-not-empty');
    assert.equal(await redis('EXISTS', `${target}accounts`), 0);
    await redis('DEL', `${target}unrelated`);
    const concurrent = await Promise.all([apply(), apply()]);
    assert.equal(concurrent.filter(value => value[0] === 'migrated').length, 1);
    assert.equal(concurrent.filter(value => value[0] === 'destination-not-empty').length, 1);
    assert.deepEqual(validateSnapshot(await redis('EVAL', SNAPSHOT_SCRIPT, 1, `${target}accounts`, target, ...IDS)), actual);
    assert.deepEqual(validateSnapshot(await redis('EVAL', SNAPSHOT_SCRIPT, 1, `${source}accounts`, source, ...IDS)), actual);
    assert.equal(await redis('EXISTS', `${target}session:synthetic-token`), 0);
    console.log('Live synthetic Lua migration checks passed: exact copy, source-change refusal, no overwrites, concurrency, preserved originals, no copied sessions.');
  } finally {
    const keys = await redis('KEYS', `${prefix}*`);
    if (keys.length) await redis('DEL', ...keys);
    console.log('Isolated synthetic migration keys removed; no live notebooks used.');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
