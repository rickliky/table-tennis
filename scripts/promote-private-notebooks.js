#!/usr/bin/env node
// Restricted, opt-in migration for the two approved initial accounts only.
// Never prints writing, dates, password verifiers, or session tokens.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const IDS = ['LK-0002', 'LK-0080'];
const SOURCE = 'uat:private-reflection:', TARGET = 'prod:private-reflection:';

// Atomic snapshot: sessions and rate-limit keys are deliberately excluded.
const SNAPSHOT_SCRIPT = `
local entries = {}
if redis.call('HLEN', KEYS[1]) ~= #ARGV - 1 then return {'unexpected-accounts'} end
for i = 2, #ARGV do
  local id = ARGV[i]
  local account = redis.call('HGET', KEYS[1], id)
  if not account then return {'missing-account'} end
  local documents = {}
  local keys = redis.call('KEYS', ARGV[1] .. 'day:' .. id .. ':*')
  table.sort(keys)
  for _, key in ipairs(keys) do
    table.insert(documents, string.sub(key, #ARGV[1] + #id + 6))
    table.insert(documents, redis.call('GET', key))
  end
  table.insert(entries, {id, account, redis.call('ZRANGE', ARGV[1] .. 'dates:' .. id, 0, -1, 'WITHSCORES'), documents})
end
return {'ok', entries}
`;

// Validate ALL source and destination state before writing anything. Refuse a
// changed source snapshot or any existing production namespace; never overwrite.
const PROMOTE_SCRIPT = `
local source, target = ARGV[1], ARGV[2]
local entries = cjson.decode(ARGV[3])
if #redis.call('KEYS', target .. '*') ~= 0 then return {'destination-not-empty'} end
if redis.call('HLEN', KEYS[1]) ~= #entries then return {'source-changed'} end
for _, entry in ipairs(entries) do
  if redis.call('HGET', KEYS[1], entry.id) ~= entry.account then return {'source-changed'} end
  local dates = redis.call('ZRANGE', source .. 'dates:' .. entry.id, 0, -1, 'WITHSCORES')
  if #dates ~= #entry.dates then return {'source-changed'} end
  for i, value in ipairs(dates) do
    if tostring(value) ~= tostring(entry.dates[i]) then return {'source-changed'} end
  end
  if #redis.call('KEYS', source .. 'day:' .. entry.id .. ':*') ~= #entry.days then return {'source-changed'} end
  for _, day in ipairs(entry.days) do
    if redis.call('GET', source .. 'day:' .. entry.id .. ':' .. day.date) ~= day.value then return {'source-changed'} end
  end
end
for _, entry in ipairs(entries) do
  redis.call('HSET', KEYS[2], entry.id, entry.account)
  for _, day in ipairs(entry.days) do
    redis.call('SET', target .. 'day:' .. entry.id .. ':' .. day.date, day.value)
  end
  for i = 1, #entry.dates, 2 do
    redis.call('ZADD', target .. 'dates:' .. entry.id, entry.dates[i + 1], entry.dates[i])
  end
end
return {'migrated', tostring(#entries)}
`;

function validateSnapshot(raw) {
  const invalid = () => { throw new Error('Notebook snapshot validation failed; no private content printed'); };
  if (raw?.[0] !== 'ok' || !Array.isArray(raw[1]) || raw[1].length !== IDS.length) invalid();
  return raw[1].map((entry, index) => {
    const [id, account, dates, documents] = entry;
    if (id !== IDS[index] || typeof account !== 'string' || !Array.isArray(dates) || !Array.isArray(documents) || dates.length % 2 || documents.length % 2) invalid();
    let credential;
    try { credential = JSON.parse(account); } catch { invalid(); }
    if (credential.playerId !== id || credential.enabled !== true || !Number.isSafeInteger(credential.version) || credential.version < 1 || !/^[a-f0-9]{64}$/.test(credential.salt) || !/^[a-f0-9]{64}$/.test(credential.hash)) invalid();
    const savedDates = new Set();
    for (let i = 0; i < dates.length; i += 2) {
      const date = dates[i];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2000-01-01' || date > '2100-12-31' || !Number.isFinite(Date.parse(date)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || String(dates[i + 1]) !== date.replace(/-/g, '') || savedDates.has(date)) invalid();
      savedDates.add(date);
    }
    const days = [];
    for (let i = 0; i < documents.length; i += 2) {
      const date = documents[i], value = documents[i + 1];
      if (!savedDates.delete(date) || typeof value !== 'string') invalid();
      let document;
      try { document = JSON.parse(value); } catch { invalid(); }
      if (!Number.isSafeInteger(document.revision) || document.revision < 0 || !document.fields || typeof document.fields !== 'object' || Array.isArray(document.fields)) invalid();
      for (const [key, text] of Object.entries(document.fields)) {
        if (!/^(activity|daily\.(en|ja)|coach\.(en|ja)|match\.(training|tournament):[A-Za-z0-9_-]+\.(en|ja))$/.test(key) || typeof text !== 'string' || text.length > (key === 'activity' ? 160 : 8000)) invalid();
      }
      if (JSON.stringify(document.fields).length > 250000) invalid();
      days.push({ date, value });
    }
    if (savedDates.size) invalid();
    return { id, account, dates, days };
  });
}

function configuredRedis() {
  const env = { ...process.env };
  if ((!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) && fs.existsSync('upstash.env')) {
    for (const line of fs.readFileSync('upstash.env', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(UPSTASH_REDIS_REST_URL|UPSTASH_REDIS_REST_TOKEN)\s*=\s*["']?(.*?)["']?\s*$/);
      if (match) env[match[1]] = match[2];
    }
  }
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) throw new Error('Configure Upstash REST credentials');
  return async (...command) => {
    const response = await fetch(env.UPSTASH_REDIS_REST_URL, { method: 'POST', headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(30000) });
    const result = await response.json();
    if (!response.ok || result.error) throw new Error('Private migration storage request failed');
    return result.result;
  };
}

function encryptedBackup(entries) {
  if (process.platform !== 'win32') throw new Error('Apply requires this Windows operator PC for the DPAPI-protected backup');
  const key = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ source: SOURCE, target: TARGET, entries }), 'utf8'), cipher.final()]);
  const wrap = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Add-Type -AssemblyName System.Security; $key=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($key,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))"], { input: key.toString('base64'), encoding: 'utf8' });
  key.fill(0);
  if (wrap.status !== 0 || !/^[A-Za-z0-9+/=]+$/.test(wrap.stdout.trim())) throw new Error('Could not protect backup key; migration not applied');
  const directory = path.join(process.env.LOCALAPPDATA, 'Temp', 'opencode');
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, `private-notebooks-before-prod-${crypto.randomUUID()}.encrypted.json`);
  fs.writeFileSync(filename, JSON.stringify({ format: 'AES-256-GCM+Windows-DPAPI-CurrentUser', createdAt: new Date().toISOString(), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), wrappedKey: wrap.stdout.trim(), ciphertext: ciphertext.toString('base64') }), { flag: 'wx', mode: 0o600 });
  return filename;
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (apply && !process.argv.includes('--confirm-production-notebooks')) throw new Error('Explicit notebook migration approval and --confirm-production-notebooks are required');
  const redis = configuredRedis();
  const entries = validateSnapshot(await redis('EVAL', SNAPSHOT_SCRIPT, 1, `${SOURCE}accounts`, SOURCE, ...IDS));
  const existing = await redis('KEYS', `${TARGET}*`);
  if (existing.length) throw new Error('Production notebook namespace is not empty; stopped without changes');
  console.log(JSON.stringify({ accounts: entries.length, savedDays: entries.reduce((total, entry) => total + entry.days.length, 0), preservesUat: true, copiesSessions: false, overwritesProd: false }));
  if (!apply) { console.log('Preview only. No writing, dates, or credentials are printed.'); return; }
  const backup = encryptedBackup(entries);
  console.log(`Encrypted recovery snapshot: ${backup}`);
  const result = await redis('EVAL', PROMOTE_SCRIPT, 2, `${SOURCE}accounts`, `${TARGET}accounts`, SOURCE, TARGET, JSON.stringify(entries));
  if (result[0] !== 'migrated') throw new Error(`Migration refused (${result[0]}); no production writing overwritten`);
  const after = validateSnapshot(await redis('EVAL', SNAPSHOT_SCRIPT, 1, `${TARGET}accounts`, TARGET, ...IDS));
  if (JSON.stringify(after) !== JSON.stringify(entries)) throw new Error('Post-migration verification differed; retain encrypted backup and investigate without rerunning');
  console.log('Verified exact production accounts, document bytes/revisions and date indexes. UAT originals retained; sessions not copied.');
}

module.exports = { IDS, SNAPSHOT_SCRIPT, PROMOTE_SCRIPT, validateSnapshot, configuredRedis, encryptedBackup };
if (require.main === module) main().catch(() => { console.error('Notebook migration stopped. No private content printed; inspect prerequisites and production state before retrying.'); process.exitCode = 1; });
