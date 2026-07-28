/**
 * Header（A9 Header Morph / A10 Header Hide）
 * -----------------------------------------------------------------------------
 * スクロール量に応じてヘッダーの見た目を変える。
 *  - 80px を超えたら白背景に切り替える（.is-scrolled）
 *  - 下スクロールで隠し、上スクロールで即座に戻す（.is-hidden）
 *
 * scroll イベントを直接リッスンする数少ない箇所のため、
 * 必ず rafThrottle を通して1フレーム1回までに抑える。
 */

import { rafThrottle } from './utils.js';

/** 白背景に切り替える閾値（px） */
const SCROLLED_THRESHOLD = 80;

/** 「下スクロール」と判定する最小移動量（px）。小刻みな揺れで反応させない */
const HIDE_DELTA = 8;

/** ヘッダーを隠し始める位置（Hero を抜けてから隠す） */
const HIDE_START = 240;

/**
 * ヘッダーのスクロール連動を初期化する。
 */
export const initHeader = () => {
  const header = document.querySelector('.js-header');
  if (!header) return;

  let lastScrollY = window.scrollY;

  const update = () => {
    const currentY = window.scrollY;

    // ---- 背景の切り替え ----
    header.classList.toggle('is-scrolled', currentY > SCROLLED_THRESHOLD);

    // ---- 表示 / 非表示 ----
    // ドロワーが開いている間は隠さない
    if (header.classList.contains('is-drawer-open')) {
      header.classList.remove('is-hidden');
      lastScrollY = currentY;
      return;
    }

    const delta = currentY - lastScrollY;

    if (currentY > HIDE_START && delta > HIDE_DELTA) {
      // 下方向へスクロール → 隠す
      header.classList.add('is-hidden');
    } else if (delta < -HIDE_DELTA || currentY <= HIDE_START) {
      // 上方向へスクロール、または最上部付近 → 戻す
      header.classList.remove('is-hidden');
    }

    lastScrollY = currentY;
  };

  // 初期状態を反映（リロード位置が途中だった場合に備える）
  update();

  window.addEventListener('scroll', rafThrottle(update), { passive: true });
};
