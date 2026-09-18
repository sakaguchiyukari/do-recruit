/**
 * 採用サイト 追従バナー【SP版】
 * -----------------------------------------------------------------------------
 * ファーストビューを通過したらバナーをフェードインさせる。
 * scroll イベントではなく IntersectionObserver で監視し、計算コストを抑える。
 *
 * 読み込み例（必ず defer を付ける）:
 *   <script src="/wp-content/themes/swell_child/assets/recruit-fixbnr-sp.js" defer></script>
 */

(() => {
  'use strict';

  const BANNER_SELECTOR = '.js-recruit-fixbnr-sp';
  const SENTINEL_CLASS = 'recruit-fixbnr-sp__sentinel';
  const VISIBLE_CLASS = 'is-visible';

  /**
   * 表示切り替えの目印となる要素を body 先頭に生成する。
   * @returns {HTMLElement} 生成した目印要素
   */
  const createSentinel = () => {
    const sentinel = document.createElement('div');
    sentinel.className = SENTINEL_CLASS;
    sentinel.setAttribute('aria-hidden', 'true');
    document.body.prepend(sentinel);
    return sentinel;
  };

  /**
   * SP追従バナーの表示制御を初期化する。
   */
  const initFixedBanner = () => {
    const banner = document.querySelector(BANNER_SELECTOR);
    if (!banner) return;

    // 非対応ブラウザでは常時表示にして導線を失わせない
    if (!('IntersectionObserver' in window)) {
      banner.classList.add(VISIBLE_CLASS);
      return;
    }

    const sentinel = createSentinel();

    const observer = new IntersectionObserver(
      ([entry]) => {
        // 目印が画面外へ出た＝ファーストビューを通過した
        banner.classList.toggle(VISIBLE_CLASS, !entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFixedBanner);
  } else {
    initFixedBanner();
  }
})();
