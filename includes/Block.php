<?php
/**
 * The wpxero-text-to-speech/player block.
 *
 * @package TTSR
 */

namespace TTSR;

use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the dynamic player block.
 */
final class Block {

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
	 * Constructor.
	 *
	 * @param Settings $settings Settings service.
	 * @param Renderer $renderer Player renderer.
	 */
	public function __construct( Settings $settings, Renderer $renderer ) {
		$this->settings = $settings;
		$this->renderer = $renderer;
	}

	/**
	 * Hooks block registration (after Assets registers the editor script).
	 */
	public function register_hooks() {
		add_action( 'init', array( $this, 'register' ) );
	}

	/**
	 * Registers the block from its block.json.
	 */
	public function register() {
		register_block_type(
			TTSR_PATH . 'blocks/player',
			array( 'render_callback' => array( $this, 'render' ) )
		);

		$layouts = array();
		foreach ( $this->settings->layouts() as $value => $label ) {
			$layouts[] = array(
				'value' => $value,
				'label' => $label,
			);
		}
		wp_add_inline_script(
			'ttsr-block-editor',
			'window.ttsrBlockEditor = ' . wp_json_encode(
				array(
					'layouts'       => $layouts,
					'defaultLayout' => $this->settings->value( 'layout' ),
					'settingsUrl'   => admin_url( 'admin.php?page=' . Admin::PAGE ),
				)
			) . ';',
			'before'
		);
	}

	/**
	 * Server-side render.
	 *
	 * @param array    $attributes Block attributes.
	 * @param string   $content    Inner content (unused).
	 * @param WP_Block $block      Block instance.
	 * @return string
	 */
	public function render( $attributes, $content = '', $block = null ) {
		$post_id = $block instanceof WP_Block && isset( $block->context['postId'] ) ? (int) $block->context['postId'] : (int) get_the_ID();
		$title   = isset( $attributes['includeTitle'] ) ? $attributes['includeTitle'] : '';

		return $this->renderer->render(
			array(
				'source'        => 'block',
				'post_id'       => $post_id,
				'layout'        => isset( $attributes['layout'] ) ? sanitize_key( $attributes['layout'] ) : '',
				'include_title' => in_array( $title, array( 'yes', 'no' ), true ) ? 'yes' === $title : null,
			)
		);
	}
}
