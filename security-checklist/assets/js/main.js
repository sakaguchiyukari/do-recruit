/**
 * ホームページ セキュリティ点検チェックリスト
 * - フェードイン（IntersectionObserver）
 * - タブ切り替え（WordPress / 静的HTML）
 * - チェック状態・点検情報の保存（localStorage）と進捗表示
 * - 印刷・リセット
 *
 * file:// で直接開いても動くよう、ESモジュールではなく defer の単一ファイル構成にしている。
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     保存（localStorage）
     プライベートブラウズ等で使えない場合も画面は動くよう try/catch で包む
     ------------------------------------------------------------------ */
  const STORAGE_KEY = 'security-checklist:v1';

  const loadState = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        checks: parsed.checks || {},
        meta: parsed.meta || {},
        tab: parsed.tab || '',
      };
    } catch (error) {
      return { checks: {}, meta: {}, tab: '' };
    }
  };

  const state = loadState();

  const saveState = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  };

  /* ------------------------------------------------------------------
     フェードイン
     ------------------------------------------------------------------ */
  const initReveal = () => {
    const targets = document.querySelectorAll('.js-reveal');
    if (!targets.length) return;

    const reveal = (el) => el.classList.add('is-revealed');

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

    targets.forEach((el) => observer.observe(el));
  };

  /* ------------------------------------------------------------------
     進捗表示
     ------------------------------------------------------------------ */
  const progressText = document.querySelector('.js-progress-text');
  const progressTrack = document.querySelector('.js-progress');

  const getActivePanel = () => document.querySelector('.js-panel:not([hidden])');

  // カテゴリ単位の件数表示
  const updateCategory = (category) => {
    const checks = category.querySelectorAll('.js-check');
    const done = category.querySelectorAll('.js-check:checked').length;
    const count = category.querySelector('.js-category-count');
    if (count) count.textContent = `${done} / ${checks.length}`;
    category.classList.toggle('is-complete', done === checks.length);
  };

  // ツールバーの全体進捗（表示中のパネルが対象）
  const updateProgress = () => {
    const panel = getActivePanel();
    if (!panel || !progressText || !progressTrack) return;

    const total = panel.querySelectorAll('.js-check').length;
    const done = panel.querySelectorAll('.js-check:checked').length;
    const ratio = total ? done / total : 0;

    progressText.textContent = `${done} / ${total}`;
    progressTrack.style.setProperty('--progress', String(ratio));
    progressTrack.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  };

  /* ------------------------------------------------------------------
     タブ切り替え
     ------------------------------------------------------------------ */
  const initTabs = () => {
    const tabs = Array.from(document.querySelectorAll('.js-tab'));
    if (!tabs.length) return;

    const select = (tab, { focus = false } = {}) => {
      tabs.forEach((item) => {
        const isActive = item === tab;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        item.setAttribute('aria-selected', String(isActive));
        item.tabIndex = isActive ? 0 : -1;
        if (panel) panel.hidden = !isActive;
      });

      if (focus) tab.focus();
      state.tab = tab.id;
      saveState();
      updateProgress();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));

      // 左右キー・Home/End でタブ移動（WAI-ARIA の Tabs パターン）
      tab.addEventListener('keydown', (event) => {
        const keyMap = {
          ArrowRight: (index + 1) % tabs.length,
          ArrowLeft: (index - 1 + tabs.length) % tabs.length,
          Home: 0,
          End: tabs.length - 1,
        };
        if (!(event.key in keyMap)) return;
        event.preventDefault();
        select(tabs[keyMap[event.key]], { focus: true });
      });
    });

    // 前回開いていたタブを復元（なければ先頭）
    const saved = tabs.find((tab) => tab.id === state.tab);
    select(saved || tabs[0]);
  };

  /* ------------------------------------------------------------------
     チェックリスト
     ------------------------------------------------------------------ */
  const initChecklist = () => {
    const checks = document.querySelectorAll('.js-check');
    if (!checks.length) return;

    // 保存済みの状態を復元
    checks.forEach((input) => {
      input.checked = Boolean(state.checks[input.id]);
    });

    document.querySelectorAll('.js-category').forEach(updateCategory);
    updateProgress();

    // 変更はイベント委譲でまとめて受ける
    document.addEventListener('change', (event) => {
      const input = event.target;
      if (!input.classList || !input.classList.contains('js-check')) return;

      if (input.checked) {
        state.checks[input.id] = true;
      } else {
        delete state.checks[input.id];
      }
      saveState();

      const category = input.closest('.js-category');
      if (category) updateCategory(category);
      updateProgress();
    });
  };

  /* ------------------------------------------------------------------
     点検情報フォーム
     ------------------------------------------------------------------ */
  const initMetaForm = () => {
    const form = document.querySelector('.js-meta-form');
    if (!form) return;

    const status = form.querySelector('.js-meta-status');
    const fields = Array.from(form.querySelectorAll('input[name]'));

    const setStatus = (text) => {
      if (status) status.textContent = text;
    };

    // エラーメッセージ（ブラウザ既定の文言ではなく、内容に合わせて表示）
    const getMessage = (input) => {
      const { validity } = input;
      if (validity.valueMissing) return '入力してください。';
      if (validity.typeMismatch || validity.patternMismatch) {
        return input.type === 'url' ? 'https:// から始まるURLを入力してください。' : '形式が正しくありません。';
      }
      if (validity.rangeUnderflow || validity.rangeOverflow) return '日付を確認してください。';
      if (validity.tooLong) return `${input.maxLength}文字以内で入力してください。`;
      return '';
    };

    const validate = (input) => {
      const errorId = input.getAttribute('aria-describedby');
      const error = errorId ? document.getElementById(errorId) : null;
      const message = input.checkValidity() ? '' : getMessage(input);

      input.setAttribute('aria-invalid', String(Boolean(message)));
      if (error) error.textContent = message;
      return !message;
    };

    // 保存済みの値を復元。点検日が空なら今日の日付を入れる
    fields.forEach((input) => {
      if (state.meta[input.name]) input.value = state.meta[input.name];
    });
    const dateInput = form.querySelector('input[type="date"]');
    if (dateInput && !dateInput.value) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
    if (state.meta.savedAt) setStatus(`前回保存：${state.meta.savedAt}`);

    // 一度エラーになった項目は、入力中に再チェックしてエラーを消す
    fields.forEach((input) => {
      input.addEventListener('blur', () => validate(input));
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') validate(input);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault(); // 送信はせず、ブラウザ内に保存するのみ

      const results = fields.map(validate);
      if (results.includes(false)) {
        const firstInvalid = fields.find((input) => input.getAttribute('aria-invalid') === 'true');
        if (firstInvalid) firstInvalid.focus();
        setStatus('未入力・誤りのある項目があります。');
        return;
      }

      fields.forEach((input) => {
        state.meta[input.name] = input.value.trim();
      });
      state.meta.savedAt = new Date().toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });

      setStatus(saveState()
        ? `保存しました（${state.meta.savedAt}）`
        : 'このブラウザでは保存できませんでした。');
    });
  };

  /* ------------------------------------------------------------------
     印刷・リセット
     ------------------------------------------------------------------ */
  const initActions = () => {
    const printButton = document.querySelector('.js-print');
    const resetButton = document.querySelector('.js-reset');

    if (printButton) {
      printButton.addEventListener('click', () => window.print());
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        const panel = getActivePanel();
        if (!panel) return;

        const title = panel.querySelector('h2');
        const label = title ? title.textContent : '表示中のリスト';
        if (!window.confirm(`「${label}」のチェックをすべて外します。よろしいですか？`)) return;

        panel.querySelectorAll('.js-check').forEach((input) => {
          input.checked = false;
          delete state.checks[input.id];
        });
        saveState();

        panel.querySelectorAll('.js-category').forEach(updateCategory);
        updateProgress();
      });
    }
  };

  /* ------------------------------------------------------------------
     初期化（1つの失敗でページ全体を止めない）
     ------------------------------------------------------------------ */
  [
    ['reveal', initReveal],
    ['tabs', initTabs],
    ['checklist', initChecklist],
    ['meta-form', initMetaForm],
    ['actions', initActions],
  ].forEach(([name, init]) => {
    try {
      init();
    } catch (error) {
      console.error(`[security-checklist] "${name}" の初期化に失敗しました`, error);
    }
  });
})();
