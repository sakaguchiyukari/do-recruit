/**
 * Smooth Anchor
 * -----------------------------------------------------------------------------
 * ページ内アンカーのみスムーススクロールさせる。
 * html { scroll-behavior: smooth } を全体に指定すると、
 * ブラウザバックや検索ジャンプまで滑ってしまい体験を損なうため、
 * アンカークリック時のみ明示的に適用する。
 *
 * スクロール完了後に対象へフォーカスを移すことで、
 * キーボード利用者が移動先から読み進められるようにする（WCAG 2.4.3）。
 */

import { prefersReducedMotion } from './utils.js';

/**
 * ページ内アンカーのスムーススクロールを初期化する。
 */
export const initSmoothAnchor = () => {
  const anchors = document.querySelectorAll('a[href^="#"]:not([href="#"])');
  if (anchors.length === 0) return;

  anchors.forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const id = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();

      target.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });

      // 移動先にフォーカスを移す。
      // 見出しなどは通常フォーカスできないため一時的に tabindex を与える
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });

      // URL を更新する（履歴は汚さない）
      window.history.replaceState(null, '', `#${id}`);
    });
  });
};
