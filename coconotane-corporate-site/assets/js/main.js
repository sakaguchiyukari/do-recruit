/**
 * 株式会社COCONOTANE - Corporate Site Script
 * ---------------------------------------------------------------------------
 * 実装している機能はこの4つのみ（不要な処理は載せない方針）
 *   1. スクロール量に応じたヘッダーの状態変化
 *   2. ページトップボタンの表示切り替え
 *   3. ハンバーガーメニュー（aria-expanded / inert / フォーカス管理）
 *   4. IntersectionObserver によるフェードイン
 *
 * 方針
 *   - ES6 / const・let のみ（var・即時実行関数は使わない）
 *   - scroll は requestAnimationFrame、resize は debounce で間引く
 *   - 監視対象が無ければ何もしない（下層ページでも同じファイルを読める）
 * ---------------------------------------------------------------------------
 */

/* ==========================================================================
   定数
   ========================================================================== */

const SELECTOR = {
  header: '#js-site-header',
  navToggle: '#js-nav-toggle',
  nav: '#global-nav',
  pageTop: '#js-page-top',
  reveal: '[data-reveal]',
  // ドロワー展開中に操作対象から外す領域
  inertArea: 'main, .site-footer, .sp-cta, .page-top'
};

const CLASS = {
  scrolled: 'is-scrolled',
  open: 'is-open',
  visible: 'is-visible',
  revealed: 'is-revealed',
  revealReady: 'is-reveal-ready',
  scrollLock: 'u-scroll-lock'
};

const HEADER_SCROLL_THRESHOLD = 24;   // ヘッダーが変化しはじめる位置(px)
const PAGE_TOP_SHOW_THRESHOLD = 480;  // ページトップボタンが現れる位置(px)
const DESKTOP_MEDIA_QUERY = '(min-width: 1025px)';
const RESIZE_DEBOUNCE_DELAY = 200;

/* ==========================================================================
   ユーティリティ
   ========================================================================== */

/**
 * requestAnimationFrame でスクロール処理を1フレーム1回に間引く
 * @param {Function} callback
 * @returns {Function} イベントハンドラ
 */
const throttleByFrame = (callback) => {
  let scheduled = false;

  return () => {
    if (scheduled) {
      return;
    }
    scheduled = true;

    window.requestAnimationFrame(() => {
      callback();
      scheduled = false;
    });
  };
};

/**
 * 連続発火するイベント（resize など）を最後の1回にまとめる
 * @param {Function} callback
 * @param {number} delay
 * @returns {Function} イベントハンドラ
 */
const debounce = (callback, delay = RESIZE_DEBOUNCE_DELAY) => {
  let timerId = 0;

  return () => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(callback, delay);
  };
};

/* ==========================================================================
   1 + 2. ヘッダーの状態変化 / ページトップボタン
   スクロールの監視はひとつのリスナーに集約する
   ========================================================================== */

const initScrollWatcher = () => {
  const header = document.querySelector(SELECTOR.header);
  const pageTop = document.querySelector(SELECTOR.pageTop);

  if (!header && !pageTop) {
    return;
  }

  const updateByScrollPosition = () => {
    const scrollY = window.scrollY;

    if (header) {
      header.classList.toggle(CLASS.scrolled, scrollY > HEADER_SCROLL_THRESHOLD);
    }

    if (pageTop) {
      pageTop.classList.toggle(CLASS.visible, scrollY > PAGE_TOP_SHOW_THRESHOLD);
    }
  };

  window.addEventListener('scroll', throttleByFrame(updateByScrollPosition), { passive: true });

  // リロード位置が途中の場合に備えて初期状態を反映
  updateByScrollPosition();
};

/* ==========================================================================
   3. ハンバーガーメニュー（ドロワー）
   ========================================================================== */

const initDrawer = () => {
  const toggle = document.querySelector(SELECTOR.navToggle);
  const nav = document.querySelector(SELECTOR.nav);

  if (!toggle || !nav) {
    return;
  }

  const label = toggle.querySelector('.hamburger__label');
  const labelClosed = label ? label.textContent : '';
  const labelOpened = label ? label.dataset.labelOpen : '';
  const inertAreas = document.querySelectorAll(SELECTOR.inertArea);
  const desktopMediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

  /**
   * ドロワーの開閉状態をまとめて反映する
   * @param {boolean} shouldOpen
   */
  const setDrawerState = (shouldOpen) => {
    toggle.setAttribute('aria-expanded', String(shouldOpen));
    nav.classList.toggle(CLASS.open, shouldOpen);
    document.body.classList.toggle(CLASS.scrollLock, shouldOpen);

    if (label) {
      label.textContent = shouldOpen ? labelOpened : labelClosed;
    }

    // 背面コンテンツをフォーカス・読み上げの対象から外す
    inertAreas.forEach((area) => {
      area.inert = shouldOpen;
    });
  };

  const openDrawer = () => {
    setDrawerState(true);

    // visibility の切り替えが描画に反映されてからフォーカスを移す
    window.requestAnimationFrame(() => {
      const firstLink = nav.querySelector('a');
      if (firstLink) {
        firstLink.focus();
      }
    });
  };

  const closeDrawer = (shouldReturnFocus = false) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') {
      return;
    }

    setDrawerState(false);

    if (shouldReturnFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeDrawer(true);
    } else {
      openDrawer();
    }
  });

  // ナビ内のリンククリックはイベント委譲でまとめて受ける
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      closeDrawer();
    }
  });

  // Esc キーで閉じてトグルへフォーカスを戻す
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDrawer(true);
    }
  });

  // PC幅へ広がったときは開いた状態を解除する
  const handleViewportChange = () => {
    if (desktopMediaQuery.matches) {
      closeDrawer();
    }
  };

  window.addEventListener('resize', debounce(handleViewportChange), { passive: true });
};

/* ==========================================================================
   4. スクロールに応じたフェードイン
   ========================================================================== */

const initScrollReveal = () => {
  const targets = document.querySelectorAll(SELECTOR.reveal);

  if (targets.length === 0) {
    return;
  }

  // JS が動く環境でのみ初期状態（非表示）を適用する
  document.documentElement.classList.add(CLASS.revealReady);

  const revealAll = () => {
    targets.forEach((target) => target.classList.add(CLASS.revealed));
  };

  if (!('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      entry.target.classList.add(CLASS.revealed);
      currentObserver.unobserve(entry.target); // 一度表示したら監視を解除
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.08
  });

  targets.forEach((target) => observer.observe(target));
};

/* ==========================================================================
   初期化
   ========================================================================== */

const init = () => {
  initScrollWatcher();
  initDrawer();
  initScrollReveal();
};

document.addEventListener('DOMContentLoaded', init);
