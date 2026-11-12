/**
 * claude.ai の Artifact 用に、1ファイルの HTML を生成するスクリプト
 *
 * 使い方（security-checklist/ で実行）:
 *   node tools/build-artifact.mjs
 *
 * index.html・assets/css/style.css・assets/js/main.js を読み込み、
 * CSS と JS を埋め込んだ dist/artifact.html を出力する。
 * Artifact は <!doctype>・<html>・<head>・<body> を公開時に自動で付けるため、ここでは書かない。
 * ※ dist/artifact.html は生成物なので直接編集しない。元のファイルを直して再生成する。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const html = read('index.html');
const css = read('assets/css/style.css');
const js = read('assets/js/main.js');

// <body> の中身だけを取り出す
const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
if (!bodyMatch) throw new Error('index.html に <body> が見つかりません');
const body = bodyMatch[1].trim();

// </script> や </style> が中に含まれていないか確認（埋め込みが壊れるため）
if (/<\/script/i.test(js)) throw new Error('main.js に </script が含まれています');
if (/<\/style/i.test(css)) throw new Error('style.css に </style が含まれています');

const out = `<title>セキュリティ点検チェックリスト</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="複数のWordPressサイト・静的HTMLサイトの定期セキュリティ点検を、チームで共有して記録するチェックリスト。">
<style>
${css}
</style>
<!-- JS有効時のみフェードインの初期状態を適用するためのフラグ -->
<script>document.documentElement.classList.add('js-enabled');</script>

${body}

<script>
${js}
</script>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/artifact.html'), out);
console.log(`dist/artifact.html を出力しました（${Math.round(Buffer.byteLength(out) / 1024)} KB）`);
