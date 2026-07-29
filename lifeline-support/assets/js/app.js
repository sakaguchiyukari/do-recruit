/**
 * ライフラインサポート — ホーム画面のエントリ
 * -----------------------------------------------------------------------------
 * 実際の描画は pages/home.js にある。ここは初期化の呼び出しだけを担当する。
 */

import { initHome } from './pages/home.js';
import { initTheme } from './modules/theme.js';
import { initPwa } from './modules/pwa.js';
import { initStatusBar } from './modules/status-bar.js';

const boot = () => {
  initTheme();
  initStatusBar();
  initPwa();
  initHome();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
