<?php
/**
 * Automatic insertion into post content.
 *
 * @package TTSR
 */

namespace TTSR;

use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Adds the player before or after the main post content.
 */
final class Content_Integration {

	const SHORTCODE = 'text_to_speech_reader';
	const BLOCK     = 'text-to-speech-reader/player';

	/**
	 * Settings service.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Player renderer.
	 *
	 * @var Renderer
	 */
	private $renderer;

	/**
	 * Asset service.
	 *
	 * @var Assets
	 */
	private $assets;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings service.
	 * @param Renderer $renderer Player renderer.
	 * @param Assets   $assets   Asset service.
	 */
	public function __construct( Settings $settings, Renderer $renderer, Assets $assets ) {
		$this->settings = $settings;
		$this->renderer = $renderer;
		$this->assets   = $assets;
	}

	/**
	 * Hooks the content filter and early asset loading.
	 */
	public function register_hooks() {
		// After blocks (9), wpautop (10) and shortcodes (11) have run, so a
		// player rendered by the block or shortcode is already known.
		add_filter( 'the_content', array( $this, 'filter_content' ), 20 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_early' ) );
	}

	/**
	 * Whether the player should be inserted automatically into a post.
	 *
	 * @param WP_Post $post Post.
	 * @return bool
	 */
	public function should_insert( WP_Post $post ) {
		$settings = $this->settings->get();
		$insert   = $settings['auto_insert']
			&& in_array( $post->post_type, (array) $settings['post_types'], true )
			&& ! get_post_meta( $post->ID, Post_Meta::DISABLE_AUTO, true )
			&& ! post_password_required( $post )
			&& ! has_shortcode( $post->post_content, self::SHORTCODE )
			&& ! has_block( self::BLOCK, $post );

		/**
		 * Filters whether the player is inserted automatically into a post.
		 *
		 * @since 1.0.0
		 *
		 * @param bool    $insert Whether to insert the player.
		 * @param WP_Post $post   The post being displayed.
		 */
		return (bool) apply_filters( 'ttsr_should_auto_insert', $insert, $post );
	}

	/**
	 * Enqueues the player in the head on pages that will show it, so its
	 * stylesheet is not printed late in the footer.
	 */
	public function enqueue_early() {
		if ( ! is_singular() ) {
			return;
		}
		$post = get_queried_object();
		if ( ! $post instanceof WP_Post ) {
			return;
		}
		if (
			$this->should_insert( $post )
			|| has_shortcode( $post->post_content, self::SHORTCODE )
			|| has_block( self::BLOCK, $post )
		) {
			$this->assets->enqueue_player();
		}
	}

	/**
	 * `the_content` filter.
	 *
	 * @param string $content Post content.
	 * @return string
	 */
	public function filter_content( $content ) {
		if ( ! $this->is_main_content() ) {
			return $content;
		}
		$post = get_post();
		if ( ! $post instanceof WP_Post || $this->renderer->has_rendered( $post->ID ) || ! $this->should_insert( $post ) ) {
			return $content;
		}

		$player    = $this->renderer->render(
			array(
				'source'  => 'auto',
				'post_id' => $post->ID,
			)
		);
		$placement = (string) $this->settings->value( 'placement' );

		/**
		 * Filters the automatic-insertion placement for a post.
		 *
		 * @since 1.0.0
		 *
		 * @param string  $placement Placement id.
		 * @param WP_Post $post      The post being displayed.
		 */
		$placement = (string) apply_filters( 'ttsr_auto_placement', $placement, $post );

		/**
		 * Lets extensions place the player themselves.
		 *
		 * Return the full content with the player inserted to take over, or
		 * null to use the default before/after placement.
		 *
		 * @since 1.0.0
		 *
		 * @param string|null $result    Null, or the content with the player.
		 * @param string      $content   Post content.
		 * @param string      $player    Player markup.
		 * @param string      $placement Placement id.
		 * @param WP_Post     $post      The post being displayed.
		 */
		$result = apply_filters( 'ttsr_insert_player', null, $content, $player, $placement, $post );
		if ( is_string( $result ) ) {
			return $result;
		}
		return 'after' === $placement ? $content . $player : $player . $content;
	}

	/**
	 * Whether `the_content` is running for the main post of a singular view
	 * on the front end (not feeds, REST, excerpts or secondary loops).
	 *
	 * @return bool
	 */
	private function is_main_content() {
		if ( is_admin() || is_feed() || wp_is_json_request() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return false;
		}
		if ( ! is_singular() || ! in_the_loop() || ! is_main_query() ) {
			return false;
		}
		return get_the_ID() === get_queried_object_id();
	}
}
