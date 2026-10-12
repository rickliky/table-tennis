import { requireRole } from './auth.js';

// A separate namespace: never part of collection exports or UAT-to-PROD overlays.
export const privateReflectionsEnabled = (environment, env) => environment === 'uat' || env.PRIVATE_REFLECTION_PROD === 'true';
export const isLegacyReflection = value => ['sessionFeedback', 'matchFeedback'].includes(value);
const encoder = new TextEncoder();
const lifetime = 56 * 24 * 60 * 60;
const bilingualIds = new Set(['LK-0080', 'LK-0002']);
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const hex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const equal = (one, two) => {
  let mismatch = one.length ^ two.length;
  for (let index = 0; index < Math.max(one.length, two.length); index++) mismatch |= (one.charCodeAt(index) || 0) ^ (two.charCodeAt(index) || 0);
  return mismatch === 0;
};
export async function passwordVerifier(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000 }, key, 256));
}

export function privateRedis(env) {
  return async (...command) => {
    const response = await fetch(env.UPSTASH_REDIS_REST_URL.replace(/\/$/, ''), {
      method: 'POST', headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command), signal: AbortSignal.timeout(15000)
    });
    const value = await response.json();
    if (!response.ok || value.error) fail('Private storage unavailable', 503);
    return value.result;
  };
}
const readJson = async (redis, key) => { const value = await redis('GET', key); return value ? JSON.parse(value) : null; };
const dateIsValid = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date && date >= '2000-01-01' && date <= '2100-12-31';
const validId = id => typeof id === 'string' && /^LK-\d{4}$/.test(id);
const own = (match, id) => match.player1Id === id || match.player2Id === id;

// Compare-and-set and date-index update are a single Redis transaction. Also
// recheck the account version inside the transaction to prevent reset races.
export const SAVE_SCRIPT = `
local accountRaw = redis.call('HGET', KEYS[1], ARGV[1])
if not accountRaw then return {'unauthorized'} end
local account = cjson.decode(accountRaw)
if not account.enabled or account.version ~= tonumber(ARGV[2]) then return {'unauthorized'} end
local sessionRaw = redis.call('GET', KEYS[4])
if not sessionRaw then return {'unauthorized'} end
local currentRaw = redis.call('GET', KEYS[2])
local current = currentRaw and cjson.decode(currentRaw) or {revision=0, fields={}}
if current.revision ~= tonumber(ARGV[3]) then return {'conflict'} end
local patch = cjson.decode(ARGV[4])
for field, value in pairs(patch) do current.fields[field] = value end
current.revision = current.revision + 1
current.updatedAt = ARGV[5]
redis.call('SET', KEYS[2], cjson.encode(current))
redis.call('ZADD', KEYS[3], ARGV[6], ARGV[7])
return {'saved', tostring(current.revision), current.updatedAt}
`;
const ACCOUNT_SCRIPT = `
local raw = redis.call('HGET', KEYS[1], ARGV[1])
local previous = raw and cjson.decode(raw) or {version=0}
local account = cjson.decode(ARGV[2])
account.version = previous.version + 1
if not account.hash then account.hash = previous.hash; account.salt = previous.salt end
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(account))
return tostring(account.version)
`;
const RATE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
`;

async function bodyOf(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail('JSON required', 415);
  const reader = request.body?.getReader();
  if (!reader) fail('Request body required');
  let size = 0, chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); fail('Request too large', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { fail('Invalid JSON'); }
}

export async function handlePrivateReflections(request, env, environment) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowed = new Set(['https://rickliky.github.io', ...(env.PRIVATE_REFLECTION_ORIGINS || '').split(',').filter(Boolean)]);
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  if (origin && allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  try {
    if (!privateReflectionsEnabled(environment, env)) fail('Not found', 404);
    if (origin && !allowed.has(origin)) fail('Origin not allowed', 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const redis = privateRedis(env), prefix = `${environment}:private-reflection:`, accountsKey = `${prefix}accounts`;
    const readCollection = async type => {
      const value = await readJson(redis, `${environment}:${type}`) || [];
      if (!Array.isArray(value)) fail('Private storage unavailable', 503);
      return value;
    };
    const accountFor = async id => { const raw = await redis('HGET', accountsKey, id); return raw ? JSON.parse(raw) : null; };
    const playerFor = async id => (await readCollection('players')).find(player => player.playerId === id);
    const publicAccount = (account, player) => ({ playerId: account.playerId, displayName: player?.displayName || account.playerId, englishName: player?.englishName || '', bilingual: bilingualIds.has(account.playerId) });

    if (url.pathname === '/api/reflections/directory' && request.method === 'GET') {
      const values = await redis('HGETALL', accountsKey) || [], players = await readCollection('players'), result = [];
      for (let index = 1; index < values.length; index += 2) {
        const account = JSON.parse(values[index]), player = players.find(item => item.playerId === account.playerId);
        if (account.enabled && player) result.push(publicAccount(account, player));
      }
      return respond({ ok: true, players: result });
    }
    if (url.pathname === '/api/reflections/accounts') {
      await requireRole(request, env, ['admin']);
      if (request.method === 'GET') {
        const values = await redis('HGETALL', accountsKey) || [], accounts = [];
        for (let index = 1; index < values.length; index += 2) { const account = JSON.parse(values[index]); accounts.push({ playerId: account.playerId, enabled: account.enabled, version: account.version }); }
        return respond({ ok: true, accounts });
      }
      if (request.method === 'POST') {
        const body = await bodyOf(request);
        if (!validId(body.playerId) || typeof body.enabled !== 'boolean' || !(await playerFor(body.playerId))) fail('Valid player and enabled status required');
        const previous = await accountFor(body.playerId), account = { playerId: body.playerId, enabled: body.enabled };
        if (body.password !== undefined) {
          if (typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128) fail('Password must contain 10–128 characters');
          account.salt = random(); account.hash = await passwordVerifier(body.password, account.salt);
        } else if (!previous?.hash) fail('Initial password required');
        const version = Number(await redis('EVAL', ACCOUNT_SCRIPT, 1, accountsKey, body.playerId, JSON.stringify(account)));
        return respond({ ok: true, playerId: body.playerId, enabled: body.enabled, version });
      }
    }
    if (url.pathname === '/api/reflections/login' && request.method === 'POST') {
      const ip = await digest(request.headers.get('CF-Connecting-IP') || 'unknown');
      if (Number(await redis('EVAL', RATE_SCRIPT, 1, `${prefix}rate:ip:${ip}`, 900)) > 60) fail('Too many attempts. Try again in 15 minutes.', 429);
      const body = await bodyOf(request);
      if (!validId(body.playerId) || typeof body.password !== 'string' || body.password.length > 128) fail('Invalid credentials', 401);
      if (Number(await redis('EVAL', RATE_SCRIPT, 1, `${prefix}rate:${ip}:${body.playerId}`, 900)) > 10) fail('Too many attempts. Try again in 15 minutes.', 429);
      const account = await accountFor(body.playerId);
      const supplied = await passwordVerifier(body.password, account?.salt || 'unavailable-account-salt');
      if (!account?.enabled || !equal(supplied, account.hash || '')) fail('Invalid credentials', 401);
      const token = random(), expires = Date.now() + lifetime * 1000;
      await redis('SET', `${prefix}session:${await digest(token)}`, JSON.stringify({ playerId: account.playerId, version: account.version, expires }), 'EX', lifetime);
      return respond({ ok: true, token, expires, player: publicAccount(account, await playerFor(account.playerId)) });
    }

    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) fail('Reflection authentication required', 401);
    const sessionKey = `${prefix}session:${await digest(token)}`, actor = await readJson(redis, sessionKey);
    if (!actor || actor.expires <= Date.now()) fail('Reflection session expired', 401);
    const account = await accountFor(actor.playerId);
    if (!account?.enabled || account.version !== actor.version) fail('Reflection session revoked', 401);
    if (url.searchParams.has('player') || url.searchParams.has('playerId')) fail('Identity is determined by your session', 403);
    if (url.pathname === '/api/reflections/session' && request.method === 'GET') return respond({ ok: true, expires: actor.expires, player: publicAccount(account, await playerFor(actor.playerId)) });
    if (url.pathname === '/api/reflections/logout' && request.method === 'POST') { await redis('DEL', sessionKey); return respond({ ok: true }); }
    const datesKey = `${prefix}dates:${actor.playerId}`;
    if (url.pathname === '/api/reflections/dates' && request.method === 'GET') return respond({ ok: true, dates: await redis('ZREVRANGE', datesKey, 0, -1) || [] });
    if (url.pathname !== '/api/reflections/day') fail('Not found', 404);
    const date = url.searchParams.get('date');
    if (!dateIsValid(date)) fail('Valid date required');
    const dayKey = `${prefix}day:${actor.playerId}:${date}`;
    const [training, tournaments, events] = await Promise.all(['matches', 'tournament-matches', 'tournaments'].map(readCollection));
    const matches = [];
    for (const [source, records] of [['training', training], ['tournament', tournaments]]) {
      for (const match of records) {
        if (match.matchDate !== date || !own(match, actor.playerId) || (match.format && match.format !== 'Singles') || (source === 'training' && !/club|training|練習/i.test(`${match.event || ''} ${match.division || ''}`))) continue;
        const first = match.player1Id === actor.playerId, ownSets = Number(first ? match.player1Sets : match.player2Sets), otherSets = Number(first ? match.player2Sets : match.player1Sets);
        const complete = Number(match.player1Sets) >= 3 || Number(match.player2Sets) >= 3;
        matches.push({ key: `${source}:${source === 'training' ? match.matchId : match.tournamentMatchId}`, source, opponentName: (first ? match.player2Name : match.player1Name) || (first ? match.player2Id : match.player1Id), score: `${ownSets}-${otherSets}`, result: complete ? (ownSets > otherSets ? 'win' : 'loss') : 'incomplete', eventName: source === 'training' ? match.event || '' : events.find(event => event.tournamentId === match.tournamentId)?.name || '', round: match.round || '' });
      }
    }
    matches.sort((a, b) => a.key.localeCompare(b.key));
    if (request.method === 'GET') return respond({ ok: true, date, document: await readJson(redis, dayKey) || { revision: 0, fields: {} }, matches });
    if (request.method === 'POST') {
      const body = await bodyOf(request);
      if (Object.keys(body).some(key => !['revision', 'patch'].includes(key)) || !Number.isSafeInteger(body.revision) || body.revision < 0 || !body.patch || typeof body.patch !== 'object' || Array.isArray(body.patch)) fail('Revision and field patch required');
      const allowedFields = new Set(['activity', 'daily.ja', 'coach.ja']);
      if (bilingualIds.has(actor.playerId)) { allowedFields.add('daily.en'); allowedFields.add('coach.en'); }
      const current = await readJson(redis, dayKey);
      // Retain access to previously-written match notes even if a match is later removed.
      for (const match of matches) { allowedFields.add(`match.${match.key}.ja`); if (bilingualIds.has(actor.playerId)) allowedFields.add(`match.${match.key}.en`); }
      for (const field of Object.keys(current?.fields || {})) if (/^match\.(training|tournament):[A-Za-z0-9_-]+\.(ja|en)$/.test(field) && (!field.endsWith('.en') || bilingualIds.has(actor.playerId))) allowedFields.add(field);
      const entries = Object.entries(body.patch);
      if (!entries.length || entries.length > 100) fail('Invalid number of fields');
      for (const [field, value] of entries) if (!allowedFields.has(field) || typeof value !== 'string' || value.length > (field === 'activity' ? 160 : 8000)) fail('Invalid journal field or text length');
      if (JSON.stringify({ ...current?.fields, ...body.patch }).length > 250000) fail('Notebook day is too large', 413);
      const updatedAt = new Date().toISOString();
      const result = await redis('EVAL', SAVE_SCRIPT, 4, accountsKey, dayKey, datesKey, sessionKey, actor.playerId, actor.version, body.revision, JSON.stringify(body.patch), updatedAt, date.replace(/-/g, ''), date);
      if (result[0] === 'unauthorized') fail('Reflection session revoked', 401);
      if (result[0] === 'conflict') return respond({ ok: false, error: 'Conflict', document: await readJson(redis, dayKey) || { revision: 0, fields: {} } }, 409);
      return respond({ ok: true, revision: Number(result[1]), updatedAt: result[2] });
    }
    fail('Not found', 404);
  } catch (error) {
    // Never echo request content, Redis errors, credentials, or journal text.
    return respond({ ok: false, error: error.status ? error.message : 'Private service unavailable' }, error.status || 503);
  }
}
