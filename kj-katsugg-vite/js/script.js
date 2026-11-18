/* ==========================================================================
   KJ & KATSUGG — js/script.js
   - type="module" で読み込む（Viteの決まり。確認は npm run dev）
   - 各機能は「対象要素が無ければ即 return」を約束とする
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     Scroll Reveal：IntersectionObserver で [data-reveal] をフェードイン
     ------------------------------------------------------------------------ */
  const initScrollReveal = () => {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    // 非対応環境ではすぐに全表示（コンテンツが読めない状態をつくらない）
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target); // 発火は1回のみ
      });
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1,
    });

    targets.forEach((el) => observer.observe(el));
  };

  /* ------------------------------------------------------------------------
     Header：ヒーローを過ぎたら背景を敷く / SP固定CTAを表示
     scrollイベントは使わず、ヒーローの可視状態で判定
     ------------------------------------------------------------------------ */
  const initHeaderState = () => {
    const header = document.querySelector('.js-header');
    const hero = document.querySelector('.js-hero');
    const cta = document.querySelector('.js-fixed-cta');
    const booking = document.querySelector('#booking');
    if (!header || !hero || !('IntersectionObserver' in window)) return;

    let isHeroVisible = true;
    let isBookingVisible = false;

    const update = () => {
      header.classList.toggle('is-scrolled', !isHeroVisible);
      // CTA はヒーロー通過後に出し、フォームが見えている間は重ならないよう隠す
      if (cta) cta.classList.toggle('is-visible', !isHeroVisible && !isBookingVisible);
    };

    new IntersectionObserver(([entry]) => {
      isHeroVisible = entry.isIntersecting;
      update();
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);

    if (booking) {
      new IntersectionObserver(([entry]) => {
        isBookingVisible = entry.isIntersecting;
        update();
      }).observe(booking);
    }
  };

  /* ------------------------------------------------------------------------
     Drawer：SPメニューの開閉
     ------------------------------------------------------------------------ */
  const initDrawer = () => {
    const toggle = document.querySelector('.js-nav-toggle');
    const nav = document.querySelector('.js-nav');
    if (!toggle || !nav) return;

    const setState = (isOpen) => {
      nav.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('is-scroll-locked', isOpen);
    };

    toggle.addEventListener('click', () => {
      setState(!nav.classList.contains('is-open'));
    });

    // メニュー内リンクを押したら閉じる
    nav.querySelectorAll('.js-nav-link').forEach((link) => {
      link.addEventListener('click', () => setState(false));
    });

    // Esc キーで閉じる
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setState(false);
        toggle.focus();
      }
    });

    // PC幅へ戻ったら状態をリセット
    window.matchMedia('(min-width: 768px)').addEventListener('change', (mq) => {
      if (mq.matches) setState(false);
    });
  };

  /* ------------------------------------------------------------------------
     Boot：1機能の失敗でページ全体を壊さない
     ------------------------------------------------------------------------ */
  const boot = () => {
    [
      ['scroll-reveal', initScrollReveal],
      ['header-state', initHeaderState],
      ['drawer', initDrawer],
    ].forEach(([name, init]) => {
      try {
        init();
      } catch (error) {
        console.error(`[main] "${name}" の初期化に失敗しました`, error);
        // フェードイン対象が隠れたままにならないよう保険をかける
        document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
      }
    });
  };

  boot(); // module は defer 相当で実行されるため DOM 構築済み
})();
