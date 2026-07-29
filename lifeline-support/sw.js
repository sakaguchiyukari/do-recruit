/**
 * ライフラインサポート — Service Worker
 * -----------------------------------------------------------------------------
 * このアプリでいちばん重要な部分。
 * 「通信があるうちに全部を端末へ保存し、通信が無いときはそこから読む」を実現する。
 *
 * ■ 方針
 *   ・インストール時に全ページ・全スクリプト・全データを precache する。
 *     一部だけ保存して「開いたら白紙」になる事態を避けるため、部分キャッシュはしない。
 *   ・取得は cache first。オフラインでも即座に開き、通信があれば裏で更新を取りに行く。
 *   ・自動では新版に切り替えない。閲覧中に内容が入れ替わると混乱するため、
 *     画面の「更新する」を押したときだけ切り替える（SKIP_WAITING メッセージ）。
 *
 * ■ 内容を更新したときは CACHE_VERSION を必ず上げること。
 */

const CACHE_VERSION = 'lifeline-support-v2';

/** sw.js からの相対パス。アプリの全ファイルをここに列挙する。 */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './lifehacks/',
  './lifehacks/index.html',
  './links/',
  './links/index.html',
  './memo/',
  './memo/index.html',
  './about/',
  './about/index.html',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/page-lifehacks.js',
  './assets/js/page-links.js',
  './assets/js/page-memo.js',
  './assets/js/page-static.js',
  './assets/js/pages/home.js',
  './assets/js/pages/lifehacks.js',
  './assets/js/pages/links.js',
  './assets/js/pages/memo.js',
  './assets/js/modules/dom.js',
  './assets/js/modules/state.js',
  './assets/js/modules/render.js',
  './assets/js/modules/region-form.js',
  './assets/js/modules/theme.js',
  './assets/js/modules/pwa.js',
  './assets/js/modules/status-bar.js',
  './assets/js/data/situations.js',
  './assets/js/data/items.js',
  './assets/js/data/links.js',
  './assets/icon/icon.svg',
  './assets/icon/icon-192.png',
  './assets/icon/icon-512.png',
  './assets/icon/maskable-512.png',
  './assets/icon/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // 1件でも欠けると addAll 全体が失敗するため、1件ずつ入れて
      // 取りこぼしがあっても「ほぼ全部保存できている」状態にする。
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch (error) {
            console.warn('[sw] 保存できませんでした:', url, error);
          }
        })
      );
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      );
      await self.clients.claim();

      // 保存が完了したことを画面に知らせる（「この端末に保存済みです」の表示用）
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.postMessage({ type: 'CACHE_READY' }));
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * cache first + 背後で更新。
 * オフラインを前提にしているので、まずキャッシュを返して画面を止めない。
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // 外部サイト（公的機関のリンク先など）はキャッシュしない
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request, { ignoreSearch: true });

      const fetchAndUpdate = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        // 更新の取得は待たない（オフラインなら失敗するだけ）
        event.waitUntil(fetchAndUpdate);
        return cached;
      }

      const fresh = await fetchAndUpdate;
      if (fresh) return fresh;

      // 未保存のページをオフラインで開いたときは、ホームを返す
      if (request.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }

      return new Response('オフラインのため、この内容は表示できません。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })()
  );
});
