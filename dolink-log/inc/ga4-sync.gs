/* =========================================================
   Do.Link 運用ログ — GA4 自動同期スクリプト（Google Apps Script）
   ---------------------------------------------------------
   GA4の閲覧権限を持つGoogleアカウントで動かし、
   毎朝、直近35日分の日別データを運用ログのサイトへ送ります。

   使い方（詳しくは運用ログの管理者画面の手順を参照）
   1. 下の PROPERTY_ID に、GA4のプロパティID（数字）を入れる
   2. 左メニュー「サービス ＋」から「Google Analytics Data API」を追加
   3. 関数「firstSetup」を選んで ▶実行（初回だけ承認画面が出ます）
========================================================= */

// ▼ ここだけ書き換える：GA4の「管理」→「プロパティの詳細」にある数字
const PROPERTY_ID = 'ここにプロパティIDを入力';

// ▼ 以下は運用ログのサイトが自動で埋めた値（変更不要）
const SITE_URL = '__SITE_URL__';
const TOKEN = '__TOKEN__';

// 取り込む指標（GA4 Data API の名前 → 画面に表示する名前）
const METRICS = [
  { api: 'screenPageViews', label: '表示回数' },
  { api: 'activeUsers', label: 'アクティブ ユーザー' },
  { api: 'eventCount', label: 'イベント数' },
];

/**
 * 初回に1回だけ実行：過去400日分を送り、毎朝の自動実行を予約する
 */
function firstSetup() {
  send_('400daysAgo', 'yesterday');
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'dailySync')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailySync').timeBased().everyDays(1).atHour(6).create();
  console.log('設定が完了しました。明日から毎朝6時台に自動で同期します。');
}

/**
 * 毎朝の自動実行：直近35日分を送る（GA4は数日後に数値が確定するため取り直す）
 */
function dailySync() {
  send_('35daysAgo', 'yesterday');
}

function send_(startDate, endDate) {
  if (!/^\d+$/.test(PROPERTY_ID)) {
    throw new Error('PROPERTY_ID にGA4のプロパティID（数字のみ）を入力してください。');
  }

  // GA4から日別の数値を取得
  const report = AnalyticsData.Properties.runReport({
    dateRanges: [{ startDate: startDate, endDate: endDate }],
    dimensions: [{ name: 'date' }],
    metrics: METRICS.map((m) => ({ name: m.api })),
    limit: 10000,
  }, 'properties/' + PROPERTY_ID);

  const days = {};
  (report.rows || []).forEach((row) => {
    const d = row.dimensionValues[0].value; // 例：20261012
    const key = d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);
    days[key] = {};
    row.metricValues.forEach((v, i) => { days[key][METRICS[i].label] = Number(v.value); });
  });

  // 運用ログのサイトへ送信
  const response = UrlFetchApp.fetch(SITE_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ token: TOKEN, metrics: METRICS.map((m) => m.label), days: days }),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('送信に失敗しました（' + code + '）：' + response.getContentText().slice(0, 200));
  }
  console.log('送信しました：' + Object.keys(days).length + '日分');
}
