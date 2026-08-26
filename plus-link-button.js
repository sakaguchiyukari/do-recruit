/* ================================================
   Plus Link Button - フェードイン
   IntersectionObserver で画面内に入ったら
   .is-plus-shown を付与する
   ================================================ */
(() => {
  const targets = document.querySelectorAll('.js-plus-fade');
  if (!targets.length) return;

  // モーション軽減設定時は即表示
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((el) => el.classList.add('is-plus-shown'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-plus-shown');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

  targets.forEach((el) => observer.observe(el));
})();
