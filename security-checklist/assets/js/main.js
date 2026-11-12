/**
 * ホームページ セキュリティ点検チェックリスト
 *
 * 保存先は開き方で自動的に切り替わる。
 * - claude.ai の Artifact として開いた場合：チーム共有のデータベース（db capability）
 *     ログインしているメンバー全員が同じ記録を見て編集でき、変更はリアルタイムに反映される。
 * - HTMLファイルを直接開いた場合：このブラウザの localStorage
 *
 * 機能
 * - 複数サイトの登録・切替・削除（サイトごとに点検結果を保存）
 * - 確認状況（OK / 確認中 / 要検討 / 対象外）とメモ
 * - 集計・絞り込み・進捗表示、最終更新者の表示（共有時）
 * - データの書き出し / 読み込み（JSON）
 * - フェードイン（IntersectionObserver）
 *
 * file:// で直接開いても動くよう、ESモジュールではなく defer の単一ファイル構成にしている。
 * 入力された文字列・共有データは必ず textContent / value で扱い、innerHTML には入れない。
 */
(() => {
  'use strict';

  /* ==================================================================
     定数
     ================================================================== */
  const LOCAL_KEY = 'security-checklist:v2';   // ローカル保存用（全サイトのデータ）
  const LEGACY_KEY = 'security-checklist:v1';  // 1サイト版のデータ（自動で引き継ぐ）
  const CURRENT_KEY = 'security-checklist:current'; // 選択中のサイト（閲覧者ごと）
  const COLLECTION = 'sites';                   // 共有データベースのコレクション名
  const STATUSES = ['ok', 'progress', 'review', 'na'];
  const DONE_STATUSES = ['ok', 'na'];           // 「完了」に数える状態
  const TYPE_LABELS = { wp: 'WordPress', html: '静的HTML' };
  const MEMO_DELAY = 700;                       // メモ入力を保存するまでの待ち時間（ms）
  const CONNECT_TIMEOUT = 10000;                // 共有データの読み込み待ち上限（ms）

  /* ==================================================================
     ユーティリティ
     ================================================================== */
  const pad = (n) => String(n).padStart(2, '0');

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const formatDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const createId = () => `site-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const toText = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

  const storageGet = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  };

  const storageSet = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  };

  /* ==================================================================
     データの形を整える（読み込み・共有データ・インポート共通）
     ================================================================== */
  const normalizeSite = (raw) => {
    if (!isPlainObject(raw)) return null;

    const items = {};
    if (isPlainObject(raw.items)) {
      Object.entries(raw.items).forEach(([key, item]) => {
        if (!/^[a-z]+-[a-z]+-\d{2}$/.test(key) || !isPlainObject(item)) return;
        const status = STATUSES.includes(item.s) ? item.s : '';
        const memo = toText(item.m, 400);
        if (status || memo) items[key] = { s: status, m: memo };
      });
    }

    // id は共有データベースのパスにもなるため、使える文字だけを許可する
    const id = typeof raw.id === 'string' && /^[A-Za-z0-9_\-.~:@+]{1,60}$/.test(raw.id) ? raw.id : createId();

    return {
      id,
      name: toText(raw.name, 80) || '名称未設定のサイト',
      url: toText(raw.url, 200),
      type: raw.type === 'html' ? 'html' : 'wp',
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : today(),
      person: toText(raw.person, 40),
      createdAt: toText(raw.createdAt, 40),
      updatedAt: toText(raw.updatedAt, 40),
      updatedBy: toText(raw.updatedBy, 80),
      items,
    };
  };

  const sortSites = (sites) => sites.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  // 共有データベースに書き込む形（id はドキュメント名なので含めない）
  const toDoc = (site) => ({
    name: site.name,
    url: site.url,
    type: site.type,
    date: site.date,
    person: site.person,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
    updatedBy: site.updatedBy,
    items: site.items,
  });

  /* ==================================================================
     状態
     ================================================================== */
  const state = {
    mode: 'local',     // local | connecting | shared
    sites: [],
    currentId: storageGet(CURRENT_KEY),
    readOnly: false,
    writeDenied: false, // 書き込みが権限不足で拒否されたことがあるか
    loaded: false,     // 共有データの初回読み込みが終わったか
    userId: null,
  };

  // 共有モードで使う capability（取得できなければ null のまま）
  const shared = { db: null, user: null, downloads: null };

  const getCurrentSite = () => state.sites.find((s) => s.id === state.currentId) || null;

  const ensureCurrent = () => {
    if (!getCurrentSite()) state.currentId = state.sites.length ? state.sites[0].id : null;
  };

  const rememberCurrent = () => {
    if (state.currentId) storageSet(CURRENT_KEY, state.currentId);
  };

  const stamp = (site) => {
    site.updatedAt = new Date().toISOString();
    site.updatedBy = state.userId || '';
  };

  /* ==================================================================
     ローカル保存（HTMLファイルを直接開いたとき / 共有に接続できないとき）
     ================================================================== */
  const migrateLegacy = () => {
    try {
      const raw = storageGet(LEGACY_KEY);
      if (!raw) return null;
      const legacy = JSON.parse(raw);
      const items = {};
      Object.keys(legacy.checks || {}).forEach((key) => {
        items[key] = { s: 'ok', m: '' };
      });
      const meta = legacy.meta || {};
      return normalizeSite({
        name: meta.site,
        url: meta.url,
        date: meta.date,
        person: meta.person,
        type: legacy.tab === 'tab-html' ? 'html' : 'wp',
        createdAt: new Date().toISOString(),
        items,
      });
    } catch (error) {
      return null;
    }
  };

  const createSite = (index) => normalizeSite({
    id: createId(),
    name: `サイト ${index}`,
    type: 'wp',
    date: today(),
    createdAt: new Date().toISOString(),
  });

  const loadLocal = () => {
    try {
      const parsed = JSON.parse(storageGet(LOCAL_KEY) || '{}');
      const sites = Array.isArray(parsed.sites) ? parsed.sites.map(normalizeSite).filter(Boolean) : [];
      if (sites.length) return sites;
    } catch (error) {
      // 壊れたデータは無視して新規で始める
    }
    return [migrateLegacy() || createSite(1)];
  };

  const saveLocal = () => storageSet(LOCAL_KEY, JSON.stringify({ version: 2, sites: state.sites }));

  /* ==================================================================
     共有データベースへの書き込み
     同じドキュメントへの書き込みは1件ずつ順番に行う（db の決まり）
     ================================================================== */
  const writeChains = new Map();

  const handleWriteError = (error) => {
    const code = error && error.code;
    if (code === 'invalid_argument') {
      // 権限が足りない書き込みは invalid_argument で拒否される
      state.writeDenied = true;
      setReadOnly(true);
      showNotice('このページを編集する権限がありません。共有の設定で「編集」以上の権限をもらってください。');
    } else if (code === 'quota_exceeded') {
      showNotice('共有データの保存容量の上限に達しました。不要なサイトを削除してください。');
    } else if (code === 'revoked') {
      setMode('error', '共有データへのアクセスが終了しました。ページを開き直してください。');
    } else {
      showNotice('保存できませんでした。通信状況を確認して、もう一度操作してください。');
    }
  };

  const queueWrite = (siteId, task) => {
    const ref = shared.db.collection(COLLECTION).doc(siteId);
    const prev = writeChains.get(siteId) || Promise.resolve();
    const next = prev.then(() => task(ref)).catch(handleWriteError);
    writeChains.set(siteId, next);
    return next;
  };

  /* ==================================================================
     保存処理の窓口（ローカル / 共有の違いをここで吸収する）
     ================================================================== */
  const store = {
    addSite(site) {
      state.sites.push(site);
      if (state.mode === 'shared') {
        queueWrite(site.id, (ref) => ref.set(toDoc(site)));
      } else {
        saveLocal();
      }
    },

    updateMeta(site, patch) {
      Object.assign(site, patch);
      stamp(site);
      if (state.mode === 'shared') {
        queueWrite(site.id, (ref) => ref.update({ ...patch, updatedAt: site.updatedAt, updatedBy: site.updatedBy }));
      } else {
        saveLocal();
      }
    },

    // 1項目の状態・メモを保存（共有時はその項目だけをマージするので、他の人の編集を上書きしない）
    updateItem(site, itemId, record) {
      if (record.s || record.m) {
        site.items[itemId] = record;
      } else {
        delete site.items[itemId];
      }
      stamp(site);
      if (state.mode === 'shared') {
        queueWrite(site.id, (ref) => ref.update({
          items: { [itemId]: { s: record.s, m: record.m } },
          updatedAt: site.updatedAt,
          updatedBy: site.updatedBy,
        }));
      } else {
        saveLocal();
      }
    },

    resetItems(site) {
      const cleared = {};
      Object.keys(site.items).forEach((key) => {
        cleared[key] = { s: '', m: '' };
      });
      site.items = {};
      stamp(site);
      if (state.mode === 'shared') {
        queueWrite(site.id, (ref) => ref.update({ items: cleared, updatedAt: site.updatedAt, updatedBy: site.updatedBy }));
      } else {
        saveLocal();
      }
    },

    deleteSite(site) {
      state.sites = state.sites.filter((s) => s.id !== site.id);
      if (state.mode === 'shared') {
        queueWrite(site.id, (ref) => ref.delete());
      } else {
        if (!state.sites.length) state.sites.push(createSite(1)); // ローカルは最低1件残す
        saveLocal();
      }
    },

    async replaceAll(sites) {
      const removed = state.sites.filter((s) => !sites.some((n) => n.id === s.id));
      state.sites = sites;
      if (state.mode === 'shared') {
        await Promise.all([
          ...sites.map((site) => queueWrite(site.id, (ref) => ref.set(toDoc(site)))),
          ...removed.map((site) => queueWrite(site.id, (ref) => ref.delete())),
        ]);
      } else {
        saveLocal();
      }
    },
  };

  /* ==================================================================
     集計
     ================================================================== */

  // 種類ごとの項目ID一覧（HTMLから取得するので、項目を増やしても自動で反映される）
  const itemIdsByType = {};
  document.querySelectorAll('.js-panel').forEach((panel) => {
    itemIdsByType[panel.dataset.type] = Array.from(panel.querySelectorAll('.js-item'))
      .map((item) => item.dataset.item);
  });

  const countSite = (site) => {
    const ids = itemIdsByType[site.type] || [];
    const counts = { ok: 0, progress: 0, review: 0, na: 0, none: 0 };
    ids.forEach((id) => {
      const status = site.items[id] ? site.items[id].s : '';
      counts[status || 'none'] += 1;
    });
    const done = DONE_STATUSES.reduce((sum, key) => sum + counts[key], 0);
    return { ...counts, done, total: ids.length };
  };

  /* ==================================================================
     DOM参照
     ================================================================== */
  const el = {
    mode: document.querySelector('.js-mode'),
    modeText: document.querySelector('.js-mode-text'),
    siteList: document.querySelector('.js-site-list'),
    siteCount: document.querySelector('.js-site-count'),
    siteEmpty: document.querySelector('.js-site-empty'),
    siteEmptyTitle: document.querySelector('.js-site-empty-title'),
    siteEmptyText: document.querySelector('.js-site-empty-text'),
    siteTemplate: document.getElementById('site-card-template'),
    siteSwitch: document.querySelector('.js-site-switch'),
    siteAdd: document.querySelector('.js-site-add'),
    siteDelete: document.querySelector('.js-site-delete'),
    metaForm: document.querySelector('.js-meta-form'),
    metaStatus: document.querySelector('.js-meta-status'),
    panels: document.querySelectorAll('.js-panel'),
    sums: document.querySelectorAll('.js-sum'),
    filters: document.querySelectorAll('.js-filter'),
    progressText: document.querySelector('.js-progress-text'),
    progressTrack: document.querySelector('.js-progress'),
    print: document.querySelector('.js-print'),
    reset: document.querySelector('.js-reset'),
    dataText: document.querySelector('.js-data-text'),
    exportButton: document.querySelector('.js-export'),
    importInput: document.querySelector('.js-import'),
    dialog: document.querySelector('.js-dialog'),
  };

  let currentFilter = 'all';
  let metaDirty = false;            // サイト情報フォームに未保存の入力があるか
  const memoTimers = new Map();     // メモの保存待ちタイマー（項目IDごと）

  const getActivePanel = () => document.querySelector('.js-panel:not([hidden])');

  const showNotice = (text) => {
    if (el.metaStatus) el.metaStatus.textContent = text;
  };

  /* ==================================================================
     表示：保存先・権限
     ================================================================== */
  const MODE_TEXT = {
    local: 'このブラウザにのみ保存します',
    connecting: '共有データを読み込んでいます…',
    shared: 'チームで共有中：変更はこのページを開いている全員に反映されます',
    readonly: 'チームで共有中（閲覧のみ）：編集するには共有の権限が必要です',
  };

  function setMode(mode, text) {
    if (el.mode) el.mode.dataset.mode = mode;
    if (el.modeText) el.modeText.textContent = text || MODE_TEXT[mode] || '';
  }

  // 閲覧のみの場合は入力欄を無効にし、編集ボタンを隠す
  function setReadOnly(readOnly) {
    state.readOnly = readOnly;
    document.body.classList.toggle('is-readonly', readOnly);
    document.querySelectorAll('.js-panel input, .js-panel textarea, .js-meta-form input, .js-meta-form select')
      .forEach((field) => { field.disabled = readOnly; });
    if (el.importInput) el.importInput.disabled = readOnly;
    if (state.mode === 'shared') setMode(readOnly ? 'readonly' : 'shared');
  }

  /* ==================================================================
     確認ダイアログ（Artifact内では confirm() が使えないため自前で用意）
     ================================================================== */
  const askConfirm = (message, okLabel = '実行する') => new Promise((resolve) => {
    const dialog = el.dialog;
    if (!dialog || typeof dialog.showModal !== 'function') {
      resolve(window.confirm(message));
      return;
    }
    dialog.querySelector('.c-dialog__message').textContent = message;
    dialog.querySelector('.js-dialog-ok').textContent = okLabel;
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.showModal();
  });

  /* ==================================================================
     表示：サイト一覧・サイト切替
     ================================================================== */

  // 最終更新者の名前を表示（共有時のみ。保存しているのはIDだけで、名前は表示のたびに引く）
  const fillUpdaterNames = () => {
    if (!shared.user) return;
    const targets = Array.from(document.querySelectorAll('[data-updated-by]'))
      .filter((node) => node.dataset.updatedBy);
    const ids = [...new Set(targets.map((node) => node.dataset.updatedBy))];
    if (!ids.length) return;

    shared.user.profiles(ids).then((profiles) => {
      targets.forEach((node) => {
        const profile = profiles[node.dataset.updatedBy];
        const name = profile && profile.isMe ? 'あなた' : (profile && profile.name) || 'メンバー';
        node.textContent = `${node.dataset.prefix || ''}${name}`;
      });
    });
  };

  const renderSiteList = () => {
    if (!el.siteList || !el.siteTemplate) return;

    const fragment = document.createDocumentFragment();

    state.sites.forEach((site) => {
      const node = el.siteTemplate.content.cloneNode(true);
      const card = node.querySelector('.js-site-card');
      const counts = countSite(site);
      const ratio = counts.total ? counts.done / counts.total : 0;

      card.dataset.siteId = site.id;
      card.setAttribute('aria-pressed', String(site.id === state.currentId));
      card.style.setProperty('--progress', String(ratio));

      node.querySelector('.c-site__type').textContent = TYPE_LABELS[site.type];
      node.querySelector('.c-site__flag').textContent = counts.review ? `要検討 ${counts.review}` : '';
      node.querySelector('.c-site__name').textContent = site.name;
      node.querySelector('.c-site__url').textContent = site.url.replace(/^https?:\/\//, '');

      const stats = [`完了 ${counts.done} / ${counts.total}`];
      if (counts.progress) stats.push(`確認中 ${counts.progress}`);
      if (site.updatedAt) stats.push(`更新 ${formatDateTime(site.updatedAt)}`);
      node.querySelector('.c-site__stats').textContent = stats.join('・');

      const by = node.querySelector('.c-site__by');
      if (state.mode === 'shared' && site.updatedBy) {
        by.dataset.updatedBy = site.updatedBy;
        by.dataset.prefix = '更新者：';
      }

      fragment.appendChild(node);
    });

    el.siteList.replaceChildren(fragment);
    if (el.siteCount) el.siteCount.textContent = state.sites.length ? `${state.sites.length}サイト登録中` : '';

    // 空の状態（共有データの読み込み中も含む）
    if (el.siteEmpty) {
      el.siteEmpty.hidden = state.sites.length > 0;
      const loading = state.mode === 'connecting';
      el.siteEmptyTitle.textContent = loading ? '共有データを読み込んでいます' : 'まだサイトが登録されていません';
      el.siteEmptyText.textContent = loading
        ? 'しばらくお待ちください。'
        : '「＋ サイトを追加」から、点検するサイトを登録してください。';
    }

    fillUpdaterNames();
  };

  const renderSiteSwitch = () => {
    if (!el.siteSwitch) return;
    const options = state.sites.map((site) => {
      const option = document.createElement('option');
      option.value = site.id;
      option.textContent = site.name; // SPの下部バーで切れないよう、種類は付けない
      return option;
    });
    el.siteSwitch.replaceChildren(...options);
    if (state.currentId) el.siteSwitch.value = state.currentId;
  };

  /* ==================================================================
     表示：サイト情報フォーム
     ================================================================== */
  const renderMetaStatus = (site) => {
    if (!el.metaStatus) return;
    el.metaStatus.replaceChildren();
    if (!site.updatedAt) return;

    el.metaStatus.append(`最終更新：${formatDateTime(site.updatedAt)}`);
    if (state.mode === 'shared' && site.updatedBy) {
      const by = document.createElement('span');
      by.dataset.updatedBy = site.updatedBy;
      by.dataset.prefix = '・';
      el.metaStatus.append(by);
      fillUpdaterNames();
    }
  };

  // force：サイトを切り替えたときなど、入力途中でも上書きする
  const fillMetaForm = ({ force = false } = {}) => {
    const site = getCurrentSite();
    if (!el.metaForm || !site) return;

    // 他のメンバーの更新が届いても、入力中の内容は消さない
    const editing = metaDirty || el.metaForm.contains(document.activeElement);
    if (!force && editing) return;

    ['name', 'url', 'type', 'date', 'person'].forEach((key) => {
      const field = el.metaForm.elements.namedItem(key);
      if (field) field.value = site[key];
    });
    el.metaForm.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
    el.metaForm.querySelectorAll('.c-field__error').forEach((error) => { error.textContent = ''; });
    metaDirty = false;
    renderMetaStatus(site);
  };

  /* ==================================================================
     表示：チェックリスト
     ================================================================== */
  const applyItem = (item, record) => {
    const status = record ? record.s : '';
    const memo = record ? record.m : '';

    item.dataset.status = status;
    item.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.checked = radio.value === status;
    });

    // 入力中・保存待ちのメモは、届いたデータで上書きしない
    const textarea = item.querySelector('.js-memo');
    const typing = textarea && (document.activeElement === textarea || memoTimers.has(item.dataset.item));
    if (textarea && !typing) textarea.value = memo;
    item.classList.toggle('has-memo', Boolean(typing ? textarea.value.trim() : memo));
  };

  const updateCategory = (category) => {
    const items = category.querySelectorAll('.js-item');
    const done = Array.from(items).filter((item) => DONE_STATUSES.includes(item.dataset.status)).length;
    const count = category.querySelector('.js-category-count');
    if (count) count.textContent = `${done} / ${items.length}`;
    category.classList.toggle('is-complete', done === items.length);
  };

  const updateSummary = () => {
    const site = getCurrentSite();
    if (!site) return;
    const counts = countSite(site);
    const ratio = counts.total ? counts.done / counts.total : 0;

    el.sums.forEach((sum) => {
      sum.textContent = String(counts[sum.dataset.status] || 0);
    });

    if (el.progressText) el.progressText.textContent = `${counts.done} / ${counts.total}`;
    if (el.progressTrack) {
      el.progressTrack.style.setProperty('--progress', String(ratio));
      el.progressTrack.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    }
  };

  const applyFilter = () => {
    const panel = getActivePanel();
    if (!panel) return;

    panel.querySelectorAll('.js-category').forEach((category) => {
      let visible = 0;
      category.querySelectorAll('.js-item').forEach((item) => {
        const status = item.dataset.status || 'none';
        const match = currentFilter === 'all' || status === currentFilter;
        item.classList.toggle('is-filtered-out', !match);
        if (match) visible += 1;
      });
      category.classList.toggle('is-filtered-out', visible === 0);
    });

    const body = panel.querySelector('.p-panel__body');
    if (body) {
      body.classList.toggle('is-empty', !panel.querySelector('.js-category:not(.is-filtered-out)'));
    }
  };

  const renderChecklist = () => {
    const site = getCurrentSite();

    el.panels.forEach((panel) => {
      panel.hidden = !site || panel.dataset.type !== site.type;
    });
    if (!site) return;

    const panel = getActivePanel();
    if (!panel) return;

    const siteLabel = panel.querySelector('.js-panel-site');
    if (siteLabel) siteLabel.textContent = site.name;

    panel.querySelectorAll('.js-item').forEach((item) => applyItem(item, site.items[item.dataset.item]));
    panel.querySelectorAll('.js-category').forEach(updateCategory);
    applyFilter();
    updateSummary();
  };

  const renderAll = ({ forceMeta = false } = {}) => {
    ensureCurrent();
    document.body.classList.toggle('is-no-site', !getCurrentSite());
    renderSiteSwitch();
    fillMetaForm({ force: forceMeta });
    renderChecklist();
    renderSiteList();
  };

  /* ==================================================================
     操作：サイトの選択・追加・削除
     ================================================================== */
  const selectSite = (id) => {
    if (!state.sites.some((s) => s.id === id)) return;
    state.currentId = id;
    rememberCurrent();
    renderAll({ forceMeta: true });
  };

  const initSites = () => {
    if (el.siteList) {
      el.siteList.addEventListener('click', (event) => {
        const card = event.target.closest('.js-site-card');
        if (card) selectSite(card.dataset.siteId);
      });
    }

    if (el.siteSwitch) {
      el.siteSwitch.addEventListener('change', () => selectSite(el.siteSwitch.value));
    }

    if (el.siteAdd) {
      el.siteAdd.addEventListener('click', () => {
        if (state.readOnly || state.mode === 'connecting') return;
        const site = createSite(state.sites.length + 1);
        stamp(site);
        store.addSite(site);
        selectSite(site.id);
        showNotice('新しいサイトを追加しました。サイト名とURLを入力して保存してください。');

        // そのまま入力できるようにサイト名へ移動
        const nameInput = el.metaForm && el.metaForm.elements.namedItem('name');
        if (nameInput) {
          nameInput.focus({ preventScroll: true });
          nameInput.select();
          el.metaForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    if (el.siteDelete) {
      el.siteDelete.addEventListener('click', async () => {
        const site = getCurrentSite();
        if (!site || state.readOnly) return;
        const note = state.mode === 'shared' ? '\nチーム全員の画面から削除されます。' : '';
        const ok = await askConfirm(`「${site.name}」と点検結果を削除します。元に戻せません。${note}`, '削除する');
        if (!ok) return;

        store.deleteSite(site);
        state.currentId = null;
        renderAll({ forceMeta: true });
        showNotice(`「${site.name}」を削除しました。`);
      });
    }
  };

  /* ==================================================================
     操作：サイト情報フォーム
     ================================================================== */
  const getErrorMessage = (input) => {
    const { validity } = input;
    if (validity.valueMissing) return '入力してください。';
    if (validity.typeMismatch || validity.patternMismatch) {
      return input.type === 'url' ? 'https:// から始まるURLを入力してください。' : '形式が正しくありません。';
    }
    if (validity.rangeUnderflow || validity.rangeOverflow) return '日付を確認してください。';
    if (validity.tooLong) return `${input.maxLength}文字以内で入力してください。`;
    return '';
  };

  const validateField = (input) => {
    const errorId = input.getAttribute('aria-describedby');
    const error = errorId ? document.getElementById(errorId) : null;
    const message = input.checkValidity() ? '' : getErrorMessage(input);

    input.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) error.textContent = message;
    return !message;
  };

  const initMetaForm = () => {
    if (!el.metaForm) return;

    const fields = Array.from(el.metaForm.querySelectorAll('input[name], select[name]'));

    fields.forEach((input) => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        metaDirty = true;
        if (input.getAttribute('aria-invalid') === 'true') validateField(input);
      });
    });

    el.metaForm.addEventListener('submit', async (event) => {
      event.preventDefault(); // 送信はせず、保存のみ行う
      const site = getCurrentSite();
      if (!site || state.readOnly) return;

      const results = fields.map(validateField);
      if (results.includes(false)) {
        const firstInvalid = fields.find((input) => input.getAttribute('aria-invalid') === 'true');
        if (firstInvalid) firstInvalid.focus();
        showNotice('未入力・誤りのある項目があります。');
        return;
      }

      const patch = {};
      fields.forEach((input) => {
        patch[input.name] = input.value.trim();
      });

      if (patch.type !== site.type) {
        const ok = await askConfirm('サイトの種類を変更すると、表示するチェック項目が切り替わります。\n元の種類の点検結果は保持されます。', '変更する');
        if (!ok) return;
      }

      store.updateMeta(site, patch);
      metaDirty = false;
      renderAll({ forceMeta: true });
      showNotice(`保存しました（${formatDateTime(site.updatedAt)}）`);
    });
  };

  /* ==================================================================
     操作：確認状況・メモ
     ================================================================== */
  const refreshAfterItemChange = (item) => {
    const category = item.closest('.js-category');
    if (category) updateCategory(category);
    updateSummary();
    renderSiteList();
  };

  const initChecklist = () => {
    // 確認状況：選択済みのボタンをもう一度押すと「未確認」に戻す
    document.addEventListener('click', (event) => {
      const radio = event.target;
      if (!(radio instanceof HTMLInputElement) || radio.type !== 'radio') return;
      const item = radio.closest('.js-item');
      const site = getCurrentSite();
      if (!item || !site || state.readOnly) return;

      const id = item.dataset.item;
      const current = site.items[id] || { s: '', m: '' };
      const record = { s: current.s === radio.value ? '' : radio.value, m: current.m || '' };

      store.updateItem(site, id, record);
      applyItem(item, record);
      refreshAfterItemChange(item);
    });

    // メモ：入力が止まってから保存（共有データへの書き込み回数を抑える）
    document.addEventListener('input', (event) => {
      const textarea = event.target;
      if (!textarea.classList || !textarea.classList.contains('js-memo')) return;
      const item = textarea.closest('.js-item');
      const site = getCurrentSite();
      if (!item || !site || state.readOnly) return;

      const id = item.dataset.item;
      const siteId = site.id;
      clearTimeout(memoTimers.get(id));
      memoTimers.set(id, setTimeout(() => {
        memoTimers.delete(id);
        const target = state.sites.find((s) => s.id === siteId);
        if (!target) return;
        const current = target.items[id] || { s: '', m: '' };
        store.updateItem(target, id, { s: current.s || '', m: textarea.value.slice(0, 400) });
        renderSiteList();
      }, MEMO_DELAY));
    });

    // メモ欄を離れたときに表示状態（has-memo）を更新
    document.addEventListener('focusout', (event) => {
      const textarea = event.target;
      if (!textarea.classList || !textarea.classList.contains('js-memo')) return;
      const item = textarea.closest('.js-item');
      if (item) item.classList.toggle('has-memo', Boolean(textarea.value.trim()));
    });
  };

  /* ==================================================================
     操作：絞り込み
     ================================================================== */
  const initFilter = () => {
    el.filters.forEach((button) => {
      button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        el.filters.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        applyFilter();
      });
    });
  };

  /* ==================================================================
     操作：印刷・リセット
     ================================================================== */
  const initActions = () => {
    if (el.print) {
      el.print.addEventListener('click', () => window.print());
    }

    if (el.reset) {
      el.reset.addEventListener('click', async () => {
        const site = getCurrentSite();
        if (!site || state.readOnly) return;
        const ok = await askConfirm(`「${site.name}」の点検結果とメモをすべて消去します。\nサイト情報は残ります。`, '消去する');
        if (!ok) return;

        store.resetItems(site);
        renderAll();
        showNotice('点検結果をリセットしました。');
      });
    }
  };

  /* ==================================================================
     操作：データの書き出し・読み込み
     ================================================================== */
  const saveFile = async (filename, text) => {
    // Artifact内では downloads capability で保存（閲覧者に確認が表示される）
    if (shared.downloads) {
      try {
        await shared.downloads.save({ filename, data: text });
        showNotice('データを書き出しました。');
      } catch (error) {
        if (error && error.code !== 'declined') showNotice('書き出せませんでした。時間をおいてもう一度お試しください。');
      }
      return;
    }

    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const initDataTransfer = () => {
    if (el.exportButton) {
      el.exportButton.addEventListener('click', () => {
        const json = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), sites: state.sites }, null, 2);
        saveFile(`security-checklist-${today().replace(/-/g, '')}.json`, json);
      });
    }

    if (el.importInput) {
      el.importInput.addEventListener('change', () => {
        const file = el.importInput.files && el.importInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', async () => {
          try {
            const parsed = JSON.parse(String(reader.result));
            const sites = Array.isArray(parsed.sites) ? parsed.sites.map(normalizeSite).filter(Boolean) : [];
            if (!sites.length) throw new Error('サイトのデータが見つかりません');

            // 作成日時がないデータは、並び順を保つために連番で補う
            const base = Date.now();
            sites.forEach((site, i) => {
              if (!site.createdAt) site.createdAt = new Date(base + i).toISOString();
            });

            const note = state.mode === 'shared' ? '\nチーム全員の記録が置き換わります。' : '';
            const ok = await askConfirm(`${sites.length}サイト分のデータを読み込みます。現在の記録はすべて置き換わります。${note}`, '読み込む');
            if (!ok) return;

            await store.replaceAll(sortSites(sites));
            state.currentId = null;
            renderAll({ forceMeta: true });
            showNotice(`${sites.length}サイト分のデータを読み込みました。`);
          } catch (error) {
            showNotice('読み込めませんでした。このチェックリストから書き出したJSONファイルを選んでください。');
          } finally {
            el.importInput.value = ''; // 同じファイルを再度選べるようにする
          }
        });
        reader.readAsText(file);
      });
    }
  };

  /* ==================================================================
     演出：フェードイン
     ================================================================== */
  const initReveal = () => {
    const targets = document.querySelectorAll('.js-reveal');
    if (!targets.length) return;

    const reveal = (target) => target.classList.add('is-revealed');

    if (!('IntersectionObserver' in window)) {
      targets.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target); // 発火は1回のみ
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    targets.forEach((target) => observer.observe(target));
  };

  /* ==================================================================
     起動：保存先の決定
     ================================================================== */
  const startLocal = (text) => {
    state.mode = 'local';
    state.sites = loadLocal();
    saveLocal(); // 旧データからの引き継ぎ結果を保存
    setMode('local', text);
    renderAll({ forceMeta: true });
  };

  const startShared = async () => {
    state.mode = 'connecting';
    setMode('connecting');
    renderAll({ forceMeta: true });

    const claude = window.claude;
    const [db, user, downloads] = await Promise.all([
      claude.use('db'),
      claude.use('user'),
      claude.use('downloads'),
    ]);

    shared.downloads = downloads;

    // ログインしていない等で共有データを使えない場合は、このブラウザに保存する
    if (!db) {
      startLocal('共有データに接続できないため、このブラウザにのみ保存します（claude.ai にログインして開くと共有されます）');
      return;
    }

    shared.db = db;
    shared.user = user;
    state.userId = user ? await user.id() : null;
    if (el.dataText) el.dataText.textContent = '記録はチームで共有されています。誤操作に備えて、定期的にデータを書き出してバックアップしてください。';

    // 書き込み権限の確認（null は「不明」なので、書き込みが拒否されたら閲覧のみに切り替える）
    const canWrite = user ? await user.can('data.write') : null;

    // 10秒で読み込めなければ案内を出す（購読はそのまま続ける）
    const timer = setTimeout(() => {
      if (!state.loaded) setMode('error', '共有データに接続できません。通信状況を確認してください（つながりしだい表示されます）');
    }, CONNECT_TIMEOUT);

    db.collection(COLLECTION).onSnapshot((snap) => {
      state.sites = sortSites(snap.docs.map((doc) => normalizeSite({ ...doc.data(), id: doc.id })).filter(Boolean));

      if (!snap.metadata.fromCache && !state.loaded) {
        state.loaded = true;
        clearTimeout(timer);
      }
      state.mode = 'shared';
      setReadOnly(canWrite === false || state.writeDenied);
      renderAll();
    }, (error) => {
      clearTimeout(timer);
      setMode('error', error && error.code === 'revoked'
        ? '共有データへのアクセスが終了しました。ページを開き直してください。'
        : '共有データを読み込めませんでした。ページを開き直してください。');
    });
  };

  /* ==================================================================
     初期化（1つの失敗でページ全体を止めない）
     ================================================================== */
  const isHosted = Boolean(window.claude && typeof window.claude.use === 'function');

  // Artifact内では印刷できないため、印刷ボタンを出さない
  if (isHosted && el.print) el.print.hidden = true;

  [
    ['sites', initSites],
    ['meta-form', initMetaForm],
    ['checklist', initChecklist],
    ['filter', initFilter],
    ['actions', initActions],
    ['data-transfer', initDataTransfer],
    ['reveal', initReveal],
  ].forEach(([name, init]) => {
    try {
      init();
    } catch (error) {
      console.error(`[security-checklist] "${name}" の初期化に失敗しました`, error);
    }
  });

  if (isHosted) {
    startShared().catch((error) => {
      console.error('[security-checklist] 共有データの初期化に失敗しました', error);
      startLocal('共有データに接続できないため、このブラウザにのみ保存します');
    });
  } else {
    startLocal();
  }
})();
