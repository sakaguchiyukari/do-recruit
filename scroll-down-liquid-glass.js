/**
 * Liquid Glass Scroll Indicator
 * iOS 26 inspired — SWELL WordPress theme
 *
 * 機能:
 * - マウス追跡による動的屈折
 * - Canvasリップル（水面の波紋）
 * - スクロール検出による自動フェードアウト
 * - クリックで次のセクションへスムーズスクロール
 */

(function () {
  'use strict';

  // モーション無効設定を尊重
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =============================================
  // リップルシステム（Canvas水面効果）
  // =============================================
  class LiquidRipple {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ripples = [];
      this.raf = null;

      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width  = (rect.width  + 60) * dpr;
      this.canvas.height = (rect.height + 60) * dpr;
      this.canvas.style.width  = (rect.width  + 60) + 'px';
      this.canvas.style.height = (rect.height + 60) + 'px';
      this.ctx.scale(dpr, dpr);
      this.w = rect.width  + 60;
      this.h = rect.height + 60;
    }

    spawn(x, y) {
      this.ripples.push({
        x: x + 30,
        y: y + 30,
        r: 0,
        maxR: Math.max(this.w, this.h) * 0.7,
        alpha: 0.5,
        speed: 2.5,
      });
      if (!this.raf) this.loop();
    }

    loop() {
      this.ctx.clearRect(0, 0, this.w, this.h);

      this.ripples = this.ripples.filter(rp => rp.alpha > 0.005);

      for (const rp of this.ripples) {
        rp.r     += rp.speed;
        rp.speed *= 0.985;
        rp.alpha *= 0.94;

        // 液体の波紋: 複数の同心リング
        for (let i = 0; i < 3; i++) {
          const offset = i * 6;
          const r = rp.r - offset;
          if (r < 0) continue;

          this.ctx.beginPath();
          this.ctx.arc(rp.x, rp.y, r, 0, Math.PI * 2);
          this.ctx.strokeStyle = `rgba(255,255,255,${rp.alpha * (1 - i * 0.3)})`;
          this.ctx.lineWidth = 1.2 - i * 0.3;
          this.ctx.stroke();
        }
      }

      if (this.ripples.length > 0) {
        this.raf = requestAnimationFrame(() => this.loop());
      } else {
        this.raf = null;
      }
    }
  }

  // =============================================
  // 動的屈折: マウス位置でガラスの歪みを変化
  // =============================================
  class DynamicRefraction {
    constructor(indicator) {
      this.indicator = indicator;
      this.surface = indicator.querySelector('.lg-glass-surface');
      this.highlight = indicator.querySelector('.lg-highlight-top');
      this.rimLeft  = indicator.querySelector('.lg-rim-left');
      this.rimRight = indicator.querySelector('.lg-rim-right');

      this.mouseX = 0;
      this.mouseY = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.raf = null;

      this.bindEvents();
      this.animate();
    }

    bindEvents() {
      this.indicator.addEventListener('mousemove', (e) => {
        const rect = this.indicator.getBoundingClientRect();
        this.targetX = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
        this.targetY = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
      }, { passive: true });

      this.indicator.addEventListener('mouseleave', () => {
        this.targetX = 0;
        this.targetY = 0;
      }, { passive: true });
    }

    animate() {
      // 慣性: 液体のようなゆっくりした追従
      this.mouseX += (this.targetX - this.mouseX) * 0.08;
      this.mouseY += (this.targetY - this.mouseY) * 0.08;

      const tiltX =  this.mouseY * 12; // deg
      const tiltY = -this.mouseX * 12;

      // 3D傾き
      if (this.surface) {
        this.surface.style.transform = `
          perspective(300px)
          rotateX(${tiltX}deg)
          rotateY(${tiltY}deg)
        `;
      }

      // ハイライトが光源方向にシフト（物理的な反射）
      if (this.highlight) {
        const shiftX = this.mouseX * 8;
        const shiftY = this.mouseY * 4;
        this.highlight.style.transform = `translate(${shiftX}px, ${shiftY}px) scaleX(${1 + Math.abs(this.mouseX) * 0.2})`;
        this.highlight.style.opacity   = 0.7 + Math.abs(this.mouseX) * 0.3;
      }

      // リムライトの強度変化
      if (this.rimLeft) {
        this.rimLeft.style.opacity  = 0.6 + (-this.mouseX + 1) * 0.3;
      }
      if (this.rimRight) {
        this.rimRight.style.opacity = 0.3 + ( this.mouseX + 1) * 0.15;
      }

      this.raf = requestAnimationFrame(() => this.animate());
    }

    destroy() {
      cancelAnimationFrame(this.raf);
    }
  }

  // =============================================
  // SVGフィルター: 屈折の動的チューニング
  // =============================================
  class SVGRefractionDriver {
    constructor(indicator) {
      this.turbulence = document.querySelector('#lg-refraction feTurbulence');
      this.displacement = document.querySelector('#lg-refraction feDisplacementMap');
      this.indicator = indicator;
      this.intensity = 0;
      this.targetIntensity = 0;
      this.raf = null;

      this.bindEvents();
      this.animate();
    }

    bindEvents() {
      this.indicator.addEventListener('mouseenter', () => {
        this.targetIntensity = 1;
      }, { passive: true });

      this.indicator.addEventListener('mouseleave', () => {
        this.targetIntensity = 0;
      }, { passive: true });
    }

    animate() {
      this.intensity += (this.targetIntensity - this.intensity) * 0.06;

      if (this.displacement) {
        const scale = 3 + this.intensity * 5;
        this.displacement.setAttribute('scale', scale.toFixed(2));
      }

      this.raf = requestAnimationFrame(() => this.animate());
    }
  }

  // =============================================
  // スクロール検出 & フェードアウト
  // =============================================
  function initScrollFade(indicator) {
    let scrolled = false;

    const handler = () => {
      if (!scrolled && window.scrollY > 80) {
        scrolled = true;
        indicator.classList.add('is-hidden');
        window.removeEventListener('scroll', handler);
      }
    };

    window.addEventListener('scroll', handler, { passive: true });
  }

  // =============================================
  // クリック: 次セクションへスムーズスクロール
  // =============================================
  function initClickScroll(indicator) {
    const scrollToNext = () => {
      // ヒーローセクションの高さ分スクロール
      const hero = indicator.closest('section, .c-hero, .p-top-hero, #hero, .hero') || document.body;
      const targetY = hero === document.body
        ? window.innerHeight
        : hero.getBoundingClientRect().bottom + window.scrollY;

      window.scrollTo({
        top: targetY,
        behavior: 'smooth',
      });
    };

    indicator.addEventListener('click', scrollToNext);
    indicator.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollToNext();
      }
    });
  }

  // =============================================
  // タッチデバイス: タップ波紋
  // =============================================
  function initTouchRipple(indicator, ripple) {
    indicator.addEventListener('touchstart', (e) => {
      const rect  = indicator.getBoundingClientRect();
      const touch = e.touches[0];
      ripple.spawn(
        touch.clientX - rect.left,
        touch.clientY - rect.top
      );
    }, { passive: true });
  }

  // =============================================
  // マウスホバー波紋
  // =============================================
  function initHoverRipple(indicator, ripple) {
    indicator.addEventListener('mouseenter', (e) => {
      const rect = indicator.getBoundingClientRect();
      ripple.spawn(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    }, { passive: true });
  }

  // =============================================
  // 初期化
  // =============================================
  function init() {
    const indicator = document.getElementById('lgScrollIndicator');
    if (!indicator) return;

    const canvas = document.getElementById('lgRippleCanvas');

    // リップル
    const ripple = new LiquidRipple(canvas);

    // 屈折 & 傾き（モーション有効時のみ）
    if (!prefersReducedMotion) {
      new DynamicRefraction(indicator);
      new SVGRefractionDriver(indicator);
    }

    // ホバー・タップ波紋
    initHoverRipple(indicator, ripple);
    initTouchRipple(indicator, ripple);

    // スクロールフェード
    initScrollFade(indicator);

    // クリックスクロール
    initClickScroll(indicator);

    // 自動パーティクルスポーン（ガラス内の気泡感）
    if (!prefersReducedMotion) {
      setInterval(() => {
        const rect = indicator.getBoundingClientRect();
        ripple.spawn(
          Math.random() * rect.width,
          Math.random() * rect.height * 0.5
        );
      }, 4000);
    }
  }

  // DOM準備完了後に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
