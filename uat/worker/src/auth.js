const encoder = new TextEncoder();

function authenticationError(message = 'Authentication required') {
  const error = new Error(message);
  error.status = 401;
  return error;
}

function secureEqual(left, right) {
  const a = encoder.encode(String(left ?? ''));
  const b = encoder.encode(String(right ?? ''));
  const length = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < length; index++) mismatch |= (a[index] || 0) ^ (b[index] || 0);
  return mismatch === 0;
}

async function signature(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return btoa(String.fromCharCode(...bytes));
}

export async function login(role, password, env) {
  const expected = role === 'admin' ? env.ADMIN_PASSWORD : role === 'approver' ? env.APPROVER_PASSWORD : role === 'site' ? env.SITE_PASSWORD : '';
  if (!expected || !secureEqual(password, expected)) throw authenticationError('Invalid credentials');
  const duration = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const payload = btoa(JSON.stringify({ role, issued: now, expires: now + duration, nonce: crypto.randomUUID() }));
  return `${payload}.${await signature(payload, env.SESSION_SECRET)}`;
}

export async function session(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw authenticationError();
  const [payload, supplied] = token.split('.');
  if (!payload || !supplied || !secureEqual(supplied, await signature(payload, env.SESSION_SECRET))) throw authenticationError('Invalid session');
  let value;
  try { value = JSON.parse(atob(payload)); } catch { throw authenticationError('Invalid session'); }
  if (!Number.isFinite(value.expires) || value.expires < Date.now() || !['site', 'admin', 'approver'].includes(value.role)) throw authenticationError('Session expired');
  return value;
}

export async function requireRole(request, env, allowedRoles) {
  const actor = await session(request, env);
  if (!allowedRoles.includes(actor.role)) {
    const error = new Error(`${allowedRoles.map(role => role[0].toUpperCase() + role.slice(1)).join(' or ')} role required`);
    error.status = 403;
    throw error;
  }
  return actor;
}
