<?php
/**
 * SWELL WordPress テーマ — Liquid Glass スクロールインジケーター組み込み
 *
 * 使い方:
 * 子テーマの functions.php にこのコードを追加する
 */

// =============================================
// CSS & JS をエンキュー
// =============================================
add_action('wp_enqueue_scripts', function () {
    // フロントページのみ読み込む場合
    if (!is_front_page()) return;

    wp_enqueue_style(
        'liquid-glass-scroll',
        get_stylesheet_directory_uri() . '/assets/scroll-down-liquid-glass.css',
        [],
        '1.0.0'
    );

    wp_enqueue_script(
        'liquid-glass-scroll',
        get_stylesheet_directory_uri() . '/assets/scroll-down-liquid-glass.js',
        [],
        '1.0.0',
        true // フッターに出力
    );
});

// =============================================
// ヒーローセクション内にHTMLを挿入
// SWELLのfvSlider（ファーストビュー）末尾に追加
// =============================================
add_action('wp_footer', function () {
    if (!is_front_page()) return;
    ?>
    <script>
    // SWELLのファーストビューセクションに移動して挿入
    (function() {
        var hero = document.querySelector('.p-top-fv, .c-hero, #hero, section.hero');
        var indicator = document.getElementById('lgScrollIndicator');
        if (hero && indicator) {
            hero.style.position = 'relative';
            hero.appendChild(indicator);
        }
    })();
    </script>
    <?php
});

// =============================================
// または: ショートコードとして使う
// 使い方: [liquid_glass_scroll]
// =============================================
add_shortcode('liquid_glass_scroll', function () {
    ob_start();
    ?>
    <div class="lg-scroll-indicator" id="lgScrollIndicator" aria-label="スクロールして続きを見る" role="button" tabindex="0">
      <div class="lg-capsule">
        <svg class="lg-svg-filters" aria-hidden="true">
          <defs>
            <filter id="lg-refraction" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.015 0.025" numOctaves="3" seed="2" result="noise">
                <animate attributeName="baseFrequency" values="0.015 0.025; 0.02 0.03; 0.015 0.025" dur="8s" repeatCount="indefinite"/>
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
            </filter>
          </defs>
        </svg>
        <div class="lg-refraction-layer" aria-hidden="true"></div>
        <div class="lg-glass-body">
          <div class="lg-depth-back" aria-hidden="true"></div>
          <div class="lg-glass-surface">
            <div class="lg-highlight-top" aria-hidden="true"></div>
            <div class="lg-rim-left" aria-hidden="true"></div>
            <div class="lg-rim-right" aria-hidden="true"></div>
            <span class="lg-label">SCROLL</span>
            <div class="lg-arrow-container" aria-hidden="true">
              <div class="lg-arrow lg-arrow-1">
                <svg viewBox="0 0 16 10" fill="none"><path d="M1 1L8 8L15 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div class="lg-arrow lg-arrow-2">
                <svg viewBox="0 0 16 10" fill="none"><path d="M1 1L8 8L15 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
            <div class="lg-particle lg-p1" aria-hidden="true"></div>
            <div class="lg-particle lg-p2" aria-hidden="true"></div>
            <div class="lg-particle lg-p3" aria-hidden="true"></div>
            <div class="lg-highlight-bottom" aria-hidden="true"></div>
          </div>
        </div>
        <div class="lg-outer-glow" aria-hidden="true"></div>
      </div>
      <canvas class="lg-ripple-canvas" id="lgRippleCanvas" aria-hidden="true"></canvas>
    </div>
    <?php
    return ob_get_clean();
});
