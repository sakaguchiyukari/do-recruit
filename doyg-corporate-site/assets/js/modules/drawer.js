/**
 * Drawer（A14 フルスクリーンメニュー）
 * -----------------------------------------------------------------------------
 * アクセシビリティ要件：
 *  - aria-expanded / aria-controls でボタンとパネルの関係を伝える
 *  - 開いている間は Tab がパネル外へ出ない（フォーカストラップ）
 *  - Esc で閉じられる
 *  - 閉じたらフォーカスをトリガーボタンへ戻す
 *  - 背面のスクロールを止める
 *  - 閉じている間は inert で支援技術からも隠す
 */

import { getFocusableElements } from './utils.js';

/**
 * フルスクリーンメニューを初期化する。
 */
export const initDrawer = () => {
  const trigger = document.querySelector('.js-drawer-trigger');
  const drawer = document.querySelector('.js-drawer');
  const header = document.querySelector('.js-header');

  if (!trigger || !drawer) return;

  let isOpen = false;

  /**
   * パネル内で Tab を循環させる。
   *
   * @param {KeyboardEvent} event キーイベント
   */
  const trapFocus = (event) => {
    if (event.key !== 'Tab') return;

    // トリガーボタン（ヘッダー内の×ボタン）も循環に含める
    const focusables = [trigger, ...getFocusableElements(drawer)];
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  /**
   * Esc キーで閉じる。
   *
   * @param {KeyboardEvent} event キーイベント
   */
  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    trapFocus(event);
  };

  /** メニューを開く */
  const open = () => {
    isOpen = true;
    drawer.classList.add('is-open');
    drawer.removeAttribute('inert');
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', 'メニューを閉じる');
    header?.classList.add('is-drawer-open');
    document.documentElement.classList.add('is-drawer-locked');

    document.addEventListener('keydown', handleKeydown);

    // 最初のリンクへフォーカスを移す
    const [firstLink] = getFocusableElements(drawer);
    firstLink?.focus();
  };

  /** メニューを閉じる */
  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    drawer.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'メニューを開く');
    header?.classList.remove('is-drawer-open');
    document.documentElement.classList.remove('is-drawer-locked');

    document.removeEventListener('keydown', handleKeydown);

    // 閉じアニメーションの完了後に支援技術から隠す
    window.setTimeout(() => {
      if (!isOpen) drawer.setAttribute('inert', '');
    }, 800);

    // フォーカスをトリガーへ戻す（WCAG 2.4.3 フォーカス順序）
    trigger.focus();
  };

  trigger.addEventListener('click', () => {
    isOpen ? close() : open();
  });

  // パネル内のリンクを踏んだら閉じる（同一ページ内アンカーのため）
  drawer.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  // 初期状態：閉じている＝支援技術からも隠す
  drawer.setAttribute('inert', '');
  trigger.setAttribute('aria-expanded', 'false');
};
