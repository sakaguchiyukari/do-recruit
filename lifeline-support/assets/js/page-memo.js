/**
 * ライフラインサポート — 緊急メモのエントリ
 */

import { initMemo } from './pages/memo.js';
import { initTheme } from './modules/theme.js';
import { initPwa } from './modules/pwa.js';
import { initStatusBar } from './modules/status-bar.js';

const boot = () => {
  initTheme();
  initStatusBar();
  initPwa();
  initMemo();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
