(() => {
  'use strict';

  const configuredBase = window.LK_API_BASE || '';
  const environment = /\/uat(?:\/|$)/i.test(location.pathname) ? 'uat' : 'prod';
  const isMaintenancePage = /(?:^|\/)admin\.html$/i.test(location.pathname);
  const dataPath = isMaintenancePage ? '/api/admin-data' : '/api/public-data';
  const endpoint = `${configuredBase.replace(/\/$/, '')}${dataPath}?environment=${environment}`;
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  const normalizeSearch = value => String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const compactSearch = value => normalizeSearch(value).replace(/\s+/g, '');
  const searchText = (...values) => {
    const normalized = normalizeSearch(values.flat(Infinity).filter(value => value !== null && value !== undefined).join(' '));
    const compact = compactSearch(normalized);
    return compact && compact !== normalized ? `${normalized} ${compact}` : normalized;
  };
  const matchesSearch = (haystack, query) => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return true;
    const searchable = searchText(haystack);
    return normalizedQuery.split(' ').filter(Boolean).every(token => searchable.includes(token) || searchable.includes(compactSearch(token)));
  };
  const playerSearchText = (player, ...extra) => searchText(
    player?.playerId,
    player?.externalOpponentId,
    player?.displayName,
    player?.englishName,
    player?.nameJa,
    player?.nameEn,
    player?.kanjiName,
    player?.romanizedName,
    player?.fullName,
    player?.notebookName,
    extra
  );
  const matchesPlayerSearch = (player, query, ...extra) => matchesSearch(playerSearchText(player, ...extra), query);

  const failureCopy = {
    en: {
      eyebrow: 'CONNECTION ISSUE',
      title: 'We could not load the latest data',
      message: 'The club data service or your internet connection may be temporarily unavailable.',
      next: 'Check your connection and try again. If the problem continues, please come back later.',
      retry: 'Try again',
      home: 'Return home',
      language: '日本語',
      label: 'Data loading problem'
    },
    ja: {
      eyebrow: '通信エラー',
      title: '最新データを読み込めませんでした',
      message: 'データサービスまたはインターネット接続に、一時的な問題が発生している可能性があります。',
      next: '接続を確認して、もう一度お試しください。解決しない場合は、時間をおいてから再度アクセスしてください。',
      retry: 'もう一度試す',
      home: 'ホームへ戻る',
      language: 'ENGLISH',
      label: 'データ読み込みエラー'
    }
  };

  function currentLanguage() {
    return localStorage.getItem('lk-language') === 'en' ? 'en' : 'ja';
  }

  function clearLoadError() {
    document.querySelector('#data-load-failure')?.remove();
    document.body.classList.remove('data-load-failed');
  }

  function showLoadError(error) {
    console.error('Little Kings data load failed:', error);
    let failure = document.querySelector('#data-load-failure');
    if (!failure) {
      failure = document.createElement('section');
      failure.id = 'data-load-failure';
      failure.className = 'data-load-failure';
      failure.setAttribute('role', 'alert');
      failure.setAttribute('aria-live', 'assertive');
      document.body.append(failure);
    }
    document.body.classList.add('data-load-failed');
    const render = language => {
      const copy = failureCopy[language];
      failure.setAttribute('aria-label', copy.label);
      failure.innerHTML = `<div class="data-load-failure-card"><button class="data-load-failure-language" type="button">${copy.language}</button><div class="data-load-failure-mark" aria-hidden="true">!</div><p class="eyebrow">${copy.eyebrow}</p><h1 tabindex="-1">${copy.title}</h1><p>${copy.message}</p><p>${copy.next}</p><div class="data-load-failure-actions"><button class="gold-button" type="button" data-load-retry>${copy.retry}</button><a href="index.html">${copy.home}</a></div></div>`;
      failure.querySelector('.data-load-failure-language').onclick = () => {
        const nextLanguage = language === 'en' ? 'ja' : 'en';
        localStorage.setItem('lk-language', nextLanguage);
        document.documentElement.lang = nextLanguage;
        render(nextLanguage);
      };
      failure.querySelector('[data-load-retry]').onclick = () => location.reload();
      requestAnimationFrame(() => failure.querySelector('h1')?.focus({ preventScroll: true }));
    };
    render(currentLanguage());
    return failure;
  }

  async function fetchPublicData() {
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const token = isMaintenancePage
          ? localStorage.getItem('lk-admin-session')
          : localStorage.getItem('lk-site-session') || localStorage.getItem('lk-admin-session');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(endpoint, { cache: 'no-store', headers, signal: controller.signal });
        if (!response.ok) {
          const error = new Error(`Data API returned ${response.status}`);
          error.status = response.status;
          throw error;
        }
        const result = await response.json();
        if (!result.ok) throw new Error('Public API returned an invalid response');
        return result;
      } catch (error) {
        lastError = error;
        if (error.status === 401 || error.status === 403) break;
        if (attempt < 2 && navigator.onLine !== false) await wait(750);
      } finally {
        clearTimeout(timeout);
      }
      if (navigator.onLine === false) break;
    }
    throw lastError || new Error('Unable to load public data');
  }

  async function loadPublicData() {
    if (window.LK_ACCESS_READY) await window.LK_ACCESS_READY;
    let result;
    try {
      result = await fetchPublicData();
      clearLoadError();
    } catch (error) {
      if (!(isMaintenancePage && (error.status === 401 || error.status === 403))) showLoadError(error);
      throw error;
    }
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
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      const error = new Error(result.error || 'API request failed');
      error.status = response.status;
      throw error;
    }
    return result;
  }

  window.LKData = Object.freeze({ environment, loadPublicData, request, showLoadError, clearLoadError, normalizeSearch, searchText, matchesSearch, playerSearchText, matchesPlayerSearch });
})();
