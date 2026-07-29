/**
 * ライフラインサポート — カードの描画
 * -----------------------------------------------------------------------------
 * ホーム・ライフハック集・リンク集で同じ見た目のカードを使う。
 * ここに描画を集約し、各ページは「どのデータを渡すか」だけを決める。
 */

import { el, searchUrl } from './dom.js';
import { bySituationId, byHouseholdId, byPrefectureId } from '../data/situations.js';

/**
 * 項目カード（対策・ライフハック・注意）を1枚つくる。
 *
 * kind が 'now' のときだけチェックボックスを付ける。
 * 「やった / まだ」が残ることが、混乱している最中のいちばんの助けになる。
 *
 * @param {object} item items.js の1件
 * @param {object} options
 * @param {boolean} options.done チェック済みか
 * @param {(id: string) => void} [options.onToggle] チェックの切り替え
 */
export function itemCard(item, { done = false, onToggle } = {}) {
  const tags = [
    ...item.situations.map((id) => bySituationId(id)),
    ...item.households.map((id) => byHouseholdId(id)),
  ]
    .filter(Boolean)
    .map((t) => el('span', { class: 'c-card__tag', text: `${t.icon} ${t.label}` }));

  const body = [
    el('span', { class: 'c-card__title', text: item.title }),
    el('span', { class: 'c-card__text', text: item.body }),
    tags.length ? el('span', { class: 'c-card__tags' }, tags) : null,
  ];

  const card = el('li', {
    class: `c-card c-card--${item.kind}${done ? ' is-done' : ''}`,
    dataset: { id: item.id, priority: String(item.priority) },
  });

  if (item.kind === 'now' && typeof onToggle === 'function') {
    const input = el('input', {
      type: 'checkbox',
      class: 'c-card__checkbox',
      id: `check-${item.id}`,
      checked: done,
      onChange: () => onToggle(item.id),
    });
    card.append(
      el('label', { class: 'c-card__inner c-card__inner--check', for: `check-${item.id}` }, [
        input,
        el('span', { class: 'c-card__mark', 'aria-hidden': 'true' }),
        el('span', { class: 'c-card__body' }, body),
      ])
    );
  } else {
    card.append(el('div', { class: 'c-card__inner' }, [el('div', { class: 'c-card__body' }, body)]));
  }

  return card;
}

/**
 * 外部リンクのカードを1枚つくる。
 *
 * URLが変わっていても行き止まりにならないよう、必ず検索リンクを添える。
 * 地域に依存するリンク（自治体・水道局・ガス会社）は、
 * 設定された市区町村名から検索URLを組み立てる。
 *
 * @param {object} link links.js の1件
 * @param {object} settings { prefecture, city }
 */
export function linkCard(link, settings = {}) {
  const pref = byPrefectureId(settings.prefecture);
  const city = (settings.city || '').trim();
  const prefLabel = pref ? pref.label : '';

  // 地域依存リンクの解決
  let href = link.url;
  let hint = '';

  if (!href && link.localSearch) {
    const place = city || prefLabel;
    if (place) {
      href = searchUrl(`${place} ${link.localSearch}`);
    } else {
      hint = '「地域を設定」しておくと、ここから直接ひらけます';
    }
  } else if (!href && link.prefSearch) {
    if (prefLabel) {
      href = searchUrl(`${prefLabel} ${link.prefSearch}`);
    } else {
      hint = '「地域を設定」しておくと、ここから直接ひらけます';
    }
  }

  const isTel = Boolean(link.tel);

  // 地域が設定されていれば「熊本市東区の水道局」のように具体的な名前にする。
  // 「お住まいの〜」のままでは、誰の窓口なのかが一目で分からないため。
  const place = city || prefLabel;
  const nameText =
    link.localName && place ? `${place}の${link.localName}` : link.name;

  const head = href
    ? el(
        'a',
        {
          class: `c-link__name${isTel ? ' c-link__name--tel' : ''}`,
          href,
          ...(isTel ? {} : { target: '_blank', rel: 'noopener noreferrer' }),
        },
        [
          el('span', { text: nameText }),
          el('span', {
            class: 'c-link__mark',
            'aria-hidden': 'true',
            text: isTel ? '☎' : '↗',
          }),
        ]
      )
    : el('span', { class: 'c-link__name c-link__name--disabled', text: nameText });

  const children = [
    settings.highlight
      ? el('p', { class: 'c-link__badge', text: '📍 あなたの地域の窓口' })
      : null,
    head,
    el('p', { class: 'c-link__note', text: link.note }),
  ].filter(Boolean);

  if (hint) {
    children.push(el('p', { class: 'c-link__hint', text: hint }));
  }

  if (link.search) {
    children.push(
      el(
        'a',
        {
          class: 'c-link__search',
          href: searchUrl(link.search),
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        ['🔎 検索して探す']
      )
    );
  }

  return el(
    'li',
    { class: `c-link${settings.highlight ? ' is-highlight' : ''}`, dataset: { id: link.id } },
    children
  );
}

/** 見出し（アイコン＋ラベル＋件数）をつくる */
export function sectionHead(icon, label, count, note) {
  return el('div', { class: 'c-head' }, [
    el('h2', { class: 'c-head__title' }, [
      el('span', { class: 'c-head__icon', 'aria-hidden': 'true', text: icon }),
      el('span', { text: label }),
      typeof count === 'number' ? el('span', { class: 'c-head__count', text: `${count}件` }) : null,
    ]),
    note ? el('p', { class: 'c-head__note', text: note }) : null,
  ]);
}

/** 何も選ばれていないときなどに出す空状態 */
export function emptyState(title, text) {
  return el('div', { class: 'c-empty' }, [
    el('p', { class: 'c-empty__title', text: title }),
    el('p', { class: 'c-empty__text', text: text }),
  ]);
}
