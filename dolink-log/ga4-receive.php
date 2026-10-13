<?php
/**
 * Do.Link 運用ログ — GA4自動同期の受け口
 * Google Apps Script（ga4-sync.gs）が毎朝、GA4の日別データをここへ送信する。
 * 合言葉（トークン）が一致した送信だけを受け付ける。
 *
 * 受け取る形式（JSON）：
 *   { "token": "...", "metrics": ["表示回数", ...], "days": { "2026-10-01": { "表示回数": 123, ... } } }
 */

declare(strict_types=1);

define('DOLINK_LOG', true);
require __DIR__ . '/inc/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply(array $body, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        reply(['ok' => false, 'error' => 'POST only'], 405);
    }

    $raw = (string) file_get_contents('php://input');
    if (strlen($raw) > 2 * 1024 * 1024) {
        reply(['ok' => false, 'error' => 'too large'], 413);
    }

    $body = json_decode($raw, true);
    if (!is_array($body)) {
        reply(['ok' => false, 'error' => 'invalid json'], 400);
    }

    if (!hash_equals(ga4_sync_token(), (string) ($body['token'] ?? ''))) {
        sleep(1); // 総当たり対策
        reply(['ok' => false, 'error' => 'unauthorized'], 401);
    }

    $days = import_ga4($body['metrics'] ?? null, $body['days'] ?? null, true);
    reply(['ok' => true, 'days' => $days]);
} catch (InvalidArgumentException $e) {
    reply(['ok' => false, 'error' => 'invalid', 'message' => $e->getMessage()], 422);
} catch (Throwable $e) {
    error_log('[dolink-log] ga4-receive: ' . $e->getMessage());
    reply(['ok' => false, 'error' => 'server'], 500);
}
