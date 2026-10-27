<?php
/**
 * REST endpoints for the admin app.
 *
 * @package TTSR
 */

namespace TTSR;

use WP_REST_Request;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * `ttsr/v1/settings` and `ttsr/v1/settings/reset`.
 */
final class Rest_Controller {

	const REST_NAMESPACE = 'ttsr/v1';

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
	 * Hooks route registration.
	 */
	public function register_hooks() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers the routes.
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_settings' ),
					'permission_callback' => array( $this, 'can_manage' ),
					'args'                => array(
						'settings' => array(
							'description' => __( 'Settings to change.', 'text-to-speech-reader' ),
							'type'        => 'object',
							'required'    => true,
						),
					),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/settings/reset',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'reset_settings' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);
	}

	/**
	 * Only administrators may read or change settings.
	 *
	 * @return bool
	 */
	public function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * GET /settings.
	 *
	 * @return array
	 */
	public function get_settings() {
		return array( 'settings' => $this->settings->get() );
	}

	/**
	 * POST /settings.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array|\WP_Error
	 */
	public function update_settings( WP_REST_Request $request ) {
		$input = $request->get_param( 'settings' );
		$saved = $this->settings->update( is_array( $input ) ? $input : array() );
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}
		return array( 'settings' => $saved );
	}

	/**
	 * POST /settings/reset.
	 *
	 * @return array
	 */
	public function reset_settings() {
		return array( 'settings' => $this->settings->reset() );
	}
}
