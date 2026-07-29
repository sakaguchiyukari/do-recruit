/**
 * ライフラインサポート — ライフハック集ページ
 * -----------------------------------------------------------------------------
 * ホームが「今の自分に必要なものだけ」を出すのに対して、
 * このページは全カテゴリを見渡すためにある。
 * 落ち着いているとき（＝備えるとき）に読まれることを想定している。
 */

import { el, clear, qs } from './modules/dom.js';
import { SITUATIONS, HOUSEHOLDS, KINDS } from './data/situations.js';
import { itemsByCategory } from './data/items.js';
import { itemCard, sectionHead } from './modules/render.js';
import { initTheme } from './modules/theme.js';
import { initPwa } from './modules/pwa.js';
import { initStatusBar } from './modules/status-bar.js';

/** カテゴリ = 状況6件 + 世帯条件5件。並び順もこの順に固定する。 */
const CATEGORIES = [
  ...[...SITUATIONS].sort((a, b) => a.order - b.order),
  ...HOUSEHOLDS,
];

let current = 'all';

function buildChips(container, onSelect) {
  clear(container);

  const chip = (id, icon, label) =>
    el('li', {}, [
      el('button', {
        type: 'button',
        class: `c-chip${current === id ? ' is-active' : ''}`,
        'aria-pressed': String(current === id),
        dataset: { category: id },
        onClick: () => onSelect(id),
      }, [
        icon ? el('span', { 'aria-hidden': 'true', text: icon }) : null,
        el('span', { text: label }),
      ]),
    ]);

  container.append(chip('all', '📚', 'すべて'));
  CATEGORIES.forEach((category) => {
    container.append(chip(category.id, category.icon, category.label));
  });
}

function buildSections(container) {
  clear(container);

  const targets = current === 'all' ? CATEGORIES : CATEGORIES.filter((c) => c.id === current);

  targets.forEach((category) => {
    const items = itemsByCategory(category.id);
    if (items.length === 0) return;

    const section = el('section', { class: 'p-category', id: `cat-${category.id}` });
    section.append(sectionHead(category.icon, category.label, items.length, category.lead));

    KINDS.forEach((kind) => {
      const group = items.filter((item) => item.kind === kind.id);
      if (group.length === 0) return;

      section.append(
        el('h3', { class: 'p-category__kind' }, [
          el('span', { 'aria-hidden': 'true', text: kind.icon }),
          el('span', { text: kind.label }),
        ])
      );
      section.append(
        el('ul', { class: 'c-card-list' }, group.map((item) => itemCard(item)))
      );
    });

    container.append(section);
  });
}

function boot() {
  initTheme();
  initStatusBar();
  initPwa();

  const chips = qs('[data-category-chips]');
  const sections = qs('[data-categories]');
  if (!sections) return;

  const select = (id) => {
    current = id;
    if (chips) buildChips(chips, select);
    buildSections(sections);
    // 絞り込み直後は一覧の先頭に視線を戻す
    sections.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  if (chips) buildChips(chips, select);
  buildSections(sections);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
