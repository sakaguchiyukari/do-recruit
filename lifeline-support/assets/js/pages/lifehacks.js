/**
 * ライフラインサポート — ライフハック集
 * -----------------------------------------------------------------------------
 * ホームが「今の自分に必要なものだけ」を出すのに対して、
 * このページは全カテゴリを見渡すためにある。
 * 落ち着いているとき（＝備えるとき）に読まれることを想定している。
 */

import { el, clear, qs } from '../modules/dom.js';
import { SITUATIONS, HOUSEHOLDS, KINDS } from '../data/situations.js';
import { itemsByCategory } from '../data/items.js';
import { itemCard, sectionHead } from '../modules/render.js';

/** カテゴリ = 状況6件 + 世帯条件5件。並び順もこの順に固定する。 */
const LIFEHACK_CATEGORIES = [
  ...[...SITUATIONS].sort((a, b) => a.order - b.order),
  ...HOUSEHOLDS,
];

let currentCategory = 'all';

function buildCategoryChips(container, onSelect) {
  clear(container);

  const chip = (id, icon, label) =>
    el('li', {}, [
      el(
        'button',
        {
          type: 'button',
          class: `c-chip${currentCategory === id ? ' is-active' : ''}`,
          'aria-pressed': String(currentCategory === id),
          dataset: { category: id },
          onClick: () => onSelect(id),
        },
        [
          icon ? el('span', { 'aria-hidden': 'true', text: icon }) : null,
          el('span', { text: label }),
        ]
      ),
    ]);

  container.append(chip('all', '📚', 'すべて'));
  LIFEHACK_CATEGORIES.forEach((category) => {
    container.append(chip(category.id, category.icon, category.label));
  });
}

function buildLifehackSections(container) {
  clear(container);

  const targets =
    currentCategory === 'all'
      ? LIFEHACK_CATEGORIES
      : LIFEHACK_CATEGORIES.filter((c) => c.id === currentCategory);

  targets.forEach((category) => {
    const items = itemsByCategory(category.id);
    if (items.length === 0) return;

    // id は hack- で始める。リンク集の cat-<カテゴリ> と重ならないようにするため
    // （1ファイル版では両方が同じ画面に存在する）。
    const section = el('section', { class: 'p-category', id: `hack-${category.id}` });
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
      section.append(el('ul', { class: 'c-card-list' }, group.map((item) => itemCard(item))));
    });

    container.append(section);
  });
}

/**
 * @param {ParentNode} root ライフハック集のマークアップを含む範囲
 */
export function initLifehacks(root = document) {
  const chips = qs('[data-category-chips]', root);
  const sections = qs('[data-categories]', root);
  if (!sections) return;

  const select = (id) => {
    currentCategory = id;
    if (chips) buildCategoryChips(chips, select);
    buildLifehackSections(sections);
    // 絞り込み直後は一覧の先頭に視線を戻す
    sections.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  if (chips) buildCategoryChips(chips, select);
  buildLifehackSections(sections);
}
