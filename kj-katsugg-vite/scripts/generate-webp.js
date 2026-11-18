/**
 * ★正本は iro-templates/core/scripts/generate-webp.js（テンプレート側のコピーは npm run sync で上書きされる）
 *
 * WebP生成スクリプト
 * images/ 内のJPG/PNG画像からWebPファイルを同じディレクトリに生成する
 * 使い方: node scripts/generate-webp.js
 */

import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

const IMAGES_DIR = 'images';
const EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const WEBP_QUALITY = 80;

// 対象ディレクトリを再帰的に探索してWebPを生成する
async function processDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    if (!EXTENSIONS.includes(ext)) continue;

    const webpPath = fullPath.replace(/\.[^.]+$/, '.webp');
    const name = basename(entry.name);

    try {
      // 既存のWebPがあり、元画像より新しければスキップ
      try {
        const [srcStat, webpStat] = await Promise.all([
          stat(fullPath),
          stat(webpPath),
        ]);
        if (webpStat.mtimeMs >= srcStat.mtimeMs) {
          console.log(`  スキップ: ${name}（WebPが最新）`);
          continue;
        }
      } catch {
        // WebPが存在しない場合は生成に進む
      }

      await sharp(fullPath).webp({ quality: WEBP_QUALITY }).toFile(webpPath);
      console.log(`  生成: ${name} → ${basename(webpPath)}`);
    } catch (err) {
      console.error(`  エラー: ${name} - ${err.message}`);
    }
  }
}

console.log('WebP生成を開始します...');
await processDirectory(IMAGES_DIR);
console.log('WebP生成が完了しました。');
