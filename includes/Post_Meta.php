<?php
/**
 * Per-post settings.
 *
 * @package TTSR
 */

namespace TTSR;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the "hide the automatic player" flag and its editor panel.
 */
final class Post_Meta {

	const DISABLE_AUTO = '_ttsr_disable_auto';

	/**
	 * Settings service.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings service.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Hooks registration. Priority 20 so post types registered on `init`
	 * by themes and plugins already exist.
	 */
	public function register_hooks() {
		add_action( 'init', array( $this, 'register' ), 20 );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor' ) );
	}

	/**
	 * Post types the player is automatically inserted into.
	 *
	 * @return string[]
	 */
	public function enabled_post_types() {
		return array_values(
			array_filter( (array) $this->settings->value( 'post_types' ), 'post_type_exists' )
		);
	}

	/**
	 * Registers the meta key for enabled post types.
	 */
	public function register() {
		foreach ( $this->enabled_post_types() as $post_type ) {
			// The block editor only exposes meta for post types with custom-fields support.
			if ( ! post_type_supports( $post_type, 'custom-fields' ) ) {
				add_post_type_support( $post_type, 'custom-fields' );
			}
			register_post_meta(
				$post_type,
				self::DISABLE_AUTO,
				array(
					'type'              => 'boolean',
					'single'            => true,
					'default'           => false,
					'show_in_rest'      => true,
					'sanitize_callback' => 'rest_sanitize_boolean',
					'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
						return current_user_can( 'edit_post', $post_id );
					},
				)
			);
		}
	}

	/**
	 * Loads the document settings panel for enabled post types.
	 */
	public function enqueue_editor() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! in_array( $screen->post_type, $this->enabled_post_types(), true ) ) {
			return;
		}
		wp_enqueue_script( 'ttsr-editor' );
		wp_add_inline_script(
			'ttsr-editor',
			'window.ttsrEditor = ' . wp_json_encode(
				array(
					'autoInsert' => (bool) $this->settings->value( 'auto_insert' ),
					'metaKey'    => self::DISABLE_AUTO,
				)
			) . ';',
			'before'
		);
	}
}
