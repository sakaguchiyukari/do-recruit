<?php
/**
 * Do.Link 運用ログ — ページ本体
 * 初期データをページに埋め込み、表示後は main.js が api.php と自動同期する
 */

declare(strict_types=1);

define('DOLINK_LOG', true);
require __DIR__ . '/inc/bootstrap.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

try {
    start_session();
    $initial = fetch_payload() + [
        'isAdmin' => is_admin(),
        'csrf' => csrf_token(),
        'refreshSeconds' => max(15, (int) (app_config()['refresh_seconds'] ?? 60)),
        'passwordIsDefault' => password_is_default(),
    ];
    session_write_close();
    $loadError = '';
} catch (Throwable $e) {
    error_log('[dolink-log] ' . $e->getMessage());
    $initial = ['ok' => false];
    $loadError = 'データを読み込めませんでした。サーバーの設定（PHPのSQLite対応・data フォルダの書き込み権限）を確認してください。';
}

// </script> などで埋め込みが壊れないようエスケープしてJSONを出力
$initialJson = json_encode($initial, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
?>
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Do.Link 運用ログ</title>
  <meta name="description" content="Do.Linkで行った作業を日付ごとに記録し、GA4のアクセス推移と並べて確認できる運用ログです。">
  <!-- 社内向けのため検索エンジンには載せない -->
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#0068b7">
  <link rel="icon" type="image/png" href="assets/img/logo-dolink.png">

  <!-- Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">

  <!-- Style（1ファイル） -->
  <link rel="stylesheet" href="assets/css/style.css">

  <!-- Script：すべて defer（記述順に実行される） -->
  <script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"></script>
  <script defer src="assets/js/main.js"></script>
</head>
<body>
  <a class="c-skip" href="#main">本文へスキップ</a>

  <!-- =========================================================
       Header
  ========================================================= -->
  <header class="l-header">
    <div class="l-container l-header__inner">
      <p class="l-header__brand">
        <span class="l-header__logo">
          <img class="l-header__logo-img" src="assets/img/logo-dolink.png" alt="Do.Link" width="184" height="161">
        </span>
        <span class="l-header__name">
          運用ログ
          <span class="l-header__sub">社員限定コミュニティサイトの作業記録</span>
        </span>
      </p>
      <div class="l-header__actions">
        <p class="c-status js-status" data-state="connecting" aria-live="polite">
          <span class="c-status__dot" aria-hidden="true"></span>
          <span class="js-status-text">読み込み中…</span>
        </p>
        <button class="c-icon-btn c-icon-btn--sm js-refresh" type="button" aria-label="最新の内容に更新">
          <span class="c-icon-btn__glyph" aria-hidden="true">↻</span>
        </button>
      </div>
    </div>
  </header>

  <main id="main" class="l-main">

    <!-- =========================================================
         Intro
    ========================================================= -->
    <section class="l-container p-intro" aria-labelledby="page-title">
      <h1 id="page-title" class="p-intro__title">サイトで行った作業を、<br class="u-sp-only">日付ごとに残す。</h1>
      <p class="p-intro__lead js-lead">Do.Linkで行った作業と、GA4のアクセス推移を日付ごとに確認できます。</p>
    </section>

    <!-- 設定前・デモ表示の案内（JSで表示） -->
    <div class="l-container">
      <p class="p-notice js-notice" role="note"<?= $loadError === '' ? ' hidden' : '' ?>><?= h($loadError) ?></p>
    </div>

    <div class="l-container l-workspace is-readonly js-workspace">

      <!-- =========================================================
           Entry form（管理者ログイン時のみ表示）
      ========================================================= -->
      <section class="p-entry u-reveal js-reveal js-entry" id="entry" aria-labelledby="entry-title" hidden>
        <div class="p-entry__panel">
          <h2 id="entry-title" class="p-entry__title js-form-title">作業を記録</h2>
          <div class="p-entry__admin">
            <span>管理者としてログイン中</span>
            <button class="c-text-btn js-logout" type="button">ログアウト</button>
          </div>

          <form class="c-form js-entry-form" novalidate>
            <fieldset class="c-form__fieldset">
              <legend class="u-visually-hidden">作業内容の入力</legend>

              <!-- 日付 -->
              <div class="c-field">
                <label class="c-field__label" for="log-date">
                  日付
                  <span class="c-field__badge c-field__badge--required">必須</span>
                </label>
                <input
                  class="c-field__control"
                  type="date"
                  id="log-date"
                  name="date"
                  required
                  min="2020-01-01"
                  max="2099-12-31"
                  aria-describedby="log-date-error">
                <p class="c-field__error" id="log-date-error" aria-live="polite"></p>
              </div>

              <!-- 事業名 -->
              <div class="c-field">
                <label class="c-field__label" for="log-dept">
                  事業名
                  <span class="c-field__badge c-field__badge--required">必須</span>
                </label>
                <input
                  class="c-field__control"
                  type="text"
                  id="log-dept"
                  name="dept"
                  list="log-dept-list"
                  required
                  minlength="2"
                  maxlength="40"
                  pattern=".*\S.*"
                  placeholder="例：グループ広報室"
                  autocomplete="off"
                  aria-describedby="log-dept-hint log-dept-error">
                <datalist id="log-dept-list"></datalist>
                <p class="c-field__hint" id="log-dept-hint">一度入力した事業名は候補に出ます。表記をそろえると集計しやすくなります。</p>
                <p class="c-field__error" id="log-dept-error" aria-live="polite"></p>
              </div>

              <!-- カテゴリ -->
              <div class="c-field">
                <label class="c-field__label" for="log-category">
                  カテゴリ
                  <span class="c-field__badge c-field__badge--required">必須</span>
                </label>
                <div class="c-field__select">
                  <select
                    class="c-field__control"
                    id="log-category"
                    name="category"
                    required
                    aria-describedby="log-category-error">
                    <option value="" disabled selected>選択してください</option>
                    <!-- 選択肢は main.js の CATEGORIES から生成 -->
                  </select>
                </div>
                <p class="c-field__error" id="log-category-error" aria-live="polite"></p>
              </div>

              <!-- 作業内容 -->
              <div class="c-field">
                <label class="c-field__label" for="log-title-input">
                  作業内容
                  <span class="c-field__badge c-field__badge--required">必須</span>
                </label>
                <input
                  class="c-field__control"
                  type="text"
                  id="log-title-input"
                  name="title"
                  required
                  minlength="2"
                  maxlength="80"
                  pattern=".*\S.*"
                  placeholder="例：CEOインタビュー記事を公開"
                  autocomplete="off"
                  aria-describedby="log-title-input-error">
                <p class="c-field__error" id="log-title-input-error" aria-live="polite"></p>
              </div>

              <!-- URL -->
              <div class="c-field">
                <label class="c-field__label" for="log-url">
                  対象ページのURL
                  <span class="c-field__badge">任意</span>
                </label>
                <input
                  class="c-field__control"
                  type="url"
                  id="log-url"
                  name="url"
                  maxlength="500"
                  pattern="https?://.+"
                  inputmode="url"
                  placeholder="https://do-link.jp/topics/ceo-interview"
                  autocomplete="off"
                  aria-describedby="log-url-hint log-url-error">
                <p class="c-field__hint" id="log-url-hint">GA4のページ別レポートと照合するときの目印になります。</p>
                <p class="c-field__error" id="log-url-error" aria-live="polite"></p>
              </div>

              <!-- メモ -->
              <div class="c-field">
                <label class="c-field__label" for="log-memo">
                  メモ
                  <span class="c-field__badge">任意</span>
                </label>
                <textarea
                  class="c-field__control c-field__control--textarea"
                  id="log-memo"
                  name="memo"
                  rows="3"
                  maxlength="300"
                  placeholder="例：全社員へ一斉送信。件名「10月の社内イベントのお知らせ」"
                  aria-describedby="log-memo-count log-memo-error"></textarea>
                <div class="c-field__foot">
                  <p class="c-field__error" id="log-memo-error" aria-live="polite"></p>
                  <p class="c-field__counter js-memo-count" id="log-memo-count">0 / 300</p>
                </div>
              </div>
            </fieldset>

            <div class="c-form__actions">
              <button class="c-button c-button--primary js-submit" type="submit">記録する</button>
              <button class="c-button c-button--ghost js-cancel" type="button" hidden>編集をやめる</button>
            </div>
          </form>
        </div>
      </section>

      <!-- =========================================================
           Log（GA4グラフ＋記録一覧）
      ========================================================= -->
      <section class="p-log" aria-labelledby="log-heading">
        <div class="p-log__head">
          <h2 id="log-heading" class="p-log__title js-month-label">—</h2>
          <div class="p-log__nav">
            <button class="c-icon-btn js-month-prev" type="button" aria-label="前の月">‹</button>
            <button class="c-chip js-month-today" type="button">今月</button>
            <button class="c-icon-btn js-month-next" type="button" aria-label="次の月">›</button>
          </div>
        </div>

        <!-- ---------- GA4：アクセスと作業 ---------- -->
        <section class="p-insight u-reveal js-reveal js-insight" aria-labelledby="insight-title" hidden>
          <div class="p-insight__head">
            <h3 id="insight-title" class="p-insight__title">アクセスと作業</h3>
            <div class="p-insight__controls">
              <div class="c-mini-select js-metric-wrap" hidden>
                <label class="u-visually-hidden" for="insight-metric">表示する指標</label>
                <select class="c-mini-select__control js-metric" id="insight-metric" name="metric"></select>
              </div>
            </div>
          </div>

          <div class="p-insight__chart js-chart-wrap" hidden>
            <canvas class="js-chart" role="img" aria-label="この月のGA4の日別推移と作業日のグラフ"></canvas>
          </div>
          <p class="p-insight__empty js-insight-empty">GA4のデータを読み込んでいます…</p>

          <ul class="p-insight__legend js-legend" aria-hidden="true" hidden>
            <li class="p-insight__legend-item"><span class="p-insight__swatch"></span>GA4の日別推移</li>
            <li class="p-insight__legend-item"><span class="p-insight__swatch p-insight__swatch--work"></span>作業があった日（点をタップ・ポイントすると内容を表示）</li>
          </ul>

          <div class="p-insight__compare js-compare" hidden>
            <p class="p-insight__stat">
              <span class="p-insight__stat-label js-stat-work-label">作業があった日の平均</span>
              <span class="p-insight__stat-value js-stat-work">—</span>
            </p>
            <p class="p-insight__stat">
              <span class="p-insight__stat-label js-stat-rest-label">作業がなかった日の平均</span>
              <span class="p-insight__stat-value js-stat-rest">—</span>
            </p>
          </div>
          <p class="p-insight__note js-insight-note" hidden>平均は参考値です。曜日や季節など、作業以外の要因による増減も含まれます。</p>

          <!-- 管理者のみ：GA4データの手動取り込み（自動同期が使えない場合の予備） -->
          <div class="p-insight__admin js-admin" hidden>
            <div class="p-insight__admin-row">
              <label class="c-button c-button--ghost c-button--sm" for="ga4-file">GA4のCSVを取り込む</label>
              <input class="u-visually-hidden js-ga4-input" type="file" id="ga4-file" name="ga4" accept=".csv,text/csv">
            </div>
            <p class="c-field__hint js-ga4-meta">GA4データは未取り込みです。</p>
            <details class="c-help">
              <summary class="c-help__summary">GA4からCSVを書き出す手順</summary>
              <ol class="c-help__body">
                <li>GA4の左メニュー「探索」→「空白」（自由形式）を開きます。</li>
                <li>ディメンションに「日付」、指標に「表示回数」「アクティブユーザー数」などを追加します。</li>
                <li>行に「日付」、値に指標をドラッグし、期間を設定します。</li>
                <li>右上の「エクスポート」から CSV を選んで保存し、ここで取り込みます。</li>
              </ol>
            </details>
          </div>
        </section>

        <div class="p-log__tools">
          <div class="p-log__filters js-filters" role="group" aria-label="カテゴリで絞り込み"></div>
          <div class="p-log__search">
            <label class="u-visually-hidden" for="log-search">キーワードで全期間を検索</label>
            <input
              class="c-search js-search"
              type="search"
              id="log-search"
              name="q"
              maxlength="50"
              placeholder="キーワードで全期間を検索"
              autocomplete="off">
          </div>
        </div>

        <div class="p-log__meta">
          <p class="p-log__count js-count" aria-live="polite">0件の記録</p>
          <!-- 書き出し：誰でも利用可 -->
          <div class="p-log__export js-export-bar">
            <div class="c-mini-select">
              <label class="u-visually-hidden" for="export-scope">書き出す範囲</label>
              <select class="c-mini-select__control js-export-scope" id="export-scope" name="scope">
                <option value="view">表示中の範囲</option>
                <option value="all">全期間</option>
              </select>
            </div>
            <button class="c-button c-button--primary c-button--sm js-export-xlsx" type="button">Excelで書き出す</button>
            <button class="c-button c-button--ghost c-button--sm js-export-csv" type="button">CSV</button>
          </div>
        </div>

        <div class="p-log__list js-log-list"></div>
        <p class="p-log__empty js-empty">記録を読み込んでいます…</p>
      </section>

    </div>
  </main>

  <!-- =========================================================
       Footer
  ========================================================= -->
  <footer class="l-footer">
    <div class="l-container l-footer__inner">
      <p class="l-footer__text">Do.Link 運用ログ ／ 記録の追加・編集は管理者のみ。どなたでも閲覧と書き出しができます。</p>
      <button class="l-footer__link js-login-open" type="button">管理者ログイン</button>
    </div>
  </footer>

  <!-- SP用：記録フォームへのショートカット（管理者のみ） -->
  <a class="c-fab js-fab" href="#entry" hidden>
    <span class="c-fab__icon" aria-hidden="true">＋</span>
    作業を記録
  </a>

  <!-- =========================================================
       Dialog：管理者ログイン
  ========================================================= -->
  <dialog class="c-dialog js-login" aria-labelledby="login-title">
    <form class="c-dialog__inner c-form js-login-form" method="dialog" novalidate>
      <h2 id="login-title" class="c-dialog__title">管理者ログイン</h2>
      <p class="c-dialog__text">config.php に設定した管理者パスワードを入力してください。ログイン状態はこのブラウザで30日間保持されます。</p>
      <div class="c-field">
        <label class="c-field__label" for="login-key">
          パスワード
          <span class="c-field__badge c-field__badge--required">必須</span>
        </label>
        <input
          class="c-field__control"
          type="password"
          id="login-key"
          name="key"
          required
          minlength="4"
          maxlength="128"
          placeholder="管理者パスワード"
          autocomplete="current-password"
          aria-describedby="login-key-error">
        <p class="c-field__error" id="login-key-error" aria-live="polite"></p>
      </div>
      <div class="c-dialog__actions">
        <button class="c-button c-button--ghost c-button--sm js-login-cancel" type="button">キャンセル</button>
        <button class="c-button c-button--primary c-button--sm js-login-submit" type="submit">ログイン</button>
      </div>
    </form>
  </dialog>

  <!-- 初期データ（main.js が読み込む。表示後は api.php と自動同期） -->
  <script type="application/json" id="initial-data"><?= $initialJson ?></script>

  <!-- 通知 -->
  <div class="c-toast js-toast" role="status" aria-live="polite"></div>
</body>
</html>
