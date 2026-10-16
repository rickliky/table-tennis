(() => {
  'use strict';
  const words = {
    en: {
      title: 'Player Notebooks', notice: 'Admin-only, read-only access. Players can see their own notebook; other members and Approvers cannot. Translation is manual.',
      player: 'Player', date: 'Saved date', choose: 'Choose a saved date', loading: 'Loading…', empty: 'No saved notebook dates for this player yet.', noPlayers: 'No notebook accounts yet.',
      failed: 'Could not load the notebook. Try again.', retry: 'Try again', refresh: 'Refresh', previous: 'Older saved date', next: 'Newer saved date', disabled: 'Account disabled',
      activity: 'Activity', daily: 'Daily reflection', coach: 'Coach feedback', matches: 'Match reflections', missing: 'Current match record unavailable',
      enOriginal: 'English original', jaVersion: 'Japanese version', jaOriginal: 'Japanese original', enVersion: 'English version', blank: 'Not written',
      updated: 'Last saved', training: 'Training', tournament: 'Tournament', win: 'Win', loss: 'Loss', incomplete: 'Incomplete',
      month: 'Saved month', allMonths: 'All months', latest: 'Latest saved note'
    },
    ja: {
      title: '選手ノート', notice: '管理者専用・閲覧のみ。選手は自分のノートだけを読めます。他のメンバーや承認者は読めません。翻訳は手入力です。',
      player: '選手', date: '保存済み日付', choose: '保存済み日付を選ぶ', loading: '読み込み中…', empty: 'この選手の保存済みノートはまだありません。', noPlayers: 'ノートのアカウントはまだありません。',
      failed: 'ノートを読み込めませんでした。再試行してください。', retry: 'もう一度試す', refresh: '更新', previous: '前の保存済み日付', next: '次の保存済み日付', disabled: 'アカウント停止中',
      activity: '活動内容', daily: '1日の振り返り', coach: 'コーチのアドバイス', matches: '試合の振り返り', missing: '現在の試合記録を参照できません',
      enOriginal: '英語の原文', jaVersion: '日本語版', jaOriginal: '日本語の原文', enVersion: '英語版', blank: '未記入',
      updated: '最終保存', training: '練習試合', tournament: '大会', win: '勝ち', loss: '負け', incomplete: '未完了',
      month: '保存済み月', allMonths: 'すべての月', latest: '最新の保存済みノート'
    }
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  function mount({ panel, language, onUnauthorized }) {
    const copy = words[language], token = localStorage.getItem('lk-admin-session');
    const listeners = new AbortController();
    let controller, disposed = false, players = [], dates = [], playerId = '', date = '', month = '';
    const name = player => language === 'en' ? player.englishName || player.displayName : player.displayName;
    const dateLabel = value => `${value} (${new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ja-JP', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))})`;
    const monthLabel = value => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ja-JP', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
    const visibleDates = () => dates.filter(value => !month || value.startsWith(`${month}-`));
    panel.innerHTML = `<h2>${copy.title}</h2><p class="admin-notebook-notice">${copy.notice}</p><div class="admin-notebook-controls"><label>${copy.player}<select id="admin-notebook-player" disabled></select></label><label>${copy.month}<select id="admin-notebook-month" disabled></select></label><label>${copy.date}<select id="admin-notebook-date" disabled><option value="">${copy.choose}</option></select></label><div class="admin-notebook-date-actions"><button type="button" class="admin-button" id="admin-notebook-older" aria-label="${copy.previous}">←</button><button type="button" class="admin-button" id="admin-notebook-newer" aria-label="${copy.next}">→</button><button type="button" class="admin-button" id="admin-notebook-latest">${copy.latest}</button><button type="button" class="admin-button" id="admin-notebook-refresh">${copy.refresh}</button></div></div><p id="admin-notebook-status" role="status"></p><div id="admin-notebook-content"></div>`;
    const playerSelect = panel.querySelector('#admin-notebook-player'), dateSelect = panel.querySelector('#admin-notebook-date');
    const content = panel.querySelector('#admin-notebook-content'), status = panel.querySelector('#admin-notebook-status');
    const older = panel.querySelector('#admin-notebook-older'), newer = panel.querySelector('#admin-notebook-newer'), refresh = panel.querySelector('#admin-notebook-refresh');
    const monthSelect = panel.querySelector('#admin-notebook-month'), latest = panel.querySelector('#admin-notebook-latest');
    function renderDateControls() {
      const months = [...new Set(dates.map(value => value.slice(0, 7)))];
      if (!months.includes(month)) month = '';
      monthSelect.replaceChildren(new Option(copy.allMonths, ''));
      months.forEach(value => monthSelect.add(new Option(monthLabel(value), value))); monthSelect.value = month;
      dateSelect.replaceChildren();
      const visible = visibleDates();
      if (!visible.length) dateSelect.add(new Option(copy.choose, ''));
      visible.forEach(value => dateSelect.add(new Option(dateLabel(value), value))); dateSelect.value = date;
    }
    function active() { return !disposed && panel.isConnected; }
    function lockControls(busy) {
      playerSelect.disabled = busy || !players.length; dateSelect.disabled = busy || !visibleDates().length;
      monthSelect.disabled = busy || !dates.length; latest.disabled = busy || !dates.length;
      const index = visibleDates().indexOf(date);
      older.disabled = busy || index < 0 || index >= visibleDates().length - 1;
      newer.disabled = busy || index <= 0; refresh.disabled = busy;
    }
    async function request(path, params, signal) {
      if (!token || localStorage.getItem('lk-admin-session') !== token) throw Object.assign(new Error('Session changed'), { status: 401 });
      const url = new URL(`${window.LK_API_BASE}${path}`);
      url.search = new URLSearchParams({ ...params, environment: window.LKData.environment });
      const response = await fetch(url, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` }, signal });
      const result = await response.json();
      if (!response.ok || !result.ok) throw Object.assign(new Error('Notebook request failed'), { status: response.status });
      if (localStorage.getItem('lk-admin-session') !== token) throw Object.assign(new Error('Session changed'), { status: 401 });
      return result;
    }
    async function load(task) {
      controller?.abort(); controller = new AbortController();
      const current = controller, timeout = setTimeout(() => current.abort(), 25000);
      content.replaceChildren(); status.textContent = copy.loading; lockControls(true);
      try {
        await task(current.signal);
      } catch (error) {
        if (!active() || current !== controller) return;
        content.replaceChildren();
        if ([401, 403].includes(error.status)) { dispose(); onUnauthorized(); return; }
        status.textContent = copy.failed;
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'admin-button'; retry.textContent = copy.retry;
        retry.onclick = () => load(task); content.append(retry);
      } finally {
        clearTimeout(timeout);
        if (active() && current === controller) lockControls(false);
      }
    }
    function readField(label, value) {
      return `<section class="admin-notebook-field"><h4>${label}</h4>${typeof value === 'object' && value ? `<div class="notebook-rich-content">${window.LKNotebookRich.html(value)}</div>` : `<p ${value ? '' : 'class="empty"'}>${escapeHtml(value || copy.blank)}</p>`}</section>`;
    }
    function renderDay(result) {
      const fields = result.document.fields, bilingual = result.player.bilingual;
      const reflection = prefix => bilingual
        ? `<div class="notebook-bilingual">${readField(copy.enOriginal, fields[`${prefix}.en`])}${readField(copy.jaVersion, fields[`${prefix}.ja`])}</div>`
        : readField(copy.jaOriginal, fields[`${prefix}.ja`]);
      const matchKeys = [...new Set(Object.keys(fields).filter(key => /^match\.(training|tournament):[A-Za-z0-9_-]+\.(en|ja)$/.test(key)).map(key => key.slice(6, -3)))];
      content.innerHTML = `<header class="admin-notebook-day-title"><h3>${escapeHtml(name(result.player))} · ${escapeHtml(dateLabel(result.date))}</h3>${result.document.updatedAt ? `<p>${copy.updated}: ${escapeHtml(new Date(result.document.updatedAt).toLocaleString(language === 'en' ? 'en-GB' : 'ja-JP', { timeZone: 'Asia/Tokyo', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }))}</p>` : ''}</header>
        <article class="notebook-entry"><h3>${copy.daily}</h3>${reflection('daily')}</article>
        ${matchKeys.length ? `<h3>${copy.matches}</h3>${matchKeys.map(key => {
          const match = result.matches.find(match => match.key === key);
          return `<article class="notebook-entry"><h3>${match ? copy[match.source] : `${copy.missing} · ${escapeHtml(key)}`}</h3>${match ? `${window.LKNotebookMatch.render(match, result.player, language)}<p>${escapeHtml([match.eventName, match.round].filter(Boolean).join(' · '))}</p>` : ''}${reflection(`match.${key}`)}</article>`;
        }).join('')}` : ''}${fields.activity ? readField(copy.activity, fields.activity) : ''}<article class="notebook-entry"><h3>${copy.coach}</h3>${bilingual ? `<div class="notebook-bilingual">${readField(copy.jaOriginal, fields['coach.ja'])}${readField(copy.enVersion, fields['coach.en'])}</div>` : readField(copy.jaOriginal, fields['coach.ja'])}</article>`;
      status.textContent = '';
    }
    async function day(signal) {
      if (!date) { status.textContent = copy.empty; return; }
      const result = await request('/api/reflections/admin/day', { playerId, date }, signal);
      if (active() && !signal.aborted) renderDay(result);
    }
    async function savedDates(signal, preserve = false) {
      const previousDate = preserve ? date : '', previousMonth = preserve ? month : '';
      const result = await request('/api/reflections/admin/dates', { playerId }, signal);
      if (!active() || signal.aborted) return;
      dates = result.dates;
      month = dates.some(value => value.startsWith(`${previousMonth}-`)) ? previousMonth : '';
      const visible = visibleDates(); date = visible.includes(previousDate) ? previousDate : visible[0] || '';
      renderDateControls();
      await day(signal);
    }
    async function directory(signal) {
      const result = await request('/api/reflections/admin/players', {}, signal);
      if (!active() || signal.aborted) return;
      players = result.players;
      const previousPlayer = playerId;
      if (!players.some(player => player.playerId === playerId)) playerId = players[0]?.playerId || '';
      if (playerId !== previousPlayer) { date = ''; month = ''; dates = []; renderDateControls(); }
      playerSelect.replaceChildren();
      players.forEach(player => playerSelect.add(new Option(`${name(player)} · ${player.playerId}${player.enabled ? '' : ` · ${copy.disabled}`}`, player.playerId)));
      playerSelect.value = playerId;
      if (playerId) await savedDates(signal, playerId === previousPlayer); else { dates = []; date = ''; month = ''; renderDateControls(); status.textContent = copy.noPlayers; }
    }
    playerSelect.onchange = () => { playerId = playerSelect.value; date = ''; month = ''; dates = []; renderDateControls(); load(savedDates); };
    dateSelect.onchange = () => { date = dateSelect.value; load(day); };
    monthSelect.onchange = () => { month = monthSelect.value; date = visibleDates()[0] || ''; renderDateControls(); load(day); };
    older.onclick = () => { const visible = visibleDates(); date = visible[visible.indexOf(date) + 1]; dateSelect.value = date; load(day); };
    newer.onclick = () => { const visible = visibleDates(); date = visible[visible.indexOf(date) - 1]; dateSelect.value = date; load(day); };
    latest.onclick = () => { month = ''; date = dates[0] || ''; renderDateControls(); load(day); };
    refresh.onclick = () => load(directory);
    // Hide cached text before a frozen-page return and revalidate Admin access
    // before fetching again. No journal text is kept in browser storage.
    window.addEventListener('pagehide', () => { controller?.abort(); content.replaceChildren(); panel.style.visibility = 'hidden'; }, { signal: listeners.signal });
    window.addEventListener('pageshow', event => {
      if (!event.persisted || !active()) return;
      load(async signal => {
        const result = await request('/api/session', {}, signal);
        if (result.role !== 'admin') throw Object.assign(new Error('Admin required'), { status: 403 });
        await directory(signal);
      }).finally(() => { panel.style.visibility = ''; });
    }, { signal: listeners.signal });
    window.addEventListener('storage', event => {
      if (event.key === 'lk-admin-session' && event.newValue !== token && active()) { dispose(); onUnauthorized(); }
    }, { signal: listeners.signal });
    function dispose() { disposed = true; controller?.abort(); listeners.abort(); content.replaceChildren(); players = []; dates = []; }
    load(directory);
    return dispose;
  }
  window.LKAdminNotebooks = Object.freeze({ mount });
})();
