/* ==========================================================================
   Recruit Fixed CTA
   固定バーの高さ分だけページ下部に余白を確保する
   （SP表示のときのみ body にクラスを付与）
   ========================================================================== */
(() => {
  const bar = document.querySelector('.recruit-fixed-cta');
  if (!bar) return;

  const update = () => {
    const isVisible = getComputedStyle(bar).display !== 'none';
    document.body.classList.toggle('recruit-fixed-cta-active', isVisible);
    document.body.style.setProperty(
      '--rfc-height',
      isVisible ? `${bar.offsetHeight}px` : '0px'
    );
  };

  update();
  window.addEventListener('resize', update, { passive: true });
})();
