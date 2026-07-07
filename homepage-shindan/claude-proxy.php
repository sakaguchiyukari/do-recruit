<?php
/**
 * ホームページ集客診断AI — Claude API プロキシ
 *
 * ブラウザから直接 api.anthropic.com を呼ぶことはできない
 * （APIキーが必要・キーをHTMLに書くと誰でも盗めてしまう）ため、
 * このPHPがサーバー側でAPIキーを保持してClaude APIを中継する。
 *
 * 設置方法:
 *   1. index.html と同じディレクトリにこのファイルを置く
 *   2. 下の ANTHROPIC_API_KEY を設定する（環境変数推奨。直接記入も可）
 *   3. https://console.anthropic.com で発行したキー（sk-ant-…）を使う
 */

// ---------------------------------------------------------------
// 設定
// ---------------------------------------------------------------

// 環境変数 ANTHROPIC_API_KEY が設定されていればそれを使う。
// 環境変数が使えないサーバーの場合は '' の部分にキーを直接記入する。
// （このファイルは.phpなのでソースが外部に見えることはないが、
//   Gitで公開リポジトリにキーを直接コミットしないこと）
$apiKey = getenv('ANTHROPIC_API_KEY') ?: '';

$model = 'claude-sonnet-4-6';

// ---------------------------------------------------------------
// リクエスト受付
// ---------------------------------------------------------------

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError(405, 'POSTメソッドのみ対応しています。');
}

if ($apiKey === '') {
    respondError(500, 'サーバーにAPIキーが設定されていません。claude-proxy.php の設定を確認してください。');
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input) || !isset($input['action'])) {
    respondError(400, 'リクエスト形式が不正です。');
}

// 診断はWeb検索を伴い時間がかかるため、実行時間の上限を延長する
set_time_limit(180);

switch ($input['action']) {
    case 'diagnose':
        $url = trim((string)($input['url'] ?? ''));
        if (!preg_match('#^https?://.+#', $url) || !filter_var($url, FILTER_VALIDATE_URL)) {
            respondError(400, 'URLの形式が正しくありません。https:// から始まるURLを入力してください。');
        }
        $body = [
            'model'      => $model,
            'max_tokens' => 4096,
            'tools'      => [[
                'type'     => 'web_search_20260209',
                'name'     => 'web_search',
                'max_uses' => 5,
            ]],
            'messages'   => [[
                'role'    => 'user',
                'content' => buildDiagnosisPrompt($url),
            ]],
        ];
        break;

    case 'article':
        $siteName = mb_substr(trim((string)($input['siteName'] ?? '')), 0, 200);
        $siteUrl  = mb_substr(trim((string)($input['siteUrl'] ?? '')), 0, 500);
        $title    = mb_substr(trim((string)($input['title'] ?? '')), 0, 300);
        if ($title === '') {
            respondError(400, '記事タイトルが指定されていません。');
        }
        $body = [
            'model'      => $model,
            'max_tokens' => 4096,
            'messages'   => [[
                'role'    => 'user',
                'content' => buildArticlePrompt($siteName, $siteUrl, $title),
            ]],
        ];
        break;

    default:
        respondError(400, '不明なアクションです。');
}

// ---------------------------------------------------------------
// Claude API 呼び出し
// ---------------------------------------------------------------

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
        'content-type: application/json',
    ],
    CURLOPT_POSTFIELDS     => json_encode($body, JSON_UNESCAPED_UNICODE),
    CURLOPT_TIMEOUT        => 150,
]);
$response = curl_exec($ch);
$status   = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($response === false) {
    respondError(502, 'Claude APIへの接続に失敗しました。' . ($curlErr !== '' ? "（{$curlErr}）" : ''));
}

$data = json_decode($response, true);

if ($status < 200 || $status >= 300) {
    $apiMessage = $data['error']['message'] ?? '不明なエラー';
    respondError(502, "Claude APIエラー（status: {$status}）: {$apiMessage}");
}

// typeがtextのブロックのみ連結（tool_use等は除外）
$text = '';
foreach (($data['content'] ?? []) as $block) {
    if (($block['type'] ?? '') === 'text') {
        $text .= $block['text'] . "\n";
    }
}

if (trim($text) === '') {
    respondError(502, 'Claude APIから有効な応答が得られませんでした。もう一度お試しください。');
}

echo json_encode(['text' => $text], JSON_UNESCAPED_UNICODE);
exit;

// ---------------------------------------------------------------
// 関数
// ---------------------------------------------------------------

function respondError(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function buildDiagnosisPrompt(string $siteUrl): string
{
    $now = new DateTime('now', new DateTimeZone('Asia/Tokyo'));
    $year  = $now->format('Y');
    $month = (int)$now->format('n');

    return <<<PROMPT
あなたはWeb集客コンサルタントです。次のサイトをWeb検索で調査し、集客診断を行ってください。
対象URL: {$siteUrl}

検索してもサイト情報が十分に得られない場合は、URL・業種の一般的な傾向から推定し、summaryに「情報が限られるため推定を含む」と明記してください。

以下のJSONのみを出力してください。前置き・後書き・Markdownの装飾は一切禁止です。
{
  "siteName": "サイト名（不明ならドメイン名）",
  "summary": "サイト全体の診断コメント。200文字程度。事実と推定を区別して書く",
  "scores": [
    {"key": "seo", "label": "SEO基礎", "score": 0-100の整数, "comment": "40文字程度の短評"},
    {"key": "mobile", "label": "スマホ対応", "score": 0-100, "comment": "同上（推定である旨を含めてよい）"},
    {"key": "speed", "label": "表示速度", "score": 0-100, "comment": "同上（推定値）"},
    {"key": "contact", "label": "問い合わせ導線", "score": 0-100, "comment": "同上"},
    {"key": "recruit", "label": "採用ページ", "score": 0-100, "comment": "採用ページが無い場合はその旨"}
  ],
  "actions": [
    {"title": "改善タスク名", "impact": "高/中/低", "detail": "具体的なやり方を80文字程度で"}
  ],
  "keywords": [
    {"keyword": "検索キーワード", "intent": "検索意図の短い分類", "reason": "狙う理由を60文字程度で"}
  ],
  "themes": ["競合と差別化できるテーマ（60文字程度）"],
  "blogIdeas": ["記事タイトル案"]
}
条件: actionsは優先順位の高い順に5件、keywordsは6件、themesは3件、blogIdeasは今の時期（{$year}年{$month}月）に旬なものを含めて10件。すべて日本語。
PROMPT;
}

function buildArticlePrompt(string $siteName, string $siteUrl, string $title): string
{
    return <<<PROMPT
あなたはSEOライターです。以下のサイトのブログ記事原稿を作成してください。
サイト: {$siteName}（{$siteUrl}）
記事タイトル: {$title}

以下のJSONのみを出力してください。前置きや装飾は禁止です。
{
  "title": "記事タイトル（必要ならリライト）",
  "metaDescription": "120文字以内のメタディスクリプション",
  "sections": [
    {"h2": "見出し", "h3": ["小見出し（0〜3件）"], "body": "この見出しの本文200〜300文字"}
  ],
  "faq": [
    {"q": "よくある質問", "a": "回答100文字程度"}
  ]
}
条件: sectionsは4件、faqは3件。読者に役立つ具体的な内容にし、事実として断定できない箇所は推定と分かる書き方にすること。すべて日本語。
PROMPT;
}
