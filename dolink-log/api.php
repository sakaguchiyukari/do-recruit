<?php
/**
 * Do.Link 運用ログ — API
 * GET  api.php?action=data[&since=番号] … 全データ（番号が変わっていなければ unchanged のみ返す）
 * POST api.php（JSON）                   … login / logout / create / update / delete / ga4Import
 *      書き込み系はログイン済み＋CSRFトークン必須
 */

declare(strict_types=1);

define('DOLINK_LOG', true);
require __DIR__ . '/inc/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/** JSONを返して終了 */
function respond(array $body, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $code, int $status, string $message = ''): void
{
    respond(['ok' => false, 'error' => $code, 'message' => $message], $status);
}

try {
    start_session();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    /* ---------- 読み込み（誰でも可） ---------- */
    if ($method === 'GET') {
        session_write_close(); // 読み込み中にセッションをロックしない
        if (($_GET['action'] ?? 'data') !== 'data') {
            fail('invalid', 400, '不明な操作です');
        }
        $since = isset($_GET['since']) ? (int) $_GET['since'] : -1;
        $revision = (int) meta_get('revision', '0');
        if ($since === $revision) {
            respond(['ok' => true, 'unchanged' => true, 'revision' => $revision, 'isAdmin' => is_admin()]);
        }
        respond(fetch_payload() + ['isAdmin' => is_admin()]);
    }

    if ($method !== 'POST') {
        fail('invalid', 405, '許可されていないメソッドです');
    }

    /* ---------- 書き込み ---------- */
    $body = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($body)) {
        fail('invalid', 400, 'JSONの形式が正しくありません');
    }

    // CSRF対策：ページに埋め込んだトークンと一致しない要求は拒否
    $token = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($token === '' || !hash_equals(csrf_token(), $token)) {
        fail('csrf', 403, 'ページを再読み込みしてからもう一度お試しください');
    }

    $action = (string) ($body['action'] ?? '');

    if ($action === 'login') {
        if (password_is_default()) {
            fail('not_configured', 403, 'config.php の管理者パスワードを変更してください');
        }
        $expected = (string) app_config()['admin_password'];
        if (!hash_equals($expected, (string) ($body['password'] ?? ''))) {
            sleep(1); // 総当たり対策
            fail('unauthorized', 401);
        }
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        respond(['ok' => true]);
    }

    if ($action === 'logout') {
        unset($_SESSION['admin']);
        session_regenerate_id(true);
        respond(['ok' => true]);
    }

    // ここから先は管理者のみ
    if (!is_admin()) {
        fail('unauthorized', 401);
    }

    switch ($action) {
        case 'create':
            respond(['ok' => true, 'id' => create_log($body['log'] ?? null)]);
        case 'update':
            if (!update_log((string) ($body['id'] ?? ''), $body['log'] ?? null)) {
                fail('not_found', 404);
            }
            respond(['ok' => true]);
        case 'delete':
            if (!delete_log((string) ($body['id'] ?? ''))) {
                fail('not_found', 404);
            }
            respond(['ok' => true]);
        case 'ga4Import':
            respond(['ok' => true, 'days' => import_ga4($body['metrics'] ?? null, $body['days'] ?? null)]);
        default:
            fail('invalid', 400, '不明な操作です');
    }
} catch (InvalidArgumentException $e) {
    fail('invalid', 422, $e->getMessage());
} catch (Throwable $e) {
    error_log('[dolink-log] ' . $e->getMessage());
    fail('server', 500, 'サーバーでエラーが発生しました');
}
