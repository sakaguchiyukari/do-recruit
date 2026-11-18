/**
 * 安否確認システム 設定ファイル
 * ------------------------------------------------------------
 * GAS_ENDPOINT に Google Apps Script の「ウェブアプリURL」を設定してください。
 *   例）'https://script.google.com/macros/s/XXXXXXXXXXXX/exec'
 * 空文字のままだと「デモモード」（700名分のダミーデータ／ブラウザ内保存）で動作します。
 */
window.SAFETY_CONFIG = Object.freeze({
  GAS_ENDPOINT: '',

  // 管理画面の一覧で1ページに表示する件数
  PAGE_SIZE: 50,

  // 管理画面の自動更新間隔（ミリ秒）
  AUTO_REFRESH_MS: 60000,

  // 通信失敗時のリトライ回数（アクセス集中対策）
  RETRY: 3
});
