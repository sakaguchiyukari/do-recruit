/**
 * ライフラインサポート — オフライン対応（PWA）
 * -----------------------------------------------------------------------------
 * このアプリの中核。通信が無いときこそ必要になる道具なので、
 * 「初回に開いた時点で、全部の情報が端末に入っている」状態をつくる。
 *
 * ここでは以下を担当する。
 *   1. Service Worker の登録（＝全ページ・全データの端末保存）
 *   2. オンライン / オフラインの表示
 *   3. ホーム画面への追加（インストール）の案内
 *   4. 新しい内容が届いたときの更新案内
 */

/**
 * 各ページ共通のステータス表示を更新する。
 * ヘッダーのバッジは1語だけにし、詳しい説明は本文側の帯に出す
 * （ヘッダーで折り返すとタイトルが潰れるため）。
 */
function renderNetworkStatus() {
  const online = navigator.onLine;

  document.querySelectorAll('[data-net-status]').forEach((node) => {
    node.dataset.state = online ? 'online' : 'offline';
    node.textContent = online ? 'オンライン' : 'オフライン';
  });

  const note = document.querySelector('[data-offline-note]');
  if (note) note.hidden = online;

  // 外部リンクは通信が要る。オフラインのときはその旨を各リンクに添える。
  document.documentElement.dataset.online = online ? 'yes' : 'no';
}

/** Service Worker を登録し、更新があれば案内を出す */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // file:// で開いたときなど、安全なコンテキストでなければ登録できない
  if (!window.isSecureContext) return;

  // sw.js はアプリのルートに置き、下層ページも同じ1つを共有する。
  // 下層から見た相対位置は <html data-app-root="../"> で受け取る。
  const root = document.documentElement.dataset.appRoot || './';
  const swUrl = new URL(`${root}sw.js`, location.href).href;

  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      const saved = document.querySelector('[data-offline-ready]');
      if (saved && (registration.active || navigator.serviceWorker.controller)) {
        saved.hidden = false;
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          // 既に動いている SW がある状態で installed になった＝更新版が届いた
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            const banner = document.querySelector('[data-update-banner]');
            if (!banner) return;
            banner.hidden = false;
            const button = banner.querySelector('[data-update-apply]');
            if (button) {
              button.addEventListener(
                'click',
                () => {
                  installing.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                },
                { once: true }
              );
            }
          }
        });
      });
    })
    .catch((error) => {
      console.error('[pwa] Service Worker の登録に失敗しました', error);
    });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_READY') {
      const saved = document.querySelector('[data-offline-ready]');
      if (saved) saved.hidden = false;
    }
  });
}

/** ホーム画面への追加を案内する */
function setupInstallPrompt() {
  const button = document.querySelector('[data-install]');
  if (!button) return;

  let deferred = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    // 既定のミニバーを抑え、自前のボタンから出す
    event.preventDefault();
    deferred = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    button.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    button.hidden = true;
  });
}

export function initPwa() {
  renderNetworkStatus();
  window.addEventListener('online', renderNetworkStatus);
  window.addEventListener('offline', renderNetworkStatus);
  registerServiceWorker();
  setupInstallPrompt();
}
