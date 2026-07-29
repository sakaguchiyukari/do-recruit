/**
 * ライフラインサポート — 状態管理
 * -----------------------------------------------------------------------------
 * 利用者の選択（状況・世帯条件・地域・チェック済み項目・緊急メモ）を
 * localStorage に保存する。サーバーには一切送信しない。
 *
 * ■ 設計方針
 *   ・localStorage が使えない環境（プライベートブラウズ等）でも
 *     アプリが落ちないよう、メモリ上の保存にフォールバックする。
 *   ・保存キーにはバージョンを含める。構造を変えるときはキーを上げ、
 *     古いデータを読み違えないようにする。
 *   ・購読（subscribe）で画面を更新する。DOM の更新はここでは行わない。
 */

const STORAGE_KEY = 'lifeline-support.v1';

/** 初期状態。保存データに欠けたキーがあってもここで補われる。 */
const DEFAULT_STATE = {
  situations: [],   // 選択中の状況 id
  households: [],   // 選択中の世帯条件 id
  prefecture: '',   // 都道府県 id
  city: '',         // 市区町村名（自由入力・検索リンクの生成に使う）
  done: {},         // { [itemId]: true } チェック済みの「今すぐやること」
  theme: 'auto',    // 'auto' | 'light' | 'dark'
  saver: false,     // 省電力表示モード
  memo: {
    contacts: '',   // 家族・親族の連絡先
    meetup: '',     // 落ち合う場所
    medical: '',    // 持病・常用薬・かかりつけ医
    other: '',      // その他（保険証番号のメモなど）
    updatedAt: '',
  },
};

/** localStorage が使えないときの代替。ページを閉じるまでは保持される。 */
let memoryFallback = null;

const canUseStorage = (() => {
  try {
    const probe = '__lls_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
})();

/** 保存データと初期値をマージする。memo は入れ子なので個別に扱う。 */
const merge = (saved) => ({
  ...DEFAULT_STATE,
  ...saved,
  memo: { ...DEFAULT_STATE.memo, ...(saved && saved.memo) },
});

const read = () => {
  if (!canUseStorage) return merge(memoryFallback);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return merge(raw ? JSON.parse(raw) : null);
  } catch {
    // 壊れたJSONが入っていても初期状態で起動する
    return merge(null);
  }
};

let state = read();
const listeners = new Set();

const write = () => {
  if (!canUseStorage) {
    memoryFallback = state;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 容量超過などで保存できなくても、画面の動作は続ける
    memoryFallback = state;
  }
};

/** 現在の状態（読み取り専用のつもりで扱うこと） */
export const getState = () => state;

/** 保存が有効かどうか。UIで「保存されません」と伝えるために使う。 */
export const isPersistent = () => canUseStorage;

/**
 * 状態を部分更新して保存し、購読者に通知する。
 * @param {object} patch 上書きしたいキーだけを持つオブジェクト
 */
export function update(patch) {
  state = { ...state, ...patch };
  write();
  listeners.forEach((fn) => fn(state));
}

/**
 * 状態の変化を購読する。
 * @param {(state: object) => void} fn
 * @returns {() => void} 購読解除
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 配列型の項目（situations / households）を1件トグルする */
export function toggleInList(key, id) {
  const list = state[key] || [];
  const next = list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
  update({ [key]: next });
}

/** 「今すぐやること」のチェックを1件トグルする */
export function toggleDone(itemId) {
  const done = { ...state.done };
  if (done[itemId]) {
    delete done[itemId];
  } else {
    done[itemId] = true;
  }
  update({ done });
}

/** チェック済みの記録だけを消す（状況の選択は残す） */
export function clearDone() {
  update({ done: {} });
}

/** 状況と世帯条件の選択をすべて解除する */
export function clearSelection() {
  update({ situations: [], households: [] });
}

/** 緊急メモを保存する。更新日時も一緒に記録する。 */
export function saveMemo(memo) {
  update({
    memo: {
      ...state.memo,
      ...memo,
      updatedAt: new Date().toISOString(),
    },
  });
}

/** この端末に保存されているデータをすべて消す */
export function resetAll() {
  state = merge(null);
  memoryFallback = null;
  if (canUseStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 消せなくても初期状態には戻っている */
    }
  }
  listeners.forEach((fn) => fn(state));
}
