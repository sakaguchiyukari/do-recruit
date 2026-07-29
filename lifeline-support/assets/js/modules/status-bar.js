/**
 * ライフラインサポート — 「現在の状況」バー
 * -----------------------------------------------------------------------------
 * 選択中の状況（停電中・断水中…）を全ページの上部に出す。
 * どのページを見ていても「自分が今どの状況にいるか」が視界に入り続けることが、
 * 情報を読み違えない一番の防波堤になる。
 */

import { el, clear } from './dom.js';
import { SITUATIONS, HOUSEHOLDS } from '../data/situations.js';
import { getState, subscribe } from './state.js';

function render(container) {
  const state = getState();
  clear(container);

  const situations = SITUATIONS.filter((s) => state.situations.includes(s.id)).sort(
    (a, b) => a.order - b.order
  );
  const households = HOUSEHOLDS.filter((h) => state.households.includes(h.id));

  if (situations.length === 0 && households.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.append(el('span', { class: 'c-status__label', text: '現在' }));

  situations.forEach((s) => {
    container.append(
      el('span', { class: 'c-status__chip', text: `${s.icon} ${s.statusLabel}` })
    );
  });

  households.forEach((h) => {
    container.append(
      el('span', { class: 'c-status__chip c-status__chip--household', text: `${h.icon} ${h.label}` })
    );
  });
}

export function initStatusBar() {
  const container = document.querySelector('[data-status-bar]');
  if (!container) return;

  render(container);
  subscribe(() => render(container));
}
