/**
 * ライフラインサポート — 公的機関リンク集ページ
 * -----------------------------------------------------------------------------
 * 災害時に「どこを見ればいいか分からない」が起きないよう、
 * 窓口をカテゴリごとに一覧化する。地域設定があれば、
 * 自治体・水道局・ガス会社のリンクがその地域向けに置き換わる。
 */

import { el, clear, qs } from './modules/dom.js';
import { CATEGORIES, linksByCategory } from './data/links.js';
import { PREFECTURES, byPrefectureId } from './data/situations.js';

import { linkCard, sectionHead } from './modules/render.js';
import { getState, update, subscribe } from './modules/state.js';
import { initTheme } from './modules/theme.js';
import { initPwa } from './modules/pwa.js';
import { initStatusBar } from './modules/status-bar.js';

let keyword = '';

/** ページ内リンク（カテゴリへの目次） */
function buildNav(container) {
  clear(container);
  CATEGORIES.forEach((category) => {
    container.append(
      el('li', {}, [
        el('a', { class: 'c-chip', href: `#cat-${category.id}` }, [
          el('span', { 'aria-hidden': 'true', text: category.icon }),
          el('span', { text: category.label }),
        ]),
      ])
    );
  });
}

/** キーワードは名称・説明・検索語のいずれかに含まれていればヒットとする */
function matches(link) {
  if (!keyword) return true;
  const haystack = `${link.name} ${link.note} ${link.search || ''}`.toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function buildSections(container, summary) {
  const state = getState();
  clear(container);

  let total = 0;
  const pref = byPrefectureId(state.prefecture);
  const userPower = pref ? pref.power : '';

  CATEGORIES.forEach((category) => {
    let links = linksByCategory(category.id).filter(matches);
    if (links.length === 0) return;
    total += links.length;

    // 自分の地域の電力会社を先頭に出す。10社の中から探させない。
    if (userPower) {
      links = [...links].sort(
        (a, b) => (b.power === userPower ? 1 : 0) - (a.power === userPower ? 1 : 0)
      );
    }

    const section = el('section', { class: 'p-category', id: `cat-${category.id}` });
    section.append(sectionHead(category.icon, category.label, links.length, category.lead));
    section.append(
      el(
        'ul',
        { class: 'c-link-list' },
        links.map((link) =>
          linkCard(link, {
            prefecture: state.prefecture,
            city: state.city,
            highlight: Boolean(userPower) && link.power === userPower,
          })
        )
      )
    );
    container.append(section);
  });

  if (total === 0) {
    container.append(
      el('p', { class: 'c-empty__text', text: '該当する窓口がありませんでした。別のことばで探してみてください。' })
    );
  }

  if (summary) {
    summary.textContent = keyword
      ? `「${keyword}」に一致する窓口を ${total}件表示しています。`
      : `${total}件の窓口を表示しています。`;
  }
}

/** このページにも地域設定を置く（ホームに戻らなくても変えられるように） */
function buildRegionForm(onChange) {
  const select = qs('[data-prefecture]');
  const cityInput = qs('[data-city]');
  const note = qs('[data-region-note]');
  if (!select || !cityInput) return;

  select.append(el('option', { value: '', text: '選択してください' }));
  PREFECTURES.forEach((pref) => {
    select.append(el('option', { value: pref.id, text: pref.label }));
  });

  const syncNote = () => {
    if (!note) return;
    const pref = byPrefectureId(getState().prefecture);
    note.textContent = pref && pref.note ? `※ ${pref.note}` : '';
  };

  select.value = getState().prefecture;
  cityInput.value = getState().city;
  syncNote();

  select.addEventListener('change', () => {
    update({ prefecture: select.value });
    syncNote();
    onChange();
  });

  cityInput.addEventListener('change', () => {
    update({ city: cityInput.value.trim() });
    onChange();
  });
}

function boot() {
  initTheme();
  initStatusBar();
  initPwa();

  const nav = qs('[data-link-nav]');
  const sections = qs('[data-links]');
  const summary = qs('[data-link-summary]');
  const search = qs('[data-link-search]');
  if (!sections) return;

  const render = () => buildSections(sections, summary);

  if (nav) buildNav(nav);
  buildRegionForm(render);
  render();
  subscribe(render);

  if (search) {
    search.addEventListener('input', () => {
      keyword = search.value.trim();
      render();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
