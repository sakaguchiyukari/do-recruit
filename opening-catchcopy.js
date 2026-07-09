/* ==========================================================
  Opening Catchcopy  ―  再生・終了の制御
  ・セッション中は初回のみ再生（sessionStorage）
  ・キャッチコピーを段階表示 → フェードアウトして home を表示
  ・スクロールロック / prefers-reduced-motion 対応
========================================================== */

(function () {
  'use strict';

  var el = document.getElementById('fvOpening');

  // 再訪（セッション2回目以降）は wp_body_open のインラインスクリプトで
  // すでに削除済み → ここでは何もしない
  if (!el) return;

  var root = document.documentElement;

  var reduce =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // このセッションでは表示済みとして記録
  try {
    sessionStorage.setItem('fvOpeningShown', '1');
  } catch (e) {}

  function cleanup() {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    root.classList.remove('fv-opening-lock');
  }

  function finish() {
    el.classList.add('is-done');

    var done = false;

    var remove = function () {
      if (done) return;
      done = true;
      cleanup();
    };

    // フェードアウト完了で撤去
    el.addEventListener('transitionend', function (ev) {
      if (ev.target === el && ev.propertyName === 'opacity') {
        remove();
      }
    });

    // 保険（transitionend が来ない環境）
    setTimeout(remove, 1200);
  }

  // 表示アニメーション開始
  requestAnimationFrame(function () {
    el.classList.add('is-active');
  });

  // キャッチコピーを見せる時間（reduce 時は短縮）
  var hold = reduce ? 500 : 2600;
  setTimeout(finish, hold);
})();
