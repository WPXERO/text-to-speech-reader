<?php
/**
 * The [text_to_speech_reader] shortcode.
 *
 * @package TTSR
 */

namespace TTSR;

defined( 'ABSPATH' ) || exit;

/**
 * Shortcode handler.
 */
final class Shortcode {

	/**
	 * Player renderer.
	 *
	 * @var Renderer
	 */
	private $renderer;

	/**
	 * Constructor.
	 *
	 * @param Renderer $renderer Player renderer.
	 */
	public function __construct( Renderer $renderer ) {
		$this->renderer = $renderer;
	}

	/**
	 * Registers the shortcode.
	 */
	public function register_hooks() {
		add_action( 'init', array( $this, 'register' ) );
	}

	/**
	 * Adds the shortcode.
	 */
	public function register() {
		add_shortcode( Content_Integration::SHORTCODE, array( $this, 'render' ) );
	}

	/**
	 * Renders the shortcode.
	 *
	 * Attributes: `layout` (layout id), `title` (`yes`/`no`), `lang` (language
	 * tag) and `rate` (0.5–2). Invalid values fall back to the settings.
	 *
	 * @param array|string $atts Shortcode attributes.
	 * @return string
	 */
	public function render( $atts ) {
		$atts = shortcode_atts(
			array(
				'layout' => '',
				'title'  => '',
				'lang'   => '',
				'rate'   => '',
			),
			is_array( $atts ) ? $atts : array(),
			Content_Integration::SHORTCODE
		);

		$include_title = null;
		if ( in_array( $atts['title'], array( 'yes', 'no' ), true ) ) {
			$include_title = 'yes' === $atts['title'];
		}

		return $this->renderer->render(
			array(
				'source'        => 'shortcode',
				'post_id'       => (int) get_the_ID(),
				'layout'        => sanitize_key( $atts['layout'] ),
				'include_title' => $include_title,
				'lang'          => sanitize_text_field( $atts['lang'] ),
				'rate'          => is_numeric( $atts['rate'] ) ? (float) $atts['rate'] : 0,
			)
		);
	}
}
