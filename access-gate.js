(() => {
  'use strict';

  const apiUrl = `${(window.LK_API_BASE || '').replace(/\/$/, '')}/api/login`;
  const accessKey = 'lk-internal-access-until';
  const accessUntil = Number(localStorage.getItem(accessKey));
  const language = localStorage.getItem('lk-language') || 'ja';
  const isAdminPage = /(?:^|\/)admin\.html$/i.test(location.pathname);
  const alreadyAllowed = isAdminPage || accessUntil > Date.now();
  let resolveAccess;

  document.documentElement.lang = language;
  window.LK_ACCESS_READY = alreadyAllowed
    ? Promise.resolve()
    : new Promise(resolve => { resolveAccess = resolve; });

  const copy = language === 'en' ? {
    eyebrow: 'INTERNAL ACCESS',
    title: 'Little Kings Internal Usage Only',
    protected: 'This website is protected by password login. Please do not share the password with others.',
    consent: 'Apart from your own data, do not share any data without consent.',
    share: 'Do not share this website or its password with anyone outside the Little Kings Family. The password is changed regularly and circulated internally to the Little Kings Family.',
    missing: 'If you do not have the password, please check with the Little Kings Family.',
    duration: 'After signing in, this browser will stay unlocked for seven days.',
    welcome: 'About Little Kings',
    intro: 'Little Kings is a table tennis club based in Kanagawa, Japan, primarily for elementary and junior-high school students. We welcome new members, visits, free trial sessions, and enquiries at any time.',
    principle: 'The Sottaku Principle',
    growth: 'We value individual talent, growth, cooperation, and independence through table tennis. Members learn manners, respect for opponents, and respect for the rules.',
    close: 'Why not take on the challenge with Little Kings?',
    contact: 'CONTACT', phone: 'Phone', email: 'Email', password: 'Password', enter: 'Enter', checking: 'Checking...', error: 'Incorrect password or verification failed.'
  } : {
    eyebrow: '内部アクセス',
    title: 'リトルキングス 内部利用限定',
    protected: 'このウェブサイトはパスワードで保護されています。パスワードを他の人と共有しないでください。',
    consent: 'ご自身のデータ以外は、本人の同意なく共有しないでください。',
    share: 'このウェブサイトとパスワードは、リトルキングスファミリー以外の方へ共有しないでください。',
    missing: 'パスワードをお持ちでない場合は、リトルキングスファミリーにご確認ください。',
    duration: '一度ログインすると、このブラウザでは7日間アクセスできます。',
    welcome: 'リトルキングスについて',
    intro: '神奈川県を拠点に活動する、小学生・中学生を中心とした卓球クラブチームです。見学・無料体験・お問い合わせは随時受け付けています。',
    principle: '「啐啄」の理念',
    growth: '卓球を通して個々の才能を伸ばし、成長・協調性・自立心を大切にしています。礼儀やマナー、相手への敬意、ルールを守る大切さも学びます。',
    close: 'リトルキングスで一緒に頑張ってみませんか！',
    contact: 'お問い合わせ', phone: '電話', email: 'メール', password: 'パスワード', enter: '入室する', checking: '確認中…', error: 'パスワードが正しくないか、確認できませんでした。'
  };

  if (!alreadyAllowed) {
    localStorage.removeItem(accessKey);
    document.body.classList.add('access-locked');
    document.body.insertAdjacentHTML('afterbegin', `
      <section id="site-password-gate" class="site-password-gate" aria-labelledby="password-gate-title">
        <form id="site-password-form">
          <button id="gate-language-toggle" class="language-toggle" type="button">${language === 'en' ? '日本語' : 'ENGLISH'}</button>
          <img src="little-kings-logo.jpg" alt="Little Kings" />
          <p class="eyebrow">${copy.eyebrow}</p>
          <h1 id="password-gate-title">${copy.title}</h1>
          <p>${copy.protected}</p>
          <p>${copy.consent}</p>
          <p>${copy.share}</p>
          <p>${copy.missing}</p>
          <p class="access-duration">${copy.duration}</p>
          <div class="access-login-controls">
            <label>${copy.password}<input id="site-password" type="password" autocomplete="current-password" required /></label>
            <button class="gold-button" type="submit">${copy.enter}</button>
            <p id="site-password-status" role="status"></p>
          </div>
          <details class="access-club-intro">
            <summary>${copy.welcome}</summary>
            <p>${copy.intro}</p>
            <h3>${copy.principle}</h3>
            <p>${copy.growth}</p>
            <p class="access-club-close">${copy.close}</p>
            <aside><b>${copy.contact}</b><span>${copy.phone} <a href="tel:09015555060">090-1555-5060</a></span><span>${copy.email} <a href="mailto:mmr0518@icloud.com">mmr0518@icloud.com</a></span><a href="https://www.instagram.com/ritokin.ryumon/" target="_blank" rel="noreferrer">Instagram @ritokin.ryumon</a></aside>
          </details>
        </form>
      </section>`);

    document.querySelector('#gate-language-toggle').onclick = () => {
      localStorage.setItem('lk-language', language === 'en' ? 'ja' : 'en');
      location.reload();
    };

    document.querySelector('#site-password-form').addEventListener('submit', async event => {
      event.preventDefault();
      const status = document.querySelector('#site-password-status');
      const submit = event.currentTarget.querySelector('[type="submit"]');
      status.textContent = copy.checking;
      submit.disabled = true;
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'site', password: document.querySelector('#site-password').value })
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error('Login failed');
        localStorage.setItem('lk-site-session', result.token);
        localStorage.setItem(accessKey, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
        document.body.classList.remove('access-locked');
        document.querySelector('#site-password-gate').remove();
        resolveAccess();
      } catch {
        status.textContent = copy.error;
        submit.disabled = false;
        document.querySelector('#site-password').focus();
      }
    });
  }

  const environment = /\/uat(?:\/|$)/i.test(location.pathname) ? 'UAT' : 'PROD';
  document.body.insertAdjacentHTML('beforeend', `<aside class="environment-badge ${environment.toLowerCase()}" aria-label="Environment: ${environment}">${environment}</aside>`);
  const backToTop = document.createElement('button');
  backToTop.id = 'site-back-to-top';
  backToTop.className = 'site-back-to-top';
  backToTop.type = 'button';
  const updateBackToTopLanguage = nextLanguage => {
    const english = nextLanguage === 'en';
    backToTop.innerHTML = `<span aria-hidden="true">↑</span>${english ? 'TOP' : '上へ'}`;
    backToTop.setAttribute('aria-label', english ? 'Back to top' : 'ページ上部へ戻る');
    backToTop.title = english ? 'Back to top' : 'ページ上部へ戻る';
  };
  updateBackToTopLanguage(language);
  document.body.append(backToTop);
  const updateBackToTopVisibility = () => backToTop.classList.toggle('visible', window.scrollY > Math.min(600, window.innerHeight * .7));
  window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
  window.addEventListener('resize', updateBackToTopVisibility, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  updateBackToTopVisibility();
  const nav = document.querySelector('nav');
  if (nav) nav.insertAdjacentHTML('beforeend', `<a href="tournament.html" id="nav-tournaments">${language === 'en' ? 'Tournaments' : '大会'}</a><a href="insights.html" id="nav-insights">${language === 'en' ? 'Training Insights' : '練習分析'}</a><a href="feedback.html" id="nav-feedback">${language === 'en' ? 'Reflection' : '振り返り'}</a><a href="admin.html" id="nav-maintenance" style="color:#8c423a;border-bottom:2px solid #8c423a;padding-bottom:0">${language === 'en' ? 'Data Maintenance' : 'データメンテナンス'}</a>`);
  window.lkUpdateInjectedNavigation = nextLanguage => {
    const english = nextLanguage === 'en';
    const labels = [['#nav-home', english ? 'Home' : 'ホーム'], ['#nav-players', english ? 'Players' : '選手'], ['#nav-sessions', english ? 'Sessions' : 'セッション'], ['#nav-tournaments', english ? 'Tournaments' : '大会'], ['#nav-insights', english ? 'Training Insights' : '練習分析'], ['#nav-feedback', english ? 'Reflection' : '振り返り'], ['#nav-maintenance', english ? 'Data Maintenance' : 'データメンテナンス']];
    labels.forEach(([selector, label]) => { const link = document.querySelector(selector); if (link) link.textContent = label; });
    updateBackToTopLanguage(nextLanguage);
  };
  document.addEventListener('click', event => {
    if (!event.target.closest('#language-toggle')) return;
    setTimeout(() => window.lkUpdateInjectedNavigation(localStorage.getItem('lk-language') || 'ja'));
  });
  const menuToggle = document.querySelector('#menu-toggle');
  if (menuToggle && nav) menuToggle.onclick = () => { const open = nav.classList.toggle('open'); menuToggle.setAttribute('aria-expanded', String(open)); };
  if (nav && menuToggle) nav.addEventListener('click', event => { if (event.target.matches('a')) { nav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); } });
})();
