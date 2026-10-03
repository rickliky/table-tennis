(() => {
  'use strict';

  const configuredBase = window.LK_API_BASE || '';
  const environment = /\/uat(?:\/|$)/i.test(location.pathname) ? 'uat' : 'prod';
  const isMaintenancePage = /(?:^|\/)admin\.html$/i.test(location.pathname);
  const endpoint = `${configuredBase.replace(/\/$/, '')}/api/public-data?environment=${environment}`;

  async function loadPublicData() {
    if (window.LK_ACCESS_READY) await window.LK_ACCESS_READY;
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Public API returned ${response.status}`);
    const result = await response.json();
    if (!result.ok) throw new Error('Public API returned an invalid response');
    // Maintenance needs inactive records for editing, but public pages must
    // only expose players whose canonical or legacy status is active.
    if (!isMaintenancePage && Array.isArray(result.players)) {
      result.players = result.players.filter(player => ['ST-001', 'Active', '有効'].includes(player.status));
    }
    // Populate rubber globals from Upstash (golden source) so pages
    // no longer need the static rubbers.js script tag.
    if (result.rubbers) {
      const all = result.rubbers;
      const byType = {};
      all.forEach(r => { if (!byType[r.type]) byType[r.type] = []; byType[r.type].push({ rubberId: r.rubberId, name: r.name, brand: r.brand }); });
      const nameToId = {};
      all.forEach(r => { nameToId[r.name] = r.rubberId; });
      window.RUBBERS = all;
      window.RUBBER_DB = byType;
      window.RUBBER_NAME_TO_ID = nameToId;
    }
    return result;
  }

  async function request(path, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    const token = isMaintenancePage
      ? localStorage.getItem('lk-admin-session')
      : localStorage.getItem('lk-site-session') || localStorage.getItem('lk-admin-session');
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${configuredBase.replace(/\/$/, '')}${path}?environment=${environment}`, { ...options, headers });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'API request failed');
    return result;
  }

  window.LKData = Object.freeze({ environment, loadPublicData, request });
})();
