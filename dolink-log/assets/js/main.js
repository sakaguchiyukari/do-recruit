/* =========================================================
   Do.Link 運用ログ — Script
   1. 設定  2. ユーティリティ  3. 状態・DOM参照
   4. 通知・同期状態  5. API（Apps Script）  6. 権限表示
   7. 描画（一覧）  8. 描画（GA4グラフ）  9. フォーム
   10. 管理者ログイン  11. 絞り込み  12. GA4取り込み
   13. 書き出し（Excel / CSV）  14. 自動同期
   15. 演出（IntersectionObserver）  16. 起動
========================================================= */
(() => {
  'use strict';

  // JS有効時のみフェードインの初期状態を適用（JS失敗時に非表示のまま残さないため）
  document.documentElement.classList.add('js-enabled');

  /* ---------- 1. 設定 ---------- */
  const CONFIG = window.DOLINK_LOG_CONFIG || {};
  const API_URL = String(CONFIG.apiUrl || '').trim();
  const REFRESH_MS = Math.max(1, Number(CONFIG.refreshMinutes) || 5) * 60 * 1000;
  const DEMO_URL = 'assets/data/demo.json';
  const KEY_STORAGE = 'dolink-log:admin-key';

  const CATEGORIES = [
    { id: 'top', label: 'TOPお知らせ' },
    { id: 'work', label: 'グループのお仕事紹介' },
    { id: 'topics', label: '新着トピックス' },
    { id: 'company', label: '新着グループ会社情報' },
    { id: 'community', label: '新着グループコミュニティ' },
    { id: 'members', label: '社員一覧・検索' },
    { id: 'mail', label: 'メール配信' },
    { id: 'design', label: 'デザイン変更' },
    { id: 'other', label: 'その他' },
  ];
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const SHEETJS_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

  /* ---------- 2. ユーティリティ ---------- */
  const pad2 = (n) => String(n).padStart(2, '0');
  const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayKey = () => toDateKey(new Date());
  const monthKeyOf = (dateKey) => dateKey.slice(0, 7);

  const shiftMonth = (monthKey, diff) => {
    const [y, m] = monthKey.split('-').map(Number);
    return toDateKey(new Date(y, m - 1 + diff, 1)).slice(0, 7);
  };

  const daysOfMonth = (monthKey) => {
    const [y, m] = monthKey.split('-').map(Number);
    const count = new Date(y, m, 0).getDate();
    return Array.from({ length: count }, (_, i) => `${monthKey}-${pad2(i + 1)}`);
  };

  const daysBetween = (startKey, endKey) => {
    const [y, m, d] = startKey.split('-').map(Number);
    const result = [];
    const cursor = new Date(y, m - 1, d);
    while (toDateKey(cursor) <= endKey && result.length < 3700) {
      result.push(toDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  };

  const parseDateKey = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return { y, m, d, week: new Date(y, m - 1, d).getDay() };
  };

  const weekdayOf = (dateKey) => WEEKDAYS[parseDateKey(dateKey).week];

  const formatMonth = (monthKey) => {
    const [y, m] = monthKey.split('-').map(Number);
    return `${y}年${m}月`;
  };

  const formatNumber = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('ja-JP') : '—');
  const formatTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  const findCategory = (value) => CATEGORIES.find((c) => c.id === value || c.label === value);
  const categoryLabel = (id) => (findCategory(id) || CATEGORIES[CATEGORIES.length - 1]).label;

  const isHttpUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const displayUrl = (value) => {
    try {
      const url = new URL(value);
      return `${url.host}${url.pathname}${url.search}`;
    } catch {
      return value;
    }
  };

  // Excel用の日付シリアル値（タイムゾーンの影響を受けない計算）
  const dateSerial = (dateKey) => {
    const { y, m, d } = parseDateKey(dateKey);
    return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
  };

  const createEl = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text; // 入力値は必ず textContent で挿入
    return node;
  };

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // localStorage はプライベートモード等で例外になるため必ず try で包む
  const storage = {
    get: (key) => { try { return localStorage.getItem(key) || ''; } catch { return ''; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* 保存できなくても動作は継続 */ } },
    remove: (key) => { try { localStorage.removeItem(key); } catch { /* noop */ } },
  };

  /* ---------- 3. 状態・DOM参照 ---------- */
  const state = {
    logs: [],
    ga4: { metrics: [], days: {} },
    metric: '',
    month: monthKeyOf(todayKey()),
    category: 'all',
    keyword: '',
    editingId: null,
    mode: API_URL ? 'live' : 'demo', // live：スプレッドシート連携 / demo：デモデータ
    loaded: false,
    adminKey: '',
    syncing: false,
    lastSynced: null,
  };

  const isAdmin = () => state.mode === 'live' && Boolean(state.adminKey);

  const $ = (selector) => document.querySelector(selector);
  const el = {
    status: $('.js-status'),
    statusText: $('.js-status-text'),
    refresh: $('.js-refresh'),
    lead: $('.js-lead'),
    notice: $('.js-notice'),
    workspace: $('.js-workspace'),
    entry: $('.js-entry'),
    formTitle: $('.js-form-title'),
    form: $('.js-entry-form'),
    logout: $('.js-logout'),
    fDate: $('#log-date'),
    fDept: $('#log-dept'),
    deptList: $('#log-dept-list'),
    fCategory: $('#log-category'),
    fTitle: $('#log-title-input'),
    fUrl: $('#log-url'),
    fMemo: $('#log-memo'),
    memoCount: $('.js-memo-count'),
    submit: $('.js-submit'),
    cancel: $('.js-cancel'),
    monthLabel: $('.js-month-label'),
    prev: $('.js-month-prev'),
    next: $('.js-month-next'),
    today: $('.js-month-today'),
    insight: $('.js-insight'),
    metricSelect: $('.js-metric'),
    metricWrap: $('.js-metric-wrap'),
    chartWrap: $('.js-chart-wrap'),
    legend: $('.js-legend'),
    chartCanvas: $('.js-chart'),
    insightEmpty: $('.js-insight-empty'),
    compare: $('.js-compare'),
    statWorkLabel: $('.js-stat-work-label'),
    statWork: $('.js-stat-work'),
    statRestLabel: $('.js-stat-rest-label'),
    statRest: $('.js-stat-rest'),
    insightNote: $('.js-insight-note'),
    admin: $('.js-admin'),
    ga4Input: $('.js-ga4-input'),
    ga4Meta: $('.js-ga4-meta'),
    filters: $('.js-filters'),
    search: $('.js-search'),
    count: $('.js-count'),
    exportScope: $('.js-export-scope'),
    exportXlsx: $('.js-export-xlsx'),
    exportCsv: $('.js-export-csv'),
    list: $('.js-log-list'),
    empty: $('.js-empty'),
    fab: $('.js-fab'),
    toast: $('.js-toast'),
    loginOpen: $('.js-login-open'),
    login: $('.js-login'),
    loginForm: $('.js-login-form'),
    loginKey: $('#login-key'),
    loginSubmit: $('.js-login-submit'),
    loginCancel: $('.js-login-cancel'),
  };
  const formFields = [el.fDate, el.fDept, el.fCategory, el.fTitle, el.fUrl, el.fMemo];

  /* ---------- 4. 通知・同期状態 ---------- */
  let toastTimer = null;
  const showToast = (message, tone = 'info') => {
    el.toast.textContent = message;
    el.toast.dataset.tone = tone;
    el.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 3600);
  };

  const setStatus = (stateName, text) => {
    el.status.dataset.state = stateName;
    el.statusText.textContent = text;
  };

  const setSyncing = (syncing) => {
    state.syncing = syncing;
    el.refresh.classList.toggle('is-spinning', syncing);
    el.refresh.disabled = syncing;
    if (syncing) setStatus('syncing', '同期中…');
  };

  const showSyncedStatus = () => {
    if (state.mode === 'demo') {
      setStatus('demo', 'デモ表示');
      return;
    }
    const time = state.lastSynced ? formatTime(state.lastSynced) : '—';
    setStatus(isAdmin() ? 'online' : 'readonly', `${isAdmin() ? '管理者' : '閲覧'}・${time} 更新`);
  };

  /* ---------- 5. API（Apps Script ウェブアプリ） ---------- */
  class ApiError extends Error {
    constructor(code, message) {
      super(message || code);
      this.code = code;
    }
  }

  // 読み込み：GETで全データを取得（キャッシュ回避のため時刻を付与）
  const fetchData = async () => {
    const url = state.mode === 'live'
      ? `${API_URL}${API_URL.includes('?') ? '&' : '?'}t=${Date.now()}`
      : DEMO_URL;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new ApiError('network', `HTTP ${response.status}`);
    const json = await response.json();
    if (json && json.ok === false) throw new ApiError(json.error || 'server', json.message);
    return json;
  };

  // 書き込み：text/plain で送るとCORSのプリフライトが発生しない（Apps Script はOPTIONS非対応のため）
  const postApi = async (action, payload = {}) => {
    if (state.mode !== 'live') throw new ApiError('demo');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, key: state.adminKey, ...payload }),
    });
    if (!response.ok) throw new ApiError('network', `HTTP ${response.status}`);
    const json = await response.json();
    if (!json || json.ok !== true) throw new ApiError((json && json.error) || 'server', json && json.message);
    return json;
  };

  const handleApiError = (error, fallback = '保存できませんでした。時間をおいてもう一度お試しください。') => {
    const code = error && error.code;
    if (code === 'unauthorized') {
      showToast('管理者キーが正しくありません。もう一度ログインしてください。', 'error');
      logout(false);
    } else if (code === 'invalid') {
      showToast(`入力内容を確認してください。${error.message && error.message !== code ? `（${error.message}）` : ''}`, 'error');
    } else if (code === 'not_found') {
      showToast('対象の記録が見つかりません。ほかの人が削除した可能性があります。', 'error');
    } else {
      showToast(fallback, 'error');
    }
  };

  /* ---------- 6. 権限表示（管理者のみ編集、他は閲覧＋書き出し） ---------- */
  const applyRole = () => {
    const canEdit = isAdmin();
    el.entry.hidden = !canEdit;
    el.fab.hidden = !canEdit;
    el.admin.hidden = !canEdit;
    el.workspace.classList.toggle('is-readonly', !canEdit);
    el.loginOpen.hidden = canEdit || state.mode !== 'live';
    el.lead.textContent = canEdit
      ? '管理者としてログイン中です。記録した内容はスプレッドシートに保存され、閲覧ページにも自動で反映されます。'
      : 'Do.Linkで行った作業と、GA4のアクセス推移を日付ごとに確認できます。必要なときはExcel・CSVで書き出せます。';

    // デモ表示の案内
    el.notice.hidden = state.mode !== 'demo';
    el.notice.textContent = 'デモ表示中です。assets/js/config.js に Apps Script のURLを設定すると、スプレッドシートの内容を表示・自動同期します。';
    if (!canEdit) el.fab.classList.remove('is-visible');
  };

  /* ---------- 7. 描画（一覧） ---------- */
  const metricValue = (dateKey) => {
    const day = state.ga4.days[dateKey];
    const value = day ? day[state.metric] : undefined;
    return Number.isFinite(value) ? value : null;
  };

  const getVisibleLogs = () => {
    const keyword = state.keyword.toLowerCase();
    return state.logs
      .filter((log) => (keyword ? true : monthKeyOf(log.date) === state.month))
      .filter((log) => state.category === 'all' || log.category === state.category)
      .filter((log) => {
        if (!keyword) return true;
        return [log.dept, log.title, log.memo, log.url, categoryLabel(log.category)]
          .some((v) => v.toLowerCase().includes(keyword));
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
  };

  const updateHead = (count) => {
    const searching = Boolean(state.keyword);
    el.monthLabel.textContent = searching ? `「${state.keyword}」の検索結果` : formatMonth(state.month);
    el.prev.disabled = searching;
    el.next.disabled = searching;
    el.today.disabled = searching || state.month === monthKeyOf(todayKey());
    el.count.textContent = searching ? `全期間から ${count}件` : `${count}件の記録`;
  };

  const buildEntry = (log) => {
    const item = createEl('li', 'c-entry');
    if (log.id === state.editingId) item.classList.add('is-editing');

    const head = createEl('div', 'c-entry__head');
    head.append(createEl('span', `c-tag u-cat--${log.category}`, categoryLabel(log.category)));
    if (log.dept) head.append(createEl('span', 'c-entry__dept', log.dept));
    item.append(head);

    item.append(createEl('h3', 'c-entry__title', log.title));
    if (log.memo) item.append(createEl('p', 'c-entry__memo', log.memo));

    if (log.url && isHttpUrl(log.url)) {
      const link = createEl('a', 'c-entry__link', displayUrl(log.url));
      link.href = log.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(link);
    }

    // 編集・削除は管理者のみ
    if (isAdmin()) {
      const foot = createEl('div', 'c-entry__foot');
      const actions = createEl('span', 'c-entry__actions');
      const editBtn = createEl('button', 'c-text-btn', '編集');
      editBtn.type = 'button';
      editBtn.dataset.action = 'edit';
      editBtn.dataset.id = log.id;
      const deleteBtn = createEl('button', 'c-text-btn c-text-btn--danger', '削除');
      deleteBtn.type = 'button';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.dataset.id = log.id;
      actions.append(editBtn, deleteBtn);
      foot.append(actions);
      item.append(foot);
    }
    return item;
  };

  const buildDay = (dateKey, logs, index) => {
    const { m, d, week } = parseDateKey(dateKey);
    const isToday = dateKey === todayKey();

    const day = createEl('article', 'p-day u-reveal js-reveal');
    if (isToday) day.classList.add('p-day--today');
    day.dataset.revealKey = `${dateKey}-${logs.length}`;
    day.style.setProperty('--i', String(Math.min(index, 6))); // 連続表示の遅延はCSS側で計算

    const date = createEl('header', 'p-day__date');
    date.setAttribute('aria-label', `${dateKey.replace(/-/g, '/')}（${WEEKDAYS[week]}）`);
    date.append(createEl('span', 'p-day__month', `${m}月`));
    date.append(createEl('span', 'p-day__num', pad2(d)));
    const weekClass = week === 0 ? ' p-day__week--sun' : week === 6 ? ' p-day__week--sat' : '';
    date.append(createEl('span', `p-day__week${weekClass}`, WEEKDAYS[week]));
    if (isToday) date.append(createEl('span', 'p-day__today', '今日'));

    const body = createEl('div', 'p-day__body');
    const value = state.metric ? metricValue(dateKey) : null;
    if (value !== null) {
      const metric = createEl('p', 'p-day__metric');
      metric.append(createEl('span', '', `この日の${state.metric}`));
      metric.append(createEl('span', 'p-day__metric-value', formatNumber(value)));
      body.append(metric);
    }
    const list = createEl('ol', 'p-day__entries');
    logs.forEach((log) => list.append(buildEntry(log)));
    body.append(list);

    day.append(date, body);
    return day;
  };

  const emptyMessage = (count) => {
    if (!state.loaded) return '記録を読み込んでいます…';
    if (count > 0) return '';
    if (state.keyword || state.category !== 'all') return '条件に合う記録はありません。';
    return isAdmin()
      ? 'この月の記録はまだありません。フォームから最初の作業を記録しましょう。'
      : 'この月の記録はまだありません。';
  };

  const render = () => {
    // 表示する指標を先に確定（一覧とグラフで同じ指標を使う）
    if (!state.ga4.metrics.includes(state.metric)) state.metric = state.ga4.metrics[0] || '';
    const visible = getVisibleLogs();
    updateHead(visible.length);

    const groups = new Map();
    visible.forEach((log) => {
      if (!groups.has(log.date)) groups.set(log.date, []);
      groups.get(log.date).push(log);
    });

    const fragment = document.createDocumentFragment();
    [...groups.entries()].forEach(([dateKey, logs], index) => fragment.append(buildDay(dateKey, logs, index)));
    el.list.replaceChildren(fragment);

    const message = emptyMessage(visible.length);
    el.empty.hidden = !message;
    el.empty.textContent = message;
    el.exportXlsx.disabled = !state.logs.length && !state.ga4.metrics.length;
    el.exportCsv.disabled = !state.logs.length;

    renderInsight();
    observeReveal(el.list.querySelectorAll('.js-reveal'));
  };

  /* ---------- 8. 描画（GA4グラフ） ---------- */
  let chart = null;

  const chartColors = () => ({
    red: cssVar('--color-brand-red') || '#bb1e00',
    muted: cssVar('--color-ink-muted') || '#556178',
    rule: cssVar('--color-rule') || '#d8e0eb',
  });

  // 線：横方向の青グラデーション／塗り：縦方向に薄くなる青
  const lineGradient = (context) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return '#0068b7';
    const g = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    g.addColorStop(0, '#00479e');
    g.addColorStop(0.45, '#0068b7');
    g.addColorStop(1, '#2b9de8');
    return g;
  };

  const fillGradient = (context) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return 'rgba(0, 104, 183, 0.1)';
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, 'rgba(43, 157, 232, 0.28)');
    g.addColorStop(1, 'rgba(43, 157, 232, 0)');
    return g;
  };

  const ensureChart = () => {
    if (chart || !window.Chart) return chart;
    const colors = chartColors();
    chart = new window.Chart(el.chartCanvas, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion() ? false : { duration: 500 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const key = items[0] && items[0].chart.$dateKeys[items[0].dataIndex];
                return key ? `${key.replace(/-/g, '/')}（${weekdayOf(key)}）` : '';
              },
              label: (item) => {
                if (item.datasetIndex === 0) return `${state.metric}：${formatNumber(item.parsed.y)}`;
                const titles = item.chart.$workTitles[item.dataIndex] || [];
                return titles.map((t) => `● ${t}`);
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.muted, maxRotation: 0, autoSkipPadding: 8 } },
          y: { beginAtZero: true, grid: { color: colors.rule }, ticks: { color: colors.muted, precision: 0 } },
        },
      },
    });
    return chart;
  };

  const renderMetricOptions = () => {
    const metrics = state.ga4.metrics;
    const current = [...el.metricSelect.options].map((o) => o.value).join('|');
    if (current !== metrics.join('|')) {
      el.metricSelect.replaceChildren(...metrics.map((name) => {
        const option = createEl('option', '', name);
        option.value = name;
        return option;
      }));
    }
    el.metricSelect.value = state.metric;
    el.metricWrap.hidden = metrics.length < 2;
  };

  const renderInsight = () => {
    // 読み込み前・キーワード検索中は月単位のグラフを出さない
    el.insight.hidden = !state.loaded || Boolean(state.keyword);
    if (el.insight.hidden) return;

    renderMetricOptions();
    const keys = daysOfMonth(state.month);
    const values = keys.map((k) => (state.metric ? metricValue(k) : null));
    const hasData = values.some((v) => v !== null);

    // 作業がある日（カテゴリ絞り込みを反映）
    const workByDay = new Map();
    state.logs
      .filter((log) => monthKeyOf(log.date) === state.month)
      .filter((log) => state.category === 'all' || log.category === state.category)
      .forEach((log) => {
        if (!workByDay.has(log.date)) workByDay.set(log.date, []);
        workByDay.get(log.date).push(`${categoryLabel(log.category)}：${log.title}`);
      });

    el.chartWrap.hidden = !hasData || !window.Chart;
    el.compare.hidden = !hasData;
    el.legend.hidden = !hasData || !window.Chart;
    el.insightNote.hidden = !hasData;
    el.insightEmpty.hidden = hasData && Boolean(window.Chart);
    if (!hasData) {
      el.insightEmpty.textContent = state.ga4.metrics.length
        ? 'この月のGA4データはまだありません。'
        : 'GA4のデータはまだ取り込まれていません。';
    } else if (!window.Chart) {
      el.insightEmpty.textContent = 'グラフを読み込めませんでした。ページを再読み込みしてください。';
    }

    // 作業がある日／ない日の平均（参考値）
    const workVals = [];
    const restVals = [];
    keys.forEach((k, i) => {
      if (values[i] === null) return;
      (workByDay.has(k) ? workVals : restVals).push(values[i]);
    });
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN);
    el.statWorkLabel.textContent = `作業があった日の平均${state.metric}（${workVals.length}日）`;
    el.statWork.textContent = formatNumber(avg(workVals));
    el.statRestLabel.textContent = `作業がなかった日の平均${state.metric}（${restVals.length}日）`;
    el.statRest.textContent = formatNumber(avg(restVals));

    if (!hasData || !ensureChart()) return;
    const colors = chartColors();
    chart.$dateKeys = keys;
    chart.$workTitles = keys.map((k) => workByDay.get(k) || null);
    chart.data.labels = keys.map((k) => String(parseDateKey(k).d));
    chart.data.datasets = [
      {
        label: state.metric,
        data: values,
        borderColor: lineGradient,
        backgroundColor: fillGradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        spanGaps: true,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: '作業日',
        data: keys.map((k, i) => (workByDay.has(k) ? (values[i] ?? 0) : null)),
        showLine: false,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: colors.red,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ];
    chart.options.scales.x.ticks.color = colors.muted;
    chart.options.scales.y.ticks.color = colors.muted;
    chart.options.scales.y.grid.color = colors.rule;
    chart.update();
  };

  /* ---------- 9. フォーム（管理者のみ） ---------- */
  const setFieldError = (field, message) => {
    const errorEl = document.getElementById(`${field.id}-error`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errorEl) errorEl.textContent = message;
  };

  const validateFields = (fields) => {
    let firstInvalid = null;
    fields.forEach((field) => {
      const valid = field.checkValidity();
      setFieldError(field, valid ? '' : field.validationMessage);
      if (!valid && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  };

  const updateMemoCount = () => {
    el.memoCount.textContent = `${el.fMemo.value.length} / ${el.fMemo.maxLength}`;
  };

  const resetForm = () => {
    el.form.reset();
    el.fDate.value = todayKey();
    formFields.forEach((field) => setFieldError(field, ''));
    state.editingId = null;
    el.formTitle.textContent = '作業を記録';
    el.submit.textContent = '記録する';
    el.cancel.hidden = true;
    updateMemoCount();
  };

  const readForm = () => ({
    date: el.fDate.value,
    dept: el.fDept.value.trim(),
    category: el.fCategory.value,
    title: el.fTitle.value.trim(),
    url: el.fUrl.value.trim(),
    memo: el.fMemo.value.trim(),
  });

  const scrollToForm = () => {
    el.entry.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    el.fTitle.focus({ preventScroll: true });
  };

  const startEdit = (log) => {
    state.editingId = log.id;
    el.fDate.value = log.date;
    el.fDept.value = log.dept;
    el.fCategory.value = log.category;
    el.fTitle.value = log.title;
    el.fUrl.value = log.url;
    el.fMemo.value = log.memo;
    formFields.forEach((field) => setFieldError(field, ''));
    el.formTitle.textContent = '記録を編集';
    el.submit.textContent = '変更を保存';
    el.cancel.hidden = false;
    updateMemoCount();
    render();
    scrollToForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin() || state.syncing) return;
    if (!validateFields(formFields)) return;

    const log = readForm();
    const isEdit = Boolean(state.editingId);
    el.submit.disabled = true;

    try {
      if (isEdit) await postApi('update', { id: state.editingId, log });
      else await postApi('create', { log });
      showToast(isEdit ? '変更を保存しました。' : '記録しました。');
      if (!state.keyword) state.month = monthKeyOf(log.date);
      resetForm();
      await sync({ silent: true });
    } catch (error) {
      handleApiError(error);
    } finally {
      el.submit.disabled = false;
    }
  };

  // 削除は2段階（誤操作防止）
  const confirmTwice = (button, label, onConfirm) => {
    if (!button.classList.contains('is-confirm')) {
      const original = button.textContent;
      button.classList.add('is-confirm');
      button.textContent = label;
      setTimeout(() => {
        if (!button.isConnected) return;
        button.classList.remove('is-confirm');
        button.textContent = original;
      }, 4000);
      return;
    }
    onConfirm();
  };

  const handleDelete = (button, id) => {
    confirmTwice(button, '削除を確定', async () => {
      button.disabled = true;
      try {
        await postApi('delete', { id });
        if (state.editingId === id) resetForm();
        showToast('記録を削除しました。');
        await sync({ silent: true });
      } catch (error) {
        button.disabled = false;
        handleApiError(error, '削除できませんでした。時間をおいてもう一度お試しください。');
      }
    });
  };

  const renderCategoryOptions = () => {
    const fragment = document.createDocumentFragment();
    CATEGORIES.forEach((category) => {
      const option = createEl('option', '', category.label);
      option.value = category.id;
      fragment.append(option);
    });
    el.fCategory.append(fragment);
  };

  // 事業名の入力候補：過去に使った名前を出し、表記ゆれを防ぐ
  let deptSignature = '';
  const renderDeptSuggestions = () => {
    const names = [...new Set(state.logs.map((log) => log.dept).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));
    const signature = names.join('|');
    if (signature === deptSignature) return;
    deptSignature = signature;
    el.deptList.replaceChildren(...names.map((name) => {
      const option = document.createElement('option');
      option.value = name;
      return option;
    }));
  };

  const initForm = () => {
    renderCategoryOptions();
    resetForm();
    el.form.addEventListener('submit', handleSubmit);
    el.cancel.addEventListener('click', () => {
      resetForm();
      render();
    });
    el.fMemo.addEventListener('input', updateMemoCount);

    // エラー表示中の項目は入力のたびに再判定
    [...formFields, el.loginKey].forEach((field) => {
      const recheck = () => {
        if (field.getAttribute('aria-invalid') === 'true') {
          setFieldError(field, field.checkValidity() ? '' : field.validationMessage);
        }
      };
      field.addEventListener('input', recheck);
      field.addEventListener('change', recheck);
    });

    el.list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || !isAdmin()) return;
      const log = state.logs.find((item) => item.id === button.dataset.id);
      if (!log) return;
      if (button.dataset.action === 'edit') startEdit(log);
      if (button.dataset.action === 'delete') handleDelete(button, log.id);
    });
  };

  /* ---------- 10. 管理者ログイン ---------- */
  const openLogin = () => {
    el.loginForm.reset();
    setFieldError(el.loginKey, '');
    if (typeof el.login.showModal === 'function') el.login.showModal();
    else el.login.setAttribute('open', '');
    el.loginKey.focus();
  };

  const closeLogin = () => {
    if (typeof el.login.close === 'function') el.login.close();
    else el.login.removeAttribute('open');
  };

  const logout = (notify = true) => {
    state.adminKey = '';
    storage.remove(KEY_STORAGE);
    resetForm();
    applyRole();
    showSyncedStatus();
    render();
    if (notify) showToast('ログアウトしました。');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!validateFields([el.loginKey])) return;
    const key = el.loginKey.value.trim();
    el.loginSubmit.disabled = true;
    const previous = state.adminKey;
    state.adminKey = key;
    try {
      await postApi('verify'); // キーの正否はサーバー側でのみ判定
      storage.set(KEY_STORAGE, key);
      closeLogin();
      applyRole();
      showSyncedStatus();
      render();
      showToast('管理者としてログインしました。');
    } catch (error) {
      state.adminKey = previous;
      setFieldError(el.loginKey, error.code === 'unauthorized'
        ? '管理者キーが正しくありません。'
        : '確認できませんでした。通信状況を確認してください。');
    } finally {
      el.loginSubmit.disabled = false;
    }
  };

  const initLogin = () => {
    el.loginOpen.addEventListener('click', openLogin);
    el.loginCancel.addEventListener('click', closeLogin);
    el.loginForm.addEventListener('submit', handleLogin);
    el.logout.addEventListener('click', () => logout(true));
    // 保存済みのキーで自動ログイン（不正なキーなら最初の書き込み時に解除される）
    if (state.mode === 'live') state.adminKey = storage.get(KEY_STORAGE);
  };

  /* ---------- 11. 絞り込み ---------- */
  const renderFilters = () => {
    const options = [{ id: 'all', label: 'すべて' }, ...CATEGORIES];
    el.filters.replaceChildren(...options.map((option) => {
      const chip = createEl('button', 'c-chip');
      chip.type = 'button';
      chip.dataset.category = option.id;
      chip.setAttribute('aria-pressed', String(option.id === state.category));
      if (option.id !== 'all') {
        const dot = createEl('span', `c-chip__dot u-cat--${option.id}`);
        dot.setAttribute('aria-hidden', 'true');
        chip.append(dot);
      }
      chip.append(document.createTextNode(option.label));
      return chip;
    }));
  };

  const initFilters = () => {
    renderFilters();
    el.filters.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-category]');
      if (!chip) return;
      state.category = chip.dataset.category;
      el.filters.querySelectorAll('[data-category]').forEach((node) => {
        node.setAttribute('aria-pressed', String(node.dataset.category === state.category));
      });
      render();
    });
    el.prev.addEventListener('click', () => { state.month = shiftMonth(state.month, -1); render(); });
    el.next.addEventListener('click', () => { state.month = shiftMonth(state.month, 1); render(); });
    el.today.addEventListener('click', () => { state.month = monthKeyOf(todayKey()); render(); });
    el.metricSelect.addEventListener('change', () => { state.metric = el.metricSelect.value; render(); });

    let timer = null;
    el.search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.keyword = el.search.value.trim();
        render();
      }, 200);
    });
  };

  /* ---------- 12. GA4取り込み（管理者のみ・自動同期が使えない場合の予備） ---------- */

  // ダブルクォート・改行を含むCSVを1行ずつ配列にする
  const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',' || ch === '\t') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.map((r) => r.map((c) => c.trim()));
  };

  // 20261006 / 2026-10-06 / 2026/10/6 を YYYY-MM-DD に変換
  const toIsoDate = (value) => {
    const v = value.replace(/\s/g, '');
    let m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!m) m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (!m) return null;
    const key = `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
    const { y, m: mo, d } = parseDateKey(key);
    const check = new Date(y, mo - 1, d);
    return check.getMonth() === mo - 1 && check.getDate() === d ? key : null;
  };

  const toNumber = (value) => {
    const n = Number(String(value).replace(/[,%\s]/g, ''));
    return value !== '' && Number.isFinite(n) ? n : null;
  };

  // GA4のエクスポートCSV（# で始まる説明行・合計行を含む）から日別の数値を取り出す
  const parseGa4Csv = (text) => {
    const rows = parseCsv(text.replace(/^﻿/, ''))
      .filter((r) => r.length && !(r.length === 1 && r[0] === ''))
      .filter((r) => !r[0].startsWith('#'));
    if (rows.length < 2) throw new Error('データ行が見つかりません。');

    const headerIndex = rows.findIndex((r, i) => i < rows.length - 1 && r.some((c) => /^(日付|date)$/i.test(c)));
    if (headerIndex < 0) throw new Error('「日付」の列が見つかりません。ディメンションに「日付」を入れて書き出してください。');
    const header = rows[headerIndex];
    const dateCol = header.findIndex((c) => /^(日付|date)$/i.test(c));
    const dataRows = rows.slice(headerIndex + 1).filter((r) => toIsoDate(r[dateCol] || ''));

    // 指標の列：ほぼ全行が数値の列
    const metricCols = header
      .map((name, col) => ({ name, col }))
      .filter(({ col, name }) => col !== dateCol && name)
      .filter(({ col }) => dataRows.length && dataRows.filter((r) => toNumber(r[col] || '') !== null).length >= dataRows.length * 0.9);
    if (!metricCols.length) throw new Error('数値の列（表示回数・ユーザー数など）が見つかりません。');

    const days = {};
    dataRows.forEach((r) => {
      const key = toIsoDate(r[dateCol]);
      days[key] = days[key] || {};
      metricCols.forEach(({ name, col }) => {
        const n = toNumber(r[col] || '');
        if (n !== null) days[key][name] = (days[key][name] || 0) + n; // 同じ日付が複数行ある場合は合算
      });
    });
    return { metrics: metricCols.map((c) => c.name), days };
  };

  const importGa4File = async (file) => {
    if (!file || !isAdmin()) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('ファイルが大きすぎます（5MBまで）。期間を絞って書き出してください。', 'error');
      return;
    }
    try {
      const parsed = parseGa4Csv(await file.text());
      await postApi('ga4Import', parsed);
      const keys = Object.keys(parsed.days).sort();
      showToast(`GA4データを取り込みました（${keys[0].replace(/-/g, '/')}〜${keys[keys.length - 1].replace(/-/g, '/')}、${parsed.metrics.length}指標）。`);
      state.month = monthKeyOf(keys[keys.length - 1]);
      await sync({ silent: true });
    } catch (error) {
      if (error instanceof ApiError) handleApiError(error, '取り込めませんでした。時間をおいてもう一度お試しください。');
      else showToast(`取り込めませんでした：${error.message}`, 'error');
    } finally {
      el.ga4Input.value = '';
    }
  };

  const updateGa4Meta = () => {
    const keys = Object.keys(state.ga4.days).sort();
    el.ga4Meta.textContent = keys.length
      ? `取り込み済み：${keys[0].replace(/-/g, '/')}〜${keys[keys.length - 1].replace(/-/g, '/')}（${state.ga4.metrics.join('・')}）`
      : 'GA4データは未取り込みです。';
  };

  const initGa4 = () => {
    el.ga4Input.addEventListener('change', () => importGa4File(el.ga4Input.files[0]));
  };

  /* ---------- 13. 書き出し（Excel / CSV：ブラウザで直接ダウンロード） ---------- */

  // 書き出し範囲のデータを組み立てる（Excel・CSV共通）
  const buildExport = () => {
    const scopeAll = el.exportScope.value === 'all';
    const logs = (scopeAll ? [...state.logs] : getVisibleLogs())
      .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
    const metrics = state.ga4.metrics;

    let dayKeys;
    if (scopeAll) {
      const all = [...logs.map((l) => l.date), ...Object.keys(state.ga4.days)].sort();
      dayKeys = all.length ? daysBetween(all[0], all[all.length - 1]) : [];
    } else if (state.keyword) {
      dayKeys = [...new Set(logs.map((l) => l.date))];
    } else {
      dayKeys = daysOfMonth(state.month);
    }

    const metricCells = (key) => metrics.map((name) => {
      const v = state.ga4.days[key] && state.ga4.days[key][name];
      return Number.isFinite(v) ? v : '';
    });

    const logHeader = ['日付', '曜日', '事業名', 'カテゴリ', '作業内容', '対象ページURL', 'メモ', ...metrics.map((m) => `${m}（その日）`)];
    const logRows = logs.map((l) => [l.date, weekdayOf(l.date), l.dept, categoryLabel(l.category), l.title, l.url, l.memo, ...metricCells(l.date)]);

    const dailyHeader = ['日付', '曜日', ...metrics, '作業件数', 'その日の作業'];
    const dailyRows = dayKeys.map((key) => {
      const items = logs.filter((l) => l.date === key);
      return [key, weekdayOf(key), ...metricCells(key), items.length,
        items.map((l) => `[${categoryLabel(l.category)}] ${l.dept ? `${l.dept}：` : ''}${l.title}`).join(' / ')];
    });

    const stamp = todayKey().replace(/-/g, '');
    const base = scopeAll ? `dolink-log-all-${stamp}` : state.keyword ? `dolink-log-search-${stamp}` : `dolink-log-${state.month}`;
    return { logHeader, logRows, dailyHeader, dailyRows, base };
  };

  const saveFile = (filename, data, type) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = createEl('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${filename} を書き出しました。`);
  };

  // 表計算ソフトで数式として解釈されるのを防ぐ
  const safeText = (value) => {
    const text = String(value ?? '');
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
  };

  const exportCsv = () => {
    const { logHeader, logRows, base } = buildExport();
    if (!logRows.length) { showToast('書き出す記録がありません。'); return; }
    const cell = (v) => `"${safeText(v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [logHeader, ...logRows].map((r) => r.map(cell).join(',')).join('\r\n'); // BOM付き（Excelの文字化け対策）
    saveFile(`${base}.csv`, csv, 'text/csv;charset=utf-8');
  };

  // SheetJSは書き出し時にだけ読み込む（初回表示を軽くするため）
  let sheetJsPromise = null;
  const loadSheetJs = () => {
    if (window.XLSX) return Promise.resolve();
    if (!sheetJsPromise) {
      sheetJsPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SHEETJS_URL;
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => { sheetJsPromise = null; reject(new Error('load failed')); };
        document.head.append(script);
      });
    }
    return sheetJsPromise;
  };

  const toSheet = (header, rows, widths, dateCols) => {
    const { XLSX } = window;
    const aoa = [header, ...rows.map((r) => r.map((v, i) => {
      if (dateCols.includes(i) && DATE_RE.test(v)) return { t: 'n', v: dateSerial(v), z: 'yyyy/mm/dd' };
      return typeof v === 'string' ? safeText(v) : v;
    }))];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet['!cols'] = widths.map((wch) => ({ wch }));
    sheet['!autofilter'] = { ref: sheet['!ref'] };
    return sheet;
  };

  const exportXlsx = async () => {
    const data = buildExport();
    if (!data.logRows.length && !data.dailyRows.length) { showToast('書き出すデータがありません。'); return; }
    el.exportXlsx.disabled = true;
    try {
      await loadSheetJs();
      const { XLSX } = window;
      const book = XLSX.utils.book_new();
      const metricW = state.ga4.metrics.map(() => 16);
      XLSX.utils.book_append_sheet(book,
        toSheet(data.logHeader, data.logRows, [12, 6, 20, 22, 40, 40, 36, ...metricW], [0]), '作業ログ');
      XLSX.utils.book_append_sheet(book,
        toSheet(data.dailyHeader, data.dailyRows, [12, 6, ...metricW, 10, 60], [0]), '日別GA4と作業');
      const buffer = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
      saveFile(`${data.base}.xlsx`, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch {
      showToast('Excelファイルを作成できませんでした。CSVでの書き出しをお試しください。', 'error');
    } finally {
      el.exportXlsx.disabled = false;
    }
  };

  /* ---------- 14. 自動同期 ---------- */

  // 受け取ったデータは形式を検証してから使う
  const normalizeLog = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const date = typeof raw.date === 'string' && DATE_RE.test(raw.date) ? raw.date : null;
    if (!date || !raw.id) return null;
    const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : v == null ? '' : String(v).slice(0, max));
    const category = findCategory(raw.category);
    return {
      id: String(raw.id),
      date,
      dept: str(raw.dept, 40),
      category: category ? category.id : 'other',
      title: str(raw.title, 80) || '（無題）',
      url: str(raw.url, 500),
      memo: str(raw.memo, 300),
      createdAt: Number(raw.createdAt) || 0,
    };
  };

  const normalizeGa4 = (raw) => {
    const source = raw && typeof raw === 'object' ? raw : {};
    const metrics = Array.isArray(source.metrics) ? source.metrics.filter((m) => typeof m === 'string').slice(0, 20) : [];
    const days = {};
    if (source.days && typeof source.days === 'object') {
      Object.entries(source.days).forEach(([key, values]) => {
        if (!DATE_RE.test(key) || !values || typeof values !== 'object') return;
        days[key] = {};
        metrics.forEach((m) => { if (Number.isFinite(values[m])) days[key][m] = values[m]; });
      });
    }
    return { metrics, days };
  };

  // 初回表示：今月にデータが無ければ、データがある最新の月を開く（空の画面を見せない）
  const jumpToLatestMonth = () => {
    const current = monthKeyOf(todayKey());
    const months = [...state.logs.map((l) => l.date), ...Object.keys(state.ga4.days)].map(monthKeyOf);
    if (!months.length || months.includes(current)) return;
    const latest = months.sort().pop();
    if (latest < current) state.month = latest;
  };

  const sync = async ({ silent = false } = {}) => {
    if (state.syncing) return;
    setSyncing(true);
    try {
      const data = await fetchData();
      state.logs = (Array.isArray(data.logs) ? data.logs : []).map(normalizeLog).filter(Boolean);
      state.ga4 = normalizeGa4(data.ga4);
      if (!state.loaded) jumpToLatestMonth();
      state.loaded = true;
      state.lastSynced = new Date();
      // 編集中の記録が他の端末で削除された場合はフォームを戻す
      if (state.editingId && !state.logs.some((log) => log.id === state.editingId)) resetForm();
      renderDeptSuggestions();
      updateGa4Meta();
      setSyncing(false);
      showSyncedStatus();
      render();
      if (!silent) showToast('最新の内容に更新しました。');
    } catch (error) {
      console.error('[dolink-log] 同期に失敗しました', error);
      setSyncing(false);
      setStatus('offline', '同期できません');
      if (!state.loaded) {
        el.empty.hidden = false;
        el.empty.textContent = state.mode === 'demo'
          ? 'デモデータを読み込めませんでした。ファイルを直接開いている場合は、Webサーバー経由で表示してください。'
          : 'データを読み込めませんでした。通信状況を確認し、右上の更新ボタンを押してください。';
      } else if (!silent) {
        showToast('更新できませんでした。時間をおいてもう一度お試しください。', 'error');
      }
    }
  };

  const initSync = () => {
    el.refresh.addEventListener('click', () => sync());

    // 一定間隔で自動同期（タブが非表示の間は止める）
    setInterval(() => {
      if (document.visibilityState === 'visible') sync({ silent: true });
    }, REFRESH_MS);

    // タブに戻ってきたとき、前回から1分以上経っていれば同期
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !state.lastSynced) return;
      if (Date.now() - state.lastSynced.getTime() > 60 * 1000) sync({ silent: true });
    });
  };

  /* ---------- 15. 演出（IntersectionObserver によるフェードイン） ---------- */
  const revealedKeys = new Set();
  let revealObserver = null;

  const revealNow = (node, instant) => {
    if (instant) node.classList.add('is-instant');
    node.classList.add('is-revealed');
    if (node.dataset.revealKey) revealedKeys.add(node.dataset.revealKey);
  };

  const observeReveal = (nodes) => {
    nodes.forEach((node) => {
      if (node.classList.contains('is-revealed')) return;
      if (revealedKeys.has(node.dataset.revealKey) || !revealObserver || prefersReducedMotion()) {
        revealNow(node, true); // 表示済み・非対応環境・動きを減らす設定では即表示
        return;
      }
      revealObserver.observe(node);
    });
  };

  const initReveal = () => {
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealNow(entry.target, false);
          revealObserver.unobserve(entry.target); // 発火は1回のみ
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    observeReveal(document.querySelectorAll('.js-reveal'));
  };

  // SPのフローティングボタン：フォームが見えていない時だけ表示（管理者のみ）
  const initFab = () => {
    el.fab.addEventListener('click', (event) => {
      event.preventDefault();
      scrollToForm();
    });
    if (!('IntersectionObserver' in window)) { el.fab.classList.add('is-visible'); return; }
    new IntersectionObserver(([entry]) => {
      el.fab.classList.toggle('is-visible', isAdmin() && !entry.isIntersecting);
    }).observe(el.entry);
  };

  /* ---------- 16. 起動（1モジュールの失敗でページ全体を止めない） ---------- */
  [
    ['reveal', initReveal],
    ['form', initForm],
    ['login', initLogin],
    ['filters', initFilters],
    ['ga4', initGa4],
    ['fab', initFab],
    ['sync', initSync],
  ].forEach(([name, init]) => {
    try {
      init();
    } catch (error) {
      console.error(`[dolink-log] "${name}" の初期化に失敗しました`, error);
    }
  });

  el.exportXlsx.addEventListener('click', exportXlsx);
  el.exportCsv.addEventListener('click', exportCsv);
  // OSのライト／ダーク切り替えに合わせてグラフの色を更新
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => render());

  applyRole();
  render();
  sync({ silent: true });
})();
