/**
 * Hero Video（A1 Hero Reveal / A2 Hero Zoom）
 * -----------------------------------------------------------------------------
 * 責務：
 *  - 条件を満たす環境でのみ Hero 動画を「生成して」読み込む
 *      × 768px 未満（通信量への配慮。poster 画像のみ表示）
 *      × Save-Data / 低速回線
 *      × prefers-reduced-motion: reduce
 *  - 再生/停止ボタンを提供する（WCAG 2.2.2 一時停止・停止・非表示）
 *  - .is-loaded を付けてキャッチコピーのフェードインを開始する
 *
 * 設計上の判断：
 *   <video> を HTML に直接書かず、JS で生成する。
 *   HTML に置いたままだと JS 無効環境で「再生できない動画」として
 *   ブラウザ既定のメディアUIが出てしまい、Hero の見た目が壊れるため。
 *   再生可能（canplay）になって初めて DOM に挿入するので、
 *   読み込み中や失敗時は poster 画像がそのまま背景として残る。
 */

import { prefersReducedData, prefersReducedMotion } from './utils.js';

/** 動画を読み込む最小ビューポート幅（px） */
const MIN_WIDTH_FOR_VIDEO = 768;

/**
 * 背景動画の要素を生成する。
 *
 * @param {Record<string, string>} sources { 'video/webm': url, 'video/mp4': url }
 * @returns {HTMLVideoElement} 生成した video 要素（まだ DOM には未挿入）
 */
const createVideo = (sources) => {
  const video = document.createElement('video');
  video.className = 'p-hero__media js-hero-video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  // 装飾目的の背景動画なので支援技術からは隠す
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;

  Object.entries(sources).forEach(([type, src]) => {
    const source = document.createElement('source');
    source.src = src;
    source.type = type;
    video.appendChild(source);
  });

  return video;
};

/**
 * 再生 / 停止ボタンを配線する。
 *
 * @param {HTMLElement} toggle ボタン要素
 * @param {HTMLVideoElement} video 対象の動画
 */
const bindToggle = (toggle, video) => {
  toggle.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      toggle.dataset.state = 'playing';
      toggle.setAttribute('aria-label', '背景動画を停止する');
    } else {
      video.pause();
      toggle.dataset.state = 'paused';
      toggle.setAttribute('aria-label', '背景動画を再生する');
    }
  });
};

/**
 * Hero の動画制御を初期化する。
 */
export const initHeroVideo = () => {
  const hero = document.querySelector('.js-hero');
  if (!hero) return;

  // キャッチコピーのフェードインは動画の成否に関わらず必ず開始する
  hero.classList.add('is-loaded');

  const webm = hero.dataset.videoWebm;
  const mp4 = hero.dataset.videoMp4;

  // 動画のURLが指定されていなければ poster 画像のみで完結する
  if (!webm && !mp4) return;

  // ---- 動画を読み込まない条件 ----
  if (
    window.innerWidth < MIN_WIDTH_FOR_VIDEO ||
    prefersReducedData() ||
    prefersReducedMotion()
  ) {
    return;
  }

  const sources = {};
  if (webm) sources['video/webm'] = webm;
  if (mp4) sources['video/mp4'] = mp4;

  const video = createVideo(sources);
  const bg = hero.querySelector('.p-hero__bg');
  const overlay = hero.querySelector('.p-hero__overlay');
  const toggle = hero.querySelector('.js-hero-video-toggle');

  // 再生できる状態になってから初めて DOM へ挿入する。
  // 失敗した場合は何も挿入されず、poster 画像が背景として残る。
  video.addEventListener(
    'canplay',
    () => {
      bg.insertBefore(video, overlay);
      hero.classList.add('has-video');

      video.play().catch(() => {
        // 自動再生が拒否された場合は静止画へ戻す
        video.remove();
        hero.classList.remove('has-video');
      });

      if (toggle) bindToggle(toggle, video);
    },
    { once: true }
  );

  video.load();
};
