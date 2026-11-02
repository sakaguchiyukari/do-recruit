# Do.Link 社内副業ページ

リファラル採用ページと同じ構成・同じコンポーネントで作った「社内副業」の下層ページ。
閲覧者は案件をさがして応募し、募集部署（投稿者）はページ下部の「案件を掲載する」から投稿・修正・削除できる。

```
do-link-sidejob/
├── index.html
└── assets/
    ├── css/style.css   … FLOCSS + BEM（c- はリファラル採用ページと共通）
    ├── js/main.js      … データストア / マッチング / 応募 / 掲載管理 / フェードイン / パスワードゲート
    └── icon/favicon.svg
```

## 案件データの保存先
`main.js` の「4. データストア」で環境を判定して切り替える。画面側は store の
`subscribe / save / remove` しか使わないため、保存先を変えても画面のコードは変わらない。

| 開き方 | 保存先 | 見える範囲 |
|---|---|---|
| claude.ai の Artifact | Artifact のデータベース（`posts/<掲載者ID>`） | ページを開ける全員 |
| ローカル（file:// 等） | localStorage（デモモード） | そのブラウザだけ |

### 権限（claude.ai 上）
公開時に次のアクセスルールを宣言している。

```json
{
  "db": { "rules": [
    { "path": "posts",        "read": "view", "write": "admin" },
    { "path": "posts/{self}", "read": "view", "write": "interact" }
  ] },
  "user": { "scopes": ["profile"] }
}
```

- 閲覧：ページを開ける全員
- 掲載・修正：共有メニューで **Contributor（投稿者）以上** にした人。自分の案件だけ編集できる
- 全件の修正・削除：Owner / Editor（管理者）

## 差し替えが必要な箇所（TODO）
- 応募フォームの送信先（`index.html` の `.js-apply-form` と `main.js` の submit 処理）
- 「応募の前に」の文言（社内の副業規程に合わせる）
- OGP 画像 `assets/img/ogp/ogp-sidejob.png`、`apple-touch-icon.png`
- 本番サーバーに置く場合は、API 等を使う `createXxxStore` を追加して `initStore` で返す

## パスワード
`PASSWORD_HASH` はリファラル採用ページと同じ値のため、同じパスワードで開ける。
変更方法は `main.js` の「13. パスワードゲート」のコメントを参照。
