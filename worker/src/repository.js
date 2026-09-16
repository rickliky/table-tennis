export function repository(env) {
  const url = env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  const headers = { Authorization: `Bearer ${token}` };
  const get = (key) => fetch(`${url}/get/${encodeURIComponent(key)}`, { headers }).then(async r => { const d = await r.json(); return d.result; });
  const set = (key, value) => fetch(`${url}/set/${encodeURIComponent(key)}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }, body: value }).then(r => r.json());
  const del = (key) => fetch(`${url}/del/${encodeURIComponent(key)}`, { method: 'POST', headers }).then(r => r.json());
  const setnxex = (key, value, ex) => fetch(`${url}/setnxex/${encodeURIComponent(key)}/${encodeURIComponent(value)}/${ex}`, { method: 'POST', headers }).then(r => r.json());
  const key = (environment, type) => `${environment}:${type}`;
  const read = async (environment, type) => { const result = await get(key(environment, type)); return result ? JSON.parse(result) : []; };
  const write = (environment, type, value) => set(key(environment, type), JSON.stringify(value));
  const withLock = async (environment, callback) => {
    const lock = `${environment}:approval-lock`;
    const acquired = await setnxex(lock, crypto.randomUUID(), '30');
    if (!acquired.result) throw new Error('Another approval is in progress. Wait a moment and try again.');
    try { return await callback(); } finally { await del(lock); }
  };
  return { read, write, withLock };
}
