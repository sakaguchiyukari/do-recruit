/**
 * ホームページ セキュリティ点検チェックリスト
 * - 複数サイトの登録・切替・削除（サイトごとに点検結果を保存）
 * - 確認状況（OK / 確認中 / 要検討 / 対象外）とメモの記録
 * - 集計・絞り込み・進捗表示
 * - データの書き出し / 読み込み（JSON）
 * - フェードイン（IntersectionObserver）
 *
 * file:// で直接開いても動くよう、ESモジュールではなく defer の単一ファイル構成にしている。
 * ユーザーが入力した文字列は必ず textContent / value で扱い、innerHTML には入れない。
 */
(() => {
  'use strict';

  /* ==================================================================
     定数
     ================================================================== */
  const STORAGE_KEY = 'security-checklist:v2';
  const LEGACY_KEY = 'security-checklist:v1'; // 1サイト版のデータ（自動で引き継ぐ）
  const STATUSES = ['ok', 'progress', 'review', 'na'];
  const DONE_STATUSES = ['ok', 'na']; // 「完了」に数える状態
  const TYPE_LABELS = { wp: 'WordPress', html: '静的HTML' };

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

  /* ==================================================================
     データ（読み込み・検証・保存）
     ================================================================== */

  // 1サイト分のデータを、想定どおりの形に整える（読み込み・インポート共通）
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

    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : createId(),
      name: toText(raw.name, 80) || '名称未設定のサイト',
      url: toText(raw.url, 200),
      type: raw.type === 'html' ? 'html' : 'wp',
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : today(),
      person: toText(raw.person, 40),
      updatedAt: toText(raw.updatedAt, 40),
      items,
    };
  };

  const createSite = (index) => normalizeSite({
    id: createId(),
    name: `サイト ${index}`,
    type: 'wp',
    date: today(),
  });

  // 1サイト版（v1）のデータを1件目のサイトとして引き継ぐ
  const migrateLegacy = () => {
    try {
      const raw = window.localStorage.getItem(LEGACY_KEY);
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
        items,
      });
    } catch (error) {
      return null;
    }
  };

  const loadData = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const sites = Array.isArray(parsed.sites) ? parsed.sites.map(normalizeSite).filter(Boolean) : [];
        if (sites.length) {
          const currentId = sites.some((s) => s.id === parsed.currentId) ? parsed.currentId : sites[0].id;
          return { sites, currentId };
        }
      }
    } catch (error) {
      // 壊れたデータは無視して新規で始める
    }

    const first = migrateLegacy() || createSite(1);
    return { sites: [first], currentId: first.id };
  };

  const data = loadData();

  const saveData = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ...data }));
      return true;
    } catch (error) {
      return false;
    }
  };

  const getCurrentSite = () => data.sites.find((s) => s.id === data.currentId) || data.sites[0];

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
    siteList: document.querySelector('.js-site-list'),
    siteCount: document.querySelector('.js-site-count'),
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
    exportButton: document.querySelector('.js-export'),
    importInput: document.querySelector('.js-import'),
  };

  let currentFilter = 'all';

  const getActivePanel = () => document.querySelector('.js-panel:not([hidden])');

  const setMetaStatus = (text) => {
    if (el.metaStatus) el.metaStatus.textContent = text;
  };

  /* ==================================================================
     表示：サイト一覧・サイト切替
     ================================================================== */
  const renderSiteList = () => {
    if (!el.siteList || !el.siteTemplate) return;

    const fragment = document.createDocumentFragment();

    data.sites.forEach((site) => {
      const node = el.siteTemplate.content.cloneNode(true);
      const card = node.querySelector('.js-site-card');
      const counts = countSite(site);
      const ratio = counts.total ? counts.done / counts.total : 0;

      card.dataset.siteId = site.id;
      card.setAttribute('aria-pressed', String(site.id === data.currentId));
      card.style.setProperty('--progress', String(ratio));

      node.querySelector('.c-site__type').textContent = TYPE_LABELS[site.type];
      node.querySelector('.c-site__flag').textContent = counts.review ? `要検討 ${counts.review}` : '';
      node.querySelector('.c-site__name').textContent = site.name;
      node.querySelector('.c-site__url').textContent = site.url.replace(/^https?:\/\//, '');

      const stats = [`完了 ${counts.done} / ${counts.total}`];
      if (counts.progress) stats.push(`確認中 ${counts.progress}`);
      if (site.updatedAt) stats.push(`更新 ${formatDateTime(site.updatedAt)}`);
      node.querySelector('.c-site__stats').textContent = stats.join('・');

      fragment.appendChild(node);
    });

    el.siteList.replaceChildren(fragment);
    if (el.siteCount) el.siteCount.textContent = `${data.sites.length}サイト登録中`;
  };

  const renderSiteSwitch = () => {
    if (!el.siteSwitch) return;
    const options = data.sites.map((site) => {
      const option = document.createElement('option');
      option.value = site.id;
      option.textContent = site.name; // SPの下部バーで切れないよう、種類は付けない
      return option;
    });
    el.siteSwitch.replaceChildren(...options);
    el.siteSwitch.value = data.currentId;
  };

  /* ==================================================================
     表示：サイト情報フォーム
     ================================================================== */
  const fillMetaForm = () => {
    if (!el.metaForm) return;
    const site = getCurrentSite();
    ['name', 'url', 'type', 'date', 'person'].forEach((key) => {
      const field = el.metaForm.elements.namedItem(key);
      if (field) field.value = site[key];
    });
    // 前のサイトのエラー表示を消す
    el.metaForm.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
    el.metaForm.querySelectorAll('.c-field__error').forEach((error) => { error.textContent = ''; });
    setMetaStatus(site.updatedAt ? `最終更新：${formatDateTime(site.updatedAt)}` : '');
  };

  /* ==================================================================
     表示：チェックリスト
     ================================================================== */

  // 1項目の表示を状態に合わせる
  const applyItem = (item, record) => {
    const status = record ? record.s : '';
    const memo = record ? record.m : '';

    item.dataset.status = status;
    item.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.checked = radio.value === status;
    });

    const textarea = item.querySelector('.js-memo');
    if (textarea) textarea.value = memo;
    item.classList.toggle('has-memo', Boolean(memo));
  };

  const updateCategory = (category) => {
    const items = category.querySelectorAll('.js-item');
    const done = Array.from(items).filter((item) => DONE_STATUSES.includes(item.dataset.status)).length;
    const count = category.querySelector('.js-category-count');
    if (count) count.textContent = `${done} / ${items.length}`;
    category.classList.toggle('is-complete', done === items.length);
  };

  // 集計・進捗バー・サイト一覧の数字を更新
  const updateSummary = () => {
    const site = getCurrentSite();
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

    renderSiteList();
  };

  // 絞り込み（未確認 / 確認中 / 要検討）
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

  // 選択中サイトの内容でチェックリスト全体を描き直す
  const renderChecklist = () => {
    const site = getCurrentSite();

    el.panels.forEach((panel) => {
      panel.hidden = panel.dataset.type !== site.type;
    });

    const panel = getActivePanel();
    if (!panel) return;

    const siteLabel = panel.querySelector('.js-panel-site');
    if (siteLabel) siteLabel.textContent = site.name;

    panel.querySelectorAll('.js-item').forEach((item) => applyItem(item, site.items[item.dataset.item]));
    panel.querySelectorAll('.js-category').forEach(updateCategory);
    applyFilter();
    updateSummary();
  };

  const renderAll = () => {
    renderSiteSwitch();
    fillMetaForm();
    renderChecklist(); // サイト一覧も内部で更新される
  };

  /* ==================================================================
     操作：サイトの選択・追加・削除
     ================================================================== */
  const selectSite = (id) => {
    if (!data.sites.some((s) => s.id === id)) return;
    data.currentId = id;
    saveData();
    renderAll();
  };

  const initSites = () => {
    // カードのクリック（イベント委譲）
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
        const site = createSite(data.sites.length + 1);
        data.sites.push(site);
        selectSite(site.id);
        setMetaStatus('新しいサイトを追加しました。サイト名とURLを入力して保存してください。');

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
      el.siteDelete.addEventListener('click', () => {
        const site = getCurrentSite();
        if (!window.confirm(`「${site.name}」と点検結果を削除します。元に戻せません。よろしいですか？`)) return;

        data.sites = data.sites.filter((s) => s.id !== site.id);
        if (!data.sites.length) data.sites.push(createSite(1)); // 最低1件は残す
        data.currentId = data.sites[0].id;
        saveData();
        renderAll();
        setMetaStatus(`「${site.name}」を削除しました。`);
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

    // 一度エラーになった項目は、入力中に再チェックしてエラーを消す
    fields.forEach((input) => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') validateField(input);
      });
    });

    el.metaForm.addEventListener('submit', (event) => {
      event.preventDefault(); // 送信はせず、ブラウザ内に保存するのみ

      const results = fields.map(validateField);
      if (results.includes(false)) {
        const firstInvalid = fields.find((input) => input.getAttribute('aria-invalid') === 'true');
        if (firstInvalid) firstInvalid.focus();
        setMetaStatus('未入力・誤りのある項目があります。');
        return;
      }

      const site = getCurrentSite();
      const nextType = el.metaForm.elements.namedItem('type').value;
      if (nextType !== site.type && !window.confirm('サイトの種類を変更すると、表示するチェック項目が切り替わります。よろしいですか？\n（元の種類の点検結果は保持されます）')) {
        return;
      }

      fields.forEach((input) => {
        site[input.name] = input.value.trim();
      });
      site.updatedAt = new Date().toISOString();

      const saved = saveData();
      renderSiteSwitch();
      renderChecklist();
      setMetaStatus(saved ? `保存しました（${formatDateTime(site.updatedAt)}）` : 'このブラウザでは保存できませんでした。');
    });
  };

  /* ==================================================================
     操作：確認状況・メモ
     ================================================================== */
  const touchSite = (site) => {
    site.updatedAt = new Date().toISOString();
    saveData();
  };

  const setRecord = (site, id, patch) => {
    const next = { s: '', m: '', ...site.items[id], ...patch };
    if (next.s || next.m) {
      site.items[id] = next;
    } else {
      delete site.items[id];
    }
    return next;
  };

  const initChecklist = () => {
    // 確認状況：選択済みのボタンをもう一度押すと「未確認」に戻す
    document.addEventListener('click', (event) => {
      const radio = event.target;
      if (!(radio instanceof HTMLInputElement) || radio.type !== 'radio') return;
      const item = radio.closest('.js-item');
      if (!item) return;

      const site = getCurrentSite();
      const id = item.dataset.item;
      const current = site.items[id] ? site.items[id].s : '';
      const status = current === radio.value ? '' : radio.value;

      applyItem(item, setRecord(site, id, { s: status }));
      touchSite(site);

      const category = item.closest('.js-category');
      if (category) updateCategory(category);
      updateSummary();
      // 絞り込み中は、状態が変わった項目もすぐには消さない（誤操作に気づけるように）
    });

    // メモ：入力のたびに保存
    document.addEventListener('input', (event) => {
      const textarea = event.target;
      if (!textarea.classList || !textarea.classList.contains('js-memo')) return;
      const item = textarea.closest('.js-item');
      if (!item) return;

      const site = getCurrentSite();
      setRecord(site, item.dataset.item, { m: textarea.value.slice(0, 400) });
      touchSite(site);
    });

    // メモ欄を離れたときに表示状態（has-memo）を更新
    document.addEventListener('focusout', (event) => {
      const textarea = event.target;
      if (!textarea.classList || !textarea.classList.contains('js-memo')) return;
      const item = textarea.closest('.js-item');
      if (item) item.classList.toggle('has-memo', Boolean(textarea.value.trim()));
      renderSiteList();
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
      el.reset.addEventListener('click', () => {
        const site = getCurrentSite();
        if (!window.confirm(`「${site.name}」の点検結果とメモをすべて消去します。よろしいですか？\n（サイト情報は残ります）`)) return;

        (itemIdsByType[site.type] || []).forEach((id) => {
          delete site.items[id];
        });
        touchSite(site);
        renderChecklist();
        setMetaStatus('点検結果をリセットしました。');
      });
    }
  };

  /* ==================================================================
     操作：データの書き出し・読み込み
     ================================================================== */
  const initDataTransfer = () => {
    if (el.exportButton) {
      el.exportButton.addEventListener('click', () => {
        const json = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), ...data }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `security-checklist-${today().replace(/-/g, '')}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      });
    }

    if (el.importInput) {
      el.importInput.addEventListener('change', () => {
        const file = el.importInput.files && el.importInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => {
          try {
            const parsed = JSON.parse(String(reader.result));
            const sites = Array.isArray(parsed.sites) ? parsed.sites.map(normalizeSite).filter(Boolean) : [];
            if (!sites.length) throw new Error('サイトのデータが見つかりません');

            if (!window.confirm(`${sites.length}サイト分のデータを読み込みます。現在の記録はすべて置き換わります。よろしいですか？`)) return;

            data.sites = sites;
            data.currentId = sites.some((s) => s.id === parsed.currentId) ? parsed.currentId : sites[0].id;
            saveData();
            renderAll();
            setMetaStatus(`${sites.length}サイト分のデータを読み込みました。`);
          } catch (error) {
            window.alert('読み込めませんでした。このチェックリストから書き出したJSONファイルを選んでください。');
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

    // 非対応ブラウザではすぐに表示する（コンテンツを隠したままにしない）
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
     初期化（1つの失敗でページ全体を止めない）
     ================================================================== */
  [
    ['render', renderAll],
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

  saveData(); // 旧データからの引き継ぎ結果などを保存しておく
})();
