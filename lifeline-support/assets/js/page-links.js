/**
 * ライフラインサポート — 公的機関リンク集のエントリ
 */

import { initLinks } from './pages/links.js';
import { initTheme } from './modules/theme.js';
import { initPwa } from './modules/pwa.js';
import { initStatusBar } from './modules/status-bar.js';

const boot = () => {
  initTheme();
  initStatusBar();
  initPwa();
  initLinks();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
