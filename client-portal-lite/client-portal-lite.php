<?php
/**
 * Plugin Name: クライアント共有ポータル (Client Portal Lite)
 * Description: ヒアリングフォームと進捗レポートを、クライアント専用URLでログイン不要で共有できる軽量プラグイン。SWELLなど任意のテーマと併用可能。
 * Version: 1.0.0
 * Author: do-recruit
 * Text Domain: client-portal-lite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CPL_QUERY_VAR', 'client_portal' );
define( 'CPL_VERSION', '1.0.0' );

/* ======================================================
 * カスタム投稿タイプ: 案件（client_project）
 * ====================================================== */
add_action( 'init', function () {
	register_post_type( 'client_project', [
		'label'        => 'クライアント案件',
		'labels'       => [
			'name'          => 'クライアント案件',
			'singular_name' => '案件',
			'add_new_item'  => '新規案件を追加',
			'edit_item'     => '案件を編集',
			'all_items'     => '案件一覧',
		],
		'public'       => false,
		'show_ui'      => true,
		'show_in_menu' => true,
		'menu_icon'    => 'dashicons-groups',
		'supports'     => [ 'title' ],
		'capability_type' => 'post',
	] );
} );

// 新規保存時は自動的に公開状態にする（クライアントURLをすぐ使えるように）
add_filter( 'wp_insert_post_data', function ( $data ) {
	if ( $data['post_type'] === 'client_project' && in_array( $data['post_status'], [ 'draft', 'auto-draft' ], true ) ) {
		$data['post_status'] = 'publish';
	}
	return $data;
} );

// 保存時に共有トークンを自動発行
add_action( 'save_post_client_project', function ( $post_id ) {
	if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
		return;
	}
	if ( ! get_post_meta( $post_id, '_cpl_token', true ) ) {
		update_post_meta( $post_id, '_cpl_token', wp_generate_password( 24, false, false ) );
	}
} );

/* ======================================================
 * ステータス定義
 * ====================================================== */
function cpl_statuses() {
	return [
		'hearing'   => 'ヒアリング中',
		'design'    => 'デザイン制作中',
		'coding'    => 'コーディング中',
		'review'    => 'クライアント確認中',
		'fixing'    => '修正対応中',
		'launching' => '公開作業中',
		'done'      => '納品完了',
	];
}

/* ======================================================
 * 管理画面: メタボックス
 * ====================================================== */
add_action( 'add_meta_boxes', function () {
	add_meta_box( 'cpl_settings', '案件設定・共有URL', 'cpl_render_settings_box', 'client_project', 'side', 'high' );
	add_meta_box( 'cpl_progress', '進捗ログ', 'cpl_render_progress_box', 'client_project', 'normal', 'high' );
	add_meta_box( 'cpl_hearing', 'ヒアリング回答', 'cpl_render_hearing_box', 'client_project', 'normal', 'default' );
	add_meta_box( 'cpl_messages', 'クライアントとのメッセージ', 'cpl_render_messages_box', 'client_project', 'normal', 'default' );
} );

function cpl_render_settings_box( $post ) {
	wp_nonce_field( 'cpl_save_settings', 'cpl_settings_nonce' );
	$status    = get_post_meta( $post->ID, '_cpl_status', true ) ?: 'hearing';
	$email     = get_post_meta( $post->ID, '_cpl_client_email', true );
	$questions = get_post_meta( $post->ID, '_cpl_questions', true );
	$token     = get_post_meta( $post->ID, '_cpl_token', true );
	$url       = $token ? add_query_arg( CPL_QUERY_VAR, $token, home_url( '/' ) ) : '';
	?>
	<p>
		<label for="cpl_status"><strong>ステータス</strong></label><br>
		<select name="cpl_status" id="cpl_status" style="width:100%">
			<?php foreach ( cpl_statuses() as $key => $label ) : ?>
				<option value="<?php echo esc_attr( $key ); ?>" <?php selected( $status, $key ); ?>><?php echo esc_html( $label ); ?></option>
			<?php endforeach; ?>
		</select>
	</p>
	<p>
		<label for="cpl_client_email"><strong>クライアントのメールアドレス</strong></label><br>
		<input type="email" name="cpl_client_email" id="cpl_client_email" style="width:100%" value="<?php echo esc_attr( $email ); ?>" placeholder="任意（入力すると進捗通知を送れます）">
	</p>
	<p>
		<label for="cpl_questions"><strong>ヒアリング項目</strong>（1行に1項目）</label><br>
		<textarea name="cpl_questions" id="cpl_questions" rows="6" style="width:100%"><?php echo esc_textarea( $questions ); ?></textarea>
	</p>
	<?php if ( $url ) : ?>
		<p><strong>クライアント共有URL</strong></p>
		<p>
			<input type="text" readonly id="cpl_share_url" value="<?php echo esc_url( $url ); ?>" style="width:100%" onclick="this.select();">
			<button type="button" class="button" style="margin-top:6px;width:100%" onclick="navigator.clipboard.writeText(document.getElementById('cpl_share_url').value);this.textContent='コピーしました';">URLをコピー</button>
		</p>
		<p class="description">このURLをクライアントにメールやチャットで送るだけで共有できます（ログイン不要）。第三者に知られないようご注意ください。</p>
	<?php else : ?>
		<p class="description">保存すると共有URLが発行されます。</p>
	<?php endif; ?>
	<?php
}

function cpl_render_progress_box( $post ) {
	$log = get_post_meta( $post->ID, '_cpl_progress_log', true );
	$log = is_array( $log ) ? array_reverse( $log ) : [];
	$statuses = cpl_statuses();
	?>
	<div style="max-height:260px;overflow-y:auto;margin-bottom:12px;">
		<?php if ( empty( $log ) ) : ?>
			<p class="description">まだ進捗ログがありません。</p>
		<?php else : ?>
			<ul style="margin:0;">
				<?php foreach ( $log as $entry ) : ?>
					<li style="padding:8px 0;border-bottom:1px solid #eee;">
						<strong><?php echo esc_html( $entry['date'] ); ?></strong>
						<span style="background:#f0f0f1;border-radius:3px;padding:2px 8px;margin-left:6px;font-size:12px;">
							<?php echo esc_html( $statuses[ $entry['status'] ] ?? $entry['status'] ); ?>
						</span>
						<div><?php echo nl2br( esc_html( $entry['note'] ) ); ?></div>
					</li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
	</div>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<?php wp_nonce_field( 'cpl_add_progress_' . $post->ID, 'cpl_progress_nonce' ); ?>
		<input type="hidden" name="action" value="cpl_add_progress">
		<input type="hidden" name="post_id" value="<?php echo esc_attr( $post->ID ); ?>">
		<p>
			<select name="progress_status" style="width:100%">
				<?php foreach ( $statuses as $key => $label ) : ?>
					<option value="<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></option>
				<?php endforeach; ?>
			</select>
		</p>
		<p>
			<textarea name="progress_note" rows="3" style="width:100%" placeholder="進捗メモ（クライアントに表示されます）" required></textarea>
		</p>
		<p>
			<label><input type="checkbox" name="notify_client" value="1"> クライアントに通知メールを送る</label>
		</p>
		<p><button type="submit" class="button button-primary">進捗を追加</button></p>
	</form>
	<?php
}

function cpl_render_hearing_box( $post ) {
	$questions = get_post_meta( $post->ID, '_cpl_questions', true );
	$questions = $questions ? array_filter( array_map( 'trim', explode( "\n", $questions ) ) ) : [];
	$answers   = get_post_meta( $post->ID, '_cpl_answers', true );
	$answers   = is_array( $answers ) ? $answers : [];

	if ( empty( $questions ) ) {
		echo '<p class="description">先に「案件設定」でヒアリング項目を入力してください。</p>';
		return;
	}
	if ( empty( $answers ) ) {
		echo '<p class="description">まだクライアントからの回答はありません。</p>';
		return;
	}
	echo '<dl>';
	foreach ( $questions as $q ) {
		echo '<dt style="font-weight:bold;margin-top:10px;">' . esc_html( $q ) . '</dt>';
		echo '<dd>' . nl2br( esc_html( $answers[ $q ] ?? '（未回答）' ) ) . '</dd>';
	}
	echo '</dl>';
}

function cpl_render_messages_box( $post ) {
	$messages = get_post_meta( $post->ID, '_cpl_messages', true );
	$messages = is_array( $messages ) ? $messages : [];
	?>
	<div style="max-height:260px;overflow-y:auto;margin-bottom:12px;">
		<?php if ( empty( $messages ) ) : ?>
			<p class="description">まだメッセージのやり取りがありません。</p>
		<?php else : ?>
			<?php foreach ( $messages as $m ) : ?>
				<p style="padding:8px;border-radius:6px;background:<?php echo $m['from'] === 'admin' ? '#e7f0fd' : '#f0f0f1'; ?>;margin:6px 0;">
					<strong><?php echo $m['from'] === 'admin' ? '自分' : 'クライアント'; ?></strong>
					<span style="color:#777;font-size:12px;"><?php echo esc_html( $m['date'] ); ?></span><br>
					<?php echo nl2br( esc_html( $m['text'] ) ); ?>
				</p>
			<?php endforeach; ?>
		<?php endif; ?>
	</div>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<?php wp_nonce_field( 'cpl_admin_message_' . $post->ID, 'cpl_message_nonce' ); ?>
		<input type="hidden" name="action" value="cpl_admin_message">
		<input type="hidden" name="post_id" value="<?php echo esc_attr( $post->ID ); ?>">
		<p><textarea name="message_text" rows="3" style="width:100%" placeholder="クライアントへの返信" required></textarea></p>
		<p><button type="submit" class="button button-primary">送信</button></p>
	</form>
	<?php
}

// 案件設定の保存
add_action( 'save_post_client_project', function ( $post_id ) {
	if ( ! isset( $_POST['cpl_settings_nonce'] ) || ! wp_verify_nonce( $_POST['cpl_settings_nonce'], 'cpl_save_settings' ) ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	if ( isset( $_POST['cpl_status'] ) && array_key_exists( $_POST['cpl_status'], cpl_statuses() ) ) {
		update_post_meta( $post_id, '_cpl_status', sanitize_text_field( $_POST['cpl_status'] ) );
	}
	if ( isset( $_POST['cpl_client_email'] ) ) {
		update_post_meta( $post_id, '_cpl_client_email', sanitize_email( $_POST['cpl_client_email'] ) );
	}
	if ( isset( $_POST['cpl_questions'] ) ) {
		update_post_meta( $post_id, '_cpl_questions', sanitize_textarea_field( $_POST['cpl_questions'] ) );
	}
} );

/* ======================================================
 * 管理画面: 一覧にステータス列を追加
 * ====================================================== */
add_filter( 'manage_client_project_posts_columns', function ( $columns ) {
	$columns['cpl_status'] = 'ステータス';
	return $columns;
} );
add_action( 'manage_client_project_posts_custom_column', function ( $column, $post_id ) {
	if ( $column === 'cpl_status' ) {
		$status = get_post_meta( $post_id, '_cpl_status', true ) ?: 'hearing';
		echo esc_html( cpl_statuses()[ $status ] ?? $status );
	}
}, 10, 2 );

/* ======================================================
 * admin-post.php ハンドラ（管理者操作）
 * ====================================================== */
add_action( 'admin_post_cpl_add_progress', function () {
	$post_id = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
	if ( ! $post_id || ! isset( $_POST['cpl_progress_nonce'] ) || ! wp_verify_nonce( $_POST['cpl_progress_nonce'], 'cpl_add_progress_' . $post_id ) ) {
		wp_die( '不正なリクエストです。' );
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		wp_die( '権限がありません。' );
	}
	$status = sanitize_text_field( $_POST['progress_status'] ?? '' );
	$note   = sanitize_textarea_field( $_POST['progress_note'] ?? '' );
	if ( array_key_exists( $status, cpl_statuses() ) && $note !== '' ) {
		$log   = get_post_meta( $post_id, '_cpl_progress_log', true );
		$log   = is_array( $log ) ? $log : [];
		$log[] = [
			'date'   => current_time( 'Y-m-d H:i' ),
			'status' => $status,
			'note'   => $note,
		];
		update_post_meta( $post_id, '_cpl_progress_log', $log );
		update_post_meta( $post_id, '_cpl_status', $status );

		if ( ! empty( $_POST['notify_client'] ) ) {
			$client_email = get_post_meta( $post_id, '_cpl_client_email', true );
			$token        = get_post_meta( $post_id, '_cpl_token', true );
			if ( $client_email && $token ) {
				$url = add_query_arg( CPL_QUERY_VAR, $token, home_url( '/' ) );
				wp_mail(
					$client_email,
					'【' . get_the_title( $post_id ) . '】進捗のお知らせ',
					"進捗が更新されました。\n\nステータス: " . cpl_statuses()[ $status ] . "\n内容: " . $note . "\n\n詳細はこちらからご確認ください:\n" . $url
				);
			}
		}
	}
	wp_safe_redirect( get_edit_post_link( $post_id, 'raw' ) );
	exit;
} );

add_action( 'admin_post_cpl_admin_message', function () {
	$post_id = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
	if ( ! $post_id || ! isset( $_POST['cpl_message_nonce'] ) || ! wp_verify_nonce( $_POST['cpl_message_nonce'], 'cpl_admin_message_' . $post_id ) ) {
		wp_die( '不正なリクエストです。' );
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		wp_die( '権限がありません。' );
	}
	$text = sanitize_textarea_field( $_POST['message_text'] ?? '' );
	if ( $text !== '' ) {
		$messages   = get_post_meta( $post_id, '_cpl_messages', true );
		$messages   = is_array( $messages ) ? $messages : [];
		$messages[] = [
			'from' => 'admin',
			'text' => $text,
			'date' => current_time( 'Y-m-d H:i' ),
		];
		update_post_meta( $post_id, '_cpl_messages', $messages );

		$client_email = get_post_meta( $post_id, '_cpl_client_email', true );
		$token        = get_post_meta( $post_id, '_cpl_token', true );
		if ( $client_email && $token ) {
			$url = add_query_arg( CPL_QUERY_VAR, $token, home_url( '/' ) );
			wp_mail(
				$client_email,
				'【' . get_the_title( $post_id ) . '】メッセージが届いています',
				"新しいメッセージが届きました。\n\n" . $text . "\n\n詳細はこちらからご確認ください:\n" . $url
			);
		}
	}
	wp_safe_redirect( get_edit_post_link( $post_id, 'raw' ) );
	exit;
} );

/* ======================================================
 * フロント: クライアント専用ページ（?client_portal=トークン）
 * ====================================================== */
add_filter( 'query_vars', function ( $vars ) {
	$vars[] = CPL_QUERY_VAR;
	return $vars;
} );

add_action( 'template_redirect', function () {
	$token = get_query_var( CPL_QUERY_VAR );
	if ( ! $token ) {
		return;
	}

	$posts = get_posts( [
		'post_type'   => 'client_project',
		'post_status' => 'publish',
		'meta_key'    => '_cpl_token',
		'meta_value'  => sanitize_text_field( $token ),
		'numberposts' => 1,
	] );

	if ( empty( $posts ) ) {
		wp_die( 'ページが見つかりません。URLをご確認ください。', '404', [ 'response' => 404 ] );
	}

	$post = $posts[0];
	cpl_handle_frontend_submit( $post->ID, $token );
	cpl_render_frontend( $post );
	exit;
} );

function cpl_handle_frontend_submit( $post_id, $token ) {
	if ( $_SERVER['REQUEST_METHOD'] !== 'POST' || empty( $_POST['cpl_action'] ) ) {
		return;
	}

	if ( $_POST['cpl_action'] === 'hearing'
		&& isset( $_POST['cpl_hearing_nonce'] )
		&& wp_verify_nonce( $_POST['cpl_hearing_nonce'], 'cpl_hearing_' . $token )
		&& empty( $_POST['website'] ) // ハニーポット
	) {
		$questions = get_post_meta( $post_id, '_cpl_questions', true );
		$questions = $questions ? array_filter( array_map( 'trim', explode( "\n", $questions ) ) ) : [];
		$answers   = [];
		foreach ( $questions as $i => $q ) {
			$answers[ $q ] = isset( $_POST['answer'][ $i ] ) ? sanitize_textarea_field( wp_unslash( $_POST['answer'][ $i ] ) ) : '';
		}
		update_post_meta( $post_id, '_cpl_answers', $answers );

		$admin_email = get_option( 'admin_email' );
		wp_mail(
			$admin_email,
			'【' . get_the_title( $post_id ) . '】ヒアリング回答が届きました',
			"クライアントからヒアリングの回答が届きました。\n管理画面でご確認ください:\n" . get_edit_post_link( $post_id, 'raw' )
		);
	}

	if ( $_POST['cpl_action'] === 'message'
		&& isset( $_POST['cpl_message_nonce'] )
		&& wp_verify_nonce( $_POST['cpl_message_nonce'], 'cpl_message_' . $token )
		&& empty( $_POST['website'] )
	) {
		$text = sanitize_textarea_field( wp_unslash( $_POST['message_text'] ?? '' ) );
		if ( $text !== '' ) {
			$messages   = get_post_meta( $post_id, '_cpl_messages', true );
			$messages   = is_array( $messages ) ? $messages : [];
			$messages[] = [
				'from' => 'client',
				'text' => $text,
				'date' => current_time( 'Y-m-d H:i' ),
			];
			update_post_meta( $post_id, '_cpl_messages', $messages );

			$admin_email = get_option( 'admin_email' );
			wp_mail(
				$admin_email,
				'【' . get_the_title( $post_id ) . '】クライアントからメッセージが届きました',
				"クライアントからメッセージが届きました。\n\n" . $text . "\n\n管理画面でご確認ください:\n" . get_edit_post_link( $post_id, 'raw' )
			);
		}
	}

	// 二重送信防止のためPRGパターンでリダイレクト
	wp_safe_redirect( add_query_arg( [ CPL_QUERY_VAR => $token, 'sent' => 1 ], home_url( '/' ) ) );
	exit;
}

function cpl_render_frontend( $post ) {
	$post_id   = $post->ID;
	$token     = get_post_meta( $post_id, '_cpl_token', true );
	$status    = get_post_meta( $post_id, '_cpl_status', true ) ?: 'hearing';
	$statuses  = cpl_statuses();
	$log       = get_post_meta( $post_id, '_cpl_progress_log', true );
	$log       = is_array( $log ) ? array_reverse( $log ) : [];
	$questions = get_post_meta( $post_id, '_cpl_questions', true );
	$questions = $questions ? array_filter( array_map( 'trim', explode( "\n", $questions ) ) ) : [];
	$answers   = get_post_meta( $post_id, '_cpl_answers', true );
	$answers   = is_array( $answers ) ? $answers : [];
	$messages  = get_post_meta( $post_id, '_cpl_messages', true );
	$messages  = is_array( $messages ) ? $messages : [];
	$site_name = get_bloginfo( 'name' );
	?>
	<!DOCTYPE html>
	<html <?php language_attributes(); ?>>
	<head>
		<meta charset="<?php bloginfo( 'charset' ); ?>">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="robots" content="noindex, nofollow">
		<title><?php echo esc_html( get_the_title( $post ) . ' | ' . $site_name ); ?></title>
		<style>
			:root { color-scheme: light; }
			* { box-sizing: border-box; }
			body { font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif; background: #f5f6f8; color: #222; margin: 0; padding: 24px 16px 60px; line-height: 1.7; }
			.cpl-wrap { max-width: 640px; margin: 0 auto; }
			.cpl-header { margin-bottom: 24px; }
			.cpl-header h1 { font-size: 20px; margin: 0 0 8px; }
			.cpl-badge { display: inline-block; background: #2271b1; color: #fff; font-size: 13px; padding: 4px 12px; border-radius: 999px; }
			.cpl-card { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
			.cpl-card h2 { font-size: 16px; margin: 0 0 14px; border-left: 4px solid #2271b1; padding-left: 10px; }
			.cpl-log-item { padding: 12px 0; border-bottom: 1px solid #eee; }
			.cpl-log-item:last-child { border-bottom: none; }
			.cpl-log-date { font-size: 12px; color: #777; }
			.cpl-log-status { display: inline-block; background: #eef3fb; color: #2271b1; font-size: 12px; padding: 2px 8px; border-radius: 4px; margin-left: 6px; }
			label { display: block; font-weight: bold; margin: 14px 0 6px; font-size: 14px; }
			textarea, input[type=text] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; font-family: inherit; }
			button { background: #2271b1; color: #fff; border: none; padding: 10px 22px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 14px; }
			button:hover { background: #135e96; }
			.cpl-msg { padding: 10px 14px; border-radius: 8px; margin: 8px 0; font-size: 14px; }
			.cpl-msg-admin { background: #eef3fb; }
			.cpl-msg-client { background: #f0f0f1; margin-left: 20px; }
			.cpl-msg-meta { font-size: 11px; color: #888; margin-bottom: 4px; }
			.cpl-honeypot { position: absolute; left: -9999px; }
			.cpl-notice { background: #d7f4dd; color: #146c2e; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 14px; }
		</style>
	</head>
	<body>
		<div class="cpl-wrap">
			<div class="cpl-header">
				<h1><?php echo esc_html( get_the_title( $post ) ); ?></h1>
				<span class="cpl-badge"><?php echo esc_html( $statuses[ $status ] ?? $status ); ?></span>
			</div>

			<?php if ( isset( $_GET['sent'] ) ) : ?>
				<div class="cpl-notice">送信しました。ありがとうございます。</div>
			<?php endif; ?>

			<div class="cpl-card">
				<h2>進捗レポート</h2>
				<?php if ( empty( $log ) ) : ?>
					<p>まだ進捗の記録がありません。</p>
				<?php else : ?>
					<?php foreach ( $log as $entry ) : ?>
						<div class="cpl-log-item">
							<span class="cpl-log-date"><?php echo esc_html( $entry['date'] ); ?></span>
							<span class="cpl-log-status"><?php echo esc_html( $statuses[ $entry['status'] ] ?? $entry['status'] ); ?></span>
							<div><?php echo nl2br( esc_html( $entry['note'] ) ); ?></div>
						</div>
					<?php endforeach; ?>
				<?php endif; ?>
			</div>

			<?php if ( ! empty( $questions ) ) : ?>
				<div class="cpl-card">
					<h2>ヒアリングシート</h2>
					<p>下記にご記入のうえ送信してください。内容はいつでも更新できます。</p>
					<form method="post">
						<input type="text" name="website" class="cpl-honeypot" tabindex="-1" autocomplete="off">
						<?php wp_nonce_field( 'cpl_hearing_' . $token, 'cpl_hearing_nonce' ); ?>
						<input type="hidden" name="cpl_action" value="hearing">
						<?php foreach ( $questions as $i => $q ) : ?>
							<label><?php echo esc_html( $q ); ?></label>
							<textarea name="answer[<?php echo esc_attr( $i ); ?>]" rows="3"><?php echo esc_textarea( $answers[ $q ] ?? '' ); ?></textarea>
						<?php endforeach; ?>
						<button type="submit">回答を送信</button>
					</form>
				</div>
			<?php endif; ?>

			<div class="cpl-card">
				<h2>メッセージ</h2>
				<?php if ( empty( $messages ) ) : ?>
					<p>まだメッセージはありません。ご質問等あればこちらからどうぞ。</p>
				<?php else : ?>
					<?php foreach ( $messages as $m ) : ?>
						<div class="cpl-msg <?php echo $m['from'] === 'admin' ? 'cpl-msg-admin' : 'cpl-msg-client'; ?>">
							<div class="cpl-msg-meta"><?php echo $m['from'] === 'admin' ? '担当者' : 'あなた'; ?>・<?php echo esc_html( $m['date'] ); ?></div>
							<?php echo nl2br( esc_html( $m['text'] ) ); ?>
						</div>
					<?php endforeach; ?>
				<?php endif; ?>
				<form method="post">
					<input type="text" name="website" class="cpl-honeypot" tabindex="-1" autocomplete="off">
					<?php wp_nonce_field( 'cpl_message_' . $token, 'cpl_message_nonce' ); ?>
					<input type="hidden" name="cpl_action" value="message">
					<textarea name="message_text" rows="3" placeholder="メッセージを入力してください" required></textarea>
					<button type="submit">送信</button>
				</form>
			</div>
		</div>
	</body>
	</html>
	<?php
}
