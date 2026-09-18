/* ==========================================================================
   Recruit Float CTA
   - 一定量スクロールしたら追従バナーを表示する
   - 閉じたらそのセッション中は再表示しない
   ========================================================================== */
(() => {
  const cta = document.querySelector('.recruit-float-cta');
  if (!cta) return;

  /* 表示し始めるスクロール量（px） */
  const SHOW_FROM = 300;
  const STORAGE_KEY = 'recruitFloatCtaClosed';

  /* プライベートモード等でstorageが使えない場合に備える */
  const isClosed = () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  };

  const update = () => {
    cta.classList.toggle('is-visible', window.scrollY > SHOW_FROM);
  };

  if (isClosed()) {
    cta.classList.add('is-closed');
    return;
  }

  cta.querySelector('.recruit-float-cta__close')?.addEventListener('click', () => {
    cta.classList.add('is-closed');
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* 保存できない場合は今回の表示だけ閉じる */
    }
  });

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
