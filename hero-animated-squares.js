/* =========================================================
   SWELL 採用ファーストビュー用スクリプト
   ・業種ワードの切り替え
   ・スクロールでフェードイン

   貼り付け先（どちらか）:
   ・SWELL:「カスタマイザー > 高度な設定 > head/body 出力コード」の
     </body>直前 に <script>〜</script> で囲んで貼る
   ・または子テーマの footer などに読み込み
   ※ 四角形のアニメーションはCSSのみで動くため、JSが無くても動きます
========================================================= */
(function () {
  var run = function () {

    /* 業種ワード切替 */
    var words = [
      "ITのしごと",
      "ゴルフのしごと",
      "販売のしごと",
      "飲食のしごと",
      "健康のしごと"
    ];
    var wordEl = document.getElementById("fvWord");
    if (wordEl) {
      var index = 0;
      setInterval(function () {
        wordEl.classList.add("is-changing");
        setTimeout(function () {
          index = (index + 1) % words.length;
          wordEl.textContent = words[index];
          wordEl.classList.remove("is-changing");
        }, 450);
      }, 3200);
    }

    /* フェードイン */
    var faders = document.querySelectorAll(".fv-hero__fade");
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      faders.forEach(function (el) { observer.observe(el); });
    } else {
      /* 非対応ブラウザは即表示 */
      faders.forEach(function (el) { el.classList.add("is-visible"); });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
