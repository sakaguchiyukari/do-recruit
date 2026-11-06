# リファラル採用マッチングシステム

社員限定ブログ（HTML入力欄）に貼り付けて使う、求人検索・マッチングの仕組み。

## 進め方

| STEP | 内容 | 状態 |
|---|---|---|
| 1 | 環境テスト（`step1-env-test.html`） | 完了：CSS・JavaScript・onclick・イベント登録・ブラウザ保存すべてOK |
| 2 | 検索・マッチングの基本版（`blocks/1〜8`、データはコード内に記述） | 作成済み・ブログでの確認待ち |
| 3 | 管理画面（Googleスプレッドシート＋Apps Script）からデータを読み込む | 未着手 |

## 貼り付け順（STEP2）

1. `blocks/1-html-base.html` … タイトル
2. `blocks/2-html-form.html` … 検索フォーム
3. `blocks/3-html-results.html` … 検索結果の表示場所
4. `blocks/4-css-base.html` … デザイン
5. `blocks/5-css-sp.html` … スマートフォン対応
6. `blocks/6-js-search.html` … 検索・表示
7. `blocks/7-js-match.html` … マッチ度の計算
8. `blocks/8-data.html` … 企業・求人データ（サンプル）

JavaScriptのブロック（6〜8）は順番が前後しても動く。ブロックが足りない場合は、件数欄に足りないブロック名が表示される。

## 名前の衝突対策

- HTMLのID・クラスは `yzw-` で始める
- CSSは `div.yzw-app` / `div#yzw-match-*` の下に限定し、`!important` を付ける
- JavaScriptのグローバル変数は `window.YZW` の1つだけ

## 管理機能の設計（STEP3予定）

ブラウザ側のコードは誰でも読めるため、パスワード認証やデータ保存をブラウザ側だけで安全に行うことはできない。以下の構成を予定する。

- データ：Googleスプレッドシート（「企業」「求人」の2シート）。編集できる人はGoogleの共有設定で限定する
- 配信：Google Apps Script のWebアプリで、シートの内容を読み取り専用のJSONとして公開
- 表示：ブログ側は JSON を読み込んで表示するだけ（書き込み処理は置かない）
- 読み込めない場合：`8-data.html` の内容を予備データとして表示する
