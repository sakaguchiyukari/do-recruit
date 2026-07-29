/**
 * ライフラインサポート — 公的機関リンク集
 * -----------------------------------------------------------------------------
 * 災害時に「どこを見ればいいか分からない」が起きないよう、
 * 窓口をカテゴリごとに一覧化する。地域設定があれば、
 * 自治体・水道局・ガス会社のリンクがその地域向けに置き換わる。
 */

import { el, clear, qs } from '../modules/dom.js';
import { CATEGORIES, linksByCategory } from '../data/links.js';
import { byPrefectureId } from '../data/situations.js';
import { linkCard, sectionHead } from '../modules/render.js';
import { initRegionForm } from '../modules/region-form.js';
import { getState, subscribe } from '../modules/state.js';

let linkKeyword = '';

/** ページ内リンク（カテゴリへの目次） */
function buildLinkNav(container) {
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
function matchesKeyword(link) {
  if (!linkKeyword) return true;
  const haystack = `${link.name} ${link.note} ${link.search || ''}`.toLowerCase();
  return haystack.includes(linkKeyword.toLowerCase());
}

function buildLinkSections(container, summary) {
  const state = getState();
  clear(container);

  let total = 0;
  const pref = byPrefectureId(state.prefecture);
  const userPower = pref ? pref.power : '';

  CATEGORIES.forEach((category) => {
    let links = linksByCategory(category.id).filter(matchesKeyword);
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
      el('p', {
        class: 'c-empty__text',
        text: '該当する窓口がありませんでした。別のことばで探してみてください。',
      })
    );
  }

  if (summary) {
    summary.textContent = linkKeyword
      ? `「${linkKeyword}」に一致する窓口を ${total}件表示しています。`
      : `${total}件の窓口を表示しています。`;
  }
}

/**
 * @param {ParentNode} root リンク集のマークアップを含む範囲
 */
export function initLinks(root = document) {
  const nav = qs('[data-link-nav]', root);
  const sections = qs('[data-links]', root);
  const summary = qs('[data-link-summary]', root);
  const search = qs('[data-link-search]', root);
  if (!sections) return;

  const render = () => buildLinkSections(sections, summary);

  if (nav) buildLinkNav(nav);
  initRegionForm(root);
  render();
  subscribe(render);

  if (search) {
    search.addEventListener('input', () => {
      linkKeyword = search.value.trim();
      render();
    });
  }
}
