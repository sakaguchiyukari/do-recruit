/**
 * 避難所持ち物チェックリスト — Service Worker
 * -----------------------------------------------------------------------------
 * 目的はただ一つ。「一度でも開いたことがあるなら、圏外でも必ず開ける」こと。
 *
 * 方針
 *  ・アプリ本体（HTML/CSS/JS）は cache first。
 *    被災時は回線が生きていても極端に遅い。ネットワークを待たずに即表示する。
 *  ・更新はバックグラウンドで取得し、次回起動時に反映する（stale-while-revalidate）。
 *    表示中に中身が入れ替わって混乱させない。
 *  ・CACHE_NAME を変えると古いキャッシュを捨てる。内容を更新したら必ず上げること。
 */

var CACHE_NAME = 'evacuation-checklist-v1';

/* オフラインで動くために最低限必要なファイル。
   1つでも取得に失敗するとインストール全体が失敗するため、点数を絞っている */
var PRECACHE_URLS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/data/items.js',
  './manifest.webmanifest',
  './assets/img/icon.svg',
  './assets/img/icon-maskable.svg',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      /* 古い版が残っているより、新しい版がすぐ効くほうが望ましい */
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== CACHE_NAME) return caches.delete(key);
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  /* GET 以外と、自分のスコープ外への通信には手を出さない */
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(function (cached) {
      var network = fetch(request)
        .then(function (response) {
          /* 正常なレスポンスだけ保存する。
             エラーページをキャッシュしてしまうと、以後ずっとそれが返る */
          if (response && response.ok && response.type === 'basic') {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          /* オフライン。キャッシュがあればそれを、
             無ければトップページを返して真っ白を避ける */
          return cached || caches.match('./index.html');
        });

      return cached || network;
    })
  );
});
