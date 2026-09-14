/* =========================================================================
   ドゥ.ヨネザワ企業グループ 採用サイト - 社員紹介一覧
   1) 部署カテゴリー絞り込み
   2) IntersectionObserver によるフェードイン
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* ----------------------------------------------------------------------
     1. カテゴリー絞り込み
     - data-filter（ボタン）と data-category（カード）を突き合わせて表示切替
     ---------------------------------------------------------------------- */
  const filterButtons = document.querySelectorAll(".doyg-filter__btn");
  const cards = document.querySelectorAll(".doyg-card");

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;

      // ボタンの選択状態を更新
      filterButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });

      // カードの表示／非表示を切り替え
      cards.forEach((card) => {
        const show = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });

  /* ----------------------------------------------------------------------
     2. スクロールフェードイン（IntersectionObserver）
     ---------------------------------------------------------------------- */
  const fadeTargets = document.querySelectorAll(".js-fade");

  // 非対応環境ではそのまま表示（フォールバック）
  if (!("IntersectionObserver" in window)) {
    fadeTargets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target); // 一度表示したら監視を解除
        }
      });
    },
    {
      threshold: 0.15,           // カードが15%見えたら発火
      rootMargin: "0px 0px -8%", // 画面下端より少し手前で発火
    }
  );

  fadeTargets.forEach((el) => observer.observe(el));
});
