# HTMLの書き方

## 基本

- 意味に合ったタグを使う（`<header>` `<main>` `<section>` `<footer>` `<nav>` など）
- `<h1>` は1ページに1つ。見出しの階層を飛ばさない（h2の次にh4を置かない）
- キャッチコピーは見出しにせず `<p>` で書く
- 余白の調整に `<br>` を使わない（デザイン上の改行位置を再現する `<br>` はOK）

## 画像

```html
<img src="./images/photo.jpg" alt="説明" width="1200" height="800" loading="lazy">
```

- `alt` は必須。装飾目的の画像でも `alt=""` と書く
- `width` と `height` を入れる（読み込み時のガタつき防止）
- ファーストビュー以外の画像には `loading="lazy"`
- 内容を伝える画像は `<figure>` で囲む

WebPを使う書き方は `rules/images.md` を参照。

## リンク

- 外部リンクには `target="_blank"` と `rel="noopener noreferrer"` を付ける
- 電話番号は `<a href="tel:...">`、住所や電話番号は `<address>` で囲む

## フォーム

- 入力欄には必ず `<label>` を関連付ける

## CSSとJSの読み込み

このテンプレートでは `index.html` から直接 `.scss` を読み込みます（Viteが変換します）。

```html
<head>
  <link rel="stylesheet" href="./sass/styles.scss">
  <script type="module" src="./js/script.js" defer></script>
</head>
```

- scriptタグは `<head>` 内に `defer` 付きで置く（`</body>` 直前には置かない）
- `type="module"` はViteが処理するために必要。JSファイルを追加するときも同じ形で `<head>` に追加する
- パスは相対パス（`./`）で書きます。

## ページを増やすとき

下層ページは `ページ名/index.html` の形で作ります（例: `about/index.html` → `/about/`）。作ったら `vite.config.js` の `rollupOptions.input` に追記が必要です。

## クラス名

Sassと揃えてBEMで書きます（`rules/sass.md` 参照）。`.cardTitle` のようなcamelCaseは使いません。
