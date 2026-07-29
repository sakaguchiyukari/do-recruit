/**
 * ライフラインサポート — DOM ヘルパー
 * -----------------------------------------------------------------------------
 * innerHTML に文字列を流し込む書き方は、データに記号が混ざったときに壊れるうえ
 * 意図しないタグを実行してしまう。このアプリでは要素生成をここに集約し、
 * テキストは必ず textContent 経由で入れる。
 */

/**
 * 要素をつくる。
 * @param {string} tag タグ名
 * @param {object} [props] class / text / html 以外は属性としてそのまま設定する
 * @param {(Node|string)[]} [children] 子要素
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  Object.entries(props).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;

    if (key === 'class') {
      node.className = value;
    } else if (key === 'text') {
      node.textContent = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([k, v]) => {
        node.dataset[k] = v;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, value);
    }
  });

  children.filter(Boolean).forEach((child) => {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  });

  return node;
}

/** 中身を空にする（innerHTML = '' より意図が明確で速い） */
export function clear(node) {
  while (node.firstChild) node.firstChild.remove();
}

export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/**
 * Google 検索へのリンクを組み立てる。
 * 公的機関のURLは改称・移転で変わることがあるため、
 * リンク切れの行き止まりを防ぐ「逃げ道」としてすべてのカードに添える。
 */
export const searchUrl = (query) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}`;
