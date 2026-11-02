# Do.Link 社内副業ページ

リファラル採用ページと同じ構成・同じコンポーネントで作った「社内副業」の下層ページ。

```
do-link-sidejob/
├── index.html
└── assets/
    ├── css/style.css   … FLOCSS + BEM（c- はリファラル採用ページと共通）
    ├── js/main.js      … 案件データ / マッチング / モーダル / フェードイン / パスワードゲート
    └── icon/favicon.svg
```

## 差し替えが必要な箇所（TODO）
- `main.js` の `JOBS`（案件データはすべてサンプル）
- 応募フォームの送信先（`index.html` の `.js-apply-form` と `main.js` の submit 処理）
- 「応募の前に」の文言（社内の副業規程に合わせる）
- OGP 画像 `assets/img/ogp/ogp-sidejob.png`、`apple-touch-icon.png`

## パスワード
`PASSWORD_HASH` はリファラル採用ページと同じ値のため、同じパスワードで開ける。
変更方法は `main.js` の「10. パスワードゲート」のコメントを参照。
