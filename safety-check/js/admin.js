/**
 * 管理画面（admin.html）
 *   - 管理キーでログイン（sessionStorage にタブ単位で保持）
 *   - 集計 / 部署別 / 一覧（検索・絞り込み・ページ送り）
 *   - CSV 出力、新しい安否確認の開始、自動更新
 */
(() => {
  'use strict';

  const { api, LABELS, escapeHtml, formatDateTime, initFade } = window.SafetyApp;
  const CONFIG = window.SAFETY_CONFIG;
  const KEY_STORAGE = 'safety-admin-key';

  // 一覧の並び順：救助が必要な人を最上位に
  const STATUS_ORDER = { severe: 0, minor: 1, none: 2, safe: 3 };

  /* ============================================================
     状態
     ============================================================ */
  const state = {
    adminKey: '',
    event: null,
    rows: [],
    filter: { q: '', dept: '', status: '' },
    page: 1,
    timer: null
  };

  /* ============================================================
     DOM 参照
     ============================================================ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const el = {
    loginView: $('#loginView'),
    loginForm: $('#loginForm'),
    loginMsg: $('[data-login-message]'),
    dashView: $('#dashView'),
    logout: $('[data-logout]'),
    list: $('[data-list]'),
    listCount: $('[data-list-count]'),
    pager: $('[data-pager]'),
    deptGrid: $('[data-dept-grid]'),
    q: $('#q'),
    fDept: $('#fDept'),
    fStatus: $('#fStatus'),
    dialog: $('#eventDialog'),
    eventForm: $('#eventForm'),
    toast: $('[data-toast]'),
    autoRefresh: $('[data-auto-refresh]')
  };

  /* ============================================================
     ヘルパー
     ============================================================ */
  const statusOf = (row) => row.status || 'none';

  const toast = (message) => {
    el.toast.textContent = message;
    el.toast.classList.add('is-show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.toast.classList.remove('is-show'), 2600);
  };

  const adminApi = (action, payload = {}) => api(action, { ...payload, adminKey: state.adminKey });

  /* ============================================================
     ログイン / ログアウト
     ============================================================ */
  const showDashboard = () => {
    el.loginView.hidden = true;
    el.dashView.hidden = false;
    el.logout.hidden = false;
    initFade(el.dashView);
  };

  const logout = () => {
    try { sessionStorage.removeItem(KEY_STORAGE); } catch (e) { /* noop */ }
    clearInterval(state.timer);
    window.location.reload();
  };

  const login = async (key) => {
    state.adminKey = key;
    await fetchData(); // 失敗時は例外
    try { sessionStorage.setItem(KEY_STORAGE, key); } catch (e) { /* noop */ }
    showDashboard();
    startAutoRefresh();
  };

  /* ============================================================
     データ取得
     ============================================================ */
  const fetchData = async () => {
    const data = await adminApi('adminSummary');
    state.event = data.event;
    state.rows = data.rows;
    $('[data-updated]').textContent = formatDateTime(new Date().toISOString());
    renderAll();
  };

  const refresh = async (silent = false) => {
    try {
      await fetchData();
      if (!silent) toast('最新の情報に更新しました');
    } catch (err) {
      toast(err.message);
    }
  };

  const startAutoRefresh = () => {
    clearInterval(state.timer);
    if (!el.autoRefresh.checked) return;
    state.timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh(true);
    }, CONFIG.AUTO_REFRESH_MS);
  };

  /* ============================================================
     描画
     ============================================================ */
  const renderAll = () => {
    renderEvent();
    renderStats();
    renderDeptOptions();
    renderDepts();
    renderList();
  };

  const renderEvent = () => {
    const ev = state.event;
    $('[data-event-title]').textContent = ev ? ev.title : '実施中の安否確認はありません';
    $('[data-event-start]').textContent = ev ? formatDateTime(ev.startedAt) : '—';
  };

  const countBy = (rows) => rows.reduce((acc, row) => {
    acc[statusOf(row)] += 1;
    return acc;
  }, { safe: 0, minor: 0, severe: 0, none: 0 });

  const renderStats = () => {
    const total = state.rows.length;
    const c = countBy(state.rows);
    const answered = total - c.none;
    const rate = total ? Math.round((answered / total) * 1000) / 10 : 0;

    const set = (key, value) => { $(`[data-stat="${key}"]`).textContent = value; };
    set('rate', rate);
    set('answered', answered);
    set('total', total);
    ['safe', 'minor', 'severe', 'none'].forEach((k) => set(k, c[k]));
    $('[data-progress]').style.width = `${rate}%`;

    // 絞り込み中のカードを強調
    $$('[data-filter-status]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.filterStatus === state.filter.status);
    });
  };

  const deptList = () => [...new Set(state.rows.map((r) => r.dept))].sort((a, b) => a.localeCompare(b, 'ja'));

  const renderDeptOptions = () => {
    const current = el.fDept.value;
    el.fDept.innerHTML = '<option value="">すべて</option>' +
      deptList().map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
    el.fDept.value = current;
  };

  const renderDepts = () => {
    const html = deptList().map((dept) => {
      const rows = state.rows.filter((r) => r.dept === dept);
      const c = countBy(rows);
      const total = rows.length;
      const rate = Math.round(((total - c.none) / total) * 100);
      const pct = (n) => `${(n / total) * 100}%`;
      const alert = c.severe ? `<span class="dept__alert">救助要 ${c.severe}名</span> ・ ` : '';
      return `
        <button class="dept js-fade" type="button" data-dept="${escapeHtml(dept)}">
          <span class="dept__head">
            <span class="dept__name">${escapeHtml(dept)}</span>
            <span class="dept__rate">${rate}%</span>
          </span>
          <span class="dept__bar" aria-hidden="true">
            <span class="dept__seg--safe" style="width:${pct(c.safe)}"></span>
            <span class="dept__seg--minor" style="width:${pct(c.minor)}"></span>
            <span class="dept__seg--severe" style="width:${pct(c.severe)}"></span>
          </span>
          <span class="dept__meta">${alert}未回答 ${c.none} / ${total}名</span>
        </button>`;
    }).join('');
    el.deptGrid.innerHTML = html;
    initFade(el.deptGrid);
  };

  const filteredRows = () => {
    const { q, dept, status } = state.filter;
    const query = q.trim().toLowerCase();
    return state.rows
      .filter((r) => !dept || r.dept === dept)
      .filter((r) => !status || statusOf(r) === status)
      .filter((r) => !query || r.name.toLowerCase().includes(query) || r.empId.includes(query))
      .sort((a, b) => (STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)]) || a.empId.localeCompare(b.empId));
  };

  const renderList = () => {
    const rows = filteredRows();
    const pages = Math.max(1, Math.ceil(rows.length / CONFIG.PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * CONFIG.PAGE_SIZE;
    const pageRows = rows.slice(start, start + CONFIG.PAGE_SIZE);

    el.listCount.textContent = rows.length;

    if (!pageRows.length) {
      el.list.innerHTML = '<tr><td class="table__empty" colspan="9">該当する社員はいません</td></tr>';
    } else {
      el.list.innerHTML = pageRows.map((r) => {
        const st = statusOf(r);
        const cell = (label, value, cls = '') =>
          `<td class="${cls}${value ? '' : ' is-empty'}" data-label="${label}">${escapeHtml(value)}</td>`;
        return `
          <tr>
            <td class="table__id">${escapeHtml(r.empId)}</td>
            <td class="table__name">${escapeHtml(r.name)}</td>
            <td class="table__dept">${escapeHtml(r.dept)}</td>
            <td class="table__status"><span class="badge badge--${st}">${LABELS.status[st]}</span></td>
            ${cell('現在地', LABELS.location[r.location] || '')}
            ${cell('出社', LABELS.work[r.work] || '')}
            ${cell('家族', LABELS.family[r.family] || '')}
            ${cell('連絡', r.comment || '', 'table__comment')}
            ${cell('回答', formatDateTime(r.answeredAt))}
          </tr>`;
      }).join('');
    }
    renderPager(pages);
  };

  const renderPager = (pages) => {
    if (pages <= 1) {
      el.pager.innerHTML = '';
      return;
    }
    const btn = (label, page, opts = {}) =>
      `<button class="pager__btn${opts.current ? ' is-current' : ''}" type="button" data-page="${page}"
        ${opts.disabled || opts.current ? 'disabled' : ''} ${opts.current ? 'aria-current="page"' : ''}
        ${opts.aria ? `aria-label="${opts.aria}"` : ''}>${label}</button>`;

    let html = btn('‹', state.page - 1, { disabled: state.page === 1, aria: '前のページ' });
    for (let p = 1; p <= pages; p += 1) {
      html += btn(p, p, { current: p === state.page });
    }
    html += btn('›', state.page + 1, { disabled: state.page === pages, aria: '次のページ' });
    el.pager.innerHTML = html;
  };

  /* ============================================================
     CSV 出力
     ============================================================ */
  const exportCsv = () => {
    // 「=」「+」「-」「@」で始まる値は Excel で数式扱いされるため先頭に ' を付ける（CSVインジェクション対策）
    const safe = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ['社員番号', '氏名', '部署', '状況', '現在地', '出社', '家族', '連絡事項', '回答日時'];
    const lines = filteredRows().map((r) => [
      r.empId, r.name, r.dept,
      LABELS.status[statusOf(r)],
      LABELS.location[r.location] || '',
      LABELS.work[r.work] || '',
      LABELS.family[r.family] || '',
      r.comment || '',
      r.answeredAt ? new Date(r.answeredAt).toLocaleString('ja-JP') : ''
    ].map(safe).join(','));

    // 先頭に BOM を付けて Excel での文字化けを防ぐ
    const blob = new Blob(['﻿' + [header.map(safe).join(','), ...lines].join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    a.href = URL.createObjectURL(blob);
    a.download = `anpi_${stamp}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* ============================================================
     イベント登録
     ============================================================ */
  // ログイン
  el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = el.loginForm.elements.adminKey;
    const field = input.closest('.field');
    field.classList.toggle('is-invalid', !input.checkValidity());
    if (!input.checkValidity()) return;

    const btn = el.loginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    el.loginMsg.textContent = '';
    try {
      await login(input.value);
    } catch (err) {
      el.loginMsg.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  el.logout.addEventListener('click', logout);
  $('[data-refresh]').addEventListener('click', () => refresh());
  $('[data-export]').addEventListener('click', exportCsv);
  el.autoRefresh.addEventListener('change', startAutoRefresh);

  // 絞り込み
  let searchTimer;
  el.q.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.filter.q = el.q.value;
      state.page = 1;
      renderList();
    }, 200);
  });

  el.fDept.addEventListener('change', () => {
    state.filter.dept = el.fDept.value;
    state.page = 1;
    renderList();
  });

  el.fStatus.addEventListener('change', () => {
    state.filter.status = el.fStatus.value;
    state.page = 1;
    renderStats();
    renderList();
  });

  // 集計カードクリックで状況絞り込み（もう一度押すと解除）
  $$('[data-filter-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.filterStatus;
      state.filter.status = state.filter.status === v ? '' : v;
      el.fStatus.value = state.filter.status;
      state.page = 1;
      renderStats();
      renderList();
      el.list.closest('section').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 部署カードクリックで部署絞り込み
  el.deptGrid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-dept]');
    if (!card) return;
    state.filter.dept = card.dataset.dept;
    el.fDept.value = state.filter.dept;
    state.page = 1;
    renderList();
    el.list.closest('section').scrollIntoView({ behavior: 'smooth' });
  });

  // ページ送り
  el.pager.addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    state.page = Number(b.dataset.page);
    renderList();
    el.list.closest('.table-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 新しい安否確認の開始
  $('[data-open-event]').addEventListener('click', () => {
    el.eventForm.reset();
    el.dialog.showModal();
  });
  $('[data-close-dialog]').addEventListener('click', () => el.dialog.close());

  el.eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = el.eventForm.elements.eventTitle;
    const field = input.closest('.field');
    field.classList.toggle('is-invalid', !input.checkValidity());
    if (!input.checkValidity()) return;

    // 誤操作防止の最終確認
    if (!window.confirm('現在の集計を締めて、新しい安否確認を開始します。よろしいですか？')) return;

    try {
      await adminApi('adminStartEvent', { title: input.value.trim() });
      el.dialog.close();
      state.filter = { q: '', dept: '', status: '' };
      el.q.value = '';
      el.fDept.value = '';
      el.fStatus.value = '';
      await fetchData();
      toast('新しい安否確認を開始しました');
    } catch (err) {
      toast(err.message);
    }
  });

  /* ============================================================
     初期化：保存済みキーがあれば自動ログイン
     ============================================================ */
  document.addEventListener('DOMContentLoaded', async () => {
    let saved = '';
    try { saved = sessionStorage.getItem(KEY_STORAGE) || ''; } catch (e) { /* noop */ }
    if (!saved) return;
    try {
      await login(saved);
    } catch (err) {
      try { sessionStorage.removeItem(KEY_STORAGE); } catch (e) { /* noop */ }
    }
  });
})();
