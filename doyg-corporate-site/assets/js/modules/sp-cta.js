/**
 * SP Fixed CTA（A15）
 * -----------------------------------------------------------------------------
 * Hero を通過したらスマホ用の固定フッターCTAを表示する。
 * 監視対象は Hero そのもの。scroll イベントではなく
 * IntersectionObserver を使い、計算コストをゼロに近づける。
 */

import { supportsIntersectionObserver } from './utils.js';

/**
 * SP固定CTAの表示制御を初期化する。
 */
export const initSpCta = () => {
  const cta = document.querySelector('.js-sp-cta');
  const hero = document.querySelector('.js-hero');

  if (!cta || !hero) return;

  // 非対応環境では常に表示しておく（導線を失わせない）
  if (!supportsIntersectionObserver()) {
    cta.classList.add('is-visible');
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      // Hero が画面から外れたら表示、戻ってきたら隠す
      cta.classList.toggle('is-visible', !entry.isIntersecting);
    },
    {
      root: null,
      // Hero の下端が画面上端に達したタイミングで切り替える
      rootMargin: '0px',
      threshold: 0,
    }
  );

  observer.observe(hero);
};
