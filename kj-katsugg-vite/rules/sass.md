# Sassの書き方

## 3層構造

| フォルダ | 役割 | 扱い |
|---|---|---|
| `sass/base/` | リセット・土台の設定 | 基本そのまま |
| `sass/global/` | 変数・関数・mixin（スタイルは出力しない） | 変数の値は案件に合わせて変更してよい |
| `sass/module/` | パーツごとのスタイル | **ここに追加していく** |

入口は `sass/styles.scss`。`base` と `module` を束ねているだけなので、基本さわりません。

## パーツの追加

`sass/module/_パーツ名.scss` を作り、先頭に必ずこれを書きます。

```scss
@use "../global" as *;
```

これがないと変数もmixinも使えずエラーになります。

**`_index.scss` は自動生成されるので手で編集しません。** ファイルを置けば `@forward` は仕組みが書きます。

## BEM記法

- Block: `.card` / Element: `.card__title` / Modifier: `.card--large`
- 孫Elementは作らない: `.card__body__title` → `.card__body-title`
- `&` でElementを結合しない（検索できなくなるため）

```scss
// NG
.card {
  &__title { ... }
}

// OK
.card__title { ... }
```

`&:hover` や `&::before` のような疑似クラス・疑似要素の結合はOKです。

**1ファイルに1Block**。別のBlockを書くときは別ファイルを作ります。

## 変数を使う

色・フォント・幅はベタ書きせず、`sass/global/_variables.scss` の変数を使います。

```scss
// NG
color: #3d7a8a;

// OK
color: $color-accent;
```

用意されている主な変数:

| 変数 | 用途 |
|---|---|
| `$color-accent` / `$color-text` / `$color-white` / `$color-bg` / `$color-border` | 色 |
| `$fw-normal` / `$fw-bold` | フォントの太さ |
| `$inner` | コンテンツの横幅 |
| `$padding-pc` / `$padding-sp` | 左右の余白 |
| `$breakpoints` | ブレイクポイント（sm / md / lg / xl） |

色を足したいときは `_variables.scss` に追加してから使います。

## サイズはremに変換する

```scss
padding: to-rem(24);      // 24px 相当
font-size: to-rem(16);
```

`border-width` や `box-shadow` の細い線はpxのままで構いません。

## メディアクエリはmixinを使う

生の `@media` は書きません（`any-hover` は例外）。

```scss
.card {
  padding: to-rem(16);

  @include mq-up("md") {   // 768px以上
    padding: to-rem(32);
  }
}
```

- `mq-up($size)` … 〇〇以上 / `mq-down($size)` … 〇〇未満
- **ブレイクポイントの値は `_variables.scss` の `$breakpoints` が正**です（このテンプレートの初期値: sm 550 / md 768 / lg 1200 / xl 1400）。数値をコードに直書きせず、必ずmixin経由で使います。迷ったら `md`
- レイアウト切替のブレイクポイントは、案件内で統一します（ページごとに変えない）

## 余白は margin-top で統一する

`margin-bottom` は使いません。要素の間隔は下に来る要素の `margin-top` で作ります。

```scss
// NG
.card { margin-bottom: to-rem(24); }

// OK
.card { margin-top: to-rem(24); }
```

左右の余白も `margin-left` / `margin-right` ではなく `margin-inline` を使います。

並びの間隔は、親に `display: flex` / `grid` と `gap` を書いて一括で管理します。`:first-child` で打ち消す書き方はしません。

## ネスト

0〜1階層まで。深くなったらクラスを分けます。

## 共通パーツ

`.inner`（コンテンツ幅を制限するクラス）は用意済みです。セクションごとに `.about__inner` のようなものを作らず、これを使い回します。
