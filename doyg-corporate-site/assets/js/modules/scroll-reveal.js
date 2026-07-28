/**
 * Scroll Reveal（A4 Fade Up / A5 Rule Draw / A6 Image Mask）
 * -----------------------------------------------------------------------------
 * IntersectionObserver で要素が画面に入ったら .is-revealed を付与する。
 *
 * 設計方針
 *  - 発火は1回のみ（unobserve する）。スクロールバックで再生し直さない。
 *  - stagger（連続要素の遅延）は JS の setTimeout ではなく、
 *    CSS カスタムプロパティ --i を渡して CSS 側で計算させる。
 *  - IntersectionObserver 非対応・モーション削減時は即座に全要素を表示する。
 *    コンテンツが読めない状態を絶対につくらない。
 */

import { prefersReducedMotion, supportsIntersectionObserver } from './utils.js';

/** 監視対象のセレクタ（A4 / A5 / A6 をまとめて扱う） */
const TARGET_SELECTOR = '.js-reveal, .js-rule, .js-mask';

/** 監視オプション */
const OBSERVER_OPTIONS = {
  root: null,
  // 画面下端より少し内側に入ってから発火させる。
  // 「見えた瞬間に動き出す」より「見えてから動く」ほうが落ち着いて見える
  rootMargin: '0px 0px -12% 0px',
  threshold: 0.15,
};

/**
 * 全対象要素を即座に表示済み状態にする（フォールバック）。
 *
 * @param {NodeListOf<HTMLElement>} targets 対象要素
 */
const revealAll = (targets) => {
  targets.forEach((element) => element.classList.add('is-revealed'));
};

/**
 * 同じ親を持つ連続要素に stagger 用のインデックスを割り当てる。
 * HTML 側で --i を明示している要素は上書きしない。
 *
 * @param {NodeListOf<HTMLElement>} targets 対象要素
 */
const assignStaggerIndex = (targets) => {
  /** @type {Map<HTMLElement, number>} 親要素ごとのカウンタ */
  const counters = new Map();

  targets.forEach((element) => {
    // data-reveal-stagger を持つ親の直下でのみ stagger を効かせる
    const group = element.closest('[data-reveal-stagger]');
    if (!group) return;

    // HTML 側で指定済みなら尊重する
    if (element.style.getPropertyValue('--i')) return;

    const current = counters.get(group) ?? 0;
    element.style.setProperty('--i', String(current));
    counters.set(group, current + 1);
  });
};

/**
 * スクロール連動の出現アニメーションを初期化する。
 */
export const initScrollReveal = () => {
  const targets = document.querySelectorAll(TARGET_SELECTOR);
  if (targets.length === 0) return;

  // 非対応環境・モーション削減時は最終状態で即表示する
  if (!supportsIntersectionObserver() || prefersReducedMotion()) {
    revealAll(targets);
    return;
  }

  assignStaggerIndex(targets);

  // 監視した要素 → 実際にクラスを付ける要素の対応表。
  // .js-mask は自分自身が clip-path で潰れているため、
  // 自分を監視しても交差率が 0 のままとなり永久に発火しない。
  // そこで親要素を監視し、クラスは本来の対象へ付ける。
  const watchMap = new WeakMap();

  const observer = new IntersectionObserver((entries, self) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const target = watchMap.get(entry.target) ?? entry.target;
      target.classList.add('is-revealed');
      // 一度出したら監視をやめる（ちらつきと無駄な計算を防ぐ）
      self.unobserve(entry.target);
    });
  }, OBSERVER_OPTIONS);

  targets.forEach((element) => {
    const isClipped = element.classList.contains('js-mask');
    const watched = (isClipped && element.parentElement) || element;

    if (watched !== element) watchMap.set(watched, element);
    observer.observe(watched);
  });
};
