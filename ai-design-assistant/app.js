/**
 * AI Design Assistant
 * ヒアリング→デザイン提案 / チラシ・バナー添削 / レイヤー分解 / SVG出力
 *
 * Claude API (claude-opus-4-8) をブラウザから直接呼び出す。
 * APIキーは localStorage にのみ保存される(サーバーには一切送信しない)。
 */
(() => {
  'use strict';

  const API_URL = 'https://api.anthropic.com/v1/messages';
  const MODEL = 'claude-opus-4-8';
  const KEY_STORAGE = 'ada_api_key';

  const $ = (sel) => document.querySelector(sel);

  /* ---------------------------------------------------------------- *
   *  APIキー管理
   * ---------------------------------------------------------------- */
  const modal = $('#api-key-modal');
  const keyInput = $('#api-key-input');

  function getApiKey() {
    return localStorage.getItem(KEY_STORAGE) || '';
  }
  function openKeyModal() {
    keyInput.value = getApiKey();
    modal.classList.remove('hidden');
    keyInput.focus();
  }
  $('#api-key-btn').addEventListener('click', openKeyModal);
  $('#api-key-save').addEventListener('click', () => {
    const v = keyInput.value.trim();
    if (v) localStorage.setItem(KEY_STORAGE, v);
    modal.classList.add('hidden');
  });
  $('#api-key-clear').addEventListener('click', () => {
    localStorage.removeItem(KEY_STORAGE);
    keyInput.value = '';
  });
  $('#api-key-close').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  /* ---------------------------------------------------------------- *
   *  タブ切り替え
   * ---------------------------------------------------------------- */
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
      $('#tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  /* ---------------------------------------------------------------- *
   *  Claude API 呼び出し(structured outputs)
   * ---------------------------------------------------------------- */
  async function callClaude({ system, messages, schema, maxTokens }) {
    const apiKey = getApiKey();
    if (!apiKey) {
      openKeyModal();
      throw new Error('APIキーが設定されていません。右上の「APIキー設定」から登録してください。');
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        thinking: { type: 'adaptive' },
        system,
        output_config: { format: { type: 'json_schema', schema } },
        messages,
      }),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const err = await res.json();
        detail = err?.error?.message || '';
      } catch (_) { /* ignore */ }
      if (res.status === 401) throw new Error('認証に失敗しました。APIキーを確認してください。');
      if (res.status === 429) throw new Error('レート制限に達しました。しばらく待って再実行してください。');
      if (res.status === 529) throw new Error('APIが混雑しています。しばらく待って再実行してください。');
      throw new Error(`APIエラー(${res.status})${detail ? ': ' + detail : ''}`);
    }

    const data = await res.json();
    if (data.stop_reason === 'refusal') {
      throw new Error('この内容には回答できませんでした。入力内容を変えてお試しください。');
    }
    if (data.stop_reason === 'max_tokens') {
      throw new Error('出力が長すぎて途中で切れました。入力を簡潔にして再実行してください。');
    }
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) throw new Error('応答の解析に失敗しました。再実行してください。');
    return JSON.parse(textBlock.text);
  }

  function setStatus(el, text, kind) {
    el.textContent = text;
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  function downloadSvg(svgText, filename) {
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const esc = (s) => String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

  /* ---------------------------------------------------------------- *
   *  画像読み込みユーティリティ
   * ---------------------------------------------------------------- */
  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve({ img, dataUrl: reader.result });
        img.onerror = () => reject(new Error('画像を読み込めませんでした。'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('ファイルを読み込めませんでした。'));
      reader.readAsDataURL(file);
    });
  }

  /** API送信用に長辺 maxEdge px へ縮小し JPEG base64 を返す */
  function imageForApi(img, maxEdge = 2000) {
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg', width: w, height: h };
  }

  function setupDropZone(zoneId, fileId, previewId, onLoaded) {
    const zone = $(zoneId);
    const input = $(fileId);
    const preview = $(previewId);

    const handle = async (file) => {
      if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return;
      try {
        const loaded = await loadImageFile(file);
        preview.src = loaded.dataUrl;
        preview.classList.remove('hidden');
        onLoaded(loaded);
      } catch (e) {
        alert(e.message);
      }
    };

    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => handle(input.files[0]));
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handle(e.dataTransfer.files[0]);
    });
  }

  /* ================================================================ *
   *  ① デザイン設計(ヒアリング → 提案 + ワイヤーフレーム)
   * ================================================================ */
  const proposalSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['concept', 'rationale', 'layout', 'catchcopy', 'colors', 'fonts', 'photo_direction'],
    properties: {
      concept: { type: 'string', description: 'デザインコンセプト(1〜2文)' },
      rationale: { type: 'string', description: 'このデザインにした理由の説明' },
      layout: {
        type: 'object',
        additionalProperties: false,
        required: ['description', 'blocks'],
        properties: {
          description: { type: 'string', description: 'レイアウト構成の説明' },
          blocks: {
            type: 'array',
            description: '紙面を構成するブロック。座標・サイズはキャンバスに対する%(0-100)',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'x', 'y', 'w', 'h', 'note'],
              properties: {
                label: { type: 'string', description: 'ブロック名(例:メインビジュアル)' },
                x: { type: 'number' },
                y: { type: 'number' },
                w: { type: 'number' },
                h: { type: 'number' },
                note: { type: 'string', description: '入る内容の補足' },
              },
            },
          },
        },
      },
      catchcopy: {
        type: 'object',
        additionalProperties: false,
        required: ['main', 'sub', 'cta'],
        properties: {
          main: { type: 'array', items: { type: 'string' }, description: 'メインコピー5案' },
          sub: { type: 'array', items: { type: 'string' }, description: 'サブコピー3案' },
          cta: { type: 'array', items: { type: 'string' }, description: 'CTA文言3案' },
        },
      },
      colors: {
        type: 'object',
        additionalProperties: false,
        required: ['palette', 'rationale'],
        properties: {
          palette: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['role', 'hex', 'usage'],
              properties: {
                role: { type: 'string', description: '役割(メイン/サブ/アクセント/背景/文字)' },
                hex: { type: 'string', description: '#RRGGBB形式' },
                usage: { type: 'string', description: '使いどころ' },
              },
            },
          },
          rationale: { type: 'string' },
        },
      },
      fonts: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['role', 'name', 'alternative', 'reason'],
          properties: {
            role: { type: 'string', description: '見出し/本文など' },
            name: { type: 'string' },
            alternative: { type: 'string', description: 'Google Fonts等の無料代替' },
            reason: { type: 'string' },
          },
        },
      },
      photo_direction: { type: 'string', description: '写真・画像の方向性' },
    },
  };

  let lastWireframeSvg = '';
  let lastPaletteSvg = '';

  $('#plan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#plan-submit');
    const status = $('#plan-status');
    const sizeSel = $('#p-size');
    const opt = sizeSel.selectedOptions[0];
    const canvasW = Number(opt.dataset.w);
    const canvasH = Number(opt.dataset.h);

    const brief = [
      `業種: ${$('#p-industry').value.trim()}`,
      `ターゲット: ${$('#p-target').value.trim()}`,
      `目的: ${$('#p-goal').value.trim()}`,
      `サイズ・媒体: ${sizeSel.value}(縦横比 ${canvasW}:${canvasH})`,
      `テイスト: ${$('#p-taste').value.trim() || '指定なし(業種・目的から最適なものを提案)'}`,
      `掲載したい情報: ${$('#p-content').value.trim() || '特になし(標準的な構成で提案)'}`,
      `ブランドカラー・指定色: ${$('#p-brand').value.trim() || '指定なし'}`,
    ].join('\n');

    btn.disabled = true;
    setStatus(status, 'AIがデザインを設計しています…(30秒〜2分ほどかかります)', 'loading');

    try {
      const result = await callClaude({
        system:
          'あなたは日本のデザイン事務所のベテランアートディレクターです。' +
          'ヒアリング内容をもとに、印刷・入稿にそのまま活かせる実践的なデザイン設計を提案してください。' +
          '配色はWCAGのコントラストにも配慮し、hexは必ず#RRGGBB形式で出力してください。' +
          'レイアウトのblocksは重なりを避け、余白(マージン)も考慮した%座標で配置してください。' +
          'すべて日本語で出力してください。',
        messages: [{ role: 'user', content: `以下のヒアリング内容でデザインを設計してください。\n\n${brief}` }],
        schema: proposalSchema,
        maxTokens: 8192,
      });
      renderProposal(result, canvasW, canvasH);
      setStatus(status, '完了しました。', '');
    } catch (err) {
      setStatus(status, err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  function renderProposal(r, canvasW, canvasH) {
    $('#r-concept').textContent = r.concept;
    $('#r-rationale').textContent = r.rationale;
    $('#r-photo').textContent = r.photo_direction;
    $('#r-layout-desc').textContent = r.layout.description;

    // キャッチコピー
    const fillCopies = (elId, list) => {
      const ul = $(elId);
      ul.innerHTML = '';
      (list || []).forEach((text) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = text;
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.textContent = 'コピー';
        copyBtn.addEventListener('click', async () => {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = '✓';
          setTimeout(() => (copyBtn.textContent = 'コピー'), 1200);
        });
        li.append(span, copyBtn);
        ul.appendChild(li);
      });
    };
    fillCopies('#r-copy-main', r.catchcopy.main);
    fillCopies('#r-copy-sub', r.catchcopy.sub);
    fillCopies('#r-copy-cta', r.catchcopy.cta);

    // パレット
    const paletteEl = $('#r-palette');
    paletteEl.innerHTML = '';
    r.colors.palette.forEach((c) => {
      const d = document.createElement('div');
      d.className = 'swatch';
      d.innerHTML =
        `<div class="chip" style="background:${esc(c.hex)}"></div>` +
        `<div class="hex">${esc(c.hex)}</div>` +
        `<div class="role">${esc(c.role)}</div>` +
        `<div class="role">${esc(c.usage)}</div>`;
      paletteEl.appendChild(d);
    });
    $('#r-color-rationale').textContent = r.colors.rationale;
    lastPaletteSvg = buildPaletteSvg(r.colors.palette);

    // フォント
    const tbody = $('#r-fonts');
    tbody.innerHTML = '';
    r.fonts.forEach((f) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td>${esc(f.role)}</td><td>${esc(f.name)}</td>` +
        `<td>${esc(f.alternative)}</td><td>${esc(f.reason)}</td>`;
      tbody.appendChild(tr);
    });

    // ワイヤーフレーム
    lastWireframeSvg = buildWireframeSvg(r.layout.blocks, canvasW, canvasH);
    $('#wireframe-holder').innerHTML = lastWireframeSvg;

    $('#plan-result').classList.remove('hidden');
  }

  function buildWireframeSvg(blocks, w, h) {
    // %座標 → 実寸。SVG単位はキャンバス比率に合わせた抽象単位
    const W = 1000;
    const H = Math.round((h / w) * 1000);
    const fontSize = Math.max(18, Math.round(W / 45));
    const rects = blocks
      .map((b) => {
        const x = (b.x / 100) * W;
        const y = (b.y / 100) * H;
        const bw = (b.w / 100) * W;
        const bh = (b.h / 100) * H;
        return (
          `<g>` +
          `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}"` +
          ` fill="#e8eefb" stroke="#2f6fed" stroke-width="2" rx="6"/>` +
          `<text x="${(x + bw / 2).toFixed(1)}" y="${(y + bh / 2).toFixed(1)}"` +
          ` font-size="${fontSize}" fill="#1c2430" text-anchor="middle" dominant-baseline="middle"` +
          ` font-family="sans-serif">${esc(b.label)}</text>` +
          `<title>${esc(b.note || '')}</title>` +
          `</g>`
        );
      })
      .join('\n');
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
      `<rect width="${W}" height="${H}" fill="#ffffff" stroke="#c8d0dc" stroke-width="2"/>` +
      rects +
      `</svg>`
    );
  }

  function buildPaletteSvg(palette) {
    const sw = 200;
    const shPad = 70;
    const W = sw * palette.length;
    const H = 200 + shPad;
    const cells = palette
      .map((c, i) => {
        const x = i * sw;
        return (
          `<g>` +
          `<rect x="${x}" y="0" width="${sw}" height="200" fill="${esc(c.hex)}"/>` +
          `<text x="${x + sw / 2}" y="230" font-size="20" text-anchor="middle" font-family="monospace" fill="#1c2430">${esc(c.hex)}</text>` +
          `<text x="${x + sw / 2}" y="255" font-size="14" text-anchor="middle" font-family="sans-serif" fill="#647080">${esc(c.role)}</text>` +
          `</g>`
        );
      })
      .join('\n');
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
      `<rect width="${W}" height="${H}" fill="#ffffff"/>` + cells + `</svg>`
    );
  }

  $('#dl-wireframe').addEventListener('click', () => {
    if (lastWireframeSvg) downloadSvg(lastWireframeSvg, 'wireframe.svg');
  });
  $('#dl-palette').addEventListener('click', () => {
    if (lastPaletteSvg) downloadSvg(lastPaletteSvg, 'palette.svg');
  });

  /* ================================================================ *
   *  ② デザイン添削
   * ================================================================ */
  const reviewSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['total_score', 'summary', 'categories', 'improvements', 'good_points'],
    properties: {
      total_score: { type: 'integer', description: '総合点(0-100)' },
      summary: { type: 'string', description: '総評(2〜3文)' },
      categories: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'score', 'comment'],
          properties: {
            name: { type: 'string' },
            score: { type: 'integer', description: '0-100' },
            comment: { type: 'string' },
          },
        },
      },
      improvements: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['priority', 'title', 'detail'],
          properties: {
            priority: { type: 'string', enum: ['高', '中', '低'] },
            title: { type: 'string', description: '改善案の見出し' },
            detail: { type: 'string', description: '「タイトルを20px大きく」のような具体的な指示' },
          },
        },
      },
      good_points: { type: 'array', items: { type: 'string' } },
    },
  };

  let reviewImage = null;

  setupDropZone('#review-drop', '#review-file', '#review-preview', (loaded) => {
    reviewImage = loaded;
    $('#review-submit').disabled = false;
  });

  $('#review-submit').addEventListener('click', async () => {
    if (!reviewImage) return;
    const btn = $('#review-submit');
    const status = $('#review-status');
    btn.disabled = true;
    setStatus(status, 'AIが添削しています…(30秒〜1分ほどかかります)', 'loading');

    try {
      const apiImg = imageForApi(reviewImage.img);
      const context = $('#review-context').value.trim();
      const result = await callClaude({
        system:
          'あなたは日本のデザイン事務所のベテランアートディレクターで、チラシ・バナーの添削講師です。' +
          '添削は具体的に、「タイトルを20px大きくすると読みやすくなります」のように数値や位置を示して指摘してください。' +
          '評価カテゴリは必ず次の7つ: 余白、視線誘導、文字量、配色、コントラスト、QRコード・連絡先、CTA(行動喚起)。' +
          '該当要素が無いカテゴリ(例:QRコードが無い)は、その必要性の観点から評価してください。' +
          'すべて日本語で出力してください。',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: apiImg.mediaType, data: apiImg.base64 },
              },
              {
                type: 'text',
                text:
                  'このデザインを100点満点で添削してください。' +
                  (context ? `\n補足情報: ${context}` : ''),
              },
            ],
          },
        ],
        schema: reviewSchema,
        maxTokens: 6000,
      });
      renderReview(result);
      setStatus(status, '完了しました。', '');
    } catch (err) {
      setStatus(status, err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  function renderReview(r) {
    $('#rv-total').textContent = Math.max(0, Math.min(100, r.total_score));
    $('#rv-summary').textContent = r.summary;

    const scoresEl = $('#rv-scores');
    scoresEl.innerHTML = '';
    r.categories.forEach((c) => {
      const score = Math.max(0, Math.min(100, c.score));
      const row = document.createElement('div');
      row.className = 'score-row';
      row.innerHTML =
        `<div class="score-head"><span>${esc(c.name)}</span><span>${score}点</span></div>` +
        `<div class="score-bar"><span style="width:${score}%"></span></div>` +
        `<p class="comment">${esc(c.comment)}</p>`;
      scoresEl.appendChild(row);
    });

    const impEl = $('#rv-improvements');
    impEl.innerHTML = '';
    const priClass = { '高': 'pri-high', '中': 'pri-mid', '低': 'pri-low' };
    r.improvements.forEach((i) => {
      const li = document.createElement('li');
      li.innerHTML =
        `<span class="pri ${priClass[i.priority] || 'pri-mid'}">${esc(i.priority)}</span>` +
        `<strong>${esc(i.title)}</strong>` +
        `<span class="detail">${esc(i.detail)}</span>`;
      impEl.appendChild(li);
    });

    const goodEl = $('#rv-good');
    goodEl.innerHTML = '';
    r.good_points.forEach((g) => {
      const li = document.createElement('li');
      li.textContent = g;
      goodEl.appendChild(li);
    });

    $('#review-result').classList.remove('hidden');
  }

  /* ================================================================ *
   *  ③ レイヤー分解
   * ================================================================ */
  const layersSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['layers'],
    properties: {
      layers: {
        type: 'array',
        description: '背面→前面の順。座標・サイズは画像に対する%(0-100)',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'type', 'x', 'y', 'w', 'h', 'description', 'text_content'],
          properties: {
            name: { type: 'string', description: 'レイヤー名(日本語)' },
            type: {
              type: 'string',
              enum: ['background', 'image', 'text', 'logo', 'shape', 'cta', 'qr', 'other'],
            },
            x: { type: 'number' },
            y: { type: 'number' },
            w: { type: 'number' },
            h: { type: 'number' },
            description: { type: 'string' },
            text_content: { type: 'string', description: 'テキスト要素なら文言。それ以外は空文字' },
          },
        },
      },
    },
  };

  const TYPE_LABEL = {
    background: '背景', image: '写真', text: 'テキスト', logo: 'ロゴ',
    shape: '図形', cta: 'CTA', qr: 'QR', other: 'その他',
  };

  let layersImage = null;
  let lastLayersSvg = '';

  setupDropZone('#layers-drop', '#layers-file', '#layers-preview', (loaded) => {
    layersImage = loaded;
    $('#layers-submit').disabled = false;
  });

  $('#layers-submit').addEventListener('click', async () => {
    if (!layersImage) return;
    const btn = $('#layers-submit');
    const status = $('#layers-status');
    btn.disabled = true;
    setStatus(status, 'AIがレイヤー構造を解析しています…(30秒〜1分ほどかかります)', 'loading');

    try {
      const apiImg = imageForApi(layersImage.img);
      const result = await callClaude({
        system:
          'あなたはバナー・チラシの構造解析の専門家です。' +
          '画像を構成要素(レイヤー)に分解し、各要素のバウンディングボックスを画像に対する%(0-100)で正確に返してください。' +
          '最初のレイヤーは必ず画像全体を覆う background(x=0,y=0,w=100,h=100)とし、以降は背面→前面の順に並べてください。' +
          '要素は最大15個まで、意味のある単位でまとめてください。すべて日本語で出力してください。',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: apiImg.mediaType, data: apiImg.base64 },
              },
              { type: 'text', text: 'この画像をレイヤーに分解してください。' },
            ],
          },
        ],
        schema: layersSchema,
        maxTokens: 8192,
      });
      renderLayers(result.layers);
      setStatus(status, '完了しました。', '');
    } catch (err) {
      setStatus(status, err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  /** 元画像から%bboxで切り抜き PNG dataURL を返す */
  function cropLayer(img, layer) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const x = Math.max(0, Math.round((layer.x / 100) * iw));
    const y = Math.max(0, Math.round((layer.y / 100) * ih));
    const w = Math.min(iw - x, Math.max(1, Math.round((layer.w / 100) * iw)));
    const h = Math.min(ih - y, Math.max(1, Math.round((layer.h / 100) * ih)));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL('image/png'), x, y, w, h };
  }

  function renderLayers(layers) {
    const img = layersImage.img;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const listEl = $('#ly-list');
    listEl.innerHTML = '';

    const svgLayers = [];
    layers.forEach((layer, idx) => {
      const crop = cropLayer(img, layer);

      // 一覧表示
      const item = document.createElement('div');
      item.className = 'layer-item';
      const thumb = document.createElement('img');
      thumb.src = crop.dataUrl;
      thumb.alt = layer.name;
      const info = document.createElement('div');
      info.innerHTML =
        `<span class="ltype">${esc(TYPE_LABEL[layer.type] || layer.type)}</span>` +
        `<strong>${esc(layer.name)}</strong>` +
        `<p class="ldesc">${esc(layer.description)}${layer.text_content ? ' /「' + esc(layer.text_content) + '」' : ''}</p>`;
      item.append(thumb, info);
      listEl.appendChild(item);

      // SVGレイヤー(グループ = レイヤーとして Illustrator / Figma が解釈)
      const descNode = layer.text_content
        ? `<desc>text: ${esc(layer.text_content)}</desc>`
        : `<desc>${esc(layer.description)}</desc>`;
      svgLayers.push(
        `<g id="layer-${idx + 1}-${esc(TYPE_LABEL[layer.type] || layer.type)}">` +
        `<title>${esc(layer.name)}</title>${descNode}` +
        `<image x="${crop.x}" y="${crop.y}" width="${crop.w}" height="${crop.h}"` +
        ` href="${crop.dataUrl}" preserveAspectRatio="none"/>` +
        `</g>`
      );
    });

    lastLayersSvg =
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
      ` viewBox="0 0 ${iw} ${ih}" width="${iw}" height="${ih}">\n` +
      svgLayers.join('\n') +
      `\n</svg>`;

    $('#ly-preview').innerHTML = lastLayersSvg;
    $('#layers-result').classList.remove('hidden');
  }

  $('#dl-layers').addEventListener('click', () => {
    if (lastLayersSvg) downloadSvg(lastLayersSvg, 'layers.svg');
  });
})();
