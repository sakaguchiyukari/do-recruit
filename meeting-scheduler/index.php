<?php
/**
 * 会議日程調整ツール (Meeting Scheduler)
 *
 * 「調整さん」型の日程調整ツール。ブラウザだけで使えるスタンドアロン版。
 * WordPress等への依存なし。このフォルダをサーバーに置くだけで動作します。
 *
 * - ログイン不要。誰でも・何件でも調整を作成できる
 * - 調整1件 = 1つのJSONファイル。専用のランダムURLを発行するため、
 *   複数の調整が同時進行しても互いに干渉せず、URLを知らない調整は見えない
 * - 幹事用URLと参加者用URLを分離（決定・削除等の管理操作は幹事のみ）
 * - 回答の保存は排他ロック付きなので、同時に送信しても上書きされない
 *
 * 動作要件: PHP 7.4 以上（追加の拡張・DB不要）
 */

/* ================= 設定 ================= */
const MS_DATA_DIR       = __DIR__ . '/data'; // データ保存先（Web公開範囲外に置く場合はここを変更）
const MS_RETENTION_DAYS = 180;               // この日数更新がない調整を自動削除（0で無効）
const MS_RATE_LIMIT     = 20;                // 同一IPが1時間に作成できる調整の上限
const MS_MAX_SLOTS      = 100;               // 候補日程の上限

/* ================= 初期化 ================= */
error_reporting( E_ALL & ~E_NOTICE & ~E_DEPRECATED );
mb_internal_encoding( 'UTF-8' );

if ( ! is_dir( MS_DATA_DIR ) ) {
	if ( ! @mkdir( MS_DATA_DIR, 0755, true ) ) {
		http_response_code( 500 );
		exit( 'データフォルダを作成できません。このフォルダに書き込み権限があるか確認してください。' );
	}
}
// データフォルダへの直接アクセスを拒否（Apache用。nginxはREADME参照）
if ( ! file_exists( MS_DATA_DIR . '/.htaccess' ) ) {
	@file_put_contents( MS_DATA_DIR . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n" );
}
if ( ! file_exists( MS_DATA_DIR . '/index.html' ) ) {
	@file_put_contents( MS_DATA_DIR . '/index.html', '' );
}

/* ================= 汎用ヘルパー ================= */

function h( $s ) {
	return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' );
}

function ms_cut( $s, $len ) {
	return function_exists( 'mb_substr' ) ? mb_substr( $s, 0, $len ) : substr( $s, 0, $len * 4 );
}

function ms_clean_line( $s ) {
	return trim( preg_replace( '/[\r\n\t]+/u', ' ', (string) $s ) );
}

// ランダムトークン（URLに使える英数字のみ）
function ms_token( $len = 24 ) {
	$chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	$out   = '';
	for ( $i = 0; $i < $len; $i++ ) {
		$out .= $chars[ random_int( 0, strlen( $chars ) - 1 ) ];
	}
	return $out;
}

// CSRF用シークレット（初回アクセス時に自動生成）
function ms_secret() {
	static $secret = null;
	if ( $secret !== null ) {
		return $secret;
	}
	$path = MS_DATA_DIR . '/secret.txt';
	if ( ! file_exists( $path ) ) {
		@file_put_contents( $path, bin2hex( random_bytes( 32 ) ), LOCK_EX );
		@chmod( $path, 0600 );
	}
	$secret = trim( (string) @file_get_contents( $path ) );
	if ( $secret === '' ) {
		http_response_code( 500 );
		exit( '初期化に失敗しました。data フォルダの書き込み権限を確認してください。' );
	}
	return $secret;
}

function ms_csrf( $context ) {
	return hash_hmac( 'sha256', 'ms_csrf|' . $context, ms_secret() );
}

function ms_verify_csrf( $context ) {
	$sent = isset( $_POST['ms_csrf'] ) ? (string) $_POST['ms_csrf'] : '';
	return $sent !== '' && hash_equals( ms_csrf( $context ), $sent );
}

// このスクリプト自身の絶対URL（共有用URLの組み立てに使用）
function ms_base_url() {
	$https = ( ! empty( $_SERVER['HTTPS'] ) && $_SERVER['HTTPS'] !== 'off' )
		|| ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https' );
	$host  = $_SERVER['HTTP_HOST'] ?? 'localhost';
	$path  = strtok( $_SERVER['REQUEST_URI'] ?? '/', '?' );
	return ( $https ? 'https' : 'http' ) . '://' . $host . $path;
}

function ms_event_url( $token, $admin_key = '' ) {
	$url = ms_base_url() . '?e=' . rawurlencode( $token );
	if ( $admin_key !== '' ) {
		$url .= '&key=' . rawurlencode( $admin_key );
	}
	return $url;
}

function ms_redirect( $url ) {
	header( 'Location: ' . $url, true, 303 );
	exit;
}

function ms_fail( $message, $code = 400 ) {
	http_response_code( $code );
	ms_render_head( 'エラー' );
	echo '<div class="ms-card"><h2>エラー</h2><p>' . h( $message ) . '</p>'
		. '<p><a href="javascript:history.back()">前の画面に戻る</a></p></div>';
	ms_render_foot( true );
	exit;
}

/* ================= データ入出力 =================
 * 調整1件 = data/ev_{トークン}.json 。ファイル単位で完全に独立
 * しているため、複数の調整が同時に作成・更新されても互いに
 * 影響しない。更新はロックファイルで排他制御し、書き込みは
 * 一時ファイル + rename（アトミック）で行う。
 * ================================================ */

function ms_event_path( $token ) {
	if ( ! preg_match( '/^[a-zA-Z0-9]{8,64}$/', $token ) ) {
		return null;
	}
	return MS_DATA_DIR . '/ev_' . $token . '.json';
}

function ms_load_event( $token ) {
	$path = ms_event_path( $token );
	if ( ! $path || ! file_exists( $path ) ) {
		return null;
	}
	$data = json_decode( (string) @file_get_contents( $path ), true );
	return ( is_array( $data ) && isset( $data['title'], $data['slots'] ) ) ? $data : null;
}

function ms_write_event_file( $path, $event ) {
	$event['updated'] = time();
	$tmp = $path . '.' . ms_token( 8 ) . '.tmp';
	if ( @file_put_contents( $tmp, json_encode( $event, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT ) ) === false ) {
		return false;
	}
	return @rename( $tmp, $path ); // rename はアトミックなので読み手が壊れたJSONを見ることはない
}

/**
 * 排他ロック付きの読み取り→変更→書き込み。
 * $fn は最新のイベント配列を受け取り、変更後の配列を返す（falseで書き込み中止）。
 * 同時に複数人が回答を送信しても、この関数が直列化するため上書き事故が起きない。
 */
function ms_update_event( $token, callable $fn ) {
	$path = ms_event_path( $token );
	if ( ! $path || ! file_exists( $path ) ) {
		return null;
	}
	$lock = @fopen( $path . '.lock', 'c' );
	if ( ! $lock ) {
		return null;
	}
	flock( $lock, LOCK_EX );
	$event  = ms_load_event( $token );
	$result = null;
	if ( $event ) {
		$changed = $fn( $event );
		if ( is_array( $changed ) ) {
			ms_write_event_file( $path, $changed );
			$result = $changed;
		} else {
			$result = $event;
		}
	}
	flock( $lock, LOCK_UN );
	fclose( $lock );
	return $result;
}

function ms_delete_event( $token ) {
	$path = ms_event_path( $token );
	if ( $path && file_exists( $path ) ) {
		@unlink( $path );
		@unlink( $path . '.lock' );
	}
}

// 古い調整の自動削除（作成時に少しずつ実行。何度使ってもデータが溜まり続けない）
function ms_cleanup_old_events() {
	if ( MS_RETENTION_DAYS <= 0 ) {
		return;
	}
	$limit = time() - MS_RETENTION_DAYS * 86400;
	$count = 0;
	foreach ( (array) @glob( MS_DATA_DIR . '/ev_*.json' ) as $file ) {
		if ( @filemtime( $file ) < $limit ) {
			@unlink( $file );
			@unlink( $file . '.lock' );
			if ( ++$count >= 100 ) {
				break;
			}
		}
	}
	// 期限切れのレート制限ファイルも掃除
	foreach ( (array) @glob( MS_DATA_DIR . '/rate_*.json' ) as $file ) {
		if ( @filemtime( $file ) < time() - 7200 ) {
			@unlink( $file );
		}
	}
}

// 同一IPからの連続作成を制限
function ms_check_rate_limit() {
	$ip   = $_SERVER['REMOTE_ADDR'] ?? '';
	$path = MS_DATA_DIR . '/rate_' . md5( $ip ) . '.json';
	$data = json_decode( (string) @file_get_contents( $path ), true );
	$now  = time();
	if ( ! is_array( $data ) || ( $data['start'] ?? 0 ) < $now - 3600 ) {
		$data = [ 'start' => $now, 'count' => 0 ];
	}
	if ( $data['count'] >= MS_RATE_LIMIT ) {
		return false;
	}
	$data['count']++;
	@file_put_contents( $path, json_encode( $data ), LOCK_EX );
	return true;
}

/* ================= ドメインヘルパー ================= */

function ms_answer_choices() {
	return [
		'ok'    => '○',
		'maybe' => '△',
		'ng'    => '×',
	];
}

function ms_is_admin( $event, $key ) {
	return is_string( $key ) && $key !== ''
		&& isset( $event['admin_hash'] )
		&& hash_equals( $event['admin_hash'], hash( 'sha256', $key ) );
}

// 回答一覧（送信順）
function ms_responses( $event ) {
	$responses = [];
	foreach ( (array) ( $event['responses'] ?? [] ) as $id => $r ) {
		if ( is_array( $r ) && isset( $r['name'] ) ) {
			$r['id']     = (string) $id;
			$responses[] = $r;
		}
	}
	usort( $responses, function ( $a, $b ) {
		return ( $a['created'] ?? 0 ) <=> ( $b['created'] ?? 0 );
	} );
	return $responses;
}

/* ================= ルーティング ================= */

$e   = isset( $_GET['e'] ) ? (string) $_GET['e'] : '';
$key = isset( $_GET['key'] ) ? (string) $_GET['key'] : '';

if ( $e === '' || $e === 'new' ) {
	ms_handle_create();
	ms_render_create_page();
	exit;
}

$event = ms_load_event( $e );
if ( ! $event ) {
	ms_fail( 'ページが見つかりません。URLが正しいか確認してください（削除済みの調整の可能性もあります）。', 404 );
}
$is_admin = ms_is_admin( $event, $key );

ms_handle_event_post( $e, $event, $is_admin, $key );
ms_render_event_page( $e, $event, $is_admin, $key );
exit;

/* ================= 処理: 新規作成 ================= */

function ms_handle_create() {
	if ( $_SERVER['REQUEST_METHOD'] !== 'POST' || ( $_POST['ms_action'] ?? '' ) !== 'create' ) {
		return;
	}
	if ( ! ms_verify_csrf( 'create' ) || ! empty( $_POST['website'] ) ) {
		ms_fail( '不正なリクエストです。前の画面に戻ってやり直してください。' );
	}
	if ( ! ms_check_rate_limit() ) {
		ms_fail( '短時間に作成できる調整の数を超えました。しばらく時間をおいてからお試しください。', 429 );
	}

	$title     = ms_cut( ms_clean_line( $_POST['ms_title'] ?? '' ), 100 );
	$organizer = ms_cut( ms_clean_line( $_POST['ms_organizer'] ?? '' ), 50 );
	$memo      = ms_cut( trim( (string) ( $_POST['ms_memo'] ?? '' ) ), 2000 );
	$slots     = array_values( array_filter( array_map( 'ms_clean_line', explode( "\n", (string) ( $_POST['ms_slots'] ?? '' ) ) ), 'strlen' ) );
	$slots     = array_map( function ( $s ) { return ms_cut( $s, 100 ); }, array_slice( $slots, 0, MS_MAX_SLOTS ) );

	if ( $title === '' || empty( $slots ) ) {
		ms_fail( '会議名と候補日程は必須です。前の画面に戻って入力してください。' );
	}

	ms_cleanup_old_events();

	// この調整専用のトークンを発行。ファイルの排他生成（xモード）で
	// 万一同じトークンが同時に生成されても衝突しない。
	$admin_key = ms_token( 24 );
	for ( $try = 0; $try < 5; $try++ ) {
		$token = ms_token( 24 );
		$fp    = @fopen( ms_event_path( $token ), 'x' );
		if ( $fp ) {
			fclose( $fp );
			$event = [
				'title'      => $title,
				'organizer'  => $organizer,
				'memo'       => $memo,
				'slots'      => $slots,
				'status'     => 'open',
				'confirmed'  => null,
				// 幹事キーはハッシュのみ保存（万一データファイルが漏れても幹事URLは復元できない）
				'admin_hash' => hash( 'sha256', $admin_key ),
				'created'    => time(),
				'responses'  => [],
			];
			if ( ! ms_write_event_file( ms_event_path( $token ), $event ) ) {
				ms_fail( '調整の作成に失敗しました。時間をおいて再度お試しください。', 500 );
			}
			ms_redirect( ms_event_url( $token, $admin_key ) . '&created=1' );
		}
	}
	ms_fail( '調整の作成に失敗しました。時間をおいて再度お試しください。', 500 );
}

/* ================= 処理: 調整ページのPOST ================= */

function ms_handle_event_post( $token, $event, $is_admin, $admin_key ) {
	if ( $_SERVER['REQUEST_METHOD'] !== 'POST' || empty( $_POST['ms_action'] ) ) {
		return;
	}
	$action = preg_replace( '/[^a-z_]/', '', (string) $_POST['ms_action'] );

	if ( ! ms_verify_csrf( 'event_' . $token ) || ! empty( $_POST['website'] ) ) {
		ms_fail( '不正なリクエストです。前の画面に戻ってやり直してください。' );
	}

	$redirect_extra = '';

	// --- 回答の登録・更新（誰でも可） ---
	if ( $action === 'respond' ) {
		if ( ( $event['status'] ?? 'open' ) !== 'open' ) {
			ms_fail( 'この調整は締め切られています。' );
		}
		$name    = ms_cut( ms_clean_line( $_POST['ms_name'] ?? '' ), 30 );
		$comment = ms_cut( trim( (string) ( $_POST['ms_comment'] ?? '' ) ), 500 );
		if ( $name === '' ) {
			ms_fail( 'お名前を入力してください。前の画面に戻ってやり直してください。' );
		}
		$choices = ms_answer_choices();
		$edit_id = preg_replace( '/[^a-zA-Z0-9]/', '', (string) ( $_POST['ms_edit_id'] ?? '' ) );

		// ロック内で最新のイベントを読み直して自分の回答だけを追加/更新するため、
		// 同時に他の人が回答していても消えない。
		$updated = ms_update_event( $token, function ( $ev ) use ( $name, $comment, $choices, $edit_id ) {
			if ( ( $ev['status'] ?? 'open' ) !== 'open' ) {
				return false;
			}
			$answers = [];
			foreach ( $ev['slots'] as $i => $slot ) {
				$v             = (string) ( $_POST['ms_answer'][ $i ] ?? '' );
				$answers[ $i ] = array_key_exists( $v, $choices ) ? $v : '';
			}
			$data = [
				'name'    => $name,
				'answers' => $answers,
				'comment' => $comment,
				'updated' => time(),
			];
			if ( $edit_id !== '' && isset( $ev['responses'][ $edit_id ] ) ) {
				$data['created']               = $ev['responses'][ $edit_id ]['created'] ?? time();
				$ev['responses'][ $edit_id ]   = $data;
			} else {
				$data['created']               = time();
				$ev['responses'][ ms_token( 16 ) ] = $data;
			}
			return $ev;
		} );
		if ( ! $updated ) {
			ms_fail( '保存に失敗しました。時間をおいて再度お試しください。', 500 );
		}
		$redirect_extra = '&saved=1';
	}

	// --- 以下は幹事のみ ---
	if ( in_array( $action, [ 'confirm', 'reopen', 'add_slots', 'update_memo', 'delete_response', 'delete_event' ], true ) ) {
		if ( ! $is_admin ) {
			ms_fail( 'この操作には幹事用URLが必要です。', 403 );
		}

		if ( $action === 'confirm' ) {
			$slot_index = (int) ( $_POST['ms_confirm_slot'] ?? -1 );
			ms_update_event( $token, function ( $ev ) use ( $slot_index ) {
				if ( ! isset( $ev['slots'][ $slot_index ] ) ) {
					return false;
				}
				$ev['status']    = 'closed';
				$ev['confirmed'] = $slot_index;
				return $ev;
			} );
			$redirect_extra = '&confirmed=1';
		}

		if ( $action === 'reopen' ) {
			ms_update_event( $token, function ( $ev ) {
				$ev['status']    = 'open';
				$ev['confirmed'] = null;
				return $ev;
			} );
		}

		if ( $action === 'add_slots' ) {
			// 候補は末尾に追加のみ。既存回答は候補のインデックスで
			// 紐付いているため、追加しても既存回答が壊れない。
			$new = array_values( array_filter( array_map( 'ms_clean_line', explode( "\n", (string) ( $_POST['ms_new_slots'] ?? '' ) ) ), 'strlen' ) );
			$new = array_map( function ( $s ) { return ms_cut( $s, 100 ); }, $new );
			if ( $new ) {
				ms_update_event( $token, function ( $ev ) use ( $new ) {
					$ev['slots'] = array_slice( array_merge( $ev['slots'], $new ), 0, MS_MAX_SLOTS );
					return $ev;
				} );
			}
		}

		if ( $action === 'update_memo' ) {
			$memo = ms_cut( trim( (string) ( $_POST['ms_memo'] ?? '' ) ), 2000 );
			ms_update_event( $token, function ( $ev ) use ( $memo ) {
				$ev['memo'] = $memo;
				return $ev;
			} );
		}

		if ( $action === 'delete_response' ) {
			$resp_id = preg_replace( '/[^a-zA-Z0-9]/', '', (string) ( $_POST['ms_resp_id'] ?? '' ) );
			if ( $resp_id !== '' ) {
				ms_update_event( $token, function ( $ev ) use ( $resp_id ) {
					unset( $ev['responses'][ $resp_id ] );
					return $ev;
				} );
			}
		}

		if ( $action === 'delete_event' ) {
			ms_delete_event( $token );
			ms_render_head( '削除完了' );
			echo '<div class="ms-card"><h2>削除しました</h2><p>この日程調整を削除しました。ご利用ありがとうございました。</p></div>';
			ms_render_foot( true );
			exit;
		}
	}

	// 二重送信防止（PRGパターン）
	ms_redirect( ms_event_url( $token, $is_admin ? $admin_key : '' ) . $redirect_extra );
}

/* ================= 描画: 共通レイアウト ================= */

function ms_render_head( $title ) {
	header( 'Content-Type: text/html; charset=UTF-8' );
	header( 'X-Robots-Tag: noindex, nofollow' );
	?>
<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex, nofollow">
	<title><?php echo h( $title ); ?> | 会議日程調整ツール</title>
	<style>
		:root { color-scheme: light; }
		* { box-sizing: border-box; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif; background: #f5f6f8; color: #222; margin: 0; padding: 24px 12px 60px; line-height: 1.7; }
		.ms-wrap { max-width: 960px; margin: 0 auto; }
		.ms-header h1 { font-size: 20px; margin: 0 0 4px; }
		.ms-sub { color: #666; font-size: 13px; margin: 0 0 20px; }
		.ms-card { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
		.ms-card h2 { font-size: 16px; margin: 0 0 14px; border-left: 4px solid #2271b1; padding-left: 10px; }
		label { display: block; font-weight: bold; margin: 14px 0 6px; font-size: 14px; }
		.ms-hint { font-weight: normal; color: #777; font-size: 12px; }
		textarea, input[type=text], select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px; font-family: inherit; }
		button { background: #2271b1; color: #fff; border: none; padding: 10px 22px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 14px; }
		button:hover { background: #135e96; }
		button.ms-danger { background: #b32d2e; }
		button.ms-danger:hover { background: #8a2424; }
		button.ms-ghost { background: #f0f0f1; color: #333; }
		.ms-notice { background: #d7f4dd; color: #146c2e; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 14px; }
		.ms-warn { background: #fcf0e4; color: #8a5a10; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; }
		.ms-badge { display: inline-block; background: #2271b1; color: #fff; font-size: 12px; padding: 2px 10px; border-radius: 999px; vertical-align: middle; }
		.ms-badge-closed { background: #b32d2e; }
		.ms-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
		table.ms-table { border-collapse: collapse; font-size: 13px; white-space: nowrap; }
		.ms-table th, .ms-table td { border: 1px solid #e2e4e7; padding: 6px 10px; text-align: center; background: #fff; }
		.ms-table th { background: #f6f7f8; font-weight: bold; }
		.ms-table th.ms-slot-col, .ms-table td.ms-slot-col { position: sticky; left: 0; z-index: 1; text-align: left; min-width: 150px; box-shadow: 2px 0 0 #e2e4e7; }
		.ms-table td.ms-slot-col { background: #f6f7f8; font-weight: bold; }
		.ms-best td { background: #eaf6ec; }
		.ms-best td.ms-slot-col { background: #dcefe0; }
		.ms-confirmed td { background: #fdf3d8; }
		.ms-confirmed td.ms-slot-col { background: #f9e9b8; }
		.ms-ans-ok { color: #1a7f37; font-weight: bold; }
		.ms-ans-maybe { color: #b78105; font-weight: bold; }
		.ms-ans-ng { color: #c22; font-weight: bold; }
		.ms-edit-link { font-size: 11px; display: block; color: #2271b1; }
		.ms-choice-row { display: flex; align-items: center; gap: 6px; padding: 8px 0; border-bottom: 1px solid #eee; flex-wrap: wrap; }
		.ms-choice-label { flex: 1 1 180px; font-size: 14px; }
		.ms-choice-row .ms-opts { display: flex; gap: 6px; }
		.ms-opts label { margin: 0; }
		.ms-opts input[type=radio] { display: none; }
		.ms-opts span { display: inline-block; width: 44px; text-align: center; padding: 8px 0; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-size: 15px; background: #fff; }
		.ms-opts input[type=radio]:checked + span { border-color: #2271b1; background: #2271b1; color: #fff; }
		.ms-url-box { background: #f6f7f8; border: 1px solid #e2e4e7; border-radius: 6px; padding: 12px; margin: 10px 0; }
		.ms-url-box input { font-size: 13px; background: #fff; }
		.ms-copy { margin-top: 6px; font-size: 12px; padding: 6px 14px; }
		.ms-honeypot { position: absolute; left: -9999px; }
		.ms-memo { white-space: pre-wrap; background: #f9fafb; border-radius: 6px; padding: 12px; font-size: 14px; }
		.ms-footer { text-align: center; font-size: 12px; color: #999; margin-top: 30px; }
		.ms-footer a { color: #2271b1; }
		details.ms-admin-tools { margin-top: 10px; }
		details.ms-admin-tools summary { cursor: pointer; font-weight: bold; font-size: 14px; }
	</style>
</head>
<body>
<div class="ms-wrap">
	<?php
}

function ms_render_foot( $show_new_link = true ) {
	?>
	<div class="ms-footer">
		<?php if ( $show_new_link ) : ?>
			<a href="<?php echo h( ms_base_url() ); ?>">＋ 新しい日程調整を作成する</a>
		<?php endif; ?>
	</div>
</div>
<script>
	function msCopy(id, btn) {
		var el = document.getElementById(id);
		el.select();
		function done(){ btn.textContent = 'コピーしました'; }
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(el.value).then(done, function(){ document.execCommand('copy'); done(); });
		} else { document.execCommand('copy'); done(); }
	}
</script>
</body>
</html>
	<?php
}

/* ================= 描画: 新規作成ページ ================= */

function ms_render_create_page() {
	ms_render_head( '新しい日程調整を作成' );
	?>
	<div class="ms-header">
		<h1>新しい日程調整を作成</h1>
		<p class="ms-sub">ログイン不要で作成できます。作成すると、この調整専用のURLが発行されます（他の調整とは完全に独立しています）。</p>
	</div>
	<div class="ms-card">
		<form method="post" action="<?php echo h( ms_base_url() ); ?>">
			<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
			<input type="hidden" name="ms_csrf" value="<?php echo h( ms_csrf( 'create' ) ); ?>">
			<input type="hidden" name="ms_action" value="create">

			<label>会議・イベント名 <span style="color:#c22;">必須</span></label>
			<input type="text" name="ms_title" required maxlength="100" placeholder="例）7月度 定例会議">

			<label>幹事のお名前 <span class="ms-hint">任意</span></label>
			<input type="text" name="ms_organizer" maxlength="50" placeholder="例）山田">

			<label>メモ <span class="ms-hint">任意（場所・オンラインURL・議題など）</span></label>
			<textarea name="ms_memo" rows="3" placeholder="例）会議室A または Zoom（URLは後日共有）"></textarea>

			<label>候補日程 <span style="color:#c22;">必須</span> <span class="ms-hint">1行に1つずつ入力してください（最大<?php echo (int) MS_MAX_SLOTS; ?>件）</span></label>
			<textarea name="ms_slots" rows="8" required placeholder="例）&#10;7/21(火) 10:00〜11:00&#10;7/21(火) 15:00〜16:00&#10;7/22(水) 13:00〜14:00"></textarea>

			<button type="submit">日程調整を作成する</button>
		</form>
	</div>
	<div class="ms-card">
		<h2>使い方</h2>
		<ol style="margin:0;padding-left:20px;font-size:14px;">
			<li>会議名と候補日程を入力して「作成」を押す</li>
			<li>発行された<strong>参加者用URL</strong>をメールやチャットで参加者に共有する</li>
			<li>参加者は名前と ○△× を入力するだけ（ログイン不要）</li>
			<li>回答が集まったら<strong>幹事用URL</strong>から日程を決定する</li>
		</ol>
	</div>
	<?php
	ms_render_foot( false );
}

/* ================= 描画: 調整ページ ================= */

function ms_render_event_page( $token, $event, $is_admin, $admin_key ) {
	$status    = $event['status'] ?? 'open';
	$confirmed = $event['confirmed'];
	$confirmed = $confirmed === null || $confirmed === '' ? null : (int) $confirmed;
	$slots     = $event['slots'];
	$responses = ms_responses( $event );
	$choices   = ms_answer_choices();
	$csrf      = ms_csrf( 'event_' . $token );

	// 集計とベスト候補の算出（○=2点、△=1点）
	$counts = [];
	$scores = [];
	foreach ( $slots as $i => $slot ) {
		$counts[ $i ] = [ 'ok' => 0, 'maybe' => 0, 'ng' => 0 ];
		foreach ( $responses as $r ) {
			$a = $r['answers'][ $i ] ?? '';
			if ( isset( $counts[ $i ][ $a ] ) ) {
				$counts[ $i ][ $a ]++;
			}
		}
		$scores[ $i ] = $counts[ $i ]['ok'] * 2 + $counts[ $i ]['maybe'];
	}
	$best_score = $responses ? max( $scores ) : 0;

	// 回答の編集モード
	$edit_id   = preg_replace( '/[^a-zA-Z0-9]/', '', (string) ( $_GET['edit'] ?? '' ) );
	$edit_resp = ( $edit_id !== '' && isset( $event['responses'][ $edit_id ] ) ) ? $event['responses'][ $edit_id ] : null;

	$page_url = ms_event_url( $token, $is_admin ? $admin_key : '' );

	ms_render_head( $event['title'] );
	?>
	<div class="ms-header">
		<h1><?php echo h( $event['title'] ); ?>
			<?php if ( $status === 'closed' ) : ?>
				<span class="ms-badge ms-badge-closed">日程決定済み</span>
			<?php else : ?>
				<span class="ms-badge">調整中</span>
			<?php endif; ?>
		</h1>
		<p class="ms-sub">
			<?php if ( $event['organizer'] !== '' ) : ?>幹事: <?php echo h( $event['organizer'] ); ?>　<?php endif; ?>
			回答: <?php echo count( $responses ); ?>人
		</p>
	</div>

	<?php if ( isset( $_GET['saved'] ) ) : ?>
		<div class="ms-notice">回答を保存しました。ありがとうございます。</div>
	<?php endif; ?>
	<?php if ( isset( $_GET['confirmed'] ) ) : ?>
		<div class="ms-notice">日程を決定しました。参加者用URLを開いた人にも決定日程が表示されます。</div>
	<?php endif; ?>

	<?php if ( $is_admin && isset( $_GET['created'] ) ) : ?>
		<div class="ms-card" style="border:2px solid #2271b1;">
			<h2>調整を作成しました！ まずURLを控えてください</h2>
			<div class="ms-url-box">
				<strong>① 参加者用URL</strong>（メール・チャットで参加者に共有）<br>
				<input type="text" readonly id="ms-url-p" value="<?php echo h( ms_event_url( $token ) ); ?>" onclick="this.select();">
				<button type="button" class="ms-copy" onclick="msCopy('ms-url-p', this)">URLをコピー</button>
			</div>
			<div class="ms-url-box">
				<strong>② 幹事用URL</strong>（あなた専用。日程の決定・管理に使います。<span style="color:#c22;">参加者には送らないでください</span>）<br>
				<input type="text" readonly id="ms-url-a" value="<?php echo h( ms_event_url( $token, $admin_key ) ); ?>" onclick="this.select();">
				<button type="button" class="ms-copy" onclick="msCopy('ms-url-a', this)">URLをコピー</button>
			</div>
			<p class="ms-warn">幹事用URLはブックマーク等で必ず保存してください。紛失すると幹事操作ができなくなります。</p>
		</div>
	<?php endif; ?>

	<?php if ( $status === 'closed' && $confirmed !== null && isset( $slots[ $confirmed ] ) ) : ?>
		<div class="ms-card" style="border:2px solid #b78105;background:#fffbeb;">
			<h2 style="border-color:#b78105;">開催日程が決定しました</h2>
			<p style="font-size:18px;font-weight:bold;margin:0;">📅 <?php echo h( $slots[ $confirmed ] ); ?></p>
		</div>
	<?php endif; ?>

	<?php if ( $event['memo'] !== '' ) : ?>
		<div class="ms-card">
			<h2>メモ</h2>
			<div class="ms-memo"><?php echo h( $event['memo'] ); ?></div>
		</div>
	<?php endif; ?>

	<div class="ms-card">
		<h2>みんなの回答状況</h2>
		<?php if ( empty( $responses ) ) : ?>
			<p>まだ回答がありません。下のフォームから最初の回答を入力してください。</p>
		<?php else : ?>
			<div class="ms-table-scroll">
				<table class="ms-table">
					<tr>
						<th class="ms-slot-col">候補日程</th>
						<th>○</th><th>△</th><th>×</th>
						<?php foreach ( $responses as $r ) : ?>
							<th>
								<?php echo h( $r['name'] ); ?>
								<?php if ( $status === 'open' ) : ?>
									<a class="ms-edit-link" href="<?php echo h( $page_url . '&edit=' . rawurlencode( $r['id'] ) ); ?>#ms-respond">編集</a>
								<?php endif; ?>
							</th>
						<?php endforeach; ?>
					</tr>
					<?php foreach ( $slots as $i => $slot ) :
						$row_class = '';
						if ( $confirmed === $i ) {
							$row_class = 'ms-confirmed';
						} elseif ( $status === 'open' && $best_score > 0 && $scores[ $i ] === $best_score ) {
							$row_class = 'ms-best';
						}
						?>
						<tr class="<?php echo h( $row_class ); ?>">
							<td class="ms-slot-col"><?php echo $confirmed === $i ? '📅 ' : ''; ?><?php echo h( $slot ); ?></td>
							<td class="ms-ans-ok"><?php echo (int) $counts[ $i ]['ok']; ?></td>
							<td class="ms-ans-maybe"><?php echo (int) $counts[ $i ]['maybe']; ?></td>
							<td class="ms-ans-ng"><?php echo (int) $counts[ $i ]['ng']; ?></td>
							<?php foreach ( $responses as $r ) :
								$a = $r['answers'][ $i ] ?? '';
								?>
								<td class="<?php echo $a !== '' ? 'ms-ans-' . h( $a ) : ''; ?>"><?php echo $a !== '' ? h( $choices[ $a ] ) : '－'; ?></td>
							<?php endforeach; ?>
						</tr>
					<?php endforeach; ?>
					<tr>
						<td class="ms-slot-col">コメント</td>
						<td></td><td></td><td></td>
						<?php foreach ( $responses as $r ) : ?>
							<td style="font-size:11px;max-width:160px;white-space:normal;"><?php echo h( $r['comment'] ?? '' ); ?></td>
						<?php endforeach; ?>
					</tr>
				</table>
			</div>
			<?php if ( $status === 'open' && $best_score > 0 ) : ?>
				<p class="ms-hint" style="margin-top:8px;">緑色の行は現時点で最も都合の良い候補です（○=2点、△=1点で集計）。</p>
			<?php endif; ?>
		<?php endif; ?>
	</div>

	<?php if ( $status === 'open' ) : ?>
		<div class="ms-card" id="ms-respond">
			<h2><?php echo $edit_resp ? '回答を編集' : '出欠を入力'; ?></h2>
			<form method="post" action="<?php echo h( $page_url ); ?>">
				<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
				<input type="hidden" name="ms_csrf" value="<?php echo h( $csrf ); ?>">
				<input type="hidden" name="ms_action" value="respond">
				<?php if ( $edit_resp ) : ?>
					<input type="hidden" name="ms_edit_id" value="<?php echo h( $edit_id ); ?>">
				<?php endif; ?>

				<label>お名前 <span style="color:#c22;">必須</span></label>
				<input type="text" name="ms_name" required maxlength="30" placeholder="例）佐藤" value="<?php echo h( $edit_resp['name'] ?? '' ); ?>">

				<label style="margin-top:18px;">各候補の都合を選んでください</label>
				<?php foreach ( $slots as $i => $slot ) : ?>
					<div class="ms-choice-row">
						<span class="ms-choice-label"><?php echo h( $slot ); ?></span>
						<span class="ms-opts">
							<?php foreach ( $choices as $val => $mark ) : ?>
								<label>
									<input type="radio" name="ms_answer[<?php echo (int) $i; ?>]" value="<?php echo h( $val ); ?>" <?php echo ( ( $edit_resp['answers'][ $i ] ?? '' ) === $val ) ? 'checked' : ''; ?>>
									<span><?php echo h( $mark ); ?></span>
								</label>
							<?php endforeach; ?>
						</span>
					</div>
				<?php endforeach; ?>

				<label>コメント <span class="ms-hint">任意</span></label>
				<textarea name="ms_comment" rows="2" placeholder="例）21日は15時以降なら調整可能です"><?php echo h( $edit_resp['comment'] ?? '' ); ?></textarea>

				<button type="submit"><?php echo $edit_resp ? '回答を更新する' : '回答を送信する'; ?></button>
				<?php if ( $edit_resp ) : ?>
					<a href="<?php echo h( $page_url ); ?>" style="margin-left:10px;font-size:13px;">キャンセル</a>
				<?php endif; ?>
			</form>
		</div>
	<?php endif; ?>

	<?php if ( $is_admin ) : ?>
		<div class="ms-card" style="border:1px solid #2271b1;">
			<h2>幹事メニュー</h2>

			<?php if ( ! isset( $_GET['created'] ) ) : ?>
				<div class="ms-url-box">
					<strong>参加者用URL</strong>（参加者への共有はこちら）<br>
					<input type="text" readonly id="ms-url-p2" value="<?php echo h( ms_event_url( $token ) ); ?>" onclick="this.select();">
					<button type="button" class="ms-copy" onclick="msCopy('ms-url-p2', this)">URLをコピー</button>
				</div>
			<?php endif; ?>

			<?php if ( $status === 'open' ) : ?>
				<form method="post" action="<?php echo h( $page_url ); ?>">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<input type="hidden" name="ms_csrf" value="<?php echo h( $csrf ); ?>">
					<input type="hidden" name="ms_action" value="confirm">
					<label>開催日程を決定する</label>
					<select name="ms_confirm_slot">
						<?php foreach ( $slots as $i => $slot ) : ?>
							<option value="<?php echo (int) $i; ?>">
								<?php echo h( $slot ); ?>（○<?php echo (int) $counts[ $i ]['ok']; ?> △<?php echo (int) $counts[ $i ]['maybe']; ?> ×<?php echo (int) $counts[ $i ]['ng']; ?>）
							</option>
						<?php endforeach; ?>
					</select>
					<button type="submit">この日程に決定する</button>
					<p class="ms-hint">決定すると回答受付が締め切られ、全員のページに決定日程が表示されます。</p>
				</form>
			<?php else : ?>
				<form method="post" action="<?php echo h( $page_url ); ?>">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<input type="hidden" name="ms_csrf" value="<?php echo h( $csrf ); ?>">
					<input type="hidden" name="ms_action" value="reopen">
					<button type="submit" class="ms-ghost">決定を取り消して再度募集する</button>
				</form>
			<?php endif; ?>

			<details class="ms-admin-tools">
				<summary>その他の管理操作</summary>

				<form method="post" action="<?php echo h( $page_url ); ?>">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<input type="hidden" name="ms_csrf" value="<?php echo h( $csrf ); ?>">
					<input type="hidden" name="ms_action" value="add_slots">
					<label>候補日程を追加 <span class="ms-hint">1行に1つ。既存の回答はそのまま残ります</span></label>
					<textarea name="ms_new_slots" rows="3" placeholder="例）7/23(木) 10:00〜11:00"></textarea>
					<button type="submit" class="ms-ghost">候補を追加する</button>
				</form>

				<form method="post" action="<?php echo h( $page_url ); ?>">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<input type="hidden" name="ms_csrf" value="<?php echo h( $csrf ); ?>">
					<input type="hidden" name="ms_action" value="update_memo">
					<label>メモを更新</label>
					<textarea name="ms_memo" rows="3"><?php echo h( $event['memo'] ); ?></textarea>
					<button type="submit" class="ms-ghost">メモを保存する</button>
				</form>

				<?php if ( ! empty( $responses ) ) : ?>
					<label style="margin-top:18px;">回答の削除</label>
					<?php foreach ( $responses as $r ) : ?>
						<form method="post" action="<?php echo h( $page_url ); ?>" style="display:inline-block;margin:2px;" onsubmit="return confirm('「<?php echo h( $r['name'] ); ?>」さんの回答を削除しますか？');">
							<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
							<input type="hidden" name="ms_csrf" value="<?php echo h( $csrf ); ?>">
							<input type="hidden" name="ms_action" value="delete_response">
							<input type="hidden" name="ms_resp_id" value="<?php echo h( $r['id'] ); ?>">
							<button type="submit" class="ms-ghost" style="margin-top:4px;font-size:12px;padding:6px 12px;"><?php echo h( $r['name'] ); ?> ✕</button>
						</form>
					<?php endforeach; ?>
				<?php endif; ?>

				<form method="post" action="<?php echo h( $page_url ); ?>" onsubmit="return confirm('この日程調整を完全に削除します。全員の回答も消えます。よろしいですか？');">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<input type="hidden" name="ms_csrf" value="<?php echo h( $csrf ); ?>">
					<input type="hidden" name="ms_action" value="delete_event">
					<button type="submit" class="ms-danger">この調整を削除する</button>
				</form>
			</details>
		</div>
	<?php endif; ?>

	<?php
	ms_render_foot( true );
}
