/**
 * ライフラインサポート — 1ファイル版（プレビュー）の生成
 * -----------------------------------------------------------------------------
 * 使い方：node tools/build-preview.mjs [--body <出力先>]
 * 出力  ：preview.html
 *         --body を付けると、<html>/<head>/<body> を持たない本文だけの版も出す
 *         （外部のページ埋め込みサービスに渡す用。リポジトリには含めない）
 *
 * ■ なぜ必要か
 *   本体は複数ページ + ES モジュール構成のため、静的ホスティングが要る。
 *   一方で「とりあえずブラウザで見たい」「1ファイルを渡して確認してほしい」
 *   という場面が必ずある。そのための出力を、本体から自動生成する。
 *
 * ■ 二重管理をしない
 *   HTML は各ページの <main> の中身をそのまま抜き出し、
 *   CSS と JS も本体のファイルをそのまま読み込む。
 *   このスクリプトは「つなぎ方」だけを知っていて、内容は一切持たない。
 *
 * ■ 本体との違い（プレビュー版の制約）
 *   ・Service Worker を登録しない（＝オフライン保存とホーム画面追加は無効）
 *   ・ページ遷移ではなく、1画面の中でビューを切り替える
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(join(ROOT, p), 'utf8');

/* --------------------------------------------------------------- HTML 抽出 */

/** ページの <main> の中身だけを取り出す */
function extractMain(html) {
  const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!match) throw new Error('<main> が見つかりません');
  return match[1];
}

/** 全ビューで重複する共通パーツ（状態バー・通知帯）を取り除く */
function stripChrome(html) {
  return html
    .replace(/\s*<div class="c-status" data-status-bar hidden><\/div>/g, '')
    .replace(/\s*<p class="c-banner c-banner--warn" data-offline-note hidden>[\s\S]*?<\/p>/g, '')
    .replace(/\s*<div class="c-banner" data-update-banner hidden>[\s\S]*?<\/div>/g, '');
}

/** 地域設定フォームを取り除く（1画面に2つ置くと id が重複するため） */
function stripRegionForm(html) {
  return html.replace(/\s*<details class="c-details"[^>]*>\s*<summary>地域を設定する[\s\S]*?<\/details>/g, '');
}

/**
 * id をビューごとに前置きして、1画面にまとめても衝突しないようにする。
 * id / for / aria-labelledby / href="#..." の4か所を同時に書き換える。
 */
function namespaceIds(html, prefix) {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  let out = html;
  ids.forEach((id) => {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`\\sid="${esc}"`, 'g'), ` id="${prefix}-${id}"`)
      .replace(new RegExp(`\\sfor="${esc}"`, 'g'), ` for="${prefix}-${id}"`)
      .replace(new RegExp(`\\saria-labelledby="${esc}"`, 'g'), ` aria-labelledby="${prefix}-${id}"`)
      .replace(new RegExp(`\\shref="#${esc}"`, 'g'), ` href="#${prefix}-${id}"`);
  });
  return out;
}

/* ----------------------------------------------------------------- JS 結合 */

/**
 * ES モジュールを1つのスクリプトへ連結する。
 * import / export を落とすだけで済むよう、本体側では
 * モジュールをまたぐ識別子の重複を作らないという約束にしている。
 */
function flattenModule(source) {
  return source
    .replace(/^import\s[\s\S]*?;\s*$/gm, '')
    .replace(/^export\s+(?=(const|let|function|class)\s)/gm, '')
    .trim();
}

/** 依存の順に並べる（下に行くほど、上を参照する） */
const MODULE_ORDER = [
  'assets/js/modules/dom.js',
  'assets/js/data/situations.js',
  'assets/js/data/items.js',
  'assets/js/data/links.js',
  'assets/js/modules/state.js',
  'assets/js/modules/render.js',
  'assets/js/modules/region-form.js',
  'assets/js/modules/theme.js',
  'assets/js/modules/pwa.js',
  'assets/js/modules/status-bar.js',
  'assets/js/pages/home.js',
  'assets/js/pages/lifehacks.js',
  'assets/js/pages/links.js',
  'assets/js/pages/memo.js',
];

const VIEWS = [
  { id: 'home', file: 'index.html', icon: '🏠', label: 'ホーム' },
  { id: 'lifehacks', file: 'lifehacks/index.html', icon: '💡', label: 'ライフハック' },
  { id: 'links', file: 'links/index.html', icon: '🔗', label: 'リンク集' },
  { id: 'memo', file: 'memo/index.html', icon: '📝', label: 'メモ' },
  { id: 'about', file: 'about/index.html', icon: 'ℹ️', label: '説明', hideFromTabs: true },
];

/* ------------------------------------------------------------------ 組み立て */

const css = await read('assets/css/style.css');
const iconSvg = (await read('assets/icon/icon.svg')).replace(/\s+/g, ' ').trim();

const viewHtml = [];
for (const view of VIEWS) {
  let main = extractMain(await read(view.file));
  main = stripChrome(main);
  if (view.id === 'links') main = stripRegionForm(main);
  main = namespaceIds(main, view.id);
  viewHtml.push(
    `<div class="p-view" data-view="${view.id}"${view.id === 'home' ? '' : ' hidden'}>\n${main}\n</div>`
  );
}

const modules = [];
for (const path of MODULE_ORDER) {
  modules.push(`/* ===== ${path} ===== */\n${flattenModule(await read(path))}`);
}

const previewBoot = `
/* ===== プレビュー版の起動処理 ===== */
const VIEW_IDS = ${JSON.stringify(VIEWS.map((v) => v.id))};
const VIEW_BY_PATH = {
  './': 'home', '../': 'home',
  'lifehacks/': 'lifehacks', '../lifehacks/': 'lifehacks',
  'links/': 'links', '../links/': 'links',
  'memo/': 'memo', '../memo/': 'memo',
  'about/': 'about', '../about/': 'about',
};

function showView(id) {
  VIEW_IDS.forEach((viewId) => {
    const node = document.querySelector('[data-view="' + viewId + '"]');
    if (node) node.hidden = viewId !== id;
  });
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    const active = tab.dataset.tab === id;
    tab.setAttribute('aria-current', active ? 'page' : 'false');
  });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function boot() {
  // 埋め込み先が <html data-theme="dark"> のように配色を指定している場合は、
  // アプリ側の設定で上書きせずそれに従う（切り替えボタンはその後も使える）。
  const hostTheme = document.documentElement.dataset.theme;
  if (hostTheme === 'dark' || hostTheme === 'light') update({ theme: hostTheme });

  initTheme();
  initStatusBar();
  initNetworkStatus();   // Service Worker はプレビューでは登録しない

  initHome(document.querySelector('[data-view="home"]'));
  initLifehacks(document.querySelector('[data-view="lifehacks"]'));
  initLinks(document.querySelector('[data-view="links"]'));
  initMemo(document.querySelector('[data-view="memo"]'));

  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => showView(tab.dataset.tab));
  });

  // 本体ではページ遷移になっているリンクを、ビュー切り替えに読み替える
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (VIEW_BY_PATH[href]) {
      event.preventDefault();
      showView(VIEW_BY_PATH[href]);
    }
  });

  showView('home');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
`;

const tabs = VIEWS.filter((v) => !v.hideFromTabs)
  .map(
    (view) =>
      `    <li><button type="button" class="l-tabbar__link" data-tab="${view.id}" aria-current="false"><span class="l-tabbar__icon" aria-hidden="true">${view.icon}</span>${view.label}</button></li>`
  )
  .join('\n');

const body = `<title>ライフラインサポート（プレビュー版）</title>
<style>
${css}

/* ---- プレビュー版だけの調整 ---------------------------------------------
   本体では別ページになっている画面を、1つの <main> の中で切り替える。 */
.p-view {
  display: grid;
  gap: 20px;
}

.l-tabbar__link {
  width: 100%;
  border: 0;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
}
</style>

<a class="u-visually-hidden" href="#main">本文へスキップ</a>

<header class="l-header">
  <div class="l-header__inner">
    <p class="l-header__title">ライフラインサポート
      <span class="l-header__sub">地震後の暮らしを支える</span>
    </p>
    <span class="c-net" data-net-status data-state="online">オンライン</span>
    <label class="c-mode__button">
      <input type="checkbox" class="u-visually-hidden" data-saver-toggle>
      <span aria-hidden="true">🌙</span>
      <span class="u-visually-hidden">省電力表示（暗い画面）に切り替える</span>
    </label>
  </div>
</header>

<main id="main" class="l-main">

  <div class="c-status" data-status-bar hidden></div>

  <p class="c-banner c-banner--warn" data-offline-note hidden>
    <span class="c-banner__text">オフラインです。保存済みの内容を表示しています。外部サイトへのリンクは、通信が戻ってからひらけます。</span>
  </p>

  <div class="c-banner">
    <span class="c-banner__text"><strong>これは動作確認用のプレビュー版です。</strong>全画面を1ファイルにまとめてあります。オフライン保存（Service Worker）とホーム画面への追加は、実際に公開したときに有効になります。</span>
  </div>

${viewHtml.join('\n\n')}

</main>

<footer class="l-footer">
  <p>掲載内容は一般的な防災の考え方をまとめたものです。実際の対応は、気象庁・自治体・ライフライン各社の最新の発表に必ず従ってください。</p>
</footer>

<nav class="l-tabbar" aria-label="主要メニュー">
  <ul class="l-tabbar__list">
${tabs}
  </ul>
</nav>

<script type="module">
${modules.join('\n\n')}

${previewBoot}
</script>
`;

/** 単体で開ける完全なHTMLに包む */
const standalone = `<!DOCTYPE html>
<html lang="ja" data-theme="auto" data-saver="off">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="停電・断水・通信障害・ガス停止・食料不足・トイレ。今困っていることを選ぶと、必要な対策だけが優先度順に表示されます。">
<meta name="theme-color" content="#0f3b5c">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(iconSvg)}">
</head>
<body>
${body}</body>
</html>
`;

await writeFile(join(ROOT, 'preview.html'), standalone, 'utf8');
console.log(`preview.html を生成しました（${(Buffer.byteLength(standalone) / 1024).toFixed(0)} KB）`);

// --body <path> … <html>/<head>/<body> を持たない本文だけの版
const bodyFlag = process.argv.indexOf('--body');
if (bodyFlag !== -1 && process.argv[bodyFlag + 1]) {
  const target = process.argv[bodyFlag + 1];
  // 本文だけの版では <html> に属性を付けられないため、JSから初期値を与える
  const bootstrap = `<script>
document.documentElement.dataset.theme = document.documentElement.dataset.theme || 'auto';
document.documentElement.dataset.saver = document.documentElement.dataset.saver || 'off';
</script>
`;
  await writeFile(target, bootstrap + body, 'utf8');
  console.log(`${target} を生成しました（${(Buffer.byteLength(body) / 1024).toFixed(0)} KB）`);
}
