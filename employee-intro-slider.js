/**
 * employee-intro-slider.js
 * - Swiper スライダー初期化
 * - IntersectionObserver によるフェードイン
 */

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================
    Swiper 初期化
  ============================================ */
  const swiperEl = document.querySelector(".employee-slider");

  if (swiperEl) {
    // ナビボタンをSwiper初期化前に取得
    const prevBtn = document.querySelector(".employee-slider__btn--prev");
    const nextBtn = document.querySelector(".employee-slider__btn--next");

    const swiper = new Swiper(".employee-slider", {
      // ループ再生
      loop: true,

      // スライド間の余白
      spaceBetween: 24,

      // 自動再生（4秒ごと・ゆっくり切り替え）
      autoplay: {
        delay: 4000,
        disableOnInteraction: false, // 手動操作後も自動再生を継続
        pauseOnMouseEnter: true,     // ホバー中は一時停止
      },

      // スライド切り替えのスピード（ms）
      speed: 800,

      // ページネーション
      pagination: {
        el: ".employee-slider__pagination",
        clickable: true,
      },

      // アクセシビリティ
      a11y: {
        prevSlideMessage: "前のスライド",
        nextSlideMessage: "次のスライド",
      },

      // ブレークポイントごとの表示枚数
      slidesPerView: 1,
      breakpoints: {
        // タブレット: 600px 以上
        600: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        // PC: 900px 以上
        900: {
          slidesPerView: 3,
          spaceBetween: 24,
        },
      },
    });

    // 矢印ボタンを手動でSwiperに接続
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        swiper.slidePrev();
        swiper.autoplay.start(); // クリック後も自動再生を維持
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        swiper.slideNext();
        swiper.autoplay.start();
      });
    }
  }

  /* ============================================
    IntersectionObserver によるフェードイン

    対象:
      .js-fade-section  … セクション全体
      .js-fade-card     … 各カード（遅延付き）
  ============================================ */

  // 共通オプション
  const fadeOptions = {
    threshold: 0.12, // 12% 見えたら発火
    rootMargin: "0px 0px -40px 0px",
  };

  // ─── セクション全体のフェードイン ───
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        sectionObserver.unobserve(entry.target); // 一度だけ発火
      }
    });
  }, fadeOptions);

  document.querySelectorAll(".js-fade-section").forEach((el) => {
    sectionObserver.observe(el);
  });

  // ─── カードのフェードイン（stagger遅延） ───
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        cardObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -20px 0px",
  });

  // 各カードに表示遅延を設定してからObserve
  document.querySelectorAll(".js-fade-card").forEach((card, index) => {
    // スライドのインデックスに応じて遅延（最大3枚分まで）
    const delay = (index % 3) * 120;
    card.style.transitionDelay = `${delay}ms`;
    cardObserver.observe(card);
  });

});
