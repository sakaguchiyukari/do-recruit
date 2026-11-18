/**
 * ★このファイルの正本は iro-templates/core/vite.config.js
 * 各テンプレート内のコピーは `npm run sync` で上書きされる。テンプレート側で直接編集しない。
 * Vite機構は全テンプレート共通＝ここを直して sync すれば static-template / student-template に流れる。
 */
import { defineConfig } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

// 出力するCSSの名前を sass/ 直下のscss（styles.scss）から決める → styles.css
const cssName = (() => {
  try {
    const entry = fs
      .readdirSync(path.resolve(__dirname, 'sass'))
      .find((f) => f.endsWith('.scss') && !f.startsWith('_'));
    return entry ? path.basename(entry, '.scss') : 'styles';
  } catch {
    return 'styles';
  }
})();

// dev中に画像が追加・変更されたらWebPを自動生成するプラグイン
function autoWebp() {
  return {
    name: 'auto-webp',
    configureServer(server) {
      const run = (file) => {
        // Windowsは C:\...\images\x.jpg のように \ 区切りで渡ってくるので / に揃えてから判定する
        const p = file.replace(/\\/g, '/');
        if (/images\/.*\.(jpe?g|png)$/i.test(p)) {
          exec('node scripts/generate-webp.js', (err, stdout) => {
            if (err) console.error('[webp] 失敗:', err.message);
            if (stdout) console.log(stdout.trim());
          });
        }
      };
      server.watcher.on('add', run);
      server.watcher.on('change', run);
    },
  };
}

// dev中に module/ へ scss が追加・削除されたら _index.scss を自動で作り直す
// → @forward の書き忘れが起きない（パーツを置くだけでスタイルが効く）
function autoSassIndex() {
  return {
    name: 'auto-sass-index',
    configureServer(server) {
      const run = (file) => {
        // Windowsは C:\...\sass\module\_x.scss のように \ 区切りで渡ってくるので / に揃えてから判定する
        const p = file.replace(/\\/g, '/');
        // module 内の _xxx.scss の増減だけ拾う（_index.scss 自身は無視＝無限ループ防止）
        if (/sass\/module\/_(?!index\.scss)[^/]*\.scss$/i.test(p)) {
          exec('node scripts/generate-sass-index.js', (err, stdout) => {
            if (err) console.error('[sass-index] 失敗:', err.message);
            if (stdout) console.log(stdout.trim());
          });
        }
      };
      server.watcher.on('add', run);
      server.watcher.on('unlink', run);
    },
  };
}

/* images/ に置いた画像を、参照が見つからないものも含めて dist/images/ に出力する。
   Viteは「HTML・CSS・JSからたどれた画像」しか dist に書き出さない仕様のため、
     ・OGP画像（絶対URLで書くとViteは外部URLとみなして無視する）
     ・faviconセット（.ico や webmanifest 内のアイコンは link タグを経由しないので追えない）
     ・JSに文字列で書いた画像パス（'images/location/2.jpg' など）
   がdistから丸ごと抜け落ち、npm run dev では表示できるのにアップすると404になる。
   ここで images/ の中身を直接バンドルに積むことで、フォルダ構成も画像圧縮も効いたまま取りこぼしを防ぐ。
   ※ 画像以外（PDF・動画・robots.txt等）はVite標準の public/ に置く。 */
function emitAllImages() {
  const IMAGE_EXT = /\.(jpe?g|png|gif|svg|webp|avif|ico)$/i;

  // images/ 以下を再帰的に集める（先頭がドットのファイルは .DS_Store 等なので除外）
  const collect = (dir, acc = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(full, acc);
      else if (IMAGE_EXT.test(entry.name)) acc.push(full);
    }
    return acc;
  };

  return {
    name: 'emit-all-images',
    apply: 'build', // devサーバーは元から images/ をそのまま配信するので、ビルド時だけでよい
    generateBundle(_options, bundle) {
      const imagesDir = path.resolve(__dirname, 'images');
      if (!fs.existsSync(imagesDir)) return;

      let added = 0;
      for (const abs of collect(imagesDir)) {
        // Windowsの \ 区切りを / に揃える
        const rel = path.relative(__dirname, abs).replace(/\\/g, '/');
        if (bundle[rel]) continue; // 参照が見つかった画像はViteがすでに出力済み
        this.emitFile({ type: 'asset', fileName: rel, source: fs.readFileSync(abs) });
        added++;
      }

      if (added > 0) {
        console.log(`[images] 参照が見つからなかった画像 ${added}件も dist/images/ に出力しました`);
      }
    },
  };
}

export default defineConfig({
  // ビルド対象のHTMLを指定（マルチページは配列で追加する）
  // 例: ['index.html', 'about.html', 'contact.html']
  root: '.',
  base: './',
  server: {
    open: true, // npm run dev したときにブラウザを自動で開く
  },
  build: {
    outDir: 'dist',
    cssMinify: false, // 納品3原則: CSSは非圧縮（先方コーダーが読める状態）。圧縮は先方指定時のみtrueへ
    minify: false, // JSも非圧縮（同上）
    assetsInlineLimit: 0, // 小さい画像もdata URIに埋め込まず画像ファイルとして書き出す（先方コーダーが差し替えやすい）
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        // ページを追加する場合はここに追記する
        // about:   path.resolve(__dirname, 'about/index.html'),
        // contact: path.resolve(__dirname, 'contact/index.html'),
      },
      output: {
        /* 納品用にハッシュ無しの素直な構成で出す（既定は dist/assets/ へ全ファイル平置き＋
           ハッシュ付き = main-DyQFGBCk.js のような名前になり、納品物として読みづらい）。
           CSS→css/ JS→js/ 画像→images/。
           画像は images/ 以下のフォルダ構成（fv/ common/ 等）をそのまま保つので、
           別フォルダに同名ファイルがあっても衝突しない。 */
        assetFileNames: (info) => {
          const src = (info.originalFileNames?.[0] || info.originalFileName || '').replace(/\\/g, '/');
          const name = info.names?.[0] || info.name || '';

          // CSS → css/styles.css（元の .scss の名前を引き継ぐ）
          if (name.endsWith('.css')) {
            const base = /\.(scss|sass|css)$/i.test(src)
              ? path.basename(src).replace(/\.[^.]+$/, '')
              : cssName;
            return `css/${base}.css`;
          }

          // 画像 → images/（サブフォルダも維持）
          if (src.startsWith('images/')) return src;

          return '[name][extname]';
        },
        entryFileNames: 'js/[name].bundle.js', // 入力(js/script.js)と同名だとビルドがソースを上書きするため分離。非圧縮のため.minでなく.bundle
        chunkFileNames: 'js/[name].bundle.js', // 動的import等でチャンクが出た場合もassets/に散らばらせない
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Sass警告を抑制（legacy API非推奨メッセージ対策）
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
  plugins: [
    autoSassIndex(),
    autoWebp(),
    emitAllImages(),
    ViteImageOptimizer({
      /* 画像劣化の方針: 「非可逆圧縮は元画像から1回だけ」。
         - WebPは全てgenerate-webp.jsが元画像から生成済み → ここで再圧縮すると二重非可逆になるため全除外
           （背景帯の境目ペアの画素連続性も命名に依存せず守られる）
         - PNGはパレット減色禁止（sharpはquality指定でpalette=256色化が自動ONになり、グラデ・写真が
           バンディング＝等高線状の筋になる。デフォルトのquality:100でも同じ）→ palette:false + ロスレス圧縮のみ
         - 配信の主役はWebP（picture/CSS参照とも）。PNGはフォールバック用なので無劣化のままでよい
         詳細: shared/rules/styling-common.md「写真のファイル形式」「CSS グラデーション背景」 */
      /* SVGも除外する。①最適化にはsvgoの別途インストールが必要でビルドがエラーを出す
         ②プラグイン既定のSVGO設定は preset-default をそのまま使うため viewBox が削除され、
         mask-image + mask-size: contain で使うアイコンの拡縮が壊れる。
         アイコンSVGは元々1KB前後で最適化の利得もない */
      exclude: /\.(?:webp|svg)$/i,
      // JPEGの圧縮設定
      jpg: {
        quality: 80,
      },
      // JPEGと同じ設定（拡張子違い）
      jpeg: {
        quality: 80,
      },
      // PNGはロスレスのみ（quality/paletteは指定しない＝減色させない）
      png: {
        palette: false,
        compressionLevel: 9,
      },
    }),
  ],
});
