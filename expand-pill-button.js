/* ================================================
   Expand Pill Button - フェードイン
   IntersectionObserver で画面内に入ったら .is-visible を付与
   ================================================ */
(() => {
  const targets = document.querySelectorAll('.js-fade-in');
  if (!targets.length) return;

  // モーション軽減設定時は即表示
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

  targets.forEach((el) => observer.observe(el));
})();
