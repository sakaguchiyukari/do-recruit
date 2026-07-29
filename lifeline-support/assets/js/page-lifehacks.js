/**
 * ライフラインサポート — ライフハック集のエントリ
 */

import { initLifehacks } from './pages/lifehacks.js';
import { initTheme } from './modules/theme.js';
import { initPwa } from './modules/pwa.js';
import { initStatusBar } from './modules/status-bar.js';

const boot = () => {
  initTheme();
  initStatusBar();
  initPwa();
  initLifehacks();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
