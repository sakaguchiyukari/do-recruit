/**
 * ★正本は iro-templates/core/scripts/generate-sass-index.js（テンプレート側のコピーは npm run sync で上書きされる）
 *
 * Sass の module/_index.scss を自動生成するスクリプト
 *
 * module/ に _xxx.scss を置くと、@forward "xxx"; を並べた _index.scss を作り直す。
 * → パーツを追加するたびに手で @forward を書き足す必要がなくなる（＝書き忘れゼロ）。
 *
 * base（reset → base）と global（変数 → 関数 → mixin）は読み込む順番に意味があるので、
 * ここでは触らず _index.scss を手書きのまま維持する。順不同で安全なのは module だけ。
 *
 * 使い方: node scripts/generate-sass-index.js
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 自動生成する層（module のみ）
const TARGET_DIRS = ['module'];
const SASS_DIR = join(__dirname, '..', 'sass');

function buildIndex(dirName) {
  const dirPath = join(SASS_DIR, dirName);

  const partials = readdirSync(dirPath)
    .filter(
      (file) =>
        file.startsWith('_') &&
        file.endsWith('.scss') &&
        file !== '_index.scss' // 自分自身は含めない（無限ループ・循環参照の防止）
    )
    .map((file) => file.slice(1, -5)) // 先頭の "_" と末尾の ".scss" を除いてパーツ名にする
    .sort((a, b) => a.localeCompare(b)); // アルファベット順（module のパーツは互いに独立なので順不同でOK）

  const header =
    '// ⚠ このファイルは自動生成されます（scripts/generate-sass-index.js）\n' +
    '// module/ に _xxx.scss を追加・削除すると、保存時に自動で作り直されます。\n' +
    '// 手で編集しても次の保存で上書きされます。順番を制御したいときは生成スクリプト側を直してください。\n\n';

  const body = partials.length
    ? partials.map((name) => `@forward "${name}";`).join('\n') + '\n'
    : '// （まだパーツがありません。module/ に _xxx.scss を作ってください）\n';

  writeFileSync(join(dirPath, '_index.scss'), header + body);
  console.log(`[sass-index] ${dirName}/_index.scss を生成しました（${partials.length}件）`);
}

for (const dir of TARGET_DIRS) {
  buildIndex(dir);
}
