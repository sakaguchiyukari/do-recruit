/* ==========================================================================
   グループ内副業トライアル募集ページ
   - フェードイン（IntersectionObserver）
   - SP固定CTAの表示制御
   ========================================================================== */

'use strict';

document.documentElement.classList.add('is-js');

/* --------------------------------------------------------------------------
   フェードイン：画面に入った要素へ .is-inview を付与（1回のみ）
   -------------------------------------------------------------------------- */
const initFadeIn = () => {
  const targets = document.querySelectorAll('.js-fade');
  if (!targets.length) return;

  // 非対応ブラウザでは即表示
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-inview'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-inview');
      obs.unobserve(entry.target);
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1,
  });

  targets.forEach((el) => observer.observe(el));
};

/* --------------------------------------------------------------------------
   SP固定CTA：ヒーローを過ぎたら表示し、応募セクション表示中は隠す
   （ボタンが二重に並ぶのを防ぐ）
   -------------------------------------------------------------------------- */
const initSpCta = () => {
  const cta = document.querySelector('.js-sp-cta');
  const hero = document.querySelector('.sj-hero');
  const entry = document.querySelector('#entry');
  if (!cta || !hero || !entry || !('IntersectionObserver' in window)) return;

  const state = { heroVisible: true, entryVisible: false };

  const update = () => {
    cta.classList.toggle('is-visible', !state.heroVisible && !state.entryVisible);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.target === hero) state.heroVisible = e.isIntersecting;
      if (e.target === entry) state.entryVisible = e.isIntersecting;
    });
    update();
  });

  observer.observe(hero);
  observer.observe(entry);
};

initFadeIn();
initSpCta();
