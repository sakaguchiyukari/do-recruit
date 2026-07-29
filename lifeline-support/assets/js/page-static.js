/**
 * ライフラインサポート — 文章だけのページ用エントリ
 * -----------------------------------------------------------------------------
 * 絞り込みも描画も必要ないページ（このアプリについて など）で、
 * 表示モード・現在の状況バー・オフライン対応だけを有効にする。
 */

import { initTheme } from './modules/theme.js';
import { initPwa } from './modules/pwa.js';
import { initStatusBar } from './modules/status-bar.js';

const boot = () => {
  initTheme();
  initStatusBar();
  initPwa();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
