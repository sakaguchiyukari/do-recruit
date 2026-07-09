<?php
/**
 * SWELL WordPress テーマ — オープニング・キャッチコピー組み込み
 * 「まいにちに『プラス』をつぎつぎと」を初回表示でフルスクリーン表示し、
 * その後 home（フロントページ）を表示する。
 *
 * 使い方:
 *   1. opening-catchcopy.css / opening-catchcopy.js を
 *      子テーマの assets/ ディレクトリに置く
 *   2. 子テーマの functions.php にこのコードを追加する
 */

// =============================================
// CSS & JS をエンキュー（フロントページのみ）
// =============================================
add_action('wp_enqueue_scripts', function () {
    if (!is_front_page()) return;

    wp_enqueue_style(
        'fv-opening',
        get_stylesheet_directory_uri() . '/assets/opening-catchcopy.css',
        [],
        '1.0.0'
    );

    wp_enqueue_script(
        'fv-opening',
        get_stylesheet_directory_uri() . '/assets/opening-catchcopy.js',
        [],
        '1.0.0',
        true // フッターに出力
    );
});

// =============================================
// オーバーレイを <body> 先頭に出力
// （home が描画される前に画面全体を覆う）
// =============================================
add_action('wp_body_open', function () {
    if (!is_front_page()) return;
    ?>
    <div class="fv-opening" id="fvOpening" role="dialog" aria-label="オープニング" aria-live="polite">
      <div class="fv-opening__inner">
        <p class="fv-opening__copy">
          <span class="fv-opening__line fv-opening__line--1">まいにちに</span>
          <span class="fv-opening__line fv-opening__line--2"><span class="fv-opening__plus">「プラス」</span>を</span>
          <span class="fv-opening__line fv-opening__line--3">つぎつぎと</span>
        </p>
      </div>
    </div>
    <script>
    // 描画前に判定：セッション2回目以降は即撤去（チラつき防止）。
    // 初回はスクロールをロックしておく。
    (function () {
      try {
        var el = document.getElementById('fvOpening');
        if (!el) return;
        if (sessionStorage.getItem('fvOpeningShown')) {
          el.parentNode.removeChild(el);
        } else {
          document.documentElement.classList.add('fv-opening-lock');
        }
      } catch (e) {}
    })();
    </script>
    <?php
}, 1);
