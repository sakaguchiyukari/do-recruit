# ホームページ セキュリティ点検チェックリスト

WordPressサイトと静的HTMLサイトの定期セキュリティ点検用のチェックリスト（1ページの静的ツール）。

## 構成

```
security-checklist/
├─ index.html              … チェックリスト本体（WordPress / 静的HTML の2パネル）
├─ assets/css/style.css    … CSS（1ファイル / FLOCSS + BEM / :root でトークン管理）
├─ assets/js/main.js       … フェードイン・タブ・保存・進捗・印刷（defer の単一ファイル）
└─ assets/img/             … 画像（仮名称。未配置）
   ├─ favicon.ico
   ├─ apple-touch-icon.png
   └─ ogp/ogp-security-checklist.png（1200×630）
```

- `index.html` をブラウザで直接開いても動く（ESモジュールを使っていないため）。
- パスはサブディレクトリに置く前提で相対パスにしている。

## 項目の追加・変更

1. `index.html` の該当カテゴリ（`<section class="p-category">`）に `<li class="c-check">` を1つ追加する。
2. `input` の `id` / `name` と `label` の `for` は、ほかと重ならない値にする（例：`wp-core-09`）。
   この `id` がチェック状態の保存キーになるため、**既存の id は変更しない**（変更すると保存済みのチェックが外れる）。
3. カテゴリの件数表示と進捗は JS が自動で数えるので、HTMLの数字を直す必要はない。

WordPress・静的HTMLで共通のカテゴリ（サーバー / ドメイン・DNS / SSL・通信 / バックアップ / 診断・監視）は
両パネルに同じ内容があるため、**変更するときは両方を修正する**。

## 保存について

- チェック状態と点検情報は `localStorage`（キー：`security-checklist:v1`）に保存される。
- 端末・ブラウザ間では共有されない。記録を残す場合は「印刷・PDF保存」を使う。

## 公開時に差し替えるもの

- `og:url` / `og:image` の `https://example.com/...`
- 検索エンジンに載せる場合は `<meta name="robots" content="noindex">` を削除
