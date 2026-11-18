# KJ & KATSUGG Official Site

DJ KJ / DJ KATSUGG のワンページサイト（静的HTML）。

## 構成
- `index.html` … 1ページ構成（Hero / About / Schedule / Mix / Booking）
- `assets/css/style.css` … CSS 1ファイル（FLOCSS + BEM、色・余白は `:root` で管理）
- `assets/js/main.js` … `defer` 読み込みの単一ファイル（フェードイン / ドロワー / フォーム検証）
- `assets/img/` … すべて仮画像

## 公開前に差し替えるもの
| 箇所 | 内容 |
|---|---|
| `assets/img/artist/artist-kj.jpg` / `artist-katsugg.jpg` | プロフィール写真（4:5推奨、800×1000） |
| `assets/img/mix/mix-01〜03.jpg` | MIXジャケット（正方形） |
| `assets/img/ogp/ogp.jpg` | OGP画像（1200×630） |
| About のプロフィール文・ジャンルタグ | 仮テキスト |
| Schedule / Mix の各 `href="#"` | イベントページ・SoundCloud等のURL |
| `og:url` / `og:image` | 公開URL |
| フォームの `action="#"` | 送信先（フォームサービス等）未確定。`#` の間はデモ表示のみ |
| レコードのラベル「NICE WONDER」 | Instagram ID からの仮置き。正式名称に変更 |
