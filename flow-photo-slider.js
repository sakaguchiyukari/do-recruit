/**
 * フローティング写真スライダー（左へ無限ループ）
 * SWELL WordPress テーマ用
 *
 * 機能:
 * - 行の中身を1セット複製し、translateX(-50%) のシームレスループを成立させる
 * - 100vw とスクロールバー幅の差を実測し、横スクロールバーの発生を防ぐ
 * - prefers-reduced-motion: reduce の場合は複製もアニメーションも行わない
 *
 * 読み込み方法:
 *   wp_enqueue_script(..., true) もしくは <script defer src="..."> で読み込む
 */

(() => {
  'use strict';

  const ROW_SELECTOR = '.dy-flow__row';
  const SBW_PROPERTY = '--dy-flow-sbw';

  /**
   * スクロールバー幅をCSS変数へ反映する
   * 100vw はスクロールバー幅を含むため、そのまま使うと
   * PCで横スクロールバーが発生する。実測値を差し引いて防ぐ
   */
  const updateScrollbarWidth = () => {
    const width = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty(SBW_PROPERTY, `${Math.max(width, 0)}px`);
  };

  /**
   * 行の中身を1セット複製し、シームレスな無限ループを成立させる
   * @param {HTMLElement} row
   */
  const duplicateRow = (row) => {
    if (row.dataset.dyFlowReady === 'true') return; // 二重複製ガード

    const fragment = document.createDocumentFragment();
    Array.from(row.children).forEach((item) => {
      fragment.appendChild(item.cloneNode(true));
    });
    row.appendChild(fragment);

    // 複製が終わってからアニメーションを開始させる
    row.dataset.dyFlowReady = 'true';
  };

  const init = () => {
    updateScrollbarWidth();

    // モーション低減設定時はループさせない（CSS側で横スクロール可能にする）
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll(ROW_SELECTOR).forEach(duplicateRow);
  };

  // リサイズ時のスクロールバー幅再計算（rAFで間引く）
  let resizeTicking = false;
  const handleResize = () => {
    if (resizeTicking) return;
    resizeTicking = true;
    window.requestAnimationFrame(() => {
      updateScrollbarWidth();
      resizeTicking = false;
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('resize', handleResize, { passive: true });
})();
