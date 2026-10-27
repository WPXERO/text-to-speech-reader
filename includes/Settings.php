<?php
/**
 * Settings storage and validation.
 *
 * @package TTSR
 */

namespace TTSR;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Owns the `ttsr_settings` option.
 *
 * All writes go through sanitize(), which validates every key it is given
 * and reports problems per field instead of silently coercing them.
 */
final class Settings {

	const OPTION = 'ttsr_settings';

	/**
	 * Request cache of the merged settings.
	 *
	 * @var array|null
	 */
	private $cache = null;

	/**
	 * Default values for every setting.
	 *
	 * @return array
	 */
	public function defaults() {
		return array(
			'auto_insert'              => true,
			'post_types'               => array( 'post' ),
			'placement'                => 'before',
			'include_title'            => true,
			'layout'                   => 'standard',
			'rate'                     => 1.0,
			'pitch'                    => 1.0,
			'voice'                    => '',
			'lang'                     => '',
			'allow_voice_select'       => false,
			'allow_rate_select'        => true,
			'delete_data_on_uninstall' => false,
		);
	}

	/**
	 * Current settings merged over the defaults.
	 *
	 * @return array
	 */
	public function get() {
		if ( null === $this->cache ) {
			$stored      = get_option( self::OPTION, array() );
			$stored      = is_array( $stored ) ? $stored : array();
			$this->cache = array_merge( $this->defaults(), array_intersect_key( $stored, $this->defaults() ) );
		}
		return $this->cache;
	}

	/**
	 * One setting.
	 *
	 * @param string $key Setting name.
	 * @return mixed
	 */
	public function value( $key ) {
		$settings = $this->get();
		return isset( $settings[ $key ] ) ? $settings[ $key ] : null;
	}

	/**
	 * Validates and stores settings.
	 *
	 * @param array $input   Settings to change.
	 * @param bool  $replace True to start from the defaults instead of the
	 *                       current values (keys not in $input are reset).
	 * @return array|WP_Error Saved settings, or an error with per-field
	 *                        messages in `errors`.
	 */
	public function update( array $input, $replace = false ) {
		$base   = $replace ? $this->defaults() : $this->get();
		$result = $this->sanitize( $input, $base );
		if ( ! empty( $result['errors'] ) ) {
			return new WP_Error(
				'ttsr_invalid_settings',
				__( 'Some settings could not be saved. Check the highlighted fields.', 'text-to-speech-reader' ),
				array(
					'status' => 400,
					'errors' => $result['errors'],
				)
			);
		}
		update_option( self::OPTION, $result['settings'] );
		$this->cache = null;
		return $this->get();
	}

	/**
	 * Restores the defaults.
	 *
	 * @return array
	 */
	public function reset() {
		update_option( self::OPTION, $this->defaults() );
		$this->cache = null;
		return $this->get();
	}

	/**
	 * Validates `$input` and merges it over `$base`.
	 *
	 * Values that are no longer registered (for example a layout supplied by
	 * a deactivated extension) are accepted only if they are already stored,
	 * so saving an unrelated field never wipes them.
	 *
	 * @param array $input Untrusted input.
	 * @param array $base  Values to merge into.
	 * @return array{settings: array, errors: array<string, string>}
	 */
	public function sanitize( array $input, array $base ) {
		$settings = $base;
		$errors   = array();
		$stored   = $this->get();

		foreach ( $input as $key => $value ) {
			switch ( $key ) {
				case 'auto_insert':
				case 'include_title':
				case 'allow_voice_select':
				case 'allow_rate_select':
				case 'delete_data_on_uninstall':
					if ( ! is_bool( $value ) && ! in_array( $value, array( 0, 1, '0', '1' ), true ) ) {
						$errors[ $key ] = __( 'Must be on or off.', 'text-to-speech-reader' );
						break;
					}
					$settings[ $key ] = (bool) $value;
					break;

				case 'post_types':
					$allowed = array_merge( array_keys( $this->eligible_post_types() ), (array) $stored['post_types'] );
					if ( ! is_array( $value ) ) {
						$errors[ $key ] = __( 'Choose content types from the list.', 'text-to-speech-reader' );
						break;
					}
					$clean = array();
					foreach ( $value as $post_type ) {
						if ( ! is_string( $post_type ) || ! in_array( $post_type, $allowed, true ) ) {
							$errors[ $key ] = __( 'One of the selected content types does not exist.', 'text-to-speech-reader' );
							break 2;
						}
						$clean[] = $post_type;
					}
					$settings[ $key ] = array_values( array_unique( $clean ) );
					break;

				case 'placement':
					if ( ! is_string( $value ) || ( ! array_key_exists( $value, $this->placements() ) && $value !== $stored['placement'] ) ) {
						$errors[ $key ] = __( 'Choose a placement from the list.', 'text-to-speech-reader' );
						break;
					}
					$settings[ $key ] = $value;
					break;

				case 'layout':
					if ( ! is_string( $value ) || ( ! array_key_exists( $value, $this->layouts() ) && $value !== $stored['layout'] ) ) {
						$errors[ $key ] = __( 'Choose a layout from the list.', 'text-to-speech-reader' );
						break;
					}
					$settings[ $key ] = $value;
					break;

				case 'rate':
				case 'pitch':
					$min = 0.5;
					$max = 2.0;
					if ( ! is_numeric( $value ) || $value < $min || $value > $max ) {
						/* translators: 1: minimum value, 2: maximum value. */
						$errors[ $key ] = sprintf( __( 'Enter a number between %1$s and %2$s.', 'text-to-speech-reader' ), $min, $max );
						break;
					}
					$settings[ $key ] = round( (float) $value, 2 );
					break;

				case 'voice':
					if ( ! is_string( $value ) || strlen( $value ) > 200 ) {
						$errors[ $key ] = __( 'Choose a voice from the list.', 'text-to-speech-reader' );
						break;
					}
					$settings[ $key ] = sanitize_text_field( $value );
					break;

				case 'lang':
					if ( ! is_string( $value ) || ( '' !== $value && ! self::is_language_tag( $value ) ) ) {
						$errors[ $key ] = __( 'Use a language code such as en-US, or leave it empty.', 'text-to-speech-reader' );
						break;
					}
					$settings[ $key ] = $value;
					break;

				default:
					/* translators: %s: setting name. */
					$errors[ (string) $key ] = sprintf( __( 'Unknown setting "%s".', 'text-to-speech-reader' ), sanitize_key( (string) $key ) );
			}
		}

		return array(
			'settings' => $settings,
			'errors'   => $errors,
		);
	}

	/**
	 * Whether a string looks like a BCP 47 language tag.
	 *
	 * @param string $value Candidate tag.
	 * @return bool
	 */
	public static function is_language_tag( $value ) {
		return (bool) preg_match( '/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8}){0,3}$/', $value );
	}

	/**
	 * The language the player should use when none is configured.
	 *
	 * @return string
	 */
	public function language() {
		$lang = (string) $this->value( 'lang' );
		return '' !== $lang ? $lang : get_bloginfo( 'language' );
	}

	/**
	 * Public post types the player can be inserted into.
	 *
	 * @return array<string, string> Post type name => label.
	 */
	public function eligible_post_types() {
		$types = array();
		foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $type ) {
			if ( 'attachment' === $type->name ) {
				continue;
			}
			$types[ $type->name ] = $type->labels->singular_name;
		}
		/**
		 * Filters the post types offered for automatic insertion.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, string> $types Post type name => label.
		 */
		return apply_filters( 'ttsr_post_types', $types );
	}

	/**
	 * Registered player layouts.
	 *
	 * @return array<string, string> Layout id => label.
	 */
	public function layouts() {
		$layouts = array(
			'standard' => __( 'Standard', 'text-to-speech-reader' ),
			'button'   => __( 'Button only', 'text-to-speech-reader' ),
		);
		/**
		 * Filters the available player layouts.
		 *
		 * An extension that adds a layout must also ship the CSS for
		 * `.ttsr-player--{id}`.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, string> $layouts Layout id => label.
		 */
		return apply_filters( 'ttsr_player_layouts', $layouts );
	}

	/**
	 * Registered automatic-insertion placements.
	 *
	 * @return array<string, string> Placement id => label.
	 */
	public function placements() {
		$placements = array(
			'before' => __( 'Before the content', 'text-to-speech-reader' ),
			'after'  => __( 'After the content', 'text-to-speech-reader' ),
		);
		/**
		 * Filters the automatic-insertion placements.
		 *
		 * Placements other than `before` and `after` must be implemented with
		 * the `ttsr_insert_player` filter.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, string> $placements Placement id => label.
		 */
		return apply_filters( 'ttsr_placements', $placements );
	}

	/**
	 * Resolves a layout id, falling back to `standard` when unregistered.
	 *
	 * @param string $layout Requested layout.
	 * @return string
	 */
	public function resolve_layout( $layout ) {
		return array_key_exists( $layout, $this->layouts() ) ? $layout : 'standard';
	}
}
