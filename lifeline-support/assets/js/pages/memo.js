/**
 * ライフラインサポート — 緊急メモ
 * -----------------------------------------------------------------------------
 * 家族の連絡先・落ち合う場所・持病と薬を、この端末の中だけに保存する。
 * スマホの電池が持つ限り、通信がなくても開ける「紙の代わり」。
 *
 * ■ 扱いに関する約束
 *   ・入力内容はサーバーへ送らない（送信先が存在しない）
 *   ・端末を他人に渡すときは「保存内容を消す」で削除できる
 */

import { qs } from '../modules/dom.js';
import { getState, saveMemo, resetAll, isPersistent } from '../modules/state.js';

const FIELDS = ['contacts', 'meetup', 'medical', 'other'];

function formatUpdatedAt(iso) {
  if (!iso) return 'まだ保存されていません';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'まだ保存されていません';
  const pad = (n) => String(n).padStart(2, '0');
  return `最終更新 ${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * @param {ParentNode} root 緊急メモのマークアップを含む範囲
 */
export function initMemo(root = document) {
  const status = qs('[data-memo-status]', root);
  const form = qs('[data-memo-form]', root);
  if (!form) return;

  const inputs = {};
  FIELDS.forEach((field) => {
    const node = qs(`[data-memo="${field}"]`, root);
    if (!node) return;
    inputs[field] = node;
    node.value = getState().memo[field] || '';
  });

  if (status) status.textContent = formatUpdatedAt(getState().memo.updatedAt);

  if (!isPersistent()) {
    const warn = qs('[data-storage-warning]', root);
    if (warn) warn.hidden = false;
  }

  const collect = () => {
    const memo = {};
    FIELDS.forEach((field) => {
      if (inputs[field]) memo[field] = inputs[field].value;
    });
    return memo;
  };

  // 入力欄を離れたタイミングで自動保存する（保存ボタンの押し忘れを防ぐ）
  Object.values(inputs).forEach((node) => {
    node.addEventListener('change', () => {
      saveMemo(collect());
      if (status) status.textContent = formatUpdatedAt(getState().memo.updatedAt);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveMemo(collect());
    if (status) status.textContent = `保存しました（${formatUpdatedAt(getState().memo.updatedAt)}）`;
  });

  const resetButton = qs('[data-memo-reset]', root);
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      const ok = window.confirm(
        'この端末に保存されている内容（緊急メモ・状況の選択・チェックの記録・地域設定）をすべて消します。よろしいですか？'
      );
      if (!ok) return;
      resetAll();
      FIELDS.forEach((field) => {
        if (inputs[field]) inputs[field].value = '';
      });
      if (status) status.textContent = formatUpdatedAt('');
    });
  }
}
