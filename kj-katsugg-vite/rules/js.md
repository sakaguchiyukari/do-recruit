# JavaScriptの書き方

## 基本

- 変数は `const` を基本にし、再代入するときだけ `let`。`var` は使わない
- イベントはHTMLの `onclick` 属性ではなく `addEventListener()` で登録する
- 納品前に `console.log` を消す

```javascript
// NG
<button onclick="openMenu()">メニュー</button>

// OK
const button = document.querySelector(".header__menu-button");
button.addEventListener("click", () => { ... });
```

## 要素の取得

- 要素が無い可能性がある場所では、取得できたか確認してから使う

```javascript
const menu = document.querySelector(".js-menu");
if (!menu) return;
```

- JSから触る要素には `js-` を付けたクラスを使うと、見た目のクラスと役割が混ざらない

## ファイルの置き場所

`js/script.js` に書きます。読み込みは `index.html` の `<script type="module">` で済んでいるので、追記は不要です。

## アニメーション・動きをつけるとき

- 動きの速さや繰り返しの有無は、デザインからは読み取れません。**依頼者に確認してから実装します**
- `prefers-reduced-motion`（動きを減らす設定）に配慮する

## アコーディオン・モーダル

自作せず、まずHTMLの標準機能を検討します。

- アコーディオン → `<details>` + `<summary>`
- モーダル → `<dialog>` + `showModal()`

標準機能を使うと、キーボード操作や閉じる動作が最初から付いてきます。
