---
name: web-fullscratch
description: HTMLファイルでホームページをフルスクラッチ制作するときのWeb制作ルール。CMSに依存せず、HTML / CSS / JavaScript を分離し、FLOCSS + BEM で設計する。小〜中規模は素のCSS、大規模サイトはSCSSでコンポーネント管理する。レスポンシブ・アクセシビリティ・パフォーマンス・保守性を重視した実装を行う。
---

# フルスクラッチWeb制作ルール

発注時のコピペ用指示文テンプレートは `PROMPT.md` を参照する。

CMS（WordPress等）を使わず、静的な HTML ファイルでホームページを制作する。

このSkillを使用する場合、以下のルールを必ず守ること。

※ WordPressテーマ「SWELL」のカスタムHTMLブロックに入れるパーツを作る場合は、
　 このSkillではなく `wp-swell` Skill を使用すること。判断基準は以下。

| 状況 | 使うSkill |
|---|---|
| 既存WordPress（SWELL）の記事・固定ページに埋め込むパーツ | `wp-swell` |
| ドメイン直下に置く静的サイトを1から作る | このSkill |
| 静的サイトを作り、後でWordPress化する前提 | このSkill（テンプレート分割を意識する） |

---

# ■ 基本方針

・実務レベルのWeb制作会社品質を目指す
・「作って終わり」ではなく「他人が引き継げる状態」を最終成果物とする
・依頼された箇所以外は原則として変更しない
・既存のHTML・CSS・JavaScriptの挙動を壊さない
・不要なコードを追加しない
・同じ処理やスタイルを重複して記述しない
・既存コードで再利用できるものは可能な限り再利用する
・実装前に必ず既存のディレクトリ構成・命名規則・変数定義を確認する
・独自ルールを新設する前に、既存ルールで表現できないかを検討する
・ライブラリ・CDNは原則使用しない。必要な場合は理由を明示して提案し、承認を得る

---

# ■ 規模判定（最初に必ず行う）

制作開始前に規模を判定し、CSSの管理方式を決定する。判定結果を最初に報告する。

| 規模 | 目安 | CSS方式 |
|---|---|---|
| 小規模 | 1ページ（LP・単一ページ） | 素のCSS 1ファイル |
| 中規模 | 2〜5ページ程度、更新頻度が低い | 素のCSS レイヤー分割 |
| 大規模 | 6ページ以上／複数人で運用／長期更新／下層ページが増え続ける | **SCSS + ビルド** |

判断に迷う場合は、以下のいずれかに該当したら大規模として扱う。

・下層ページが今後追加される予定がある
・同じUIパーツが3ページ以上で使い回される
・複数人が同時に触る
・納品後にクライアント側で更新する運用がある

規模が確定できない情報しかない場合は、**勝手に決めずに確認する**。

---

# ■ ディレクトリ構成

## 小〜中規模（素のCSS）

```
project/
├─ index.html
├─ about/
│   └─ index.html
├─ assets/
│   ├─ css/
│   │   ├─ style.css              … @import のエントリのみ
│   │   ├─ foundation/
│   │   │   ├─ _variables.css     … デザイントークン（:root）
│   │   │   ├─ _reset.css
│   │   │   ├─ _base.css
│   │   │   └─ _typography.css
│   │   ├─ layout/    _l-header.css / _l-footer.css / _l-container.css …
│   │   ├─ component/ _c-button.css / _c-card.css …
│   │   ├─ project/   _p-hero.css / _p-about.css …
│   │   └─ utility/   _u-visually-hidden.css / _u-motion.css
│   ├─ js/
│   │   ├─ main.js                … 各モジュールの初期化のみ
│   │   └─ modules/
│   │       ├─ utils.js
│   │       ├─ drawer.js
│   │       └─ scroll-reveal.js
│   ├─ img/
│   └─ icon/
└─ docs/
    └─ DESIGN.md                  … 設計書（必要に応じて）
```

**注意（事実）：** CSSの `@import` はブラウザ側で読み込みが直列化し、表示開始が遅れる。
開発時の可読性を優先して分割してよいが、**公開前に1ファイルへ結合すること**を前提に進め、
その旨をコメントとして `style.css` の冒頭に明記する。

## 大規模（SCSS）

```
project/
├─ index.html
├─ src/
│   └─ scss/
│       ├─ style.scss             … @use のエントリのみ
│       ├─ globals/               … 全ファイルから @use される変数・関数・mixin
│       │   ├─ _index.scss        … @forward でまとめる
│       │   ├─ _variables.scss    … Sass変数（ブレークポイント等、ビルド時に確定する値）
│       │   ├─ _mixins.scss
│       │   └─ _functions.scss
│       ├─ foundation/
│       │   ├─ _index.scss
│       │   ├─ _tokens.scss       … CSSカスタムプロパティ（:root）
│       │   ├─ _reset.scss
│       │   ├─ _base.scss
│       │   └─ _typography.scss
│       ├─ layout/    _index.scss / _header.scss / _footer.scss …
│       ├─ component/ _index.scss / _button.scss / _card.scss …
│       ├─ project/   _index.scss / _hero.scss / _about.scss …
│       └─ utility/   _index.scss / _visually-hidden.scss …
├─ assets/
│   ├─ css/style.css              … ビルド生成物（直接編集禁止）
│   ├─ js/
│   ├─ img/
│   └─ icon/
├─ package.json
└─ .gitignore                     … node_modules を除外
```

**ビルド生成物（`assets/css/style.css` と `.map`）は直接編集しない。**
必ず `src/scss/` を編集し、ビルドし直す。

---

# ■ 出力構成

HTML・CSS・JavaScript を明確に分離する。

出力順：

1. ディレクトリ構成
2. HTML
3. CSS（または SCSS）
4. JavaScript

コードは省略せず、完全な状態で出力する。
「以下省略」「続きます」で終わらせない。

---

# ■ HTML

## 基本

・HTML5を使用する
・`<html lang="ja">` を必ず指定する
・`<meta charset="UTF-8">` を最初に置く
・`<meta name="viewport" content="width=device-width, initial-scale=1">` を必ず入れる
・セマンティックHTMLを使用する（section / article / header / nav / main / aside / footer / figure）
・divだけでレイアウトを構成しない
・不要に深いDOM構造を作らない
・インデントを揃える
・セクションごとにコメントを記述する

## 見出し・リンク

・`<h1>` は1ページに1つ
・h2 → h3 の論理的な順序を守る。見た目のためにレベルを飛ばさない
・リンクには目的が分かるテキストを設定する（「こちら」「詳しくは」単体を使わない）
・遷移するものは `<a>`、動作するものは `<button>` を使い分ける
・外部リンクに `target="_blank"` を使う場合は `rel="noopener"` を付ける

## head に必ず含めるもの

・`<title>`（ページ固有・全角30字前後を目安）
・`<meta name="description">`（ページ固有）
・OGP（og:type / og:title / og:description / og:image / og:url / og:site_name）
・`<meta name="twitter:card" content="summary_large_image">`
・favicon / apple-touch-icon
・canonical（重複URLが発生しうる場合）
・CSS の `<link rel="stylesheet">`
・JS の `<script>`（後述）

**OGP画像は 1200×630 の PNG または JPG を指定する。SVGはOGPで表示されない。**

## script タグ

・通常のJS：`<script defer src="...">` を head に置く
・ESモジュール構成：`<script type="module" src="...">` を head に置く
　（`type="module"` は仕様上つねに defer 相当で動作するため、defer の記述は不要）
・body末尾に置く方式は使わない（head + defer / module に統一する）
・インラインスクリプトは原則書かない

**例外：** スクロールアニメーションで初期状態を `opacity: 0` にする場合のみ、
head 最上部に1行だけインラインスクリプトを置き、`<html>` に `js-enabled` クラスを付ける。
JSが無効・読み込み失敗の環境でコンテンツが非表示のまま残るのを防ぐため、この1行は必須とする。

```html
<script>document.documentElement.classList.add('js-enabled');</script>
```

## 共通パーツの扱い（静的HTMLの最大のリスク）

静的HTMLではヘッダー・フッターが全ページに複製されるため、**修正漏れが必ず起きる**。

・ヘッダー / フッター / メタ情報の「原本」を決め、`docs/` かコメントで明示する
・共通パーツを変更したら、必ず全ページに反映し、反映したページ一覧を報告する
・ページ数が多い場合は、静的サイトジェネレータやHTMLインクルードの導入を提案する
　（導入するかは依頼者の判断。勝手に構成を変えない）

## 画像

・`<img>` には必ず `alt` を設定する。装飾目的は `alt=""`
・`width` / `height` 属性を指定してレイアウトシフト（CLS）を防ぐ
・ファーストビュー外の画像は `loading="lazy" decoding="async"`
・ファーストビューの主画像には `loading="lazy"` を付けない（表示が遅れる）
・画像ファイル名は仮名称で記述する
　例：`assets/img/hero/hero-main.jpg` / `assets/img/about/about-01.jpg`

## パス

・サイト全体で **ルート相対パス（`/assets/...`）** に統一する
・サブディレクトリ公開の可能性がある場合のみ相対パスを使い、その理由を報告する
・同一ファイル内でルート相対と相対を混在させない

---

# ■ CSS

## 設計方針

・FLOCSS ベースのレイヤー構成 + BEM でクラス名を作る
・レイヤーごとにプレフィックスを付ける

| レイヤー | プレフィックス | 役割 |
|---|---|---|
| foundation | なし | 変数・リセット・素の要素 |
| layout | `l-` | 版面と配置（ヘッダー / フッター / コンテナ / セクション枠） |
| component | `c-` | 再利用可能な部品（ボタン / カード / 見出し） |
| project | `p-` | ページ固有のまとまり（ヒーロー / 会社概要） |
| utility | `u-` | 単一責務の上書き |
| 状態 | `is-` | JSが付け外しする状態（`is-open` / `is-revealed`） |
| JSフック | `js-` | JSが参照するだけのクラス。**CSSを当てない** |

・BEM は `.c-card__title` / `.c-card--wide` の形式で書く
・要素の入れ子が深くなる場合、BEMの `__` を無理に連ねない（`__body__inner` のような形にしない）
・状態変化は `is-` クラスで表現し、スタイルは `.c-drawer.is-open` のように書く

## 禁止・注意

・`!important` は原則使用しない
・インラインstyleは禁止（JSが動的に計算する値のみ例外。その場合はカスタムプロパティ経由）
・IDセレクタをCSS設計に使用しない（IDはアンカーとJSの参照にのみ使う）
・過剰なセレクタ・不要な子孫セレクタを書かない
・`.container` `.title` `.button` `.card` `.item` のような汎用クラス名を単独で使わない
・スタイルの重複を書かない。共通化できるものは component 層に切り出す
・レイヤーをまたいだ上書き合戦をしない（下位レイヤーで解決する）

## デザイントークン

色・余白・角丸・影・モーションは **CSSカスタムプロパティ（`:root`）で一元管理**する。
component / project 層では変数経由でのみ参照し、生の値を直接書かない。

```css
:root {
  /* Color */
  --color-primary: #0b2545;
  --color-text: #14181c;
  --color-text-muted: #5b6570;
  --color-bg: #ffffff;
  --color-rule: #dce1e6;

  /* Space */
  --space-section: clamp(4rem, 10vw, 8rem);
  --space-gutter: clamp(1.25rem, 4vw, 2.5rem);

  /* Radius / Shadow */
  --radius: 0.75rem;
  --shadow: 0 10px 30px rgba(0, 0, 0, 0.08);

  /* Motion */
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --duration: 0.6s;

  /* Layout */
  --width-content: 1120px;
}
```

・コンポーネント固有の値は、そのコンポーネントの親要素内でローカル変数として定義してよい
・ダークモード対応が要件にある場合のみ `prefers-color-scheme` でトークンを切り替える

---

# ■ SCSS（大規模サイトのみ）

## モジュールシステム

**`@import` は使わない。`@use` / `@forward` を使う。**
（事実：Dart Sass では `@import` は非推奨となり、将来的に削除される。新規実装で使う理由はない）

```scss
// src/scss/globals/_index.scss
@forward 'variables';
@forward 'mixins';
@forward 'functions';
```

```scss
// src/scss/component/_button.scss
@use '../globals' as g;

.c-button {
  padding: 1rem 2rem;

  @include g.mq(md) {
    padding: 1.25rem 2.5rem;
  }
}
```

```scss
// src/scss/style.scss  … エントリ。ここには @use 以外を書かない
@use 'foundation';
@use 'layout';
@use 'component';
@use 'project';
@use 'utility';
```

## 記述ルール

・ネストは **3階層まで**。それ以上は設計を見直す
・`&__element` による部分文字列のクラス生成は**しない**
　（`.c-card__title` で全文検索できなくなり、保守性が著しく落ちる。フルクラス名で書く）
・`&:hover` `&.is-open` `&::before` など、**擬似クラス・擬似要素・状態クラスの `&` は使ってよい**
・メディアクエリは mixin にまとめ、各コンポーネント内に書く（末尾に集約しない）
・変数の使い分けを守る
　- **Sass変数（`$`）**：ブレークポイントなど、ビルド時に確定しCSSに出す必要がない値
　- **CSSカスタムプロパティ（`--`）**：色・余白など、実行時に参照・切り替えする値
・色の計算には `color.adjust()` / `color.scale()` を使う（`darken()` / `lighten()` は非推奨）
・使っていない変数・mixin・パーシャルを残さない

## mixin の例

```scss
// src/scss/globals/_variables.scss
$breakpoints: (
  sm: 480px,
  md: 768px,
  lg: 1024px,
  xl: 1280px,
);

// src/scss/globals/_mixins.scss
@use 'sass:map';
@use 'variables' as v;

/// モバイルファーストのメディアクエリ
/// @param {String} $key - $breakpoints のキー
@mixin mq($key: md) {
  @media (min-width: map.get(v.$breakpoints, $key)) {
    @content;
  }
}
```

## ビルド

・Dart Sass を使う（`npm i -D sass`）
・`package.json` に scripts を用意し、READMEにコマンドを記載する

```json
{
  "scripts": {
    "dev": "sass --watch src/scss/style.scss:assets/css/style.css --style=expanded",
    "build": "sass src/scss/style.scss:assets/css/style.css --style=compressed --no-source-map"
  }
}
```

・納品時は `build`（圧縮・sourcemapなし）で生成したCSSを含める
・`node_modules` は `.gitignore` に追加する
・ビルド生成物をコミットするかは運用に合わせる。判断したらREADMEに明記する

---

# ■ レスポンシブ

モバイルファーストで設計する（`min-width` のメディアクエリで積み上げる）。

・スマートフォン / タブレット / PC すべての幅で崩れないようにする
・`max-width` を適切に設定し、横に広がりすぎないようにする
・余白・文字サイズは `clamp()` で自然に可変させる
・固定値だけに依存しない
・Grid と Flexbox を適切に使い分ける
　- Grid：2次元の配置、カード一覧、`repeat(auto-fit, minmax())` による可変列
　- Flexbox：1次元の並び、ナビ、ボタン群
・画像は `width: 100%; height: auto;` を基本にレスポンシブ対応する
・アスペクト比が必要な箇所は `aspect-ratio` を使う
・スマートフォンで不要に縦長にならないようにする
・CTA や重要なリンクが埋もれないようにする（必要ならSP固定CTAを検討）
・横スクロールが発生していないか必ず確認する
・タップ領域は最低 44×44px 相当を確保する

---

# ■ JavaScript

JavaScriptは必要最低限にする。

## 基本

・ES2015以降で記述する
・`var` は禁止。`const` / `let` を使う
・jQueryは禁止
・`addEventListener` / `querySelector` / `querySelectorAll` を使う
・アロー関数を使う
・グローバル変数を作らない
・DOMContentLoaded または ESモジュールでスコープを管理する
・関数を役割ごとに分割する
・不要なDOM操作・不要な監視を行わない
・`console.log` を納品コードに残さない（意図的なエラー出力の `console.error` は可）

## モジュール構成（推奨）

`main.js` は初期化のみを担当し、ロジックを書かない。
各モジュールは **対象要素が無ければ即 return する** ことを約束とする
（全ページで同じ `main.js` を読み込むため）。

```js
// assets/js/modules/drawer.js
export const initDrawer = () => {
  const drawer = document.querySelector('.js-drawer');
  const toggle = document.querySelector('.js-drawer-toggle');
  if (!drawer || !toggle) return; // 対象が無いページでは何もしない

  const setState = (isOpen) => {
    drawer.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  };

  toggle.addEventListener('click', () => {
    setState(!drawer.classList.contains('is-open'));
  });
};
```

```js
// assets/js/main.js  … 初期化のみ
import { initDrawer } from './modules/drawer.js';
import { initScrollReveal } from './modules/scroll-reveal.js';

const boot = () => {
  [['drawer', initDrawer], ['scroll-reveal', initScrollReveal]]
    .forEach(([name, init]) => {
      try {
        init();
      } catch (error) {
        // 1モジュールの失敗でページ全体を壊さない
        console.error(`[main] "${name}" の初期化に失敗しました`, error);
      }
    });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
```

**注意（事実）：** `type="module"` のJSは、`file://` で直接HTMLを開くとCORS制約で読み込めない。
動作確認はローカルサーバー（例：`npx serve` / VS Code Live Server）で行うこと。
この制約を依頼者に必ず伝える。

ローカルサーバーを使えない納品条件がある場合のみ、
モジュール分割をやめて `<script defer>` の単一ファイル構成にする。

## スクロール・リサイズ

・`scroll` / `resize` イベントの多用を避ける
・表示検知は `IntersectionObserver` を使う
・追従ヘッダーの状態切り替えも `IntersectionObserver`（センチネル要素）で行う
・どうしてもイベントが必要な場合は `{ passive: true }` を付け、`requestAnimationFrame` で間引く

---

# ■ アニメーション

`IntersectionObserver` を使用してフェードインを実装する。

基本仕様：

・初期状態は `opacity: 0`、必要に応じて `transform: translateY(1.5rem)`
・表示領域に入ったら `.is-revealed` を付与する
・発火は原則1回のみ（`unobserve` する）
・連続要素の遅延（stagger）は JS の `setTimeout` ではなく、
　CSSカスタムプロパティ（`--i`）を渡してCSS側で計算する
・`IntersectionObserver` 非対応時・JS失敗時は**即座に全要素を表示する**
　（コンテンツが読めない状態を絶対につくらない）
・過剰なアニメーションを避ける。ユーザーの操作を妨げない
・アニメーションさせるプロパティは `opacity` と `transform` に限定する
　（`width` / `top` / `margin` はレイアウト再計算が発生し、動きが重くなる）
・`prefers-reduced-motion: reduce` に必ず対応する

```css
@media (prefers-reduced-motion: reduce) {
  .js-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

---

# ■ ホバー

PCでは必要に応じてホバーアニメーションを実装する。

・`transform` / `opacity` / `box-shadow` / `background-color` などを使う
・過剰にならない自然な動きにする
・`transition` は `0.2s`〜`0.4s` 程度を基準にする
・スマートフォンではホバー前提のUIにしない
・タッチ端末での誤発火を避けたい場合は `@media (hover: hover)` で囲む

---

# ■ フォーム

静的HTMLのフォームは**単体では送信できない**。送信先（メールフォームサービス／PHP／外部フォーム）を
必ず確認し、未確定の場合は `action` を仮置きしてその旨を明記する。

必須項目：

・`label` / `for` / `id` / `name` / `type` / `placeholder` / `required` / `autocomplete`

必要に応じて設定する属性：

・`minlength` / `maxlength` / `pattern` / `min` / `max` / `inputmode`

その他：

・`type` を正しく使う（`email` / `tel` / `url` / `number` / `date`）
・スマホのキーボード最適化のため `inputmode` を併用する（電話：`inputmode="numeric"`）
・エラー表示を実装する場合は `aria-invalid` と `aria-describedby` を使う
・送信ボタンは `<button type="submit">` を使う
・個人情報の取り扱いに関する同意チェックが必要な場合は `required` を付ける
・スパム対策（reCAPTCHA等）の要否を確認する

---

# ■ デザイン

・現代的で洗練されたデザインにする
・テンプレート感を減らす
・Bootstrap風のデザインを避ける
・古いWebサイトのようなデザインを避ける
・余白設計を重視する（余白はデザインの主役）
・情報を詰め込みすぎない
・タイポグラフィの階層を明確にする
・適度な角丸を使用する
・自然な影を使用する（濃い黒の落ち影を避ける）
・コントラストを確保する
・カードUIは必要な場合のみ使用する。すべてをカードにしない
・装飾は目的を持って使用する
・過剰なグラデーション・過剰な装飾を避ける
・視認性と可読性を優先する
・本文の行間は 1.7〜2.0 を目安にする
・本文の1行あたりの文字数は日本語で 30〜45字程度に収める

---

# ■ SEO・アクセシビリティ

・見出し構造を適切にする
・title / description をページごとに固有にする
・構造化データ（JSON-LD）は要件がある場合のみ追加する（Organization / BreadcrumbList など）
・画像に alt属性を設定する
・リンクテキストを分かりやすくする
・キーボード操作を考慮する（Tabで全機能に到達できること）
・`:focus-visible` でフォーカス表示を確保する。`outline: none` だけの指定は禁止
・本文へのスキップリンクを設置する
・十分なコントラスト比を確保する（本文4.5:1以上）
・`aria` 属性は必要な場合のみ使用する。意味のない `aria` を追加しない
・アコーディオン・ドロワーには `aria-expanded` と `aria-controls` を設定する
・`sitemap.xml` / `robots.txt` の要否を確認する

---

# ■ パフォーマンス

・不要なライブラリ・不要な外部CDNを読み込まない
・Webフォントは使用ウェイトを絞る。日本語フォントはサブセット化を検討する
・`font-display: swap` を指定する
・ファーストビューの主画像は `preload` + `fetchpriority="high"` を検討する
・それ以外の画像は `loading="lazy"`
・画像は適切なサイズに縮小してから配置する。必要なら WebP を使う
・公開前にCSSを1ファイルへ結合する（`@import` の直列読み込みを解消する）
・使っていないCSS・JSを残さない

---

# ■ 制作フロー

1. **要件・規模の確認**（ページ数 / 更新運用 / 送信先 / 公開環境）
2. **規模判定と構成の提示**（素のCSS か SCSS か。ディレクトリ構成を先に示す）
3. **デザイントークンの定義**（色・余白・タイポグラフィを先に決める）
4. **共通パーツの実装**（header / footer / container / button）
5. **ページ単位の実装**
6. **レスポンシブ確認**（SP / タブレット / PC）
7. **アクセシビリティ・パフォーマンス確認**
8. **報告**

情報が足りない場合は、推測で作らずに確認する。
ただし、確認待ちで全体を止めない。**確定している部分は先に実装し、
未確定部分は前提を明記した上で仮実装する。**

---

# ■ Claude Codeでの実装ルール

このSkillを使用している場合、コードを生成するだけでなく、実際のプロジェクトファイルを確認・編集する。

・実装前に必ず既存の関連ファイルを確認する
・既存のディレクトリ構成・命名規則・デザイントークンに合わせる
・依頼された箇所以外は原則変更しない
・既存コードを変更する場合は、既存の機能・デザインへの影響を確認する

変更後は以下を簡潔に報告する。

・変更したファイル
・変更した内容
・共通パーツを変更した場合は、反映したページ一覧
・必要に応じて注意点・未確定事項

---

# ■ 実装時の優先順位

1. 既存サイトを壊さない
2. 依頼内容を正確に実装する
3. レスポンシブ対応
4. アクセシビリティ
5. パフォーマンス
6. 保守性
7. コードの簡潔さ
8. デザインの細部調整

「見た目を良くする」ことを理由に、依頼されていない部分を勝手に変更しない。

---

# ■ 禁止事項

・`var`
・jQuery
・インラインstyle
・不要な `!important`
・汎用クラス名
・IDセレクタでのスタイリング
・過剰なDOM / 過剰なJavaScript
・同じCSSの重複
・不要なライブラリ / 不要な外部CDN
・不要なアニメーション
・SCSSでの `@import`（`@use` を使う）
・SCSSでの `&__` によるクラス名生成
・ビルド生成物（`assets/css/style.css`）の直接編集
・`outline: none` 単体の指定
・既存コードの無断変更
・コードの省略出力

---

# ■ 完成条件

実装したコードは、そのまま使用できる完成状態にする。

・コードを省略しない
・「続きます」「以下省略」で終わらせない
・必要なHTML・CSS・JavaScriptをすべて提示する
・ローカルサーバーで開いてそのまま動作する状態にする
・SCSS構成の場合は、ビルドコマンドと生成物の場所を明記する
