const encoder = new TextEncoder();

async function signature(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return btoa(String.fromCharCode(...bytes));
}

export async function login(role, password, env) {
  const expected = role === 'admin' ? env.ADMIN_PASSWORD : role === 'approver' ? env.APPROVER_PASSWORD : role === 'site' ? env.SITE_PASSWORD : '';
  if (!expected || password !== expected) throw new Error('Invalid credentials');
  const payload = btoa(JSON.stringify({ role, expires: Date.now() + 8 * 60 * 60 * 1000 }));
  return `${payload}.${await signature(payload, env.SESSION_SECRET)}`;
}

export async function session(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Authentication required');
  const [payload, supplied] = token.split('.');
  if (!payload || supplied !== await signature(payload, env.SESSION_SECRET)) throw new Error('Invalid session');
  const value = JSON.parse(atob(payload));
  if (value.expires < Date.now() || !['site', 'admin', 'approver'].includes(value.role)) throw new Error('Session expired');
  return value;
}
