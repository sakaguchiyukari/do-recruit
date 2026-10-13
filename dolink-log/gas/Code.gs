/* =========================================================
   Do.Link 運用ログ — Google Apps Script（スプレッドシートに紐づけて使用）
   1. 設定  2. 初期設定（setup）  3. 読み込みAPI（doGet）
   4. 書き込みAPI（doPost）  5. GA4自動同期  6. 共通処理
   ---------------------------------------------------------
   ・閲覧ページは doGet の JSON を読み込んで表示します
   ・記録の追加／編集／削除は「管理者キー」を知っている人だけが可能です
   ・スプレッドシートを直接編集しても、閲覧ページに自動で反映されます
========================================================= */

/* ---------- 1. 設定 ---------- */
const SHEET_LOGS = '作業ログ';
const SHEET_GA4 = 'GA4';
const LOG_HEADERS = ['ID', '日付', '事業名', 'カテゴリ', '作業内容', '対象ページURL', 'メモ', '登録日時', '更新日時'];
const COL = { id: 0, date: 1, dept: 2, category: 3, title: 4, url: 5, memo: 6, createdAt: 7, updatedAt: 8 };

// 画面側（main.js）の CATEGORIES と同じ並び・表記にする
const CATEGORIES = [
  { id: 'top', label: 'TOPお知らせ' },
  { id: 'work', label: 'グループのお仕事紹介' },
  { id: 'topics', label: '新着トピックス' },
  { id: 'company', label: '新着グループ会社情報' },
  { id: 'community', label: '新着グループコミュニティ' },
  { id: 'members', label: '社員一覧・検索' },
  { id: 'mail', label: 'メール配信' },
  { id: 'design', label: 'デザイン変更' },
  { id: 'other', label: 'その他' },
];

// GA4 Data API の指標名 → シートの列名（GA4画面の表記に合わせる）
const GA4_METRICS = [
  { api: 'screenPageViews', label: '表示回数' },
  { api: 'activeUsers', label: 'アクティブ ユーザー' },
  { api: 'eventCount', label: 'イベント数' },
];

const CACHE_KEY = 'payload';
const CACHE_SECONDS = 30; // 短時間に大勢が開いてもシートを読みに行きすぎないため
const LIMITS = { dept: 40, title: 80, url: 500, memo: 300 };

/* ---------- 2. 初期設定（最初に1回だけエディタから実行） ---------- */

/**
 * シートの作成・見た目の調整を行う。何度実行しても既存データは消えない。
 */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('Asia/Tokyo');

  // --- 作業ログ ---
  const logs = ss.getSheetByName(SHEET_LOGS) || ss.insertSheet(SHEET_LOGS, 0);
  logs.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
  styleHeader_(logs, LOG_HEADERS.length);
  logs.setFrozenRows(1);
  [130, 110, 200, 180, 320, 280, 280, 150, 150].forEach((w, i) => logs.setColumnWidth(i + 1, w));
  logs.getRange('B2:B').setNumberFormat('yyyy/mm/dd');
  logs.getRange('H2:I').setNumberFormat('yyyy/mm/dd hh:mm');
  logs.getRange('E2:G').setWrap(true);
  logs.hideColumns(1); // IDは自動採番のため非表示（削除しないこと）

  // カテゴリはプルダウンで選択
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CATEGORIES.map((c) => c.label), true)
    .setAllowInvalid(false)
    .build();
  logs.getRange('D2:D').setDataValidation(rule);

  // 1行おきの色分け（見やすさのため）
  if (!logs.getBandings().length) {
    logs.getRange(1, 1, logs.getMaxRows(), LOG_HEADERS.length)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  }

  // --- GA4 ---
  const ga4 = ss.getSheetByName(SHEET_GA4) || ss.insertSheet(SHEET_GA4);
  if (!ga4.getRange(1, 1).getValue()) {
    ga4.getRange(1, 1, 1, GA4_METRICS.length + 1).setValues([['日付'].concat(GA4_METRICS.map((m) => m.label))]);
  }
  styleHeader_(ga4, Math.max(ga4.getLastColumn(), 1));
  ga4.setFrozenRows(1);
  ga4.setColumnWidth(1, 110);
  ga4.getRange('A2:A').setNumberFormat('yyyy/mm/dd');

  // 管理者キーが未設定なら案内
  if (!getProp_('ADMIN_KEY')) {
    Logger.log('【要設定】プロジェクトの設定 → スクリプト プロパティに ADMIN_KEY（16文字以上推奨）を追加してください。');
  }
  clearCache_();
}

function styleHeader_(sheet, width) {
  sheet.getRange(1, 1, 1, width)
    .setBackground('#0068b7')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 32);
}

/* ---------- 3. 読み込みAPI（誰でも閲覧可） ---------- */
function doGet() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY);
  if (cached) return json_(JSON.parse(cached));

  const payload = { ok: true, logs: readLogs_(), ga4: readGa4_(), updatedAt: Date.now() };
  const text = JSON.stringify(payload);
  if (text.length < 90000) cache.put(CACHE_KEY, text, CACHE_SECONDS); // キャッシュは1件100KBまで
  return json_(payload);
}

function readLogs_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_LOGS);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, LOG_HEADERS.length);
  const rows = range.getValues();

  // シートに直接入力された行（IDが空）には、ここでIDを振る
  const missing = rows.map((r, i) => (!r[COL.id] && r[COL.date] && r[COL.title] ? i : -1)).filter((i) => i >= 0);
  if (missing.length) {
    withLock_(() => {
      missing.forEach((i) => {
        rows[i][COL.id] = newId_();
        sheet.getRange(i + 2, COL.id + 1).setValue(rows[i][COL.id]);
      });
    });
  }

  return rows
    .map((r, i) => {
      const date = toDateKey_(r[COL.date]);
      if (!date || !r[COL.id]) return null;
      return {
        id: String(r[COL.id]),
        date: date,
        dept: String(r[COL.dept] || ''),
        category: toCategoryId_(r[COL.category]),
        title: String(r[COL.title] || ''),
        url: String(r[COL.url] || ''),
        memo: String(r[COL.memo] || ''),
        // 登録日時が無い行は行番号順で並ぶようにする
        createdAt: r[COL.createdAt] instanceof Date ? r[COL.createdAt].getTime() : i,
      };
    })
    .filter(Boolean);
}

function readGa4_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_GA4);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 2) return { metrics: [], days: {} };
  const values = sheet.getDataRange().getValues();
  const metrics = values[0].slice(1).map(String).filter(Boolean);
  const days = {};
  values.slice(1).forEach((r) => {
    const key = toDateKey_(r[0]);
    if (!key) return;
    days[key] = {};
    metrics.forEach((m, i) => {
      const n = Number(r[i + 1]);
      if (r[i + 1] !== '' && isFinite(n)) days[key][m] = n;
    });
  });
  return { metrics: metrics, days: days };
}

/* ---------- 4. 書き込みAPI（管理者キー必須） ---------- */
function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'invalid', message: 'JSONの形式が正しくありません' });
  }

  if (!isAuthorized_(body.key)) {
    Utilities.sleep(800); // 総当たり対策
    return json_({ ok: false, error: 'unauthorized' });
  }

  try {
    const result = withLock_(() => {
      switch (body.action) {
        case 'verify': return { ok: true };
        case 'create': return createLog_(body.log);
        case 'update': return updateLog_(body.id, body.log);
        case 'delete': return deleteLog_(body.id);
        case 'ga4Import': return mergeGa4_(body.metrics, body.days);
        default: return { ok: false, error: 'invalid', message: '不明な操作です' };
      }
    });
    if (result.ok && body.action !== 'verify') clearCache_();
    return json_(result);
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server', message: String(err && err.message || err) });
  }
}

function isAuthorized_(key) {
  const expected = getProp_('ADMIN_KEY');
  return Boolean(expected) && typeof key === 'string' && key.length >= 8 && key === expected;
}

// 入力値の検証（画面側と同じ条件をサーバーでも確認する）
function sanitizeLog_(log) {
  if (!log || typeof log !== 'object') throw invalid_('記録の内容がありません');
  const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  const date = toDateKey_(log.date);
  const category = CATEGORIES.filter((c) => c.id === log.category)[0];
  const clean = {
    date: date,
    dept: text(log.dept, LIMITS.dept),
    category: category ? category.label : '',
    title: text(log.title, LIMITS.title),
    url: text(log.url, LIMITS.url),
    memo: text(log.memo, LIMITS.memo),
  };
  if (!clean.date) throw invalid_('日付');
  if (clean.dept.length < 2) throw invalid_('事業名');
  if (!clean.category) throw invalid_('カテゴリ');
  if (clean.title.length < 2) throw invalid_('作業内容');
  if (clean.url && !/^https?:\/\/.+/.test(clean.url)) throw invalid_('URL');
  return clean;
}

function invalid_(field) {
  const err = new Error(field);
  err.code = 'invalid';
  return err;
}

function toRow_(id, clean, createdAt, updatedAt) {
  const parts = clean.date.split('-').map(Number);
  return [id, new Date(parts[0], parts[1] - 1, parts[2]), clean.dept, clean.category,
    clean.title, clean.url, clean.memo, createdAt, updatedAt];
}

function createLog_(log) {
  const clean = trySanitize_(log);
  if (clean.ok === false) return clean; // 入力エラーはそのまま返す
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_LOGS);
  const id = newId_();
  const now = new Date();
  sheet.appendRow(toRow_(id, clean, now, now));
  return { ok: true, id: id };
}

function updateLog_(id, log) {
  const clean = trySanitize_(log);
  if (clean.ok === false) return clean;
  const found = findRow_(id);
  if (!found) return { ok: false, error: 'not_found' };
  const createdAt = found.sheet.getRange(found.row, COL.createdAt + 1).getValue() || new Date();
  found.sheet.getRange(found.row, 1, 1, LOG_HEADERS.length)
    .setValues([toRow_(String(id), clean, createdAt, new Date())]);
  return { ok: true, id: id };
}

function deleteLog_(id) {
  const found = findRow_(id);
  if (!found) return { ok: false, error: 'not_found' };
  found.sheet.deleteRow(found.row);
  return { ok: true };
}

function trySanitize_(log) {
  try {
    return sanitizeLog_(log);
  } catch (err) {
    return { ok: false, error: 'invalid', message: err.message };
  }
}

function findRow_(id) {
  if (!id) return null;
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_LOGS);
  if (sheet.getLastRow() < 2) return null;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i += 1) {
    if (String(ids[i][0]) === String(id)) return { sheet: sheet, row: i + 2 };
  }
  return null;
}

/* ---------- 5. GA4自動同期 ---------- */

/**
 * 毎日の自動同期（トリガーから実行）。直近35日分を取り直して上書きする。
 * 実行するGoogleアカウントに、GA4プロパティの「閲覧者」以上の権限が必要。
 */
function syncGa4() {
  syncGa4Range_('35daysAgo', 'yesterday');
}

/**
 * 初回のみ：過去400日分をまとめて取り込む（エディタから手動実行）
 */
function syncGa4Full() {
  syncGa4Range_('400daysAgo', 'yesterday');
}

function syncGa4Range_(startDate, endDate) {
  const propertyId = getProp_('GA4_PROPERTY_ID');
  if (!propertyId) throw new Error('スクリプト プロパティに GA4_PROPERTY_ID（数字のプロパティID）を設定してください。');

  const report = AnalyticsData.Properties.runReport({
    dateRanges: [{ startDate: startDate, endDate: endDate }],
    dimensions: [{ name: 'date' }],
    metrics: GA4_METRICS.map((m) => ({ name: m.api })),
    limit: 10000,
  }, 'properties/' + propertyId);

  const metrics = GA4_METRICS.map((m) => m.label);
  const days = {};
  (report.rows || []).forEach((row) => {
    const key = toDateKey_(row.dimensionValues[0].value);
    if (!key) return;
    days[key] = {};
    row.metricValues.forEach((v, i) => { days[key][metrics[i]] = Number(v.value); });
  });

  withLock_(() => mergeGa4_(metrics, days));
  clearCache_();
  console.log('GA4同期：' + Object.keys(days).length + '日分');
}

/**
 * 毎朝6時台に syncGa4 を実行するトリガーを作る（1回だけ実行）
 */
function createDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'syncGa4')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncGa4').timeBased().everyDays(1).atHour(6).create();
}

// 既存のGA4シートに日付単位で上書きマージし、日付順に並べ直す
function mergeGa4_(incomingMetrics, incomingDays) {
  if (!Array.isArray(incomingMetrics) || !incomingDays || typeof incomingDays !== 'object') {
    return { ok: false, error: 'invalid', message: 'GA4データの形式が正しくありません' };
  }
  const current = readGa4_();
  const metrics = current.metrics.slice();
  incomingMetrics.map(String).slice(0, 20).forEach((m) => { if (m && metrics.indexOf(m) < 0) metrics.push(m); });

  const days = current.days;
  Object.keys(incomingDays).forEach((raw) => {
    const key = toDateKey_(raw);
    const values = incomingDays[raw];
    if (!key || !values || typeof values !== 'object') return;
    days[key] = days[key] || {};
    Object.keys(values).forEach((m) => {
      const n = Number(values[m]);
      if (metrics.indexOf(m) >= 0 && isFinite(n)) days[key][m] = n;
    });
  });

  const keys = Object.keys(days).sort();
  const rows = keys.map((key) => {
    const p = key.split('-').map(Number);
    return [new Date(p[0], p[1] - 1, p[2])].concat(metrics.map((m) => (m in days[key] ? days[key][m] : '')));
  });

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_GA4);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, metrics.length + 1).setValues([['日付'].concat(metrics)]);
  if (rows.length) sheet.getRange(2, 1, rows.length, metrics.length + 1).setValues(rows);
  styleHeader_(sheet, metrics.length + 1);
  return { ok: true, days: keys.length };
}

/* ---------- 6. 共通処理 ---------- */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getProp_(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || '';
}

function clearCache_() {
  CacheService.getScriptCache().remove(CACHE_KEY);
}

function withLock_(task) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return task();
  } finally {
    lock.releaseLock();
  }
}

function newId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 20);
}

// Date / 20261006 / 2026-10-06 / 2026/10/6 を YYYY-MM-DD に統一
function toDateKey_(value) {
  if (value instanceof Date && !isNaN(value)) {
    return Utilities.formatDate(value, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  const v = String(value == null ? '' : value).replace(/\s/g, '');
  const m = v.match(/^(\d{4})(\d{2})(\d{2})$/) || v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return '';
  return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
}

function toCategoryId_(value) {
  const found = CATEGORIES.filter((c) => c.label === value || c.id === value)[0];
  return found ? found.id : 'other';
}
