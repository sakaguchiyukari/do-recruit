/* ==========================================================================
   Recruit Float CTA
   一定量スクロールしたら追従ボタンを表示する
   ========================================================================== */
(() => {
  const cta = document.querySelector('.recruit-float-cta');
  if (!cta) return;

  /* 表示し始めるスクロール量（px） */
  const SHOW_FROM = 300;

  const update = () => {
    cta.classList.toggle('is-visible', window.scrollY > SHOW_FROM);
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
