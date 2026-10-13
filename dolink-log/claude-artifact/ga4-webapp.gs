/* =========================================================
   Do.Link 運用ログ（Claudeアーティファクト版）— GA4 取り出し用 Apps Script
   ---------------------------------------------------------
   GA4の「閲覧者」権限を持つGoogleアカウントで動かします。
   Claude の自動実行（毎朝）がこのURLを呼び出し、受け取った数値を
   運用ログに書き込みます。合言葉（token）が合わない呼び出しには何も返しません。

   設定手順
   1. https://script.google.com で「新しいプロジェクト」を作り、このコードを貼り付けて保存
   2. 下の PROPERTY_ID にGA4のプロパティID（数字）を入力して保存
   3. 左メニュー「サービス ＋」→「Google Analytics Data API」→「追加」
   4. 関数「testRun」を選んで ▶実行（初回は承認画面 → 許可）。ログに日数が出ればOK
   5. 右上「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
        次のユーザーとして実行：自分 ／ アクセスできるユーザー：全員 → デプロイ
   6. 関数「showUrl」を ▶実行 → ログに出たURLを、Claudeの環境設定に登録
========================================================= */

// ▼ ここだけ書き換える：GA4の「管理」→「プロパティの詳細」にある数字
const PROPERTY_ID = 'ここにプロパティIDを入力';

// 取り込む指標（GA4 Data API の名前 → 運用ログに表示する名前）
const METRICS = [
  { api: 'screenPageViews', label: '表示回数' },
  { api: 'activeUsers', label: 'アクティブ ユーザー' },
  { api: 'eventCount', label: 'イベント数' },
];

/**
 * Claude から呼ばれる入口（?token=合言葉&days=日数）
 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.token !== getToken_()) {
    return json_({ ok: false, error: 'unauthorized' });
  }
  const days = Math.min(Math.max(parseInt(params.days || '35', 10) || 35, 1), 500);
  try {
    return json_(Object.assign({ ok: true, fetchedAt: Date.now() }, fetchGa4_(days)));
  } catch (err) {
    return json_({ ok: false, error: 'ga4', message: String(err && err.message || err) });
  }
}

/**
 * 動作確認（承認画面を出すためにも最初に1回実行）
 */
function testRun() {
  const result = fetchGa4_(7);
  console.log('GA4から取得できました：' + Object.keys(result.days).length + '日分', JSON.stringify(result.days));
}

/**
 * Claude の環境設定に登録するURLを表示（デプロイ後に実行）
 */
function showUrl() {
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    throw new Error('先に「デプロイ」→「新しいデプロイ」でウェブアプリとして公開してください。');
  }
  console.log('このURLを登録してください（社外に共有しないこと）：\n' + url + '?token=' + getToken_());
}

/**
 * 合言葉を作り直す（URLが漏れたときに実行し、新しいURLを登録し直す）
 */
function resetToken() {
  PropertiesService.getScriptProperties().deleteProperty('TOKEN');
  showUrl();
}

/* ---------- 内部処理 ---------- */
function fetchGa4_(days) {
  if (!/^\d+$/.test(PROPERTY_ID)) {
    throw new Error('PROPERTY_ID にGA4のプロパティID（数字のみ）を入力してください。');
  }
  const report = AnalyticsData.Properties.runReport({
    dateRanges: [{ startDate: days + 'daysAgo', endDate: 'yesterday' }],
    dimensions: [{ name: 'date' }],
    metrics: METRICS.map((m) => ({ name: m.api })),
    limit: 10000,
  }, 'properties/' + PROPERTY_ID);

  const result = {};
  (report.rows || []).forEach((row) => {
    const d = row.dimensionValues[0].value; // 例：20261012
    const key = d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);
    result[key] = {};
    row.metricValues.forEach((v, i) => { result[key][METRICS[i].label] = Number(v.value); });
  });
  return { metrics: METRICS.map((m) => m.label), days: result };
}

function getToken_() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty('TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('TOKEN', token);
  }
  return token;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
