<?php
/**
 * Minimal assertion harness for integration tests run with `wp eval-file`.
 *
 * These tests run inside a real WordPress install with the plugins loaded,
 * create the posts they need and delete them again.
 *
 * @package TTSR\Tests
 */

defined( 'ABSPATH' ) || exit;

$GLOBALS['ttsr_test'] = array(
	'passed' => 0,
	'failed' => array(),
	'posts'  => array(),
	'group'  => '',
);

/**
 * Starts a named group of assertions.
 *
 * @param string $name Group name.
 */
function ttsr_test_group( $name ) {
	$GLOBALS['ttsr_test']['group'] = $name;
	WP_CLI::log( "\n# {$name}" );
}

/**
 * Records an assertion.
 *
 * @param bool   $condition Outcome.
 * @param string $message   What was checked.
 */
function ttsr_assert( $condition, $message ) {
	if ( $condition ) {
		++$GLOBALS['ttsr_test']['passed'];
		WP_CLI::log( "  ok   {$message}" );
		return;
	}
	$GLOBALS['ttsr_test']['failed'][] = $GLOBALS['ttsr_test']['group'] . ': ' . $message;
	WP_CLI::log( "  FAIL {$message}" );
}

/**
 * Asserts equality, printing both values on failure.
 *
 * @param mixed  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @param string $message  What was checked.
 */
function ttsr_assert_same( $expected, $actual, $message ) {
	$ok = $expected === $actual;
	ttsr_assert( $ok, $ok ? $message : $message . ' (expected ' . wp_json_encode( $expected ) . ', got ' . wp_json_encode( $actual ) . ')' );
}

/**
 * Creates a published post that is removed when the test ends.
 *
 * @param array $args wp_insert_post() arguments.
 * @return int Post ID.
 */
function ttsr_test_post( array $args = array() ) {
	$id                              = wp_insert_post(
		array_merge(
			array(
				'post_title'   => 'TTSR test post',
				'post_content' => '<!-- wp:paragraph --><p>First paragraph of the test post.</p><!-- /wp:paragraph --><!-- wp:paragraph --><p>Second paragraph.</p><!-- /wp:paragraph -->',
				'post_status'  => 'publish',
				'post_type'    => 'post',
			),
			$args
		)
	);
	$GLOBALS['ttsr_test']['posts'][] = $id;
	return $id;
}

/**
 * Renders a post's content as the main query on its single view would.
 *
 * @param int   $post_id Post ID.
 * @param array $flags   Extra WP_Query flags to set, e.g. is_feed.
 * @return string Filtered content.
 */
function ttsr_render_content( $post_id, array $flags = array() ) {
	global $wp_query, $wp_the_query, $post;
	$type         = get_post_type( $post_id );
	$query        = new WP_Query(
		array(
			'p'         => $post_id,
			'post_type' => $type,
		)
	);
	$wp_query     = $query; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
	$wp_the_query = $query; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
	foreach ( $flags as $flag => $value ) {
		$query->$flag = $value;
	}
	$query->the_post();
	// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Core filter, applied as a theme would.
	$content = apply_filters( 'the_content', $post->post_content );
	$query->rewind_posts();
	wp_reset_postdata();
	return $content;
}

/**
 * Number of player containers in some HTML.
 *
 * @param string $html Markup.
 * @return int
 */
function ttsr_count_players( $html ) {
	return substr_count( $html, 'data-ttsr-player' );
}

/**
 * Decoded config of the first player in some HTML.
 *
 * @param string $html Markup.
 * @return array|null
 */
function ttsr_player_config( $html ) {
	if ( ! preg_match( '/data-ttsr-config="([^"]*)"/', $html, $match ) ) {
		return null;
	}
	return json_decode( html_entity_decode( $match[1], ENT_QUOTES ), true );
}

/**
 * Runs a REST request as a given user.
 *
 * @param string $method  HTTP method.
 * @param string $route   Route.
 * @param array  $body    JSON body.
 * @param int    $user_id User to run as (0 = logged out).
 * @return WP_REST_Response
 */
function ttsr_rest( $method, $route, array $body = array(), $user_id = 0 ) {
	wp_set_current_user( $user_id );
	$request = new WP_REST_Request( $method, $route );
	if ( $body ) {
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( wp_json_encode( $body ) );
	}
	return rest_do_request( $request );
}

/**
 * An administrator's user ID.
 *
 * @return int
 */
function ttsr_admin_id() {
	$admins = get_users(
		array(
			'role'   => 'administrator',
			'number' => 1,
			'fields' => 'ID',
		)
	);
	return (int) $admins[0];
}

/**
 * Deletes test posts, prints a summary and sets the exit code.
 */
function ttsr_test_finish() {
	foreach ( $GLOBALS['ttsr_test']['posts'] as $id ) {
		wp_delete_post( $id, true );
	}
	$failed = $GLOBALS['ttsr_test']['failed'];
	WP_CLI::log( "\n" . $GLOBALS['ttsr_test']['passed'] . ' passed, ' . count( $failed ) . ' failed' );
	foreach ( $failed as $line ) {
		WP_CLI::log( "  - {$line}" );
	}
	if ( $failed ) {
		WP_CLI::halt( 1 );
	}
}

// Every test starts from known settings and restores the originals afterwards.
$GLOBALS['ttsr_test']['saved_options'] = array(
	'ttsr_settings'  => get_option( 'ttsr_settings', null ),
	'ttsrp_settings' => get_option( 'ttsrp_settings', null ),
);
register_shutdown_function(
	static function () {
		foreach ( $GLOBALS['ttsr_test']['saved_options'] as $name => $value ) {
			if ( null === $value ) {
				delete_option( $name );
			} else {
				update_option( $name, $value );
			}
		}
	}
);
