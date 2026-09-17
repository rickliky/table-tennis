(() => {
  'use strict';

  const configuredBase = window.LK_API_BASE || '';
  const environment = /\/uat(?:\/|$)/i.test(location.pathname) ? 'uat' : 'prod';
  const endpoint = `${configuredBase.replace(/\/$/, '')}/api/public-data?environment=${environment}`;

  async function loadPublicData() {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Public API returned ${response.status}`);
      const result = await response.json();
      if (!result.ok) throw new Error('Public API returned an invalid response');
      return result;
    } catch (error) {
      const response = await fetch('./public-data.json', { cache: 'no-store' });
      if (!response.ok) throw error;
      return response.json();
    }
  }

  async function request(path, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    const token = localStorage.getItem('lk-admin-session');
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${configuredBase.replace(/\/$/, '')}${path}?environment=${environment}`, { ...options, headers });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'API request failed');
    return result;
  }

  window.LKData = Object.freeze({ environment, loadPublicData, request });
})();
