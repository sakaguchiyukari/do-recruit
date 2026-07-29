/**
 * ライフラインサポート — 表示モード
 * -----------------------------------------------------------------------------
 * ダークモードは好みの問題ではなく、停電時の実用機能として扱う。
 *   ・暗闇で明るい画面を見ると目が慣れず、周囲が見えなくなる
 *   ・有機ELでは黒い画面のほうが消費電力が小さい
 * そのため「省電力表示」を独立したスイッチとして用意している。
 */

import { getState, update } from './state.js';

const THEME_COLORS = {
  light: '#0f3b5c',
  dark: '#0a0f14',
};

/** <html> に属性を反映し、ブラウザUIの色も合わせる */
function apply(state) {
  const root = document.documentElement;
  root.dataset.theme = state.theme;
  root.dataset.saver = state.saver ? 'on' : 'off';

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = state.saver || state.theme === 'dark' || (state.theme === 'auto' && prefersDark);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? THEME_COLORS.dark : THEME_COLORS.light);
}

/**
 * 表示モードを初期化する。
 * 対象のボタンが無いページでも apply だけは行う（全ページで見た目を揃えるため）。
 */
export function initTheme() {
  apply(getState());

  // OS 側の設定変更にも追従する（theme が 'auto' のときだけ意味を持つ）
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    apply(getState());
  });

  const themeButtons = Array.from(document.querySelectorAll('[data-theme-value]'));
  const saverToggle = document.querySelector('[data-saver-toggle]');

  const sync = () => {
    const state = getState();
    themeButtons.forEach((button) => {
      const active = button.dataset.themeValue === state.theme;
      button.setAttribute('aria-pressed', String(active));
    });
    if (saverToggle) saverToggle.checked = state.saver;
    apply(state);
  };

  themeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      update({ theme: button.dataset.themeValue });
      sync();
    });
  });

  if (saverToggle) {
    saverToggle.addEventListener('change', () => {
      update({ saver: saverToggle.checked });
      sync();
    });
  }

  sync();
}
