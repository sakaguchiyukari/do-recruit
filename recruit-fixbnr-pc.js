/**
 * 採用サイト 追従バナー【PC版】
 * -----------------------------------------------------------------------------
 * ファーストビューを通過したら画面右からバナーをスライドインさせる。
 * scroll イベントではなく IntersectionObserver で監視し、計算コストを抑える。
 * 閉じるボタンを押したら、その表示中は再表示しない（sessionStorage に記録）。
 *
 * 読み込み例（必ず defer を付ける）:
 *   <script src="/wp-content/themes/swell_child/assets/recruit-fixbnr-pc.js" defer></script>
 */

(() => {
  'use strict';

  const BANNER_SELECTOR = '.js-recruit-fixbnr-pc';
  const CLOSE_SELECTOR = '.js-recruit-fixbnr-pc-close';
  const SENTINEL_CLASS = 'recruit-fixbnr-pc__sentinel';
  const VISIBLE_CLASS = 'is-visible';
  const CLOSED_CLASS = 'is-closed';
  const STORAGE_KEY = 'recruitFixbnrPcClosed';

  /**
   * 閉じた状態を sessionStorage から読み取る。
   * プライベートモード等で例外が出ても表示を止めない。
   * @returns {boolean} 閉じられていれば true
   */
  const isClosed = () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (error) {
      return false;
    }
  };

  /**
   * 閉じた状態を sessionStorage に保存する。
   */
  const saveClosed = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (error) {
      // 保存できない環境では記録しない（挙動は継続）
    }
  };

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
   * 閉じるボタンの挙動を設定する。
   * @param {HTMLElement} banner バナー要素
   * @param {IntersectionObserver|null} observer 監視インスタンス
   */
  const initCloseButton = (banner, observer) => {
    const closeButton = banner.querySelector(CLOSE_SELECTOR);
    if (!closeButton) return;

    closeButton.addEventListener('click', () => {
      banner.classList.add(CLOSED_CLASS);
      banner.classList.remove(VISIBLE_CLASS);
      saveClosed();
      if (observer) observer.disconnect();
    });
  };

  /**
   * PC追従バナーの表示制御を初期化する。
   */
  const initFixedBanner = () => {
    const banner = document.querySelector(BANNER_SELECTOR);
    if (!banner) return;

    // 同一セッション中に閉じられていれば表示しない
    if (isClosed()) {
      banner.classList.add(CLOSED_CLASS);
      return;
    }

    // 非対応ブラウザでは常時表示にして導線を失わせない
    if (!('IntersectionObserver' in window)) {
      banner.classList.add(VISIBLE_CLASS);
      initCloseButton(banner, null);
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
    initCloseButton(banner, observer);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFixedBanner);
  } else {
    initFixedBanner();
  }
})();
