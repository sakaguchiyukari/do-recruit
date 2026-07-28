/**
 * Utils
 * -----------------------------------------------------------------------------
 * 各モジュールから共通で使うヘルパー群。
 * 外部ライブラリは一切使用しない。
 */

/**
 * requestAnimationFrame でコールバックを間引く。
 * scroll / resize のような高頻度イベントに必ず噛ませること。
 *
 * @param {Function} callback 実行したい処理
 * @returns {Function} 間引き済みのハンドラ
 */
export const rafThrottle = (callback) => {
  let requestId = null;

  return (...args) => {
    // 前回のフレームがまだ描画されていなければ何もしない
    if (requestId !== null) return;

    requestId = window.requestAnimationFrame(() => {
      requestId = null;
      callback(...args);
    });
  };
};

/**
 * 指定ミリ秒だけ呼び出しを遅らせる（連続呼び出しは最後の1回のみ実行）。
 *
 * @param {Function} callback 実行したい処理
 * @param {number} wait 待機時間（ミリ秒）
 * @returns {Function} 遅延実行されるハンドラ
 */
export const debounce = (callback, wait = 200) => {
  let timerId = null;

  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => callback(...args), wait);
  };
};

/**
 * ユーザーがモーション削減を希望しているかを返す。
 * CSS 側でも @media で無効化しているが、JS 側でも判定して
 * 計算処理そのものを実行しないようにする（CPU負荷の削減）。
 *
 * @returns {boolean} 削減を希望していれば true
 */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 通信量の節約が要求されているかを返す。
 * SPでの動画読み込みを抑制する判定に使う。
 *
 * @returns {boolean} 節約が要求されていれば true
 */
export const prefersReducedData = () => {
  const connection = navigator.connection;
  if (!connection) return false;

  // Save-Data ヘッダー、または低速回線の場合は節約する
  return (
    connection.saveData === true ||
    /(^|-)2g$/.test(connection.effectiveType ?? '')
  );
};

/**
 * IntersectionObserver が利用できるかを返す。
 * 非対応環境ではアニメーションを諦め、コンテンツを即表示する。
 *
 * @returns {boolean} 利用可能なら true
 */
export const supportsIntersectionObserver = () =>
  'IntersectionObserver' in window;

/**
 * 要素内のフォーカス可能な要素をすべて取得する。
 * ドロワーのフォーカストラップで使用する。
 *
 * @param {HTMLElement} container 探索対象
 * @returns {HTMLElement[]} フォーカス可能な要素の配列
 */
export const getFocusableElements = (container) => {
  const SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll(SELECTOR)).filter(
    // 非表示の要素は対象外にする
    (element) => element.offsetParent !== null || element === document.activeElement
  );
};
