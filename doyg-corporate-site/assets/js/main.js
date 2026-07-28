/**
 * DO.YONEZAWA CORPORATE GROUP — Main Entry
 * -----------------------------------------------------------------------------
 * 各モジュールの初期化のみを担当する。ここにロジックを書かない。
 *
 * 全ページで同じ main.js を読み込むため、各モジュールは
 * 「対象要素が無ければ即 return する」という約束を守ること。
 *
 * Phase1（TOPページ）で有効化するモジュール：
 *   header / drawer / hero-video / sp-cta / smooth-anchor / scroll-reveal
 *
 * Phase3（アニメーション）で追加予定：
 *   parallax / count-up / news-filter
 */

import { initHeader } from './modules/header.js';
import { initDrawer } from './modules/drawer.js';
import { initHeroVideo } from './modules/hero-video.js';
import { initSpCta } from './modules/sp-cta.js';
import { initSmoothAnchor } from './modules/smooth-anchor.js';
import { initScrollReveal } from './modules/scroll-reveal.js';

/**
 * 全モジュールを初期化する。
 * 1つのモジュールが失敗しても他が止まらないよう、個別に例外を捕捉する。
 */
const boot = () => {
  // 起動できたことを知らせる。これが付かないと <head> の保険が働き、
  // アニメーションの初期状態（opacity:0）が解除されて内容が即表示される。
  document.documentElement.classList.add('js-booted');

  const modules = [
    ['header', initHeader],
    ['drawer', initDrawer],
    ['hero-video', initHeroVideo],
    ['sp-cta', initSpCta],
    ['smooth-anchor', initSmoothAnchor],
    ['scroll-reveal', initScrollReveal],
  ];

  modules.forEach(([name, init]) => {
    try {
      init();
    } catch (error) {
      // 1モジュールの失敗でページ全体を壊さない
      console.error(`[main] "${name}" の初期化に失敗しました`, error);
    }
  });
};

// DOM の準備状況に応じて即時 or DOMContentLoaded で起動する
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
