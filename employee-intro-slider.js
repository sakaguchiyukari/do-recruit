/**
 * employee-intro-slider.js
 * 社員紹介セクション
 *
 * 機能:
 * - Swiper スライダー初期化（矢印はSwiper標準のnavigationに委譲）
 * - 矢印クリックがリンク遷移になる事故の防止（保険処理）
 * - IntersectionObserver によるフェードイン
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const section = document.querySelector('.employee-section');

  if (!section) {
    return;
  }

  // =============================================================
  // 保険1: 不正な <a> の除去
  // ブロックエディタがタグを自動補正すると、中身が空の
  // .employee-card-link がスライダー全体を包み込むことがある。
  // その状態だと矢印クリックが「詳細ページへのリンク」になるため、
  // カード(article)を含まないリンクは中身を残して剥がす（unwrap）。
  // =============================================================
  section.querySelectorAll('.employee-card-link').forEach((link) => {
    if (link.querySelector('.employee-card')) {
      return; // 正常なカードリンクは触らない
    }

    const parent = link.parentNode;

    while (link.firstChild) {
      parent.insertBefore(link.firstChild, link);
    }

    parent.removeChild(link);
  });

  // =============================================================
  // 保険2: 矢印・ページネーションのクリックでは遷移させない
  // 万一まだリンクの内側に残っていても、キャプチャ段階で
  // デフォルト動作（ページ遷移）だけを打ち消す。
  // Swiper 自身のクリック処理は通常どおり動作する。
  // =============================================================
  section.addEventListener(
    'click',
    (event) => {
      const control = event.target.closest(
        '.employee-slider__btn, .employee-slider__pagination'
      );

      if (!control) {
        return;
      }

      const wrappingLink = control.closest('a');

      if (wrappingLink) {
        event.preventDefault();
      }
    },
    true // キャプチャ段階
  );

  // =============================================================
  // Swiper 初期化
  // =============================================================
  const sliderEl = section.querySelector('.employee-slider');
  let swiper = null;

  if (sliderEl && typeof Swiper !== 'undefined') {
    const slideCount = sliderEl.querySelectorAll('.swiper-slide').length;

    // 最大表示枚数(4)の2倍未満だとループ時に描画が崩れるため、
    // 枚数が足りない場合はループを無効にする
    const enableLoop = slideCount >= 8;

    swiper = new Swiper(sliderEl, {
      loop: enableLoop,
      speed: 800,
      spaceBetween: 24,
      slidesPerView: 1,

      /* 自動再生 */
      autoplay: {
        delay: 4000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },

      /* 矢印ボタン（Swiper標準機能に委譲） */
      navigation: {
        prevEl: section.querySelector('.employee-slider__btn--prev'),
        nextEl: section.querySelector('.employee-slider__btn--next'),
      },

      /* ページネーション */
      pagination: {
        el: section.querySelector('.employee-slider__pagination'),
        clickable: true,
      },

      /* アクセシビリティ */
      a11y: {
        prevSlideMessage: '前のスライド',
        nextSlideMessage: '次のスライド',
      },

      /* レスポンシブ */
      breakpoints: {
        /* タブレット */
        600: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        /* 小型PC */
        900: {
          slidesPerView: 3,
          spaceBetween: 24,
        },
        /* 大型PC */
        1200: {
          slidesPerView: 4,
          spaceBetween: 28,
        },
      },
    });
  }

  // =============================================================
  // フェードイン
  // =============================================================
  let isRevealed = false;

  /**
   * セクション内の全カードを順に表示する。
   * ループ用の複製スライドが後から生成されても
   * 非表示のまま取り残されないよう、都度全カードに適用する。
   */
  const revealCards = () => {
    section.querySelectorAll('.js-fade-card').forEach((card, index) => {
      if (card.classList.contains('is-visible')) {
        return;
      }

      // 4枚表示に合わせて遅延を調整
      card.style.transitionDelay = `${(index % 4) * 120}ms`;
      card.classList.add('is-visible');
    });
  };

  const sectionObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        isRevealed = true;
        revealCards();
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  document.querySelectorAll('.js-fade-section').forEach((element) => {
    sectionObserver.observe(element);
  });

  // 複製スライド生成後にもフェードイン状態を適用する
  if (swiper) {
    ['loopFix', 'slidesUpdated', 'resize'].forEach((eventName) => {
      swiper.on(eventName, () => {
        if (isRevealed) {
          revealCards();
        }
      });
    });
  }
});
