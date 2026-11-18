# KJ & KATSUGG Official Site（Vite版）

iro code. Vite テンプレートで作った DJ KJ / DJ KATSUGG のワンページサイト。
ルールは `AGENTS.md` と `rules/` を参照（AI エージェントも自動で読み込む）。
静的HTML版は `../kj-katsugg-site/` に残してある。

## コマンド
```bash
npm install     # 最初の一度だけ
npm run dev     # 開発サーバー（確認はこちらで。index.html のダブルクリックでは JS が動かない）
npm run build   # dist/ に納品用ファイルを書き出し
npm run preview # dist/ の確認
```

## 主なファイル
- `index.html` … Hero / About / Schedule / Mix / Booking
- `sass/global/_variables.scss` … 色・フォント・幅・影・動きの変数（見た目の調整はまずここ）
- `sass/module/` … 1ファイル1ブロック（`_index.scss` は自動生成）
- `js/script.js` … フェードイン / ヘッダー状態 / SPドロワー / フォーム検証
- `images/` … 仮画像（jpg を差し替えれば webp は自動生成）

## 公開前に差し替えるもの
| 箇所 | 内容 |
|---|---|
| `images/artist/artist-kj.jpg` / `artist-katsugg.jpg` | プロフィール写真（4:5、800×1000） |
| `images/mix/mix-01〜03.jpg` | MIXジャケット（正方形） |
| `images/ogp/ogp.jpg` | OGP画像（1200×630） |
| About のプロフィール文・ジャンルタグ | 仮テキスト |
| Schedule / Mix の `href="#"` | イベントページ・SoundCloud等のURL |
| `og:url` / `og:image` | 公開URL（絶対URL） |
| フォームの `action="#"` | 送信先が未確定。`#` の間はデモ表示のみ |
| レコードのラベル「NICE WONDER」 | Instagram ID からの仮置き |
