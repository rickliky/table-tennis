export function repository(env) {
  const url = env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  const call = (command, ...args) => fetch(`${url}/${command}/${args.map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).then(async response => { if (!response.ok) throw new Error(`Redis returned ${response.status}`); return response.json(); });
  const key = (environment, type) => `${environment}:${type}`;
  const read = async (environment, type) => { const result = await call('get', key(environment, type)); return result.result ? JSON.parse(result.result) : []; };
  const write = (environment, type, value) => call('set', key(environment, type), JSON.stringify(value));
  const withLock = async (environment, callback) => {
    const lock = `${environment}:approval-lock`;
    const acquired = await call('setnxex', lock, crypto.randomUUID(), '15');
    if (!acquired.result) throw new Error('Another approval is in progress');
    try { return await callback(); } finally { await call('del', lock); }
  };
  return { read, write, withLock };
}
