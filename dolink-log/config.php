<?php
/**
 * Do.Link 運用ログ — 設定ファイル
 * サーバーにアップロードする前に、ここだけ書き換えてください。
 */

return [
    // 管理者パスワード（記録の追加・編集・削除に使用）
    // ★必ず変更してください。12文字以上の英数字を推奨
    'admin_password' => 'change-me-please',

    // データの保存先（SQLiteファイル）
    // 初期値はこのフォルダ内の data/。可能ならWeb公開領域の外を指定するとより安全です
    // 例：'/home/ユーザー名/dolink-log-data/dolink-log.sqlite'
    'db_path' => __DIR__ . '/data/dolink-log.sqlite',

    // 画面の自動同期の間隔（秒）。この間隔で他の人の更新が画面に反映されます
    'refresh_seconds' => 60,
];
