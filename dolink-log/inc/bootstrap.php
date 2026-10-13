<?php
/**
 * Do.Link 運用ログ — 共通処理
 * 1. 設定読み込み  2. セッション  3. データベース  4. 初回データ取り込み
 * 5. 読み出し  6. 書き込み  7. ユーティリティ
 */

declare(strict_types=1);

if (!defined('DOLINK_LOG')) {
    http_response_code(403);
    exit;
}

/* ---------- 1. 設定読み込み ---------- */
date_default_timezone_set('Asia/Tokyo');

const APP_DIR = __DIR__ . '/..';
const DEFAULT_PASSWORD = 'change-me-please';

// 画面側（main.js）の CATEGORIES と同じ並び・表記にする
const CATEGORIES = [
    'top' => 'TOPお知らせ',
    'work' => 'グループのお仕事紹介',
    'topics' => '新着トピックス',
    'company' => '新着グループ会社情報',
    'community' => '新着グループコミュニティ',
    'members' => '社員一覧・検索',
    'mail' => 'メール配信',
    'design' => 'デザイン変更',
    'other' => 'その他',
];

const LIMITS = ['dept' => 40, 'title' => 80, 'url' => 500, 'memo' => 300];

function app_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require APP_DIR . '/config.php';
    }
    return $config;
}

/* ---------- 2. セッション（管理者ログイン） ---------- */
function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('dolinklog');
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 30, // 30日間ログイン状態を保持
        'path' => dirname($_SERVER['SCRIPT_NAME'] ?? '/') ?: '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.gc_maxlifetime', (string) (60 * 60 * 24 * 30));
    session_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
}

function is_admin(): bool
{
    return !empty($_SESSION['admin']);
}

function csrf_token(): string
{
    return (string) ($_SESSION['csrf'] ?? '');
}

function password_is_default(): bool
{
    $password = (string) (app_config()['admin_password'] ?? '');
    return $password === '' || $password === DEFAULT_PASSWORD;
}

/* ---------- 3. データベース（SQLite：初回アクセス時に自動作成） ---------- */
function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $path = (string) app_config()['db_path'];
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('データ保存用フォルダを作成できません：' . $dir);
    }

    $pdo = new PDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA busy_timeout = 5000');
    $pdo->exec('PRAGMA journal_mode = WAL');

    $pdo->exec('CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        dept TEXT NOT NULL DEFAULT \'\',
        category TEXT NOT NULL DEFAULT \'other\',
        title TEXT NOT NULL,
        url TEXT NOT NULL DEFAULT \'\',
        memo TEXT NOT NULL DEFAULT \'\',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )');
    $pdo->exec('CREATE INDEX IF NOT EXISTS logs_date ON logs (date)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS ga4 (
        date TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        PRIMARY KEY (date, metric)
    )');
    $pdo->exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');

    seed_from_migration($pdo);
    return $pdo;
}

function meta_get(string $key, string $default = ''): string
{
    $stmt = db()->prepare('SELECT value FROM meta WHERE key = ?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value === false ? $default : (string) $value;
}

function meta_set(string $key, string $value): void
{
    db()->prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        ->execute([$key, $value]);
}

/**
 * GA4自動同期用の合言葉（Google Apps Script からの送信を確認する）
 * 初回に自動で作成し、管理者画面にだけ表示する
 */
function ga4_sync_token(): string
{
    $token = meta_get('ga4_token');
    if ($token === '') {
        $token = bin2hex(random_bytes(24));
        meta_set('ga4_token', $token);
    }
    return $token;
}

// 更新のたびに番号を進め、画面側は番号が変わったときだけ再描画する
function bump_revision(): void
{
    meta_set('revision', (string) ((int) meta_get('revision', '0') + 1));
}

/* ---------- 4. 初回データ取り込み（migration/ のCSVを1回だけ読み込む） ---------- */
function seed_from_migration(PDO $pdo): void
{
    $done = $pdo->query("SELECT value FROM meta WHERE key = 'seeded'")->fetchColumn();
    if ($done !== false) {
        return;
    }

    $pdo->beginTransaction();
    try {
        $logsCsv = APP_DIR . '/migration/logs.csv';
        if (is_file($logsCsv)) {
            $rows = read_csv($logsCsv);
            array_shift($rows); // 見出し行
            $insert = $pdo->prepare('INSERT OR IGNORE INTO logs (id, date, dept, category, title, url, memo, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($rows as $r) {
                $date = to_date_key($r[1] ?? '');
                if ($date === '' || trim($r[4] ?? '') === '') {
                    continue;
                }
                $created = strtotime((string) ($r[7] ?? '')) ?: time();
                $updated = strtotime((string) ($r[8] ?? '')) ?: $created;
                $insert->execute([
                    $r[0] !== '' ? $r[0] : new_id(), $date, $r[2] ?? '', category_id($r[3] ?? ''),
                    $r[4], $r[5] ?? '', $r[6] ?? '', $created * 1000, $updated * 1000,
                ]);
            }
        }

        $ga4Csv = APP_DIR . '/migration/ga4.csv';
        if (is_file($ga4Csv)) {
            $rows = read_csv($ga4Csv);
            $header = array_shift($rows) ?: [];
            $metrics = array_values(array_filter(array_slice($header, 1), 'strlen'));
            $days = [];
            foreach ($rows as $r) {
                $date = to_date_key($r[0] ?? '');
                if ($date === '') {
                    continue;
                }
                foreach ($metrics as $i => $name) {
                    $value = $r[$i + 1] ?? '';
                    if ($value !== '' && is_numeric($value)) {
                        $days[$date][$name] = (float) $value;
                    }
                }
            }
            write_ga4($pdo, $metrics, $days);
        }

        $pdo->prepare("INSERT INTO meta (key, value) VALUES ('seeded', ?)")->execute([date('c')]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function read_csv(string $path): array
{
    $rows = [];
    $fp = fopen($path, 'rb');
    if ($fp === false) {
        return $rows;
    }
    // 先頭のBOMを読み飛ばす
    if (fread($fp, 3) !== "\xEF\xBB\xBF") {
        rewind($fp);
    }
    while (($row = fgetcsv($fp, 0, ',', '"', '')) !== false) {
        if ($row === [null]) {
            continue;
        }
        $rows[] = array_map(static fn($v) => trim((string) $v), $row);
    }
    fclose($fp);
    return $rows;
}

/* ---------- 5. 読み出し ---------- */
function fetch_payload(): array
{
    $pdo = db();
    $logs = array_map(static fn(array $r) => [
        'id' => $r['id'],
        'date' => $r['date'],
        'dept' => $r['dept'],
        'category' => $r['category'],
        'title' => $r['title'],
        'url' => $r['url'],
        'memo' => $r['memo'],
        'createdAt' => (int) $r['created_at'],
    ], $pdo->query('SELECT * FROM logs ORDER BY date DESC, created_at DESC')->fetchAll());

    $metrics = json_decode(meta_get('ga4_metrics', '[]'), true) ?: [];
    $days = [];
    foreach ($pdo->query('SELECT date, metric, value FROM ga4 ORDER BY date')->fetchAll() as $r) {
        $days[$r['date']][$r['metric']] = $r['value'] + 0;
    }

    return [
        'ok' => true,
        'revision' => (int) meta_get('revision', '0'),
        'logs' => $logs,
        'ga4' => ['metrics' => $metrics, 'days' => (object) $days],
        'ga4SyncedAt' => (int) meta_get('ga4_synced_at', '0'), // GA4自動同期の最終実行（ミリ秒）
    ];
}

/* ---------- 6. 書き込み ---------- */

/** 入力値の検証（画面側と同じ条件をサーバーでも確認する） */
function sanitize_log($log): array
{
    if (!is_array($log)) {
        throw new InvalidArgumentException('記録の内容がありません');
    }
    $text = static fn($v, int $max) => mb_substr(trim((string) ($v ?? '')), 0, $max);
    $clean = [
        'date' => to_date_key((string) ($log['date'] ?? '')),
        'dept' => $text($log['dept'] ?? '', LIMITS['dept']),
        'category' => (string) ($log['category'] ?? ''),
        'title' => $text($log['title'] ?? '', LIMITS['title']),
        'url' => $text($log['url'] ?? '', LIMITS['url']),
        'memo' => $text($log['memo'] ?? '', LIMITS['memo']),
    ];
    if ($clean['date'] === '') {
        throw new InvalidArgumentException('日付');
    }
    if (mb_strlen($clean['dept']) < 2) {
        throw new InvalidArgumentException('事業名');
    }
    if (!isset(CATEGORIES[$clean['category']])) {
        throw new InvalidArgumentException('カテゴリ');
    }
    if (mb_strlen($clean['title']) < 2) {
        throw new InvalidArgumentException('作業内容');
    }
    if ($clean['url'] !== '' && !preg_match('#^https?://.+#i', $clean['url'])) {
        throw new InvalidArgumentException('URL');
    }
    return $clean;
}

function create_log($log): string
{
    $clean = sanitize_log($log);
    $id = new_id();
    $now = now_ms();
    db()->prepare('INSERT INTO logs (id, date, dept, category, title, url, memo, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$id, $clean['date'], $clean['dept'], $clean['category'], $clean['title'], $clean['url'], $clean['memo'], $now, $now]);
    bump_revision();
    return $id;
}

function update_log(string $id, $log): bool
{
    $clean = sanitize_log($log);
    $stmt = db()->prepare('UPDATE logs SET date = ?, dept = ?, category = ?, title = ?, url = ?, memo = ?, updated_at = ? WHERE id = ?');
    $stmt->execute([$clean['date'], $clean['dept'], $clean['category'], $clean['title'], $clean['url'], $clean['memo'], now_ms(), $id]);
    if ($stmt->rowCount() === 0) {
        return false;
    }
    bump_revision();
    return true;
}

function delete_log(string $id): bool
{
    $stmt = db()->prepare('DELETE FROM logs WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        return false;
    }
    bump_revision();
    return true;
}

/** GA4データを日付単位で上書きマージする */
function import_ga4($metrics, $days, bool $auto = false): int
{
    if (!is_array($metrics) || !is_array($days)) {
        throw new InvalidArgumentException('GA4データの形式');
    }
    $metrics = array_slice(array_values(array_filter(array_map('strval', $metrics), 'strlen')), 0, 20);
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $count = write_ga4($pdo, $metrics, $days);
        if ($auto) {
            meta_set('ga4_synced_at', (string) now_ms());
        }
        bump_revision();
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    return $count;
}

function write_ga4(PDO $pdo, array $metrics, array $days): int
{
    $current = json_decode((string) ($pdo->query("SELECT value FROM meta WHERE key = 'ga4_metrics'")->fetchColumn() ?: '[]'), true) ?: [];
    $all = array_values(array_unique(array_merge($current, $metrics)));
    $pdo->prepare("INSERT INTO meta (key, value) VALUES ('ga4_metrics', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        ->execute([json_encode($all, JSON_UNESCAPED_UNICODE)]);

    $upsert = $pdo->prepare('INSERT INTO ga4 (date, metric, value) VALUES (?, ?, ?)
        ON CONFLICT(date, metric) DO UPDATE SET value = excluded.value');
    $count = 0;
    foreach ($days as $rawDate => $values) {
        $date = to_date_key((string) $rawDate);
        if ($date === '' || !is_array($values)) {
            continue;
        }
        foreach ($values as $metric => $value) {
            if (in_array((string) $metric, $all, true) && is_numeric($value)) {
                $upsert->execute([$date, (string) $metric, (float) $value]);
            }
        }
        $count++;
    }
    return $count;
}

/* ---------- 7. ユーティリティ ---------- */
function new_id(): string
{
    return bin2hex(random_bytes(10));
}

function now_ms(): int
{
    return (int) floor(microtime(true) * 1000);
}

/** 20261006 / 2026-10-06 / 2026/10/6 を YYYY-MM-DD に統一（不正な日付は空文字） */
function to_date_key(string $value): string
{
    $v = preg_replace('/\s+/', '', $value) ?? '';
    if (!preg_match('/^(\d{4})(\d{2})(\d{2})$/', $v, $m) && !preg_match('/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/', $v, $m)) {
        return '';
    }
    [$y, $mo, $d] = [(int) $m[1], (int) $m[2], (int) $m[3]];
    return checkdate($mo, $d, $y) ? sprintf('%04d-%02d-%02d', $y, $mo, $d) : '';
}

function category_id(string $value): string
{
    if (isset(CATEGORIES[$value])) {
        return $value;
    }
    $found = array_search($value, CATEGORIES, true);
    return $found === false ? 'other' : $found;
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
