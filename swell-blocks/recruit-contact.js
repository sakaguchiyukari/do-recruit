/* ==========================================================================
   Recruit Contact CTA / フェードイン
   ========================================================================== */
(() => {
  if (!('IntersectionObserver' in window)) return;

  const targets = document.querySelectorAll('.recruit-contact__reveal');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        target.classList.add('is-visible');
        observer.unobserve(target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
  );

  targets.forEach((target) => {
    target.closest('.recruit-contact').classList.add('is-ready');
    observer.observe(target);
  });
})();
