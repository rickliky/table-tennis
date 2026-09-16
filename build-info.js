(() => {
  'use strict';

  const isUat = /\/uat(?:\/|$)/i.test(location.pathname);
  const basePath = isUat ? 'uat/' : '';
  const versionLabel = isUat ? 'UAT' : 'PROD';

  function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  function render(info) {
    const buildDate = new Date(info.buildDate);
    const localDate = buildDate.toLocaleString();
    const relative = timeAgo(buildDate);
    const shortCommit = (info.commit || '').slice(0, 7);
    const branch = info.branch || '';
    const version = info.version || '';

    const existing = document.getElementById('build-info');
    if (existing) existing.remove();

    const node = document.createElement('small');
    node.id = 'build-info';
    node.className = 'build-info';
    node.title = `Branch: ${branch}\nCommit: ${info.commit}\nBuild: ${localDate}`;
    node.innerHTML = `<span class="build-env">${versionLabel}</span> v${version} · ${branch} · ${shortCommit} · built ${relative}`;

    const footer = document.querySelector('footer');
    if (footer) footer.appendChild(node);
    else document.body.appendChild(node);
  }

  fetch(`${basePath}build-info.json`, { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(render)
    .catch(() => {});
})();
