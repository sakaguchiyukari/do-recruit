/**
 * 安否確認システム バックエンド（Google Apps Script）
 * ------------------------------------------------------------
 * スプレッドシートに紐づけて使用します（拡張機能 > Apps Script）。
 *
 * シート構成（setup() 実行で自動作成）
 *   社員マスタ : 社員番号 | 氏名 | 部署 | メール | 確認コード
 *   回答       : イベントID | 社員番号 | 氏名 | 部署 | 状況 | 現在地 | 出社 | 家族 | 連絡事項 | 回答日時
 *   イベント   : イベントID | 件名 | 開始日時
 *
 * スクリプトプロパティ
 *   ADMIN_KEY : 管理画面のログインキー（setup() で自動生成、ログに出力）
 *   ANSWER_URL: 通知メールに載せる回答画面URL（任意）
 */

const SHEET = Object.freeze({ EMP: '社員マスタ', RES: '回答', EVT: 'イベント' });

const HEADERS = Object.freeze({
  EMP: ['社員番号', '氏名', '部署', 'メール', '確認コード'],
  RES: ['イベントID', '社員番号', '氏名', '部署', '状況', '現在地', '出社', '家族', '連絡事項', '回答日時'],
  EVT: ['イベントID', '件名', '開始日時']
});

// 受け付ける値（ホワイトリスト）
const ALLOWED = Object.freeze({
  status: ['safe', 'minor', 'severe'],
  location: ['home', 'office', 'shelter', 'moving', 'other'],
  work: ['yes', 'remote', 'no'],
  family: ['', 'safe', 'injured', 'unknown', 'none']
});

// 確認コード総当たり対策：10分間に5回失敗でロック
const MAX_FAIL = 5;
const LOCK_SEC = 600;

/* ============================================================
   エントリーポイント
   ============================================================ */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    switch (body.action) {
      case 'getEvent':        return json_(true, { event: getCurrentEvent_() });
      case 'answer':          return json_(true, saveAnswer_(body));
      case 'adminSummary':    requireAdmin_(body); return json_(true, adminSummary_());
      case 'adminStartEvent': requireAdmin_(body); return json_(true, startEvent_(body.title));
      default:                return json_(false, null, '不明な操作です');
    }
  } catch (err) {
    // AppError は利用者向けメッセージ、それ以外は内部エラー
    if (err && err.isAppError) return json_(false, null, err.message);
    console.error(err);
    return json_(false, null, 'サーバーでエラーが発生しました。時間をおいて再送してください。');
  }
}

// 動作確認用（ブラウザでURLを開くと応答する）
function doGet() {
  return json_(true, { message: 'safety-check api is running' });
}

/* ============================================================
   回答の保存（同じイベント・社員番号は上書き）
   ============================================================ */
function saveAnswer_(body) {
  const empId = String(body.empId || '').trim();
  const pin = String(body.pin || '').trim();

  if (!/^\d{4,8}$/.test(empId) || !/^\d{4}$/.test(pin)) {
    throw appError_('社員番号または確認コードの形式が正しくありません');
  }
  checkValue_('status', body.status);
  checkValue_('location', body.location);
  checkValue_('work', body.work);
  checkValue_('family', body.family || '');

  // 総当たり対策
  const cache = CacheService.getScriptCache();
  const failKey = 'fail_' + empId;
  const failCount = Number(cache.get(failKey) || 0);
  if (failCount >= MAX_FAIL) {
    throw appError_('入力ミスが続いたため一時的にロックしました。10分後に再度お試しください。');
  }

  const emp = findEmployee_(empId);
  if (!emp || emp.pin !== pin) {
    cache.put(failKey, String(failCount + 1), LOCK_SEC);
    throw appError_('社員番号または確認コードが正しくありません');
  }
  cache.remove(failKey);

  const event = getCurrentEvent_();
  if (!event) throw appError_('現在、実施中の安否確認はありません');

  const now = new Date();
  const comment = sanitizeText_(body.comment, 200);
  const row = [
    event.id, empId, emp.name, emp.dept,
    body.status, body.location, body.work, body.family || '',
    comment, now
  ];

  // 同時書き込みで行が壊れないよう排他制御
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sheet = sheet_(SHEET.RES);
    const last = sheet.getLastRow();
    let target = 0;
    if (last >= 2) {
      // イベントID + 社員番号 が一致する既存行を探す
      const keys = sheet.getRange(2, 1, last - 1, 2).getDisplayValues();
      for (let i = keys.length - 1; i >= 0; i -= 1) {
        if (keys[i][0] === event.id && keys[i][1] === empId) { target = i + 2; break; }
      }
    }
    if (target) {
      sheet.getRange(target, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  return { name: emp.name, answeredAt: now.toISOString() };
}

/* ============================================================
   管理：集計データ（社員マスタ + 現イベントの回答）
   ============================================================ */
function adminSummary_() {
  const event = getCurrentEvent_();
  const employees = getEmployees_();
  const answers = {};

  if (event) {
    const sheet = sheet_(SHEET.RES);
    const last = sheet.getLastRow();
    if (last >= 2) {
      const values = sheet.getRange(2, 1, last - 1, HEADERS.RES.length).getValues();
      values.forEach(function (v) {
        if (String(v[0]) !== event.id) return;
        answers[String(v[1])] = {
          status: v[4], location: v[5], work: v[6], family: v[7],
          comment: String(v[8]).replace(/^'/, ''),
          answeredAt: v[9] instanceof Date ? v[9].toISOString() : ''
        };
      });
    }
  }

  // 確認コード・メールは画面に返さない
  const rows = employees.map(function (emp) {
    return Object.assign({ empId: emp.empId, name: emp.name, dept: emp.dept }, answers[emp.empId] || {});
  });
  return { event: event, rows: rows };
}

/* ============================================================
   管理：新しい安否確認を開始
   ============================================================ */
function startEvent_(title) {
  const t = sanitizeText_(title, 60);
  if (t.length < 2) throw appError_('件名は2〜60文字で入力してください');

  const id = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd-HHmmss');
  const now = new Date();
  sheet_(SHEET.EVT).appendRow([id, t, now]);
  PropertiesService.getScriptProperties().setProperty('CURRENT_EVENT', JSON.stringify({
    id: id, title: t, startedAt: now.toISOString()
  }));
  return { event: getCurrentEvent_() };
}

/* ============================================================
   通知メール一斉送信（GASエディタから手動実行）
   ※ MailApp の1日あたり送信上限に注意（README 参照）
   ============================================================ */
function sendNotification() {
  const event = getCurrentEvent_();
  const url = PropertiesService.getScriptProperties().getProperty('ANSWER_URL');
  if (!event) throw new Error('実施中のイベントがありません。管理画面から開始してください。');
  if (!url) throw new Error('スクリプトプロパティ ANSWER_URL に回答画面のURLを設定してください。');

  const quota = MailApp.getRemainingDailyQuota();
  const targets = getEmployees_().filter(function (e) { return e.email; });
  if (targets.length > quota) {
    throw new Error('本日の送信可能数（' + quota + '件）が対象者数（' + targets.length + '名）より少ないため中止しました。');
  }

  targets.forEach(function (emp) {
    MailApp.sendEmail({
      to: emp.email,
      subject: '【安否確認】' + event.title,
      body: emp.name + ' さん\n\n安否確認を実施しています。以下のURLから回答してください。\n\n'
        + url + '\n\n社員番号：' + emp.empId + '\n確認コード：事前配布の4桁の番号\n\n'
        + '※ 救助が必要な場合は、まず119番/110番へ通報してください。'
    });
  });
  console.log(targets.length + ' 名に送信しました');
}

/* ============================================================
   未回答者へのリマインド（GASエディタから手動実行／時間主導トリガー可）
   ============================================================ */
function sendReminder() {
  const event = getCurrentEvent_();
  const url = PropertiesService.getScriptProperties().getProperty('ANSWER_URL');
  if (!event || !url) throw new Error('イベントまたは ANSWER_URL が未設定です');

  const answered = {};
  adminSummary_().rows.forEach(function (r) { if (r.status) answered[r.empId] = true; });
  const targets = getEmployees_().filter(function (e) { return e.email && !answered[e.empId]; });
  if (targets.length > MailApp.getRemainingDailyQuota()) throw new Error('本日の送信可能数を超えるため中止しました');

  targets.forEach(function (emp) {
    MailApp.sendEmail({
      to: emp.email,
      subject: '【再送・安否確認】' + event.title,
      body: emp.name + ' さん\n\nまだ回答が確認できていません。至急、以下から回答してください。\n\n' + url
    });
  });
  console.log('未回答 ' + targets.length + ' 名にリマインドしました');
}

/* ============================================================
   初期設定（最初に1回だけ GASエディタから実行）
   ============================================================ */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [['EMP', SHEET.EMP], ['RES', SHEET.RES], ['EVT', SHEET.EVT]].forEach(function (pair) {
    let sh = ss.getSheetByName(pair[1]);
    if (!sh) sh = ss.insertSheet(pair[1]);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS[pair[0]]);
      sh.setFrozenRows(1);
    }
  });
  // 社員番号・確認コード列は先頭0が消えないよう文字列書式に
  ss.getSheetByName(SHEET.EMP).getRange('A:A').setNumberFormat('@');
  ss.getSheetByName(SHEET.EMP).getRange('E:E').setNumberFormat('@');
  ss.getSheetByName(SHEET.RES).getRange('A:B').setNumberFormat('@');

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_KEY')) {
    props.setProperty('ADMIN_KEY', Utilities.getUuid().replace(/-/g, ''));
  }
  console.log('管理キー: ' + props.getProperty('ADMIN_KEY'));
}

/**
 * 確認コードを未設定の社員に4桁のランダムコードを自動発番（任意）
 */
function generatePins() {
  const sh = sheet_(SHEET.EMP);
  const last = sh.getLastRow();
  if (last < 2) return;
  const range = sh.getRange(2, 5, last - 1, 1);
  const values = range.getDisplayValues().map(function (r) {
    return [r[0] || String(Math.floor(Math.random() * 10000)).padStart(4, '0')];
  });
  range.setValues(values);
}

/* ============================================================
   内部関数
   ============================================================ */
function getCurrentEvent_() {
  const raw = PropertiesService.getScriptProperties().getProperty('CURRENT_EVENT');
  return raw ? JSON.parse(raw) : null;
}

function getEmployees_() {
  // 700名程度なら毎回読み込んでも十分高速。30秒キャッシュでアクセス集中時の負荷を軽減
  const cache = CacheService.getScriptCache();
  const cached = cache.get('employees');
  if (cached) return JSON.parse(cached);

  const sh = sheet_(SHEET.EMP);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const list = sh.getRange(2, 1, last - 1, HEADERS.EMP.length).getDisplayValues()
    .filter(function (v) { return v[0]; })
    .map(function (v) {
      return { empId: v[0].trim(), name: v[1], dept: v[2], email: v[3], pin: v[4].trim() };
    });
  try { cache.put('employees', JSON.stringify(list), 30); } catch (e) { /* 100KB超などは無視 */ }
  return list;
}

function findEmployee_(empId) {
  return getEmployees_().find(function (e) { return e.empId === empId; }) || null;
}

function requireAdmin_(body) {
  const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || body.adminKey !== key) {
    Utilities.sleep(800); // 総当たり対策の遅延
    throw appError_('管理キーが正しくありません');
  }
}

function checkValue_(name, value) {
  if (ALLOWED[name].indexOf(value) === -1) throw appError_('入力内容が正しくありません（' + name + '）');
}

/**
 * 文字列の整形
 *  - 長さ制限
 *  - 「=」などで始まる値はシートで数式として評価されるため先頭に ' を付与
 */
function sanitizeText_(value, max) {
  let s = String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('シート「' + name + '」がありません。setup() を実行してください。');
  return sh;
}

function appError_(message) {
  const err = new Error(message);
  err.isAppError = true;
  return err;
}

function json_(ok, data, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, data: data, message: message || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}
