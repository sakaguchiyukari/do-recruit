# AGENTS.md — このプロジェクトで作業するAIエージェントへ

iro code. のViteテンプレートです。**Claude Code / Codex CLI / Cursor / Gemini CLI など、どのエージェントもまずこのファイルを読んでください。**

## 最初にやること

1. コードを書く前に `rules/` の該当ファイルを読む
   - `rules/html.md` — HTMLの書き方（セマンティック・画像・リンク）
   - `rules/sass.md` — Sassの書き方（3層構造・BEM・変数・メディアクエリ）
   - `rules/js.md` — JavaScriptの書き方
   - `rules/images.md` — 画像とWebPの扱い（このテンプレ固有の自動化）
2. 実装したら、書いたコードをルールと照合して最終確認する

## このテンプレートの前提

| 項目 | 内容 |
|---|---|
| 種別 | 静的サイト（HTML / Sass / JavaScript） |
| ビルドツール | Vite |
| CSS | Sass（.scss）。3層構造 `base` / `global` / `module` |
| 言語 | 日本語 |

```bash
npm install     # 最初の一度だけ
npm run dev     # 開発サーバー（保存で即反映）
npm run build   # 本番用に dist/ へ書き出し
```

## 触ってはいけないもの

- `dist/` — ビルドで作られる成果物。直接編集しない
- `sass/module/_index.scss` — **自動生成される目次ファイル**。手で編集しても `npm run dev` / `npm run build` のたびに上書きされる
- `vite.config.js` / `scripts/` / `package.json` — 自動化の設定。依頼されていない限り変更しない
- `node_modules/` — 部品置き場

新しいパーツを作るときは `sass/module/_パーツ名.scss` を置くだけでよい。`@forward` の追記は仕組みが自動でやる。

## 絶対違反一覧（違反したら即修正）

| ルール | 代替 |
|---|---|
| `margin-bottom` 禁止 | `margin-top` で統一 |
| 生の `@media` 禁止（any-hover除く） | `mq-up()` / `mq-down()` |
| `@import` 禁止 | `@use` / `@forward` |
| `&__` でのBEM Element結合禁止 | `.block__el` をフルで書く |
| HEX値ベタ書き禁止（module内） | `$color-` 変数を経由 |
| `font-family` ベタ書き禁止 | `$font-` 変数 |
| `margin-left` / `margin-right` 禁止 | `margin-inline` |
| `:first-child` でのmargin打ち消し禁止 | 親の `flex` / `grid` + `gap` で一元管理 |
| 1ファイル複数Block禁止（module内） | Blockごとにファイルを分ける |
| `var` 禁止 | `const` / `let` |
| `onclick` 属性禁止 | `addEventListener()` |
| `console.log` 残置禁止（納品時） | 削除 |
| `alt` なしの `<img>` 禁止 | 装飾画像でも `alt=""` |
| `sass/module/_index.scss` の手編集禁止 | 自動生成に任せる |

## 作業計画（PLAN.md）

次のどれかに当てはまる作業は、実装の前に計画を書いて確認を取ります。

- 新しいセクション・パーツの追加
- 複数ファイルにまたがる変更
- ファイル構成に触る変更

手順:

1. プロジェクト直下に `PLAN.md` を書く（前の計画が残っていたら上書きする）
2. ユーザーにOKをもらってから実装する
3. 実装中、終わった項目に `[x]` を付けていく
4. セッションをまたいで再開するとき・作業が長くなってきたときは、`PLAN.md` を読み直してから続ける
5. `PLAN.md` と今の依頼が食い違うときは、勝手に判断せずユーザーに確認する

`PLAN.md` の形式:

```markdown
# 作業計画: お知らせセクションの追加

## 触るファイル
- [ ] index.html（セクションのHTMLを追加）
- [ ] sass/module/_news.scss（新規）
- [ ] images/news/（画像を配置）

## 使う既存の仕組み
- $color-accent / $inner / mq-up("md")
- .inner 共通パーツ

## 確認方法
- npm run dev でトップに「お知らせ」セクションが表示される
- スマホ幅（375px）とPC幅で崩れない
```

小さな修正（1ファイル・数行）では `PLAN.md` は不要です。

## 作業の進め方

**自分で判断してよい（聞かない）**
- デザインから読み取れること（色・配置・余白・背景）
- 既存の共通パーツの使い回し（`.inner` など）
- ルールファイルに書いてあること
- `sass/global/_variables.scss` にある変数の値

**質問する**
- デザインだけでは判断できない挙動（アニメーションの速さ、スライダーのループ有無など）
- 新しい共通パーツを作るかどうかの判断
- 画像やテキストが仮なのか本番なのか分からないとき

質問はYes/Noか選択式にする。自由回答を求めない。

## 実装後の自己チェック

1. `rules/` の各ファイルと照合して違反がないか確認する
2. `npm run dev` で表示を確認する
3. スマホ幅（375px）・中間幅（1000px）・PC幅の3つで崩れないか確認する
4. 次の3つを短く報告する
   - 変えたファイルの一覧
   - ルール照合の結果（確認した項目と結果）
   - 自分では確認できなかったこと（実画面の確認など）

---

以下はClaude Code用の自動読み込み設定です（他のエージェントは上の指示に従って `rules/` を読んでください）。

@rules/html.md
@rules/sass.md
@rules/js.md
@rules/images.md
