/**
 * 1ファイル版のビルド
 * -----------------------------------------------------------------------------
 * CSS と JS を index.html に埋め込み、HTML 1枚だけで完結する版を出力する。
 *
 * なぜ必要か
 *   通常版はフォルダごと配布する必要があり、
 *   「メールに添付する」「USBメモリで渡す」「LINEで送る」ができない。
 *   被災時にツールを人に渡す手段は多いほどよいので、1枚版も用意する。
 *
 * 使い方
 *   node build-single-file.js
 *
 * 出力
 *   dist/避難所持ち物チェックリスト.html   ブラウザで開ける完全版
 *   dist/artifact.html                      HTML断片（外側の骨組みを持たない環境用）
 *
 * 注意
 *   1ファイル版は Service Worker を持たない（単体のHTMLからは登録できない）。
 *   ただし保存したファイル自体が手元にあるので、オフラインでは開ける。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const html = read('index.html');
const css = read('assets/css/style.css');
const items = read('assets/js/data/items.js');
const app = read('assets/js/app.js');

/* </script> や </style> がソース中にあると埋め込み先が途中で閉じてしまう。
   現状は含まれないが、将来データに紛れ込んだ場合に黙って壊れないよう検査する */
[['CSS', css], ['items.js', items], ['app.js', app]].forEach(([name, code]) => {
  if (/<\/(script|style)/i.test(code)) {
    throw new Error(name + ' に </script> または </style> が含まれています。埋め込めません。');
  }
});

let out = html;

/* --- CSS を埋め込む ------------------------------------------------------ */
out = out.replace(
  /<!-- 外部ドメイン[\s\S]*?<link rel="stylesheet" href="assets\/css\/style\.css">/,
  '<style>\n' + css + '</style>'
);

/* --- manifest は1ファイル版では参照できないので外す --------------------- */
out = out.replace(/\s*<link rel="manifest"[^>]*>/, '');

/* --- JS を埋め込み、Service Worker の登録ブロックを差し替える ----------- */
out = out.replace(
  /<script src="assets\/js\/data\/items\.js"><\/script>[\s\S]*?<\/script>\s*(?=<\/body>)/,
  '<script>\n' + items + '</script>\n<script>\n' + app + '</script>\n'
);

/* 埋め込み漏れがあれば、壊れたファイルを出す前に止める */
['assets/css/style.css', 'assets/js/app.js', 'assets/js/data/items.js', 'manifest.webmanifest']
  .forEach((ref) => {
    if (out.includes(ref)) throw new Error('埋め込みに失敗しました: ' + ref + ' への参照が残っています');
  });
if (out.includes('serviceWorker')) throw new Error('Service Worker の登録処理が残っています');

fs.mkdirSync(DIST, { recursive: true });

/* --- 出力1: そのままブラウザで開ける完全版 ------------------------------ */
fs.writeFileSync(path.join(DIST, '避難所持ち物チェックリスト.html'), out, 'utf8');

/* --- 出力2: 外側の骨組みを持たない断片版 --------------------------------
   <!doctype>〜<body> を自前で用意する埋め込み先（Artifact 等）向け。
   <title> は識別に使われるので残す。 */
const titleTag = (out.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
const headExtras = (out.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
const bodyInner = out.slice(out.indexOf('<body>') + '<body>'.length, out.lastIndexOf('</body>'));

fs.writeFileSync(
  path.join(DIST, 'artifact.html'),
  titleTag + '\n' + headExtras + '\n' + bodyInner.trim() + '\n',
  'utf8'
);

const kb = (p) => (fs.statSync(path.join(DIST, p)).size / 1024).toFixed(1) + ' KB';
console.log('dist/避難所持ち物チェックリスト.html  ' + kb('避難所持ち物チェックリスト.html'));
console.log('dist/artifact.html                    ' + kb('artifact.html'));
