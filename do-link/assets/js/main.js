/* ==========================================================================
   Do.Link トップページ スクリプト
   ---------------------------------------------------------------------------
   ・<script defer> で読み込む単一ファイル構成（file:// でも動作する）
   ・各 init 関数は対象要素が無ければ即 return する
   ・グローバル変数を作らないよう、全体をブロックスコープで包む
   ========================================================================== */
{
  /* ------------------------------------------------------------------------
     Scroll reveal：IntersectionObserver でフェードイン
     ------------------------------------------------------------------------ */
  const initScrollReveal = () => {
    const targets = document.querySelectorAll('.js-reveal');
    if (!targets.length) return;

    // 同じ親の中での順番を --i に渡し、CSS 側で遅延（stagger）を計算する
    targets.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((child) => child.classList.contains('js-reveal'));
      el.style.setProperty('--i', String(Math.max(0, siblings.indexOf(el))));
    });

    // 非対応環境ではすぐに全要素を表示する（コンテンツを隠したままにしない）
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target); // 発火は1回のみ
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    targets.forEach((el) => observer.observe(el));
  };

  /* ------------------------------------------------------------------------
     Drawer：ハンバーガーメニュー
     ------------------------------------------------------------------------ */
  const initDrawer = () => {
    const drawer = document.querySelector('.js-drawer');
    const toggle = document.querySelector('.js-drawer-toggle');
    if (!drawer || !toggle) return;

    const setState = (isOpen) => {
      drawer.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    };

    toggle.addEventListener('click', () => {
      setState(!drawer.classList.contains('is-open'));
    });

    // メニュー内リンクを押したら閉じる
    drawer.querySelectorAll('.js-drawer-link').forEach((link) => {
      link.addEventListener('click', () => setState(false));
    });

    // Esc キーで閉じ、トグルにフォーカスを戻す
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !drawer.classList.contains('is-open')) return;
      setState(false);
      toggle.focus();
    });

    // メニュー外クリックで閉じる
    document.addEventListener('click', (event) => {
      if (!drawer.classList.contains('is-open')) return;
      if (drawer.contains(event.target) || toggle.contains(event.target)) return;
      setState(false);
    });
  };

  /* ------------------------------------------------------------------------
     Carousel：横スクロール + 前後ボタン
     ------------------------------------------------------------------------ */
  const initCarousels = () => {
    const carousels = document.querySelectorAll('.js-carousel');
    if (!carousels.length) return;

    carousels.forEach((carousel) => {
      const track = carousel.querySelector('.js-carousel-track');
      const prev = carousel.querySelector('.js-carousel-prev');
      const next = carousel.querySelector('.js-carousel-next');
      if (!track || !prev || !next) return;

      // 1スライド分（スライド幅 + gap）の移動量
      const getStep = () => {
        const slide = track.firstElementChild;
        if (!slide) return track.clientWidth;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return slide.getBoundingClientRect().width + gap;
      };

      // 端に到達したらボタンを無効化する
      const updateButtons = () => {
        const maxScroll = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= maxScroll;
      };

      prev.addEventListener('click', () => track.scrollBy({ left: -getStep(), behavior: 'smooth' }));
      next.addEventListener('click', () => track.scrollBy({ left: getStep(), behavior: 'smooth' }));

      // scroll イベントは rAF で間引く
      let ticking = false;
      track.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          updateButtons();
          ticking = false;
        });
      }, { passive: true });

      // 幅が変わったときもボタン状態を更新する
      if ('ResizeObserver' in window) {
        new ResizeObserver(updateButtons).observe(track);
      }
      updateButtons();
    });
  };

  /* ------------------------------------------------------------------------
     Modal：NUMBER カード → ダイアログ（3スライドを前後で切り替え）
     ------------------------------------------------------------------------ */
  const initModal = () => {
    const modal = document.querySelector('.js-modal');
    const openers = document.querySelectorAll('.js-modal-open');
    if (!modal || !openers.length || typeof modal.showModal !== 'function') return;

    const slides = [...modal.querySelectorAll('.js-modal-slide')];
    const panel = modal.querySelector('.c-modal__panel');
    let current = 0;

    // 指定番号のスライドを表示（範囲外はループさせる）
    const show = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.hidden = i !== current;
      });
      modal.setAttribute('aria-labelledby', `about-modal-title-${current}`);
      if (panel) panel.scrollTop = 0;
    };

    openers.forEach((opener) => {
      opener.addEventListener('click', () => {
        show(Number(opener.dataset.slide) || 0);
        modal.showModal();
      });
    });

    modal.querySelector('.js-modal-prev')?.addEventListener('click', () => show(current - 1));
    modal.querySelector('.js-modal-next')?.addEventListener('click', () => show(current + 1));
    modal.querySelector('.js-modal-close')?.addEventListener('click', () => modal.close());

    // 背景（::backdrop）クリックで閉じる
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.close();
    });

    // ← → キーでも切り替え
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') show(current - 1);
      if (event.key === 'ArrowRight') show(current + 1);
    });
  };

  /* ------------------------------------------------------------------------
     SP fixed CTA：ヒーロー下の CTA が画面外に出たら下部バーを表示
     ------------------------------------------------------------------------ */
  const initSpCta = () => {
    const bar = document.querySelector('.js-sp-cta');
    const sentinel = document.querySelector('.js-cta-sentinel');
    if (!bar || !sentinel || !('IntersectionObserver' in window)) return;

    const links = bar.querySelectorAll('a');
    const setVisible = (isVisible) => {
      bar.classList.toggle('is-visible', isVisible);
      bar.setAttribute('aria-hidden', String(!isVisible));
      // 非表示中はキーボードフォーカスが入らないようにする
      links.forEach((link) => link.setAttribute('tabindex', isVisible ? '0' : '-1'));
    };

    new IntersectionObserver(([entry]) => {
      // CTA より下にスクロールしたときだけ表示（上に戻ったら隠す）
      const isPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      setVisible(isPassed);
    }).observe(sentinel);
  };

  /* ------------------------------------------------------------------------
     Boot：1モジュールの失敗でページ全体を壊さない
     ------------------------------------------------------------------------ */
  const boot = () => {
    [
      ['scroll-reveal', initScrollReveal],
      ['drawer', initDrawer],
      ['carousel', initCarousels],
      ['modal', initModal],
      ['sp-cta', initSpCta],
    ].forEach(([name, init]) => {
      try {
        init();
      } catch (error) {
        console.error(`[main] "${name}" の初期化に失敗しました`, error);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
