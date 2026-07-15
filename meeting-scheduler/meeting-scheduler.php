<?php
/**
 * Plugin Name: 会議日程調整ツール (Meeting Scheduler)
 * Description: 調整さん型の日程調整ツール。ログイン不要で誰でも調整を作成でき、調整ごとに専用URLが発行されるため、複数の調整が同時進行しても互いに干渉・閲覧されることがありません。SWELLなど任意のテーマと併用可能。
 * Version: 1.0.0
 * Author: do-recruit
 * Text Domain: meeting-scheduler
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MS_QUERY_VAR', 'msched' );
define( 'MS_VERSION', '1.0.0' );

/* ======================================================
 * カスタム投稿タイプ: 日程調整（msched_event）
 * 1調整 = 1投稿。投稿単位で完全に独立しているため、
 * 複数の社員が同時に別々の調整を作成しても衝突しない。
 * ====================================================== */
add_action( 'init', function () {
	register_post_type( 'msched_event', [
		'label'  => '日程調整',
		'labels' => [
			'name'          => '日程調整',
			'singular_name' => '日程調整',
			'all_items'     => '調整一覧',
		],
		'public'          => false,
		'show_ui'         => true,
		'show_in_menu'    => true,
		'menu_icon'       => 'dashicons-calendar-alt',
		'supports'        => [ 'title' ],
		'capability_type' => 'post',
		'map_meta_cap'    => true,
	] );
} );

/* ======================================================
 * ヘルパー
 * ====================================================== */

// トークンから調整を取得（公開URLの唯一の入口）
function ms_get_event_by_token( $token ) {
	$token = sanitize_text_field( $token );
	if ( $token === '' || strlen( $token ) > 64 ) {
		return null;
	}
	$posts = get_posts( [
		'post_type'   => 'msched_event',
		'post_status' => 'publish',
		'meta_key'    => '_ms_token',
		'meta_value'  => $token,
		'numberposts' => 1,
	] );
	return $posts ? $posts[0] : null;
}

// 候補日程の配列
function ms_get_slots( $post_id ) {
	$slots = get_post_meta( $post_id, '_ms_slots', true );
	return is_array( $slots ) ? $slots : [];
}

/**
 * 回答一覧を取得。
 * 回答は「1人 = 1メタキー（_ms_resp_xxx）」で保存する。
 * 共有配列への読み書きをしないため、複数人が同時に回答を
 * 送信しても互いの回答を上書きしない。
 */
function ms_get_responses( $post_id ) {
	$all       = get_post_meta( $post_id );
	$responses = [];
	foreach ( $all as $key => $values ) {
		if ( strpos( $key, '_ms_resp_' ) !== 0 ) {
			continue;
		}
		$data = maybe_unserialize( $values[0] );
		if ( is_array( $data ) && isset( $data['name'] ) ) {
			$data['id']        = substr( $key, strlen( '_ms_resp_' ) );
			$responses[]       = $data;
		}
	}
	usort( $responses, function ( $a, $b ) {
		return ( $a['created'] ?? 0 ) <=> ( $b['created'] ?? 0 );
	} );
	return $responses;
}

// 回答の選択肢
function ms_answer_choices() {
	return [
		'ok'    => '○',
		'maybe' => '△',
		'ng'    => '×',
	];
}

// 幹事キーの検証（タイミング攻撃対策に hash_equals を使用）
function ms_is_admin_key_valid( $post_id, $key ) {
	$stored = get_post_meta( $post_id, '_ms_admin_key', true );
	return is_string( $key ) && $key !== '' && $stored && hash_equals( $stored, $key );
}

// 各種URL
function ms_event_url( $token, $admin_key = '' ) {
	$args = [ MS_QUERY_VAR => $token ];
	if ( $admin_key ) {
		$args['key'] = $admin_key;
	}
	return add_query_arg( $args, home_url( '/' ) );
}

function ms_new_url() {
	return add_query_arg( MS_QUERY_VAR, 'new', home_url( '/' ) );
}

/* ======================================================
 * ショートコード: 固定ページに設置する入口ボタン
 * 使い方: [meeting_scheduler]
 * ====================================================== */
add_shortcode( 'meeting_scheduler', function () {
	return '<div style="text-align:center;margin:24px 0;">'
		. '<a href="' . esc_url( ms_new_url() ) . '" style="display:inline-block;background:#2271b1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">新しい日程調整を作成する</a>'
		. '<p style="font-size:13px;color:#666;margin-top:8px;">ログイン不要・何件でも作成できます</p>'
		. '</div>';
} );

/* ======================================================
 * 管理画面（WPダッシュボード）: サイト管理者向けの管理機能
 * ====================================================== */
add_action( 'add_meta_boxes', function () {
	add_meta_box( 'ms_info', '調整情報・URL', 'ms_render_info_box', 'msched_event', 'normal', 'high' );
} );

function ms_render_info_box( $post ) {
	$token     = get_post_meta( $post->ID, '_ms_token', true );
	$admin_key = get_post_meta( $post->ID, '_ms_admin_key', true );
	$status    = get_post_meta( $post->ID, '_ms_status', true ) ?: 'open';
	$responses = ms_get_responses( $post->ID );
	if ( ! $token ) {
		echo '<p class="description">この調整はフロント画面から作成されたものではありません。</p>';
		return;
	}
	?>
	<p><strong>ステータス:</strong> <?php echo $status === 'closed' ? '日程決定済み' : '調整中'; ?>　<strong>回答数:</strong> <?php echo count( $responses ); ?>人</p>
	<p><strong>参加者用URL</strong><br>
		<input type="text" readonly style="width:100%" value="<?php echo esc_url( ms_event_url( $token ) ); ?>" onclick="this.select();"></p>
	<p><strong>幹事用URL</strong>（第三者に渡さないでください）<br>
		<input type="text" readonly style="width:100%" value="<?php echo esc_url( ms_event_url( $token, $admin_key ) ); ?>" onclick="this.select();"></p>
	<?php
}

add_filter( 'manage_msched_event_posts_columns', function ( $columns ) {
	$columns['ms_status']    = 'ステータス';
	$columns['ms_responses'] = '回答数';
	return $columns;
} );

add_action( 'manage_msched_event_posts_custom_column', function ( $column, $post_id ) {
	if ( $column === 'ms_status' ) {
		$status = get_post_meta( $post_id, '_ms_status', true ) ?: 'open';
		echo $status === 'closed' ? '日程決定済み' : '調整中';
	}
	if ( $column === 'ms_responses' ) {
		echo count( ms_get_responses( $post_id ) ) . '人';
	}
}, 10, 2 );

/* ======================================================
 * フロント: ルーティング（?msched=new / ?msched=トークン）
 * ====================================================== */
add_filter( 'query_vars', function ( $vars ) {
	$vars[] = MS_QUERY_VAR;
	return $vars;
} );

add_action( 'template_redirect', function () {
	$token = get_query_var( MS_QUERY_VAR );
	if ( ! $token ) {
		return;
	}

	if ( $token === 'new' ) {
		ms_handle_create();
		ms_render_create_page();
		exit;
	}

	$post = ms_get_event_by_token( $token );
	if ( ! $post ) {
		wp_die( 'ページが見つかりません。URLをご確認ください。', '404', [ 'response' => 404 ] );
	}

	$admin_key = isset( $_GET['key'] ) ? sanitize_text_field( wp_unslash( $_GET['key'] ) ) : '';
	$is_admin  = ms_is_admin_key_valid( $post->ID, $admin_key );

	ms_handle_event_post( $post, $is_admin, $admin_key );
	ms_render_event_page( $post, $is_admin, $admin_key );
	exit;
} );

/* ======================================================
 * 調整の新規作成
 * ====================================================== */
function ms_handle_create() {
	if ( $_SERVER['REQUEST_METHOD'] !== 'POST' || ( $_POST['ms_action'] ?? '' ) !== 'create' ) {
		return;
	}
	if ( ! isset( $_POST['ms_nonce'] ) || ! wp_verify_nonce( $_POST['ms_nonce'], 'ms_create' ) || ! empty( $_POST['website'] ) ) {
		wp_die( '不正なリクエストです。前の画面に戻ってやり直してください。' );
	}

	// 連続作成のレート制限（同一IPから1時間に20件まで）
	$ip    = isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : '';
	$tkey  = 'ms_rate_' . md5( $ip );
	$count = (int) get_transient( $tkey );
	if ( $count >= 20 ) {
		wp_die( '短時間に作成できる調整の数を超えました。しばらく時間をおいてからお試しください。' );
	}
	set_transient( $tkey, $count + 1, HOUR_IN_SECONDS );

	$title     = sanitize_text_field( wp_unslash( $_POST['ms_title'] ?? '' ) );
	$organizer = sanitize_text_field( wp_unslash( $_POST['ms_organizer'] ?? '' ) );
	$memo      = sanitize_textarea_field( wp_unslash( $_POST['ms_memo'] ?? '' ) );
	$slots_raw = sanitize_textarea_field( wp_unslash( $_POST['ms_slots'] ?? '' ) );
	$slots     = array_values( array_filter( array_map( 'trim', explode( "\n", $slots_raw ) ) ) );
	$slots     = array_slice( $slots, 0, 100 );

	if ( $title === '' || empty( $slots ) ) {
		wp_die( '会議名と候補日程は必須です。前の画面に戻って入力してください。' );
	}

	// トークンを発行（衝突チェック付き）。この調整専用のURLになるため、
	// 他の調整と混ざったり、URLを知らない人に見られたりすることはない。
	do {
		$token = wp_generate_password( 24, false, false );
	} while ( ms_get_event_by_token( $token ) );
	$admin_key = wp_generate_password( 24, false, false );

	$post_id = wp_insert_post( [
		'post_type'   => 'msched_event',
		'post_status' => 'publish',
		'post_title'  => mb_substr( $title, 0, 100 ),
	], true );

	if ( is_wp_error( $post_id ) ) {
		wp_die( '調整の作成に失敗しました。時間をおいて再度お試しください。' );
	}

	update_post_meta( $post_id, '_ms_token', $token );
	update_post_meta( $post_id, '_ms_admin_key', $admin_key );
	update_post_meta( $post_id, '_ms_slots', $slots );
	update_post_meta( $post_id, '_ms_organizer', mb_substr( $organizer, 0, 50 ) );
	update_post_meta( $post_id, '_ms_memo', mb_substr( $memo, 0, 2000 ) );
	update_post_meta( $post_id, '_ms_status', 'open' );

	// 作成直後は幹事用URLへ（URL案内を表示）
	wp_safe_redirect( add_query_arg( 'created', '1', ms_event_url( $token, $admin_key ) ) );
	exit;
}

/* ======================================================
 * 調整ページでのPOST処理（回答・幹事操作）
 * ====================================================== */
function ms_handle_event_post( $post, $is_admin, $admin_key ) {
	if ( $_SERVER['REQUEST_METHOD'] !== 'POST' || empty( $_POST['ms_action'] ) ) {
		return;
	}
	$post_id = $post->ID;
	$token   = get_post_meta( $post_id, '_ms_token', true );
	$action  = sanitize_key( $_POST['ms_action'] );
	$status  = get_post_meta( $post_id, '_ms_status', true ) ?: 'open';

	if ( ! isset( $_POST['ms_nonce'] ) || ! wp_verify_nonce( $_POST['ms_nonce'], 'ms_event_' . $token ) || ! empty( $_POST['website'] ) ) {
		wp_die( '不正なリクエストです。前の画面に戻ってやり直してください。' );
	}

	$redirect_args = [];

	// --- 回答の登録・更新（誰でも可） ---
	if ( $action === 'respond' && $status === 'open' ) {
		$name    = sanitize_text_field( wp_unslash( $_POST['ms_name'] ?? '' ) );
		$name    = mb_substr( $name, 0, 30 );
		$comment = sanitize_textarea_field( wp_unslash( $_POST['ms_comment'] ?? '' ) );
		$comment = mb_substr( $comment, 0, 500 );
		$slots   = ms_get_slots( $post_id );
		$choices = ms_answer_choices();

		if ( $name === '' ) {
			wp_die( 'お名前を入力してください。前の画面に戻ってやり直してください。' );
		}

		$answers = [];
		foreach ( $slots as $i => $slot ) {
			$v             = isset( $_POST['ms_answer'][ $i ] ) ? sanitize_key( $_POST['ms_answer'][ $i ] ) : '';
			$answers[ $i ] = array_key_exists( $v, $choices ) ? $v : '';
		}

		$edit_id = isset( $_POST['ms_edit_id'] ) ? sanitize_key( $_POST['ms_edit_id'] ) : '';
		$data    = [
			'name'    => $name,
			'answers' => $answers,
			'comment' => $comment,
			'updated' => current_time( 'Y-m-d H:i' ),
		];

		if ( $edit_id && get_post_meta( $post_id, '_ms_resp_' . $edit_id, true ) ) {
			// 既存回答の更新: 自分のメタ行だけを書き換えるので他の人の回答に影響しない
			$existing        = get_post_meta( $post_id, '_ms_resp_' . $edit_id, true );
			$data['created'] = is_array( $existing ) && isset( $existing['created'] ) ? $existing['created'] : time();
			update_post_meta( $post_id, '_ms_resp_' . $edit_id, $data );
		} else {
			// 新規回答: 回答者ごとに一意のメタキーで追加保存する。
			// 同時に複数人が送信しても互いを上書きしない。
			$data['created'] = time();
			$resp_id         = str_replace( '.', '', uniqid( '', true ) ) . wp_rand( 100, 999 );
			add_post_meta( $post_id, '_ms_resp_' . $resp_id, $data );
		}
		$redirect_args['saved'] = 1;
	}

	// --- 以下は幹事のみ ---
	if ( in_array( $action, [ 'confirm', 'reopen', 'add_slots', 'update_memo', 'delete_response', 'delete_event' ], true ) ) {
		if ( ! $is_admin ) {
			wp_die( 'この操作には幹事用URLが必要です。' );
		}

		if ( $action === 'confirm' ) {
			$slot_index = isset( $_POST['ms_confirm_slot'] ) ? absint( $_POST['ms_confirm_slot'] ) : -1;
			$slots      = ms_get_slots( $post_id );
			if ( isset( $slots[ $slot_index ] ) ) {
				update_post_meta( $post_id, '_ms_status', 'closed' );
				update_post_meta( $post_id, '_ms_confirmed', $slot_index );
				$redirect_args['confirmed'] = 1;
			}
		}

		if ( $action === 'reopen' ) {
			update_post_meta( $post_id, '_ms_status', 'open' );
			delete_post_meta( $post_id, '_ms_confirmed' );
		}

		if ( $action === 'add_slots' ) {
			// 候補は末尾に追加のみ。既存回答は候補のインデックスで
			// 紐付いているため、追加しても既存回答が壊れない。
			$raw   = sanitize_textarea_field( wp_unslash( $_POST['ms_new_slots'] ?? '' ) );
			$new   = array_values( array_filter( array_map( 'trim', explode( "\n", $raw ) ) ) );
			$slots = ms_get_slots( $post_id );
			$slots = array_slice( array_merge( $slots, $new ), 0, 100 );
			update_post_meta( $post_id, '_ms_slots', $slots );
		}

		if ( $action === 'update_memo' ) {
			$memo = sanitize_textarea_field( wp_unslash( $_POST['ms_memo'] ?? '' ) );
			update_post_meta( $post_id, '_ms_memo', mb_substr( $memo, 0, 2000 ) );
		}

		if ( $action === 'delete_response' ) {
			$resp_id = isset( $_POST['ms_resp_id'] ) ? sanitize_key( $_POST['ms_resp_id'] ) : '';
			if ( $resp_id ) {
				delete_post_meta( $post_id, '_ms_resp_' . $resp_id );
			}
		}

		if ( $action === 'delete_event' ) {
			wp_delete_post( $post_id, true );
			wp_die( 'この日程調整を削除しました。ご利用ありがとうございました。', '削除完了', [ 'response' => 200 ] );
		}
	}

	// 二重送信防止（PRGパターン）
	wp_safe_redirect( ms_event_url( $token, $is_admin ? $admin_key : '' ) . '&' . http_build_query( $redirect_args ) );
	exit;
}

/* ======================================================
 * フロント描画: 共通レイアウト
 * ====================================================== */
function ms_render_head( $title ) {
	$site_name = get_bloginfo( 'name' );
	?>
	<!DOCTYPE html>
	<html <?php language_attributes(); ?>>
	<head>
		<meta charset="<?php bloginfo( 'charset' ); ?>">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="robots" content="noindex, nofollow">
		<title><?php echo esc_html( $title . ' | ' . $site_name ); ?></title>
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
			textarea, input[type=text] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px; font-family: inherit; }
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
			<a href="<?php echo esc_url( ms_new_url() ); ?>">＋ 新しい日程調整を作成する</a>
		<?php endif; ?>
	</div>
	</div>
	<script>
		function msCopy(id, btn) {
			var el = document.getElementById(id);
			el.select();
			navigator.clipboard.writeText(el.value).then(function(){ btn.textContent = 'コピーしました'; });
		}
	</script>
	</body>
	</html>
	<?php
}

/* ======================================================
 * フロント描画: 新規作成ページ（?msched=new）
 * ====================================================== */
function ms_render_create_page() {
	ms_render_head( '新しい日程調整を作成' );
	?>
	<div class="ms-header">
		<h1>新しい日程調整を作成</h1>
		<p class="ms-sub">ログイン不要で作成できます。作成すると、この調整専用のURLが発行されます（他の調整とは完全に独立しています）。</p>
	</div>
	<div class="ms-card">
		<form method="post">
			<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
			<?php wp_nonce_field( 'ms_create', 'ms_nonce' ); ?>
			<input type="hidden" name="ms_action" value="create">

			<label>会議・イベント名 <span style="color:#c22;">必須</span></label>
			<input type="text" name="ms_title" required maxlength="100" placeholder="例）7月度 定例会議">

			<label>幹事のお名前 <span class="ms-hint">任意</span></label>
			<input type="text" name="ms_organizer" maxlength="50" placeholder="例）山田">

			<label>メモ <span class="ms-hint">任意（場所・オンラインURL・議題など）</span></label>
			<textarea name="ms_memo" rows="3" placeholder="例）会議室A または Zoom（URLは後日共有）"></textarea>

			<label>候補日程 <span style="color:#c22;">必須</span> <span class="ms-hint">1行に1つずつ入力してください（最大100件）</span></label>
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

/* ======================================================
 * フロント描画: 調整ページ（参加者用・幹事用）
 * ====================================================== */
function ms_render_event_page( $post, $is_admin, $admin_key ) {
	$post_id   = $post->ID;
	$token     = get_post_meta( $post_id, '_ms_token', true );
	$status    = get_post_meta( $post_id, '_ms_status', true ) ?: 'open';
	$confirmed = get_post_meta( $post_id, '_ms_confirmed', true );
	$confirmed = $confirmed === '' ? null : (int) $confirmed;
	$organizer = get_post_meta( $post_id, '_ms_organizer', true );
	$memo      = get_post_meta( $post_id, '_ms_memo', true );
	$slots     = ms_get_slots( $post_id );
	$responses = ms_get_responses( $post_id );
	$choices   = ms_answer_choices();

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
	$edit_id   = isset( $_GET['edit'] ) ? sanitize_key( $_GET['edit'] ) : '';
	$edit_resp = null;
	if ( $edit_id ) {
		$raw = get_post_meta( $post_id, '_ms_resp_' . $edit_id, true );
		if ( is_array( $raw ) ) {
			$edit_resp = $raw;
		}
	}

	$page_url = ms_event_url( $token, $is_admin ? $admin_key : '' );

	ms_render_head( get_the_title( $post ) );
	?>
	<div class="ms-header">
		<h1><?php echo esc_html( get_the_title( $post ) ); ?>
			<?php if ( $status === 'closed' ) : ?>
				<span class="ms-badge ms-badge-closed">日程決定済み</span>
			<?php else : ?>
				<span class="ms-badge">調整中</span>
			<?php endif; ?>
		</h1>
		<p class="ms-sub">
			<?php if ( $organizer ) : ?>幹事: <?php echo esc_html( $organizer ); ?>　<?php endif; ?>
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
				<input type="text" readonly id="ms-url-p" value="<?php echo esc_url( ms_event_url( $token ) ); ?>" onclick="this.select();">
				<button type="button" class="ms-copy" onclick="msCopy('ms-url-p', this)">URLをコピー</button>
			</div>
			<div class="ms-url-box">
				<strong>② 幹事用URL</strong>（あなた専用。日程の決定・管理に使います。<span style="color:#c22;">参加者には送らないでください</span>）<br>
				<input type="text" readonly id="ms-url-a" value="<?php echo esc_url( ms_event_url( $token, $admin_key ) ); ?>" onclick="this.select();">
				<button type="button" class="ms-copy" onclick="msCopy('ms-url-a', this)">URLをコピー</button>
			</div>
			<p class="ms-warn">このURLはブックマーク等で必ず保存してください。URLを紛失すると幹事操作ができなくなります。</p>
		</div>
	<?php endif; ?>

	<?php if ( $status === 'closed' && $confirmed !== null && isset( $slots[ $confirmed ] ) ) : ?>
		<div class="ms-card" style="border:2px solid #b78105;background:#fffbeb;">
			<h2 style="border-color:#b78105;">開催日程が決定しました</h2>
			<p style="font-size:18px;font-weight:bold;margin:0;">📅 <?php echo esc_html( $slots[ $confirmed ] ); ?></p>
		</div>
	<?php endif; ?>

	<?php if ( $memo ) : ?>
		<div class="ms-card">
			<h2>メモ</h2>
			<div class="ms-memo"><?php echo esc_html( $memo ); ?></div>
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
								<?php echo esc_html( $r['name'] ); ?>
								<?php if ( $status === 'open' ) : ?>
									<a class="ms-edit-link" href="<?php echo esc_url( add_query_arg( 'edit', $r['id'], $page_url ) . '#ms-respond' ); ?>">編集</a>
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
						<tr class="<?php echo esc_attr( $row_class ); ?>">
							<td class="ms-slot-col"><?php echo $confirmed === $i ? '📅 ' : ''; ?><?php echo esc_html( $slot ); ?></td>
							<td class="ms-ans-ok"><?php echo (int) $counts[ $i ]['ok']; ?></td>
							<td class="ms-ans-maybe"><?php echo (int) $counts[ $i ]['maybe']; ?></td>
							<td class="ms-ans-ng"><?php echo (int) $counts[ $i ]['ng']; ?></td>
							<?php foreach ( $responses as $r ) :
								$a = $r['answers'][ $i ] ?? '';
								?>
								<td class="<?php echo $a ? 'ms-ans-' . esc_attr( $a ) : ''; ?>"><?php echo $a ? esc_html( $choices[ $a ] ) : '－'; ?></td>
							<?php endforeach; ?>
						</tr>
					<?php endforeach; ?>
					<tr>
						<td class="ms-slot-col">コメント</td>
						<td></td><td></td><td></td>
						<?php foreach ( $responses as $r ) : ?>
							<td style="font-size:11px;max-width:160px;white-space:normal;"><?php echo esc_html( $r['comment'] ?? '' ); ?></td>
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
			<form method="post" action="<?php echo esc_url( $page_url ); ?>">
				<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
				<?php wp_nonce_field( 'ms_event_' . $token, 'ms_nonce' ); ?>
				<input type="hidden" name="ms_action" value="respond">
				<?php if ( $edit_resp ) : ?>
					<input type="hidden" name="ms_edit_id" value="<?php echo esc_attr( $edit_id ); ?>">
				<?php endif; ?>

				<label>お名前 <span style="color:#c22;">必須</span></label>
				<input type="text" name="ms_name" required maxlength="30" placeholder="例）佐藤" value="<?php echo esc_attr( $edit_resp['name'] ?? '' ); ?>">

				<label style="margin-top:18px;">各候補の都合を選んでください</label>
				<?php foreach ( $slots as $i => $slot ) : ?>
					<div class="ms-choice-row">
						<span class="ms-choice-label"><?php echo esc_html( $slot ); ?></span>
						<span class="ms-opts">
							<?php foreach ( $choices as $val => $mark ) : ?>
								<label>
									<input type="radio" name="ms_answer[<?php echo esc_attr( $i ); ?>]" value="<?php echo esc_attr( $val ); ?>" <?php checked( ( $edit_resp['answers'][ $i ] ?? '' ), $val ); ?>>
									<span><?php echo esc_html( $mark ); ?></span>
								</label>
							<?php endforeach; ?>
						</span>
					</div>
				<?php endforeach; ?>

				<label>コメント <span class="ms-hint">任意</span></label>
				<textarea name="ms_comment" rows="2" placeholder="例）21日は15時以降なら調整可能です"><?php echo esc_textarea( $edit_resp['comment'] ?? '' ); ?></textarea>

				<button type="submit"><?php echo $edit_resp ? '回答を更新する' : '回答を送信する'; ?></button>
				<?php if ( $edit_resp ) : ?>
					<a href="<?php echo esc_url( $page_url ); ?>" style="margin-left:10px;font-size:13px;">キャンセル</a>
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
					<input type="text" readonly id="ms-url-p2" value="<?php echo esc_url( ms_event_url( $token ) ); ?>" onclick="this.select();">
					<button type="button" class="ms-copy" onclick="msCopy('ms-url-p2', this)">URLをコピー</button>
				</div>
			<?php endif; ?>

			<?php if ( $status === 'open' ) : ?>
				<form method="post" action="<?php echo esc_url( $page_url ); ?>">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<?php wp_nonce_field( 'ms_event_' . $token, 'ms_nonce' ); ?>
					<input type="hidden" name="ms_action" value="confirm">
					<label>開催日程を決定する</label>
					<select name="ms_confirm_slot" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-size:15px;">
						<?php foreach ( $slots as $i => $slot ) : ?>
							<option value="<?php echo esc_attr( $i ); ?>">
								<?php echo esc_html( $slot ); ?>（○<?php echo (int) $counts[ $i ]['ok']; ?> △<?php echo (int) $counts[ $i ]['maybe']; ?> ×<?php echo (int) $counts[ $i ]['ng']; ?>）
							</option>
						<?php endforeach; ?>
					</select>
					<button type="submit">この日程に決定する</button>
					<p class="ms-hint">決定すると回答受付が締め切られ、全員のページに決定日程が表示されます。</p>
				</form>
			<?php else : ?>
				<form method="post" action="<?php echo esc_url( $page_url ); ?>">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<?php wp_nonce_field( 'ms_event_' . $token, 'ms_nonce' ); ?>
					<input type="hidden" name="ms_action" value="reopen">
					<button type="submit" class="ms-ghost">決定を取り消して再度募集する</button>
				</form>
			<?php endif; ?>

			<details class="ms-admin-tools">
				<summary>その他の管理操作</summary>

				<form method="post" action="<?php echo esc_url( $page_url ); ?>">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<?php wp_nonce_field( 'ms_event_' . $token, 'ms_nonce' ); ?>
					<input type="hidden" name="ms_action" value="add_slots">
					<label>候補日程を追加 <span class="ms-hint">1行に1つ。既存の回答はそのまま残ります</span></label>
					<textarea name="ms_new_slots" rows="3" placeholder="例）7/23(木) 10:00〜11:00"></textarea>
					<button type="submit" class="ms-ghost">候補を追加する</button>
				</form>

				<form method="post" action="<?php echo esc_url( $page_url ); ?>">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<?php wp_nonce_field( 'ms_event_' . $token, 'ms_nonce' ); ?>
					<input type="hidden" name="ms_action" value="update_memo">
					<label>メモを更新</label>
					<textarea name="ms_memo" rows="3"><?php echo esc_textarea( $memo ); ?></textarea>
					<button type="submit" class="ms-ghost">メモを保存する</button>
				</form>

				<?php if ( ! empty( $responses ) ) : ?>
					<label style="margin-top:18px;">回答の削除</label>
					<?php foreach ( $responses as $r ) : ?>
						<form method="post" action="<?php echo esc_url( $page_url ); ?>" style="display:inline-block;margin:2px;" onsubmit="return confirm('「<?php echo esc_js( $r['name'] ); ?>」さんの回答を削除しますか？');">
							<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
							<?php wp_nonce_field( 'ms_event_' . $token, 'ms_nonce' ); ?>
							<input type="hidden" name="ms_action" value="delete_response">
							<input type="hidden" name="ms_resp_id" value="<?php echo esc_attr( $r['id'] ); ?>">
							<button type="submit" class="ms-ghost" style="margin-top:4px;font-size:12px;padding:6px 12px;"><?php echo esc_html( $r['name'] ); ?> ✕</button>
						</form>
					<?php endforeach; ?>
				<?php endif; ?>

				<form method="post" action="<?php echo esc_url( $page_url ); ?>" onsubmit="return confirm('この日程調整を完全に削除します。全員の回答も消えます。よろしいですか？');">
					<input type="text" name="website" class="ms-honeypot" tabindex="-1" autocomplete="off">
					<?php wp_nonce_field( 'ms_event_' . $token, 'ms_nonce' ); ?>
					<input type="hidden" name="ms_action" value="delete_event">
					<button type="submit" class="ms-danger">この調整を削除する</button>
				</form>
			</details>
		</div>
	<?php endif; ?>

	<?php
	ms_render_foot( true );
}

/* ======================================================
 * 古い調整の自動削除（既定: 最終更新から180日）
 * 何度使っても古いデータが溜まり続けないようにする。
 * 日数は msched_retention_days フィルタで変更可能。0で無効。
 * ====================================================== */
register_activation_hook( __FILE__, 'ms_activate' );
function ms_activate() {
	if ( ! wp_next_scheduled( 'ms_daily_cleanup' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'ms_daily_cleanup' );
	}
}

register_deactivation_hook( __FILE__, 'ms_deactivate' );
function ms_deactivate() {
	wp_clear_scheduled_hook( 'ms_daily_cleanup' );
}

add_action( 'ms_daily_cleanup', function () {
	$days = (int) apply_filters( 'msched_retention_days', 180 );
	if ( $days <= 0 ) {
		return;
	}
	$old = get_posts( [
		'post_type'   => 'msched_event',
		'post_status' => 'any',
		'numberposts' => 50,
		'date_query'  => [
			[
				'column' => 'post_modified_gmt',
				'before' => $days . ' days ago',
			],
		],
	] );
	foreach ( $old as $p ) {
		wp_delete_post( $p->ID, true );
	}
} );
