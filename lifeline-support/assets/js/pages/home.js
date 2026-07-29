/**
 * ライフラインサポート — ホーム画面
 * -----------------------------------------------------------------------------
 * 「今困っていること」を選ぶと、その状況で優先度の高い対策だけが上から並ぶ。
 * ここがこのアプリの中心で、他のページは補助にすぎない。
 *
 * 描画の流れ
 *   1. 状況スイッチ・世帯条件・地域設定を組み立てる（1回だけ）
 *   2. 状態が変わるたびに結果を描き直す
 */

import { el, clear, qs } from '../modules/dom.js';
import { SITUATIONS, HOUSEHOLDS, KINDS, byPrefectureId } from '../data/situations.js';
import { filterItems } from '../data/items.js';
import { linksForSituations } from '../data/links.js';
import { itemCard, linkCard, sectionHead, emptyState } from '../modules/render.js';
import { initRegionForm } from '../modules/region-form.js';
import {
  getState,
  subscribe,
  toggleInList,
  toggleDone,
  clearDone,
  clearSelection,
  isPersistent,
} from '../modules/state.js';

/* ------------------------------------------------------------------ 選択UI */

/**
 * 大きなトグルスイッチを1つつくる。
 * チェックボックスを土台にしているので、キーボードでも読み上げでもそのまま動く。
 */
function toggleTile(item, { name, checked, onChange, modifier = '' }) {
  const id = `${name}-${item.id}`;
  const input = el('input', {
    type: 'checkbox',
    class: 'c-tile__input',
    id,
    checked,
    onChange: () => onChange(item.id),
  });

  return el('li', { class: 'c-tile-item' }, [
    input,
    el('label', { class: `c-tile${modifier}`, for: id }, [
      el('span', { class: 'c-tile__icon', 'aria-hidden': 'true', text: item.icon }),
      el('span', { class: 'c-tile__label', text: item.label }),
      el('span', { class: 'c-tile__state', 'aria-hidden': 'true' }),
    ]),
  ]);
}

function buildSituationGrid(container) {
  const state = getState();
  clear(container);
  [...SITUATIONS]
    .sort((a, b) => a.order - b.order)
    .forEach((situation) => {
      container.append(
        toggleTile(situation, {
          name: 'situation',
          checked: state.situations.includes(situation.id),
          onChange: (id) => toggleInList('situations', id),
        })
      );
    });
}

function buildHouseholdGrid(container) {
  const state = getState();
  clear(container);
  HOUSEHOLDS.forEach((household) => {
    container.append(
      toggleTile(household, {
        name: 'household',
        checked: state.households.includes(household.id),
        onChange: (id) => toggleInList('households', id),
        modifier: ' c-tile--sub',
      })
    );
  });
}

/* ------------------------------------------------------------------ 結果 */

function buildResults(container, summary) {
  const state = getState();
  clear(container);

  if (state.situations.length === 0) {
    if (summary) summary.textContent = '';
    container.append(
      emptyState(
        'まず、いま困っていることを選んでください',
        '選んだ状況に合わせて、優先度の高い対策だけを上から順に表示します。複数選ぶと、その組み合わせ専用の注意も出ます。'
      )
    );
    return;
  }

  const items = filterItems(state.situations, state.households);

  // 選択中の状況の要点を、結果の前にひとことずつ置く
  const leads = SITUATIONS.filter((s) => state.situations.includes(s.id)).sort(
    (a, b) => a.order - b.order
  );
  container.append(
    el(
      'ul',
      { class: 'p-lead' },
      leads.map((s) =>
        el('li', { class: 'p-lead__item' }, [
          el('span', { class: 'p-lead__icon', 'aria-hidden': 'true', text: s.icon }),
          el('span', { class: 'p-lead__text', text: s.lead }),
        ])
      )
    )
  );

  const nowItems = items.filter((i) => i.kind === 'now');
  const doneCount = nowItems.filter((i) => state.done[i.id]).length;
  if (summary) {
    summary.textContent = `${items.length}件の対策を表示中。今すぐやること ${nowItems.length}件のうち ${doneCount}件が完了しています。`;
  }

  KINDS.forEach((kind) => {
    const group = items.filter((item) => item.kind === kind.id);
    if (group.length === 0) return;

    const section = el('section', { class: `p-group p-group--${kind.id}` });
    section.append(sectionHead(kind.icon, kind.label, group.length, kind.note));

    if (kind.id === 'now' && nowItems.length > 0) {
      section.append(
        el('div', { class: 'p-progress' }, [
          el('div', { class: 'p-progress__bar' }, [
            el('div', {
              class: 'p-progress__fill',
              style: `width:${Math.round((doneCount / nowItems.length) * 100)}%`,
            }),
          ]),
          el('p', { class: 'p-progress__text', text: `${doneCount} / ${nowItems.length} 完了` }),
        ])
      );
    }

    section.append(
      el(
        'ul',
        { class: 'c-card-list' },
        group.map((item) =>
          itemCard(item, {
            done: Boolean(state.done[item.id]),
            onToggle: toggleDone,
          })
        )
      )
    );

    container.append(section);
  });
}

/* -------------------------------------------------------------- 困ったとき */

function buildQuickLinks(container) {
  const state = getState();
  clear(container);

  if (state.situations.length === 0) {
    container.hidden = true;
    return;
  }

  const pref = byPrefectureId(state.prefecture);
  const links = linksForSituations(state.situations, pref ? pref.power : '');
  if (links.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.append(
    sectionHead('🔗', '困ったとき（公式情報）', links.length, '外部サイトへ移動します。通信が必要です。')
  );
  container.append(
    el(
      'ul',
      { class: 'c-link-list' },
      links.map((link) => linkCard(link, { prefecture: state.prefecture, city: state.city }))
    )
  );
  container.append(
    el('p', { class: 'c-note' }, [
      '他の窓口は ',
      el('a', { href: 'links/', class: 'c-note__link', text: '公的機関リンク集' }),
      ' にまとめています。',
    ])
  );
}

/* ------------------------------------------------------------------ 初期化 */

/**
 * @param {ParentNode} root ホーム画面のマークアップを含む範囲
 */
export function initHome(root = document) {
  const situationGrid = qs('[data-situation-grid]', root);
  const householdGrid = qs('[data-household-grid]', root);
  const results = qs('[data-results]', root);
  const quickLinks = qs('[data-quick-links]', root);
  const summary = qs('[data-result-summary]', root);
  if (!situationGrid && !results) return;

  if (situationGrid) buildSituationGrid(situationGrid);
  if (householdGrid) buildHouseholdGrid(householdGrid);
  initRegionForm(root);

  const renderAll = () => {
    if (results) buildResults(results, summary);
    if (quickLinks) buildQuickLinks(quickLinks);
  };

  renderAll();
  subscribe(renderAll);

  const clearButton = qs('[data-clear]', root);
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearSelection();
      // トグルの見た目も戻す
      if (situationGrid) buildSituationGrid(situationGrid);
      if (householdGrid) buildHouseholdGrid(householdGrid);
    });
  }

  const clearDoneButton = qs('[data-clear-done]', root);
  if (clearDoneButton) {
    clearDoneButton.addEventListener('click', () => {
      if (window.confirm('チェックの記録を消します。よろしいですか？')) clearDone();
    });
  }

  // 保存できない環境（プライベートブラウズ等）では、その旨をはっきり伝える
  if (!isPersistent()) {
    const warn = qs('[data-storage-warning]', root);
    if (warn) warn.hidden = false;
  }
}
