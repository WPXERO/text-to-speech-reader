<?php
/**
 * Player markup.
 *
 * @package TTSR
 */

namespace TTSR;

use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Renders the player container used by automatic insertion, the shortcode
 * and the block. The controls are built by the frontend script, so a
 * visitor without JavaScript never sees a button that cannot work.
 */
final class Renderer {

	/**
	 * Settings service.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Asset service.
	 *
	 * @var Assets
	 */
	private $assets;

	/**
	 * Players rendered in this request, for unique ids.
	 *
	 * @var int
	 */
	private $count = 0;

	/**
	 * Post IDs that already have a player in this request.
	 *
	 * @var array<int, bool>
	 */
	private $rendered = array();

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings service.
	 * @param Assets   $assets   Asset service.
	 */
	public function __construct( Settings $settings, Assets $assets ) {
		$this->settings = $settings;
		$this->assets   = $assets;
	}

	/**
	 * Whether a player for this post was already rendered in this request.
	 *
	 * @param int $post_id Post ID.
	 * @return bool
	 */
	public function has_rendered( $post_id ) {
		return ! empty( $this->rendered[ (int) $post_id ] );
	}

	/**
	 * Player markup.
	 *
	 * @param array $args {
	 *     Optional. Render arguments.
	 *
	 *     @type string    $source        `auto`, `shortcode` or `block`.
	 *     @type int       $post_id       Post the player belongs to.
	 *     @type string    $layout        Layout id; empty for the global setting.
	 *     @type bool|null $include_title Null for the global setting.
	 *     @type string    $lang          Language tag; empty for the global setting.
	 *     @type float     $rate          Speech rate; 0 for the global setting.
	 * }
	 * @return string
	 */
	public function render( array $args = array() ) {
		$args     = wp_parse_args(
			$args,
			array(
				'source'        => 'shortcode',
				'post_id'       => 0,
				'layout'        => '',
				'include_title' => null,
				'lang'          => '',
				'rate'          => 0,
			)
		);
		$settings = $this->settings->get();
		$post     = $args['post_id'] ? get_post( (int) $args['post_id'] ) : null;
		$post     = $post instanceof WP_Post ? $post : null;

		$include_title = null === $args['include_title'] ? (bool) $settings['include_title'] : (bool) $args['include_title'];
		$rate          = (float) $args['rate'];
		$lang          = (string) $args['lang'];

		++$this->count;
		$config  = array(
			'id'               => 'ttsr-player-' . $this->count,
			'source'           => (string) $args['source'],
			'postId'           => $post ? $post->ID : 0,
			'title'            => $post ? $this->plain_title( $post ) : '',
			'includeTitle'     => $include_title,
			'layout'           => '' !== $args['layout'] ? (string) $args['layout'] : $settings['layout'],
			'lang'             => Settings::is_language_tag( $lang ) ? $lang : $this->settings->language(),
			'voice'            => $settings['voice'],
			'rate'             => $rate >= 0.5 && $rate <= 2 ? $rate : (float) $settings['rate'],
			'pitch'            => (float) $settings['pitch'],
			'allowVoiceSelect' => (bool) $settings['allow_voice_select'],
			'allowRateSelect'  => (bool) $settings['allow_rate_select'],
			'showStop'         => true,
			'showStatus'       => true,
			'showProgress'     => false,
			'scope'            => 'auto' === $args['source'] ? 'parent' : 'closest',
			'contentSelector'  => '',
			'excludeSelectors' => array(),
			'labels'           => array(
				'listen' => __( 'Listen', 'text-to-speech-reader' ),
				'pause'  => __( 'Pause', 'text-to-speech-reader' ),
				'resume' => __( 'Resume', 'text-to-speech-reader' ),
				'stop'   => __( 'Stop', 'text-to-speech-reader' ),
			),
			'extensions'       => array(),
		);
		$context = array(
			'source' => $config['source'],
			'post'   => $post,
			'args'   => $args,
		);

		/**
		 * Filters a player's configuration before it is rendered.
		 *
		 * The array is passed to the frontend as JSON. Add extension-specific
		 * data under `extensions.{your-prefix}` rather than new top-level keys.
		 *
		 * @since 1.0.0
		 *
		 * @param array $config  Player configuration.
		 * @param array $context {
		 *     @type string       $source `auto`, `shortcode` or `block`.
		 *     @type WP_Post|null $post   The post the player belongs to.
		 *     @type array        $args   Arguments passed to render().
		 * }
		 */
		$config           = apply_filters( 'ttsr_player_config', $config, $context );
		$config['layout'] = $this->settings->resolve_layout( (string) $config['layout'] );
		if ( ! $config['includeTitle'] ) {
			$config['title'] = '';
		}

		/**
		 * Filters CSS custom properties set on the player element.
		 *
		 * Only `--ttsr-*` / `--ttsrp-*` names with simple values are output.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, string> $vars    Property name => value.
		 * @param array                 $config  Player configuration.
		 * @param array                 $context See `ttsr_player_config`.
		 */
		$style = $this->style_attribute( (array) apply_filters( 'ttsr_player_style', array(), $config, $context ) );

		$this->assets->enqueue_player();
		if ( $post ) {
			$this->rendered[ $post->ID ] = true;
		}

		$classes = array( 'ttsr-player', 'ttsr-player--' . sanitize_html_class( $config['layout'] ) );
		$html    = sprintf(
			'<div id="%1$s" class="%2$s" data-ttsr-player data-ttsr-config="%3$s" role="region" aria-label="%4$s"%5$s hidden></div>',
			esc_attr( $config['id'] ),
			esc_attr( implode( ' ', $classes ) ),
			esc_attr( (string) wp_json_encode( $config ) ),
			esc_attr__( 'Listen to this content', 'text-to-speech-reader' ),
			$style ? ' style="' . esc_attr( $style ) . '"' : ''
		);

		/**
		 * Filters the final player markup.
		 *
		 * @since 1.0.0
		 *
		 * @param string $html    Player markup.
		 * @param array  $config  Player configuration.
		 * @param array  $context See `ttsr_player_config`.
		 */
		return (string) apply_filters( 'ttsr_player_html', $html, $config, $context );
	}

	/**
	 * Post title as plain text.
	 *
	 * @param WP_Post $post Post.
	 * @return string
	 */
	private function plain_title( WP_Post $post ) {
		$title = html_entity_decode( get_the_title( $post ), ENT_QUOTES, get_bloginfo( 'charset' ) );
		return trim( wp_strip_all_tags( $title ) );
	}

	/**
	 * Builds a safe `style` attribute from custom properties.
	 *
	 * @param array $vars Property name => value.
	 * @return string
	 */
	private function style_attribute( array $vars ) {
		$rules = array();
		foreach ( $vars as $name => $value ) {
			if ( ! is_string( $name ) || ! preg_match( '/^--ttsrp?-[a-z0-9-]+$/', $name ) ) {
				continue;
			}
			$value = is_scalar( $value ) ? trim( (string) $value ) : '';
			if ( '' === $value || strlen( $value ) > 64 || ! preg_match( '/^[#a-zA-Z0-9.,%()\s-]+$/', $value ) ) {
				continue;
			}
			$rules[] = $name . ':' . $value;
		}
		return implode( ';', $rules );
	}
}
