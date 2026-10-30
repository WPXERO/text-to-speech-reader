<?php
/**
 * Integration tests for WPXERO Text to Speech. Run with Free active, with or
 * without Pro (they must pass in both cases).
 *
 * @package TTSR\Tests
 */

defined( 'ABSPATH' ) || exit;

require __DIR__ . '/bootstrap.php';

$ttsr_settings = ttsr()->settings();
$ttsr_admin    = ttsr_admin_id();
$ttsr_pro      = class_exists( 'TTSRP\\Plugin' ) && TTSRP\Plugin::is_running();
WP_CLI::log( $ttsr_pro ? '(Pro is active)' : '(Free only)' );

ttsr_test_group( 'Bootstrap' );
ttsr_assert( defined( 'TTSR_VERSION' ) && defined( 'TTSR_API_VERSION' ), 'version constants are defined' );
ttsr_assert( did_action( 'ttsr_loaded' ) > 0, 'ttsr_loaded fired' );
ttsr_assert( shortcode_exists( 'wpxero_text_to_speech' ), 'shortcode is registered' );
ttsr_assert( WP_Block_Type_Registry::get_instance()->is_registered( 'wpxero-text-to-speech/player' ), 'block is registered' );
ttsr_assert( wp_script_is( 'ttsr-player', 'registered' ) && wp_style_is( 'ttsr-player', 'registered' ), 'player assets are registered' );
ttsr_assert( ! wp_script_is( 'ttsr-player', 'enqueued' ), 'player assets are not enqueued by default' );

ttsr_test_group( 'Settings defaults and validation' );
$ttsr_settings->reset();
$ttsr_defaults = $ttsr_settings->get();
ttsr_assert_same( true, $ttsr_defaults['auto_insert'], 'automatic insertion is on by default' );
ttsr_assert_same( array( 'post' ), $ttsr_defaults['post_types'], 'posts are the default content type' );
ttsr_assert_same( 'before', $ttsr_defaults['placement'], 'player goes before the content by default' );
ttsr_assert_same( false, $ttsr_defaults['delete_data_on_uninstall'], 'data is kept on uninstall by default' );

$ttsr_saved = $ttsr_settings->update(
	array(
		'post_types' => array( 'post', 'page' ),
		'rate'       => '1.5',
		'lang'       => 'en-GB',
	)
);
ttsr_assert( is_array( $ttsr_saved ) && array( 'post', 'page' ) === $ttsr_saved['post_types'] && 1.5 === $ttsr_saved['rate'], 'valid settings are saved and normalised' );
ttsr_assert_same( array( 'post', 'page' ), get_option( 'ttsr_settings' )['post_types'], 'settings are persisted to the option' );

$ttsr_invalid = $ttsr_settings->update(
	array(
		'rate'        => 9,
		'post_types'  => array( 'no-such-type' ),
		'layout'      => 'nope',
		'lang'        => 'not a language!',
		'evil'        => '<script>',
		'auto_insert' => 'maybe',
	)
);
ttsr_assert( is_wp_error( $ttsr_invalid ), 'invalid settings are rejected' );
$ttsr_errors = is_wp_error( $ttsr_invalid ) ? $ttsr_invalid->get_error_data()['errors'] : array();
foreach ( array( 'rate', 'post_types', 'layout', 'lang', 'evil', 'auto_insert' ) as $ttsr_key ) {
	ttsr_assert( isset( $ttsr_errors[ $ttsr_key ] ), "error reported for {$ttsr_key}" );
}
ttsr_assert_same( 1.5, $ttsr_settings->value( 'rate' ), 'a rejected update changes nothing' );

ttsr_test_group( 'REST API' );
$ttsr_response = ttsr_rest( 'GET', '/ttsr/v1/settings' );
ttsr_assert( in_array( $ttsr_response->get_status(), array( 401, 403 ), true ), 'logged-out users cannot read settings' );
$ttsr_editor_id = (int) wp_insert_user(
	array(
		'user_login' => 'ttsr_test_editor_' . wp_rand(),
		'user_pass'  => wp_generate_password(),
		'role'       => 'editor',
	)
);
$ttsr_response  = ttsr_rest( 'POST', '/ttsr/v1/settings', array( 'settings' => array( 'rate' => 1 ) ), $ttsr_editor_id );
ttsr_assert_same( 403, $ttsr_response->get_status(), 'editors cannot change settings' );
require_once ABSPATH . 'wp-admin/includes/user.php';
wp_delete_user( $ttsr_editor_id );

$ttsr_response = ttsr_rest( 'GET', '/ttsr/v1/settings', array(), $ttsr_admin );
ttsr_assert_same( 200, $ttsr_response->get_status(), 'administrators can read settings' );
$ttsr_response = ttsr_rest( 'POST', '/ttsr/v1/settings', array( 'settings' => array( 'include_title' => false ) ), $ttsr_admin );
ttsr_assert( 200 === $ttsr_response->get_status() && false === $ttsr_response->get_data()['settings']['include_title'], 'administrators can save settings' );
$ttsr_response = ttsr_rest( 'POST', '/ttsr/v1/settings', array( 'settings' => array( 'pitch' => 'loud' ) ), $ttsr_admin );
ttsr_assert( 400 === $ttsr_response->get_status() && isset( $ttsr_response->get_data()['data']['errors']['pitch'] ), 'REST returns field errors with status 400' );
$ttsr_response = ttsr_rest( 'POST', '/ttsr/v1/settings', array(), $ttsr_admin );
ttsr_assert_same( 400, $ttsr_response->get_status(), 'the settings argument is required' );
$ttsr_response = ttsr_rest( 'POST', '/ttsr/v1/settings/reset', array(), $ttsr_admin );
ttsr_assert( 200 === $ttsr_response->get_status() && true === $ttsr_response->get_data()['settings']['include_title'], 'reset restores defaults' );
wp_set_current_user( 0 );

ttsr_test_group( 'Automatic insertion' );
$ttsr_settings->reset();
$ttsr_post = ttsr_test_post();
$ttsr_html = ttsr_render_content( $ttsr_post );
ttsr_assert_same( 1, ttsr_count_players( $ttsr_html ), 'one player is added to a single post' );
ttsr_assert( 0 === strpos( $ttsr_html, '<div id="ttsr-player-' ), 'player is placed before the content' );
$ttsr_config = ttsr_player_config( $ttsr_html );
ttsr_assert( is_array( $ttsr_config ) && 'auto' === $ttsr_config['source'] && 'parent' === $ttsr_config['scope'], 'automatic player reads its parent element' );
ttsr_assert_same( 'TTSR test post', $ttsr_config['title'], 'title is passed as plain text' );
ttsr_assert( wp_script_is( 'ttsr-player', 'enqueued' ), 'rendering a player enqueues its assets' );
ttsr_assert( false !== strpos( $ttsr_html, ' hidden></div>' ), 'container is hidden until the script builds the controls' );

// The renderer adds at most one player per post per request, so every
// scenario below uses a fresh post.
$ttsr_settings->update( array( 'placement' => 'after' ) );
$ttsr_html = ttsr_render_content( ttsr_test_post() );
ttsr_assert( 1 === ttsr_count_players( $ttsr_html ) && 0 !== strpos( $ttsr_html, '<div id="ttsr-player-' ) && '</div>' === substr( $ttsr_html, -6 ), 'after placement puts the player after the content' );

ttsr_assert_same( 0, ttsr_count_players( ttsr_render_content( ttsr_test_post(), array( 'is_feed' => true ) ) ), 'no player in feeds' );
ttsr_assert_same(
	0,
	ttsr_count_players(
		ttsr_render_content(
			ttsr_test_post(),
			array(
				'is_singular' => false,
				'is_single'   => false,
				'is_home'     => true,
			)
		)
	),
	'no player on archive views'
);

ttsr_assert_same( 0, ttsr_count_players( ttsr_render_content( ttsr_test_post( array( 'post_type' => 'page' ) ) ) ), 'no player on content types that are not selected' );
$ttsr_settings->update( array( 'post_types' => array( 'post', 'page' ) ) );
ttsr_assert_same( 1, ttsr_count_players( ttsr_render_content( ttsr_test_post( array( 'post_type' => 'page' ) ) ) ), 'player appears once the content type is selected' );

$ttsr_post = ttsr_test_post();
update_post_meta( $ttsr_post, '_ttsr_disable_auto', true );
ttsr_assert_same( 0, ttsr_count_players( ttsr_render_content( $ttsr_post ) ), 'per-post opt-out hides the automatic player' );

$ttsr_settings->update( array( 'auto_insert' => false ) );
ttsr_assert_same( 0, ttsr_count_players( ttsr_render_content( ttsr_test_post() ) ), 'turning automatic insertion off removes the player' );
$ttsr_settings->update( array( 'auto_insert' => true ) );

$ttsr_post = ttsr_test_post();
ttsr_render_content( $ttsr_post );
ttsr_assert_same( 0, ttsr_count_players( ttsr_render_content( $ttsr_post ) ), 'a post never gets a second automatic player in the same request' );

$ttsr_protected = ttsr_test_post( array( 'post_password' => 'secret' ) );
ttsr_assert_same( 0, ttsr_count_players( ttsr_render_content( $ttsr_protected ) ), 'no player on password-protected posts' );

ttsr_test_group( 'Shortcode and block' );
$ttsr_sc_post = ttsr_test_post( array( 'post_content' => '<p>Intro.</p>[wpxero_text_to_speech layout="button" title="no" rate="1.25"]<p>Body.</p>' ) );
$ttsr_html    = ttsr_render_content( $ttsr_sc_post );
ttsr_assert_same( 1, ttsr_count_players( $ttsr_html ), 'shortcode replaces the automatic player instead of adding a second one' );
$ttsr_config = ttsr_player_config( $ttsr_html );
ttsr_assert( 'shortcode' === $ttsr_config['source'] && 'button' === $ttsr_config['layout'] && 1.25 === $ttsr_config['rate'] && '' === $ttsr_config['title'], 'shortcode attributes are applied' );
ttsr_assert_same( 'closest', $ttsr_config['scope'], 'shortcode reads the surrounding article' );

$ttsr_bad    = do_shortcode( '[wpxero_text_to_speech layout="<script>" rate="99" lang="x y"]' );
$ttsr_config = ttsr_player_config( $ttsr_bad );
ttsr_assert( 'standard' === $ttsr_config['layout'] && 99.0 !== $ttsr_config['rate'] && false === strpos( $ttsr_bad, '<script>' ), 'invalid shortcode attributes fall back to the settings' );

$ttsr_multi = do_shortcode( '[wpxero_text_to_speech][wpxero_text_to_speech]' );
preg_match_all( '/id="(ttsr-player-\d+)"/', $ttsr_multi, $ttsr_ids );
ttsr_assert( 2 === count( array_unique( $ttsr_ids[1] ) ), 'multiple players get unique ids' );

$ttsr_block_post = ttsr_test_post( array( 'post_content' => '<!-- wp:paragraph --><p>Hello.</p><!-- /wp:paragraph --><!-- wp:wpxero-text-to-speech/player {"layout":"button","includeTitle":"yes"} /-->' ) );
$ttsr_html       = ttsr_render_content( $ttsr_block_post );
$ttsr_config     = ttsr_player_config( $ttsr_html );
ttsr_assert( 1 === ttsr_count_players( $ttsr_html ) && 'block' === $ttsr_config['source'] && 'button' === $ttsr_config['layout'] && 'TTSR test post' === $ttsr_config['title'], 'block renders one configured player and suppresses the automatic one' );

ttsr_test_group( 'Escaping' );
$ttsr_xss  = ttsr_test_post( array( 'post_title' => '"><img src=x onerror=alert(1)> Title' ) );
$ttsr_html = ttsr_render_content( $ttsr_xss );
ttsr_assert( false === strpos( $ttsr_html, '<img src=x' ), 'post titles cannot break out of the config attribute' );
add_filter(
	'ttsr_player_style',
	static function ( $vars ) {
		$vars['--ttsr-accent'] = 'red;background:url(javascript:alert(1))';
		$vars['color']         = 'red';
		$vars['--ttsr-radius'] = '6px';
		return $vars;
	},
	99
);
$ttsr_html = do_shortcode( '[wpxero_text_to_speech]' );
ttsr_assert( false !== strpos( $ttsr_html, '--ttsr-radius:6px' ) && false === strpos( $ttsr_html, 'javascript' ) && false === strpos( $ttsr_html, 'color:red' ), 'style filter output is limited to safe custom properties' );
remove_all_filters( 'ttsr_player_style', 99 );

ttsr_test_group( 'Post meta' );
$ttsr_meta = get_registered_meta_keys( 'post', 'post' );
ttsr_assert( isset( $ttsr_meta['_ttsr_disable_auto'] ) && $ttsr_meta['_ttsr_disable_auto']['show_in_rest'], 'opt-out meta is registered for the editor' );
wp_set_current_user( 0 );
ttsr_assert( ! current_user_can( 'edit_post_meta', $ttsr_post, '_ttsr_disable_auto' ), 'logged-out users cannot edit the opt-out meta' );

ttsr_test_finish();
