(() => {
  'use strict';
  const words = {
    en: {
      title: 'Player Notebooks', notice: 'Admin-only, read-only access. Players can see their own notebook; other members and Approvers cannot. Translation is manual.',
      player: 'Player', date: 'Saved date', choose: 'Choose a saved date', loading: 'Loading…', empty: 'No saved notebook dates for this player yet.', noPlayers: 'No notebook accounts yet.',
      failed: 'Could not load the notebook. Try again.', retry: 'Try again', refresh: 'Refresh', previous: 'Older saved date', next: 'Newer saved date', disabled: 'Account disabled',
      activity: 'Activity', daily: 'Daily reflection', coach: 'Coach feedback — entered by the player', matches: 'Match reflections', missing: 'Current match record unavailable',
      enOriginal: 'English original', jaVersion: 'Japanese version (manual)', jaOriginal: 'Japanese original', enVersion: 'English version (manual)', blank: 'Not written',
      updated: 'Last saved', training: 'Training', tournament: 'Tournament', win: 'Win', loss: 'Loss', incomplete: 'Incomplete'
    },
    ja: {
      title: '選手ノート', notice: '管理者専用・閲覧のみ。選手は自分のノートだけを読めます。他のメンバーや承認者は読めません。翻訳は手入力です。',
      player: '選手', date: '保存済み日付', choose: '保存済み日付を選ぶ', loading: '読み込み中…', empty: 'この選手の保存済みノートはまだありません。', noPlayers: 'ノートのアカウントはまだありません。',
      failed: 'ノートを読み込めませんでした。再試行してください。', retry: 'もう一度試す', refresh: '更新', previous: '前の保存済み日付', next: '次の保存済み日付', disabled: 'アカウント停止中',
      activity: '活動内容', daily: '1日の振り返り', coach: 'コーチのアドバイス — 選手が入力', matches: '試合の振り返り', missing: '現在の試合記録を参照できません',
      enOriginal: '英語の原文', jaVersion: '日本語版（手入力）', jaOriginal: '日本語の原文', enVersion: '英語版（手入力）', blank: '未記入',
      updated: '最終保存', training: '練習試合', tournament: '大会', win: '勝ち', loss: '負け', incomplete: '未完了'
    }
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  function mount({ panel, language, onUnauthorized }) {
    const copy = words[language], token = localStorage.getItem('lk-admin-session');
    const listeners = new AbortController();
    let controller, disposed = false, players = [], dates = [], playerId = '', date = '';
    const name = player => language === 'en' ? player.englishName || player.displayName : player.displayName;
    panel.innerHTML = `<h2>${copy.title}</h2><p class="admin-notebook-notice">${copy.notice}</p><div class="admin-notebook-controls"><label>${copy.player}<select id="admin-notebook-player" disabled></select></label><label>${copy.date}<select id="admin-notebook-date" disabled><option value="">${copy.choose}</option></select></label><div class="admin-notebook-date-actions"><button type="button" class="admin-button" id="admin-notebook-older" aria-label="${copy.previous}">←</button><button type="button" class="admin-button" id="admin-notebook-newer" aria-label="${copy.next}">→</button><button type="button" class="admin-button" id="admin-notebook-refresh">${copy.refresh}</button></div></div><p id="admin-notebook-status" role="status"></p><div id="admin-notebook-content"></div>`;
    const playerSelect = panel.querySelector('#admin-notebook-player'), dateSelect = panel.querySelector('#admin-notebook-date');
    const content = panel.querySelector('#admin-notebook-content'), status = panel.querySelector('#admin-notebook-status');
    const older = panel.querySelector('#admin-notebook-older'), newer = panel.querySelector('#admin-notebook-newer'), refresh = panel.querySelector('#admin-notebook-refresh');
    function active() { return !disposed && panel.isConnected; }
    function lockControls(busy) {
      playerSelect.disabled = busy || !players.length; dateSelect.disabled = busy || !dates.length;
      const index = dates.indexOf(date);
      older.disabled = busy || index < 0 || index >= dates.length - 1;
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
      return `<section class="admin-notebook-field"><h4>${label}</h4><p ${value ? '' : 'class="empty"'}>${escapeHtml(value || copy.blank)}</p></section>`;
    }
    function renderDay(result) {
      const fields = result.document.fields, bilingual = result.player.bilingual;
      const reflection = prefix => bilingual
        ? `<div class="notebook-bilingual">${readField(copy.enOriginal, fields[`${prefix}.en`])}${readField(copy.jaVersion, fields[`${prefix}.ja`])}</div>`
        : readField(copy.jaOriginal, fields[`${prefix}.ja`]);
      const matchKeys = [...new Set(Object.keys(fields).filter(key => /^match\.(training|tournament):[A-Za-z0-9_-]+\.(en|ja)$/.test(key)).map(key => key.slice(6, -3)))];
      content.innerHTML = `<header class="admin-notebook-day-title"><h3>${escapeHtml(name(result.player))} · ${escapeHtml(result.date)}</h3>${result.document.updatedAt ? `<p>${copy.updated}: ${escapeHtml(new Date(result.document.updatedAt).toLocaleString(language === 'en' ? 'en-GB' : 'ja-JP'))}</p>` : ''}</header>
        ${fields.activity ? readField(copy.activity, fields.activity) : ''}<article class="notebook-entry"><h3>${copy.daily}</h3>${reflection('daily')}</article>
        ${matchKeys.length ? `<h3>${copy.matches}</h3>${matchKeys.map(key => {
          const match = result.matches.find(match => match.key === key);
          return `<article class="notebook-entry"><h3>${match ? `${copy[match.source]} · ${escapeHtml(match.opponentName)} · ${escapeHtml(match.score)} · ${copy[match.result]}` : `${copy.missing} · ${escapeHtml(key)}`}</h3>${match ? `<p>${escapeHtml([match.eventName, match.round].filter(Boolean).join(' · '))}</p>` : ''}${reflection(`match.${key}`)}</article>`;
        }).join('')}` : ''}<article class="notebook-entry"><h3>${copy.coach}</h3>${bilingual ? `<div class="notebook-bilingual">${readField(copy.jaOriginal, fields['coach.ja'])}${readField(copy.enVersion, fields['coach.en'])}</div>` : readField(copy.jaOriginal, fields['coach.ja'])}</article>`;
      status.textContent = '';
    }
    async function day(signal) {
      if (!date) { status.textContent = copy.empty; return; }
      const result = await request('/api/reflections/admin/day', { playerId, date }, signal);
      if (active() && !signal.aborted) renderDay(result);
    }
    async function savedDates(signal) {
      date = ''; dates = []; dateSelect.replaceChildren(new Option(copy.choose, ''));
      const result = await request('/api/reflections/admin/dates', { playerId }, signal);
      if (!active() || signal.aborted) return;
      dates = result.dates; date = dates[0] || '';
      if (dates.length) dateSelect.replaceChildren();
      dates.forEach(value => dateSelect.add(new Option(value, value))); dateSelect.value = date;
      await day(signal);
    }
    async function directory(signal) {
      const result = await request('/api/reflections/admin/players', {}, signal);
      if (!active() || signal.aborted) return;
      players = result.players;
      if (!players.some(player => player.playerId === playerId)) playerId = players[0]?.playerId || '';
      playerSelect.replaceChildren();
      players.forEach(player => playerSelect.add(new Option(`${name(player)} · ${player.playerId}${player.enabled ? '' : ` · ${copy.disabled}`}`, player.playerId)));
      playerSelect.value = playerId;
      if (playerId) await savedDates(signal); else { dates = []; date = ''; status.textContent = copy.noPlayers; }
    }
    playerSelect.onchange = () => { playerId = playerSelect.value; load(savedDates); };
    dateSelect.onchange = () => { date = dateSelect.value; load(day); };
    older.onclick = () => { date = dates[dates.indexOf(date) + 1]; dateSelect.value = date; load(day); };
    newer.onclick = () => { date = dates[dates.indexOf(date) - 1]; dateSelect.value = date; load(day); };
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
