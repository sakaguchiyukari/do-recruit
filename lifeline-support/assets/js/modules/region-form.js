/**
 * ライフラインサポート — 地域設定フォーム
 * -----------------------------------------------------------------------------
 * ホームとリンク集の両方に置くため、共通部品として切り出している。
 * 都道府県を選ぶと一般送配電事業者が決まり、市区町村名を入れると
 * 自治体・水道局・ガス会社を探す検索リンクが自動で作られる。
 *
 * root を渡すとその中だけを探す。1つの画面に複数の版を並べる
 * （プレビュー版のような）場合でも取り違えない。
 */

import { el, qs } from './dom.js';
import { PREFECTURES, byPrefectureId } from '../data/situations.js';
import { getState, update } from './state.js';

/**
 * @param {ParentNode} root 探索範囲
 * @param {() => void} [onChange] 変更後に呼ばれる（一覧の再描画など）
 */
export function initRegionForm(root = document, onChange) {
  const select = qs('[data-prefecture]', root);
  const cityInput = qs('[data-city]', root);
  const note = qs('[data-region-note]', root);
  if (!select || !cityInput) return;

  // 二重初期化で選択肢が倍に増えるのを防ぐ
  if (select.options.length === 0) {
    select.append(el('option', { value: '', text: '選択してください' }));
    PREFECTURES.forEach((pref) => {
      select.append(el('option', { value: pref.id, text: pref.label }));
    });
  }

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
    if (onChange) onChange();
  });

  // 入力のたびに保存すると書き込みが多すぎるため、離れたときに保存する
  cityInput.addEventListener('change', () => {
    update({ city: cityInput.value.trim() });
    if (onChange) onChange();
  });
}
