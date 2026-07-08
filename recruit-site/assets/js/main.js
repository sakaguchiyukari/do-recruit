/* =========================================================
   Yukari Sakaguchi | Portfolio — main.js
   ---------------------------------------------------------
   1. IntersectionObserver によるフェードイン
   2. ハンバーガーメニュー（ドロワー）
   3. ページトップボタン
   4. スクロール量に応じたヘッダー変化
   ※ var不使用／jQuery不使用／全ページ共通で読み込む
========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     1. フェードイン（.js-fade / .stats__item が対象）
  --------------------------------------------------------- */
  const fadeTargets = document.querySelectorAll('.js-fade, .stats__item');

  if (fadeTargets.length > 0) {
    const fadeObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        observer.unobserve(entry.target); // 一度表示したら監視を外す
      });
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0,
    });

    fadeTargets.forEach((el) => fadeObserver.observe(el));
  }

  /* ---------------------------------------------------------
     2. ハンバーガーメニュー
        - aria-expanded を切り替え
        - 背景オーバーレイはJSで生成（HTMLを汚さない）
  --------------------------------------------------------- */
  const menuToggle = document.querySelector('.js-menu-toggle');
  const drawer = document.querySelector('.js-drawer');

  if (menuToggle && drawer) {
    // 黒幕オーバーレイを生成して body 直下へ
    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    document.body.appendChild(overlay);

    const setMenu = (isOpen) => {
      drawer.classList.toggle('is-open', isOpen);
      overlay.classList.toggle('is-open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    };

    menuToggle.addEventListener('click', () => {
      setMenu(!drawer.classList.contains('is-open'));
    });

    // 黒幕クリック／リンククリックで閉じる
    overlay.addEventListener('click', () => setMenu(false));
    document.querySelectorAll('.js-drawer-link').forEach((link) => {
      link.addEventListener('click', () => setMenu(false));
    });

    // Escキーでも閉じられるように（アクセシビリティ配慮）
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenu(false);
    });
  }

  /* ---------------------------------------------------------
     3. ページトップボタン ＆ 4. ヘッダー変化
        - scrollイベントは1つにまとめて負荷を抑える
  --------------------------------------------------------- */
  const pagetop = document.querySelector('.js-pagetop');
  const header = document.querySelector('.js-header');

  const onScroll = () => {
    const scrollY = window.scrollY;

    if (header) {
      header.classList.toggle('is-scrolled', scrollY > 10);
    }

    if (pagetop) {
      pagetop.classList.toggle('is-visible', scrollY > 500);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // 初期表示時にも状態を反映

  if (pagetop) {
    pagetop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
