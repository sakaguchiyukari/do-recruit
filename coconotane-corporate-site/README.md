# 株式会社COCONOTANE コーポレートサイト

サブリース事業・賃貸売買仲介・外国人材向け住まい支援を行う不動産会社のコーポレートサイト。
静的HTML／CSS／素のJavaScriptで構築し、将来的なWordPress化を前提とした構造にしています。

---

## 1. ディレクトリ構成

```
coconotane-corporate-site/
├── index.html              TOPページ
├── privacy.html            プライバシーポリシー（下層ページ）
├── README.md               本ドキュメント（設計仕様）
└── assets/
    ├── css/
    │   └── style.css       全ページ共通スタイル（1ファイル / レイヤー順に記述）
    ├── js/
    │   └── main.js         全ページ共通スクリプト（defer読み込み）
    └── images/
        ├── hero-main.webp            FV画像            1200×1200
        ├── message-main.webp         企業メッセージ画像  1080×810
        ├── business-sublease.webp    事業01            960×640
        ├── business-brokerage.webp   事業02            960×640
        ├── business-global.webp      事業03            960×640
        ├── og-image.png              OGP画像           1200×630
        ├── apple-touch-icon.png      タッチアイコン      180×180
        └── favicon.svg               ファビコン
```

画像はすべて仮素材です。実写差し替え時も **同じファイル名・同じ寸法** を維持すれば、
HTML側の `width` / `height` を触らずに済みます（CLS対策のため寸法をハードコードしています）。

---

## 2. サイトマップ

```
ホーム (/)
├── #message   企業メッセージ
├── #business  事業紹介（サブリース / 賃貸・売買仲介 / 外国人材の住まい支援）
├── #company   会社概要
└── #contact   お問い合わせ（TEL / MAIL / フォーム）

プライバシーポリシー (/privacy.html)
```

TOPは1ページ完結。将来の拡張余地として、`#business` の各カードは
そのまま下層ページ（`/business/sublease/` など）へ切り出せる粒度で作っています。
Instagram はアカウント開設後、フッターと `#contact` の「準備中」表示を差し替えます。

---

## 3. ワイヤーフレーム

### TOPページ

```
┌────────────────────────────────────────────┐
│ HEADER  logo          nav  TEL  [CTA]  ≡   │ sticky / スクロールで影が出る
├────────────────────────────────────────────┤
│ FV                                          │
│  eyebrow                     ┌───────────┐  │ PC: テキスト左・画像右の2カラム
│  H1 住まいさがしの、          │           │  │ SP: 縦積み（テキスト → 画像）
│     その先へ。                │   IMAGE   │  │ CTAは主(赤ベタ)＋副(電話)の2本
│  リード文                     │           │  │
│  [お問い合わせ] [TEL 0238-…] └───────────┘  │
├────────────────────────────────────────────┤
│ 01 MESSAGE                          （淡色）│
│  H2 「ここ」に、暮らしの種を蒔く。            │
│  本文3段落              ┌──────────────┐   │ PC: 文章左・画像右
│                         │    IMAGE     │   │
│                         └──────────────┘   │
│  ┌────────┐┌────────┐┌────────┐            │ 3つの姿勢カード（上辺に赤罫）
│  │透明である││伴走する ││ひらかれ ││            │ TAB/PCで3カラム
│  └────────┘└────────┘└────────┘            │
├────────────────────────────────────────────┤
│ 02 BUSINESS                                 │
│  H2 3つの事業で、地域の「住む」を支える。     │
│  ┌─────────┐┌─────────┐┌─────────┐         │ PC: 3カラム（高さ揃え）
│  │  IMAGE  ││  IMAGE  ││  IMAGE  │         │ TAB: 画像左＋文右の横並び
│  │ H3 事業名││ H3 事業名││ H3 事業名│         │ SP: 1カラム縦積み
│  │ 説明文   ││ 説明文   ││ 説明文   │         │ 箇条書きは下端に揃う
│  │ ・要点×3 ││ ・要点×3 ││ ・要点×3 │         │
│  └─────────┘└─────────┘└─────────┘         │
├────────────────────────────────────────────┤
│ 03 COMPANY                          （淡色）│
│  H2 会社概要                                 │
│  ┌───────┬──────────────────────┐          │ dl / TAB以上で2カラム定義リスト
│  │ 商号   │ 株式会社ＣＯＣＯＮＯ… │          │ SPでは項目名の下に値
│  │ 代表者 │ …                     │          │
│  └───────┴──────────────────────┘          │
├────────────────────────────────────────────┤
│ 04 CONTACT                                  │
│  H2 ご相談は、無料です。                      │
│  ┌──────────┐  ┌──────────────────┐        │ PC: 連絡先左・フォーム右
│  │ TEL カード │  │  お問い合わせ      │        │ SP: 縦積み（連絡先が先）
│  │ MAIL カード│  │  フォーム          │        │
│  │ Instagram │  │  [送信]           │        │
│  └──────────┘  └──────────────────┘        │
├────────────────────────────────────────────┤
│ FOOTER  logo / 住所・TEL・MAIL │ ナビ         │ 濃紺ベタ
│ © 2026 COCONOTANE Inc.                      │
└────────────────────────────────────────────┘
[ 電話する ][ お問い合わせ ]  ← SP固定CTA（〜767px・常時表示）
                        (↑) ← ページトップ（480px以上スクロールで出現）
```

### プライバシーポリシー

```
HEADER → ページ見出し帯 → パンくず → 本文（01〜10のsection） → 窓口 → FOOTER
```

---

## 4. カラーパレット

信頼感（濃紺・白）を土台に、指定色 `#fe0002` を**面積を絞ったアクセント**として使う設計です。
赤を広く敷くと威圧的になり不動産の信頼感を損なうため、ロゴ・CTA・見出しの罫・箇条書きのドットに限定しています。
温かみのあるオフホワイト（`#f7f6f4`）を第2背景に置き、「清潔感＋親しみやすさ」を両立させました。

| 役割 | 変数 | 値 | 用途 | 白背景とのコントラスト |
|---|---|---|---|---|
| ブランド | `--color-brand` | `#fe0002` | ロゴ、罫、図形、装飾 | 4.03（装飾専用） |
| ブランド（面） | `--color-brand-strong` | `#e60002` | ボタン背景（白文字） | 4.81 ✅ AA |
| ブランド（文字） | `--color-brand-deep` | `#c40001` | 赤文字・リンク | 6.27 ✅ AA |
| ブランド（淡） | `--color-brand-tint` | `#fff4f4` | バッジ背景、フォーカス影 | — |
| 見出し | `--color-ink` | `#14171c` | h1〜h4、強調 | 16.6 ✅ AAA |
| 本文 | `--color-ink-body` | `#434a55` | 段落 | 9.0 ✅ AAA |
| 補足 | `--color-ink-muted` | `#666d78` | 注記、ラベル | 5.6 ✅ AA |
| 背景 | `--color-bg` | `#ffffff` | ベース | — |
| 背景（交互） | `--color-bg-alt` | `#f7f6f4` | 1つおきのセクション | — |
| 背景（濃） | `--color-bg-dark` | `#101319` | フッター、SP固定CTA | — |
| 罫線 | `--color-line` | `#e4e1dc` | カード枠、区切り | — |
| フォーカス | `--color-focus` | `#1552d6` | フォーカスリング（明背景） | 6.54 ✅ |
| フォーカス（暗） | — | `#ffd166` | フッター等の暗背景で自動切替 | — |

> **指定色の扱いについて**
> `#fe0002` は白背景とのコントラストが 4.03:1 で、WCAG AA の本文基準（4.5:1）にわずかに届きません。
> そのためブランド色そのものは図形・装飾に使い、テキストとボタン面には同系統で基準を満たす
> `#c40001` / `#e60002` を用意しました。見た目の印象は保ったまま AA を全項目でクリアしています。

---

## 5. デザイントークン

すべて `assets/css/style.css` の `:root`（セクション2）に集約しています。

| 分類 | トークン | 値 |
|---|---|---|
| タイポ | `--font-base` | `"Noto Sans JP", -apple-system, … , sans-serif` |
| | `--fs-hero` | `clamp(2.125rem, 1.35rem + 3.3vw, 3.75rem)` |
| | `--fs-h2` | `clamp(1.625rem, 1.2rem + 1.8vw, 2.5rem)` |
| | `--fs-h3` | `clamp(1.1875rem, 1.08rem + 0.45vw, 1.4375rem)` |
| | `--fs-lead` / `--fs-body` / `--fs-sm` / `--fs-xs` | 可変 / `1rem` / `.875rem` / `.75rem` |
| | `--line-height-body` | `1.75`（日本語の可読性重視） |
| | `--letter-spacing-base` | `0.02em`＋`font-feature-settings: "palt" 1` |
| 余白 | `--space-2xs` 〜 `--space-2xl` | `.25rem` 〜 `clamp(3.5rem, 2.4rem + 4.5vw, 6rem)` |
| | `--section-py` | `clamp(4rem, 2.4rem + 7vw, 8rem)` |
| レイアウト | `--container-max` / `--container-narrow` | `1180px` / `760px` |
| | `--container-pad` | `clamp(1.25rem, 0.7rem + 2.6vw, 3rem)` |
| | `--header-height` | `64px`（PCは `84px`） |
| 形状 | `--radius-sm` / `--radius` / `--radius-lg` | `4px` / `8px` / `12px`（角丸は控えめ） |
| 影 | `--shadow-xs` / `-sm` / `-md` | ごく薄い3段階のみ |
| モーション | `--ease-out` | `cubic-bezier(0.22, 0.7, 0.3, 1)` |
| | `--duration-fast` / `-base` / `-slow` | `.2s` / `.32s` / `.7s` |

---

## 6. コンポーネント一覧

BEM（`block__element--modifier`）で命名しています。

| レイヤー | ブロック | 役割 |
|---|---|---|
| Layout | `l-container` | 最大幅＋左右余白の共通枠 |
| | `section` / `section--alt` | セクション上下余白／交互の淡色背景 |
| | `site-header` | 共通ヘッダー（`is-scrolled` で状態変化） |
| | `site-footer` | 共通フッター |
| Component | `skip-link` | 本文へスキップ（フォーカス時のみ出現） |
| | `button` / `--primary` `--outline` `--sm` `--block` `--tel` | 全ボタンの統一スタイル |
| | `text-link` / `tel-link` | 下線リンク／電話番号リンク（ラベル＋番号の2段） |
| | `section-head` | 通し番号＋英字ラベル＋H2＋リード |
| | `brand` / `--footer` | ロゴ（SVGマーク＋社名） |
| | `global-nav` | PCは横並び、〜1024pxは全画面ドロワー |
| | `hamburger` | 開閉ボタン（`aria-expanded` を見た目にも反映） |
| | `hero` | FV |
| | `message` / `value-card` | 企業メッセージ／3つの姿勢カード |
| | `business-card` | 事業カード（画像・番号・見出し・説明・要点） |
| | `def-list` | 会社概要の定義リスト |
| | `contact-card` / `form` | 連絡先カード／お問い合わせフォーム |
| | `footer-nav` | フッターナビ |
| | `sp-cta` | SP固定CTAバー |
| | `page-top` | ページトップボタン |
| | `page-head` / `breadcrumb` / `policy` | 下層ページ用 |
| Utility | `u-visually-hidden` / `u-br-sp` / `u-scroll-lock` | 3つのみ（増やさない方針） |

---

## 7. レスポンシブ設計

| ブレイクポイント | 幅 | 主な変化 |
|---|---|---|
| SP | 〜767px | 1カラム、ドロワーナビ、SP固定CTA表示 |
| TAB | 768〜1024px | 姿勢カード3列／事業カードは画像左・文右の横並び、ドロワー継続 |
| PC | 1025px〜 | 横並びナビ、FV2カラム、事業カード3列 |

- モバイルファーストで記述（ベース＝SP、`min-width` で拡張）
- 余白・フォントサイズは `clamp()` で連続可変。ブレイクポイントでの段差を作らない
- 本文幅は `--container-narrow`（760px）で抑え、1行が長くなりすぎないようにする
- 全ブレイクポイントで横スクロールが発生しないことを実測確認済み

---

## 8. SEO設計

| 項目 | index.html | privacy.html |
|---|---|---|
| `title` | 株式会社COCONOTANE｜サブリース・賃貸売買・外国人材の住まい支援 | プライバシーポリシー｜株式会社COCONOTANE |
| `meta description` | 事業3本柱と提供価値を120字程度で | ページ内容の要約 |
| `canonical` | `https://coconotane.co.jp/` | `https://coconotane.co.jp/privacy.html` |
| `meta robots` | `index, follow, max-image-preview:large` | 同左 |
| OGP / Twitter Card | `og:type=website`＋`summary_large_image` | `og:type=article` |
| 構造化データ | `Organization`（住所・電話・対応言語含む） | `BreadcrumbList` |
| 見出し | `h1`×1 → `h2`×4 → `h3`×6（レベル飛びなし） | `h1`×1 → `h2`×10 |

- ステージング公開時は各ページ先頭のコメント内 `noindex, nofollow` を有効化してください
- `Organization` に `availableLanguage: ["Japanese", "English"]` を含め、外国人材向け事業を検索側にも伝えています

---

## 9. アクセシビリティ（WCAG 2.2 AA 準拠を目標）

- **キーボード操作**：スキップリンク → ロゴ → ナビ → CTA の自然なタブ順。全操作をキーボードのみで完結可能
- **フォーカス**：`:focus-visible` で3pxのリングを表示。暗い背景ブロックではCSS変数を上書きして明色リングへ自動切替
- **hover と focus を同等に**：ボタン・リンク・カードのすべてで `:hover` と `:focus-visible` に同じ見た目を適用
- **ハンバーガー**：`aria-expanded` を更新し、開閉状態をアイコンとラベル（メニュー/閉じる）にも反映
- **ドロワー展開中**：背面の `main` / `footer` / SP固定CTA に `inert` を付与し、フォーカスと読み上げの対象から除外。Escキーで閉じてトグルへフォーカスを戻す
- **コントラスト**：全テキストスタイルを実測し、AA基準を100%クリア
- **画像**：装飾SVGは `aria-hidden` + `focusable="false"`、内容画像はすべて説明的な `alt`
- **フォーム**：`label[for]`／`required`＋`aria-required`／`autocomplete`／`inputmode`／エラー表示枠（`role="alert"` `aria-live="polite"`）
- **モーション**：`prefers-reduced-motion: reduce` でアニメーションとスムーススクロールを無効化
- 検証：axe-core（wcag2a/2aa/21aa/22aa/best-practice）を PC・SP・ドロワー展開中・下層ページの4状態で実行し、**違反0件**

---

## 10. パフォーマンス

- FV画像は `fetchpriority="high"`、それ以外は `loading="lazy"`
- 全画像に `width` / `height` を明示（CLS対策）。画像はWebP、合計約30KB
- CSS 1ファイル・JS 1ファイル。JSは `defer` で読み込み、`DOMContentLoaded` 後に初期化
- アニメーションは `transform` / `opacity` のみ。`will-change` は不使用
- `scroll` は `requestAnimationFrame` で1フレーム1回に間引き、`passive: true` で登録
- `resize` は 200ms の debounce
- IntersectionObserver は一度表示した要素を `unobserve` して監視を解除
- フォントは `display=swap`（Google Fonts の css2 API が付与）＋ `preconnect`
  - **本番推奨**：Noto Sans JP をサブセット化して自己ホストすると、外部接続とレンダリング遅延を削減できます

---

## 11. Sass化する場合の対応表

`style.css` は下記のパーシャル構成をそのまま1ファイルに展開した順序で書いています。
Sassへ移す際は、目次コメントの区切りごとに切り出すだけで対応できます。

```
src/scss/
├── style.scss                 @use で以下を読み込む
├── foundation/
│   ├── _reset.scss            → CSS 1. Reset
│   ├── _variables.scss        → CSS 2. Root
│   └── _base.scss             → CSS 3. Base
├── layout/
│   ├── _container.scss        ┐
│   ├── _section.scss          │→ CSS 4. Layout
│   ├── _header.scss           │
│   └── _footer.scss           ┘
├── component/
│   ├── _button.scss           ┐
│   ├── _link.scss             │
│   ├── _section-head.scss     │
│   ├── _brand.scss            │
│   ├── _global-nav.scss       │→ CSS 5. Component
│   ├── _hamburger.scss        │
│   ├── _hero.scss             │  （5-1〜5-5の小見出しがそのままファイル単位）
│   ├── _message.scss          │
│   ├── _business-card.scss    │
│   ├── _def-list.scss         │
│   ├── _contact.scss          │
│   ├── _form.scss             │
│   ├── _sp-cta.scss           │
│   ├── _page-top.scss         │
│   └── _policy.scss           ┘
├── utility/
│   └── _utility.scss          → CSS 6. Utility
└── animation/
    └── _reveal.scss           → CSS 7. Animation
```

色・余白はCSSカスタムプロパティで管理しているため、Sass変数への置き換えは不要です
（実行時にテーマ切り替えができる利点を残しています）。

---

## 12. WordPress化の手順メモ

| 静的ファイル | WordPress |
|---|---|
| `<head>` 〜 `</header>` | `header.php`（メタ情報は `wp_head()` ＋ SEOプラグインへ委譲） |
| `<footer>` 〜 `</body>` | `footer.php`（`wp_footer()` を追加） |
| TOPの各 `<section>` | `front-page.php`。各セクション冒頭のコメントが分割位置の目印 |
| `privacy.html` | 固定ページ＋`page-privacy.php`（パーマリンクは `/privacy/`。canonical と og:url も合わせて更新） |
| `business-card` の `<li>` | カスタム投稿タイプ「事業」のループへ。3枚とも同一マークアップ |
| `value-card` の `<li>` | ACFの繰り返しフィールド |
| `def-list__row` | ACFの繰り返しフィールド（項目名／内容） |
| `form` | Contact Form 7 / Snow Monkey Forms へ置換。`form__*` のclassはそのまま流用可 |
| 画像パス | すべて `./assets/images/` 起点。`<?php echo get_template_directory_uri(); ?>/assets/images/` へ一括置換 |

- ヘッダー／フッターは2ページで**完全に同一のマークアップ**です（リンク先の相対パスのみ異なる）。テンプレート化時はそのまま切り出せます
- `id` は `js-` 接頭辞（JSフック）と アンカー用 を明確に分けています

---

## 13. 公開前の差し替えチェックリスト

以下はすべて**仮の値**です。`〇` と `0` が含まれる箇所が該当します。

- [ ] 代表者名（`index.html` 会社概要）
- [ ] 所在地・郵便番号（`index.html` 会社概要／フッター、`privacy.html` 窓口、JSON-LD）
- [ ] 設立年月（`index.html` 会社概要）
- [ ] **宅地建物取引業免許番号**（`index.html` 会社概要）— 法定表示のため必ず実番号に差し替えてください
- [ ] 電話番号 `0238-00-0000` → 実番号（`tel:` 属性は `+81` 形式も合わせて更新）
- [ ] メールアドレス `info@coconotane.co.jp`
- [ ] 独自ドメイン `https://coconotane.co.jp/`（canonical / og:url / JSON-LD）
- [ ] プライバシーポリシーの制定日
- [ ] フォームの `action`（現状 `#`。送信処理またはフォームプラグインへ接続）
- [ ] Instagram URL（開設後、`#contact` とフッターの「準備中」表示を差し替え）
- [ ] 画像8点を実素材へ（ファイル名・寸法は据え置き推奨）

---

## 14. 動作確認環境

- Chromium（Playwright）にて 390px / 834px / 1440px で表示・横スクロール無しを確認
- axe-core による自動アクセシビリティ検査：4状態すべて違反0件
- HTML: html5lib でパースエラー0件／JSON-LD: パース成功／CSS: 構文エラー0件
- コンソールエラー・JSランタイムエラーなし
