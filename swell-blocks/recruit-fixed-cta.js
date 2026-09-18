/* ==========================================================================
   Recruit Fixed CTA
   - 固定バーの高さ分だけページ下部に余白を確保する
   - トップへ戻るボタンの表示制御とスクロール
   ========================================================================== */
(() => {
  const bar = document.querySelector('.recruit-fixed-cta');
  if (!bar) return;

  const toTop = bar.querySelector('.recruit-fixed-cta__totop');
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* トップへ戻るボタンを表示し始めるスクロール量（px） */
  const SHOW_FROM = 300;

  /* バーの高さ分の余白をbodyに確保する */
  const updateHeight = () => {
    const isVisible = getComputedStyle(bar).display !== 'none';
    document.body.classList.toggle('recruit-fixed-cta-active', isVisible);
    document.body.style.setProperty(
      '--rfc-height',
      isVisible ? `${bar.offsetHeight}px` : '0px'
    );
  };

  /* 一定量スクロールしたらトップへ戻るボタンを表示する */
  const updateToTop = () => {
    if (!toTop) return;
    toTop.classList.toggle('is-visible', window.scrollY > SHOW_FROM);
  };

  toTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: REDUCED.matches ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', updateToTop, { passive: true });
  window.addEventListener('resize', updateHeight, { passive: true });

  updateHeight();
  updateToTop();
})();
