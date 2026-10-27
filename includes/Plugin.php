<?php
/**
 * Plugin container.
 *
 * @package TTSR
 */

namespace TTSR;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the plugin's services together and exposes them to extensions.
 */
final class Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var Plugin|null
	 */
	private static $instance = null;

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
	 * Asset registration.
	 *
	 * @var Assets
	 */
	private $assets;

	/**
	 * Automatic insertion.
	 *
	 * @var Content_Integration
	 */
	private $content;

	/**
	 * Whether boot() has run.
	 *
	 * @var bool
	 */
	private $booted = false;

	/**
	 * Returns the shared instance.
	 *
	 * @return Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Builds the services.
	 */
	private function __construct() {
		$this->settings = new Settings();
		$this->assets   = new Assets();
		$this->renderer = new Renderer( $this->settings, $this->assets );
		$this->content  = new Content_Integration( $this->settings, $this->renderer, $this->assets );
	}

	/**
	 * Registers every hook. Safe to call more than once.
	 */
	public function boot() {
		if ( $this->booted ) {
			return;
		}
		$this->booted = true;

		Lifecycle::register();
		$this->assets->register_hooks();
		$this->content->register_hooks();
		( new Shortcode( $this->renderer ) )->register_hooks();
		( new Block( $this->settings, $this->renderer ) )->register_hooks();
		( new Post_Meta( $this->settings ) )->register_hooks();
		( new Rest_Controller( $this->settings ) )->register_hooks();

		if ( is_admin() ) {
			( new Admin( $this->settings, $this->assets ) )->register_hooks();
		}

		add_action( 'plugins_loaded', array( $this, 'announce' ), 5 );
	}

	/**
	 * Tells extensions the core is ready.
	 */
	public function announce() {
		/**
		 * Fires once Text to Speech Reader has registered its hooks.
		 *
		 * Extensions should initialise from this action and check
		 * TTSR_API_VERSION before relying on any other part of the contract.
		 *
		 * @since 1.0.0
		 *
		 * @param Plugin $plugin The plugin instance.
		 */
		do_action( 'ttsr_loaded', $this );
	}

	/**
	 * Settings service.
	 *
	 * @return Settings
	 */
	public function settings() {
		return $this->settings;
	}

	/**
	 * Player renderer.
	 *
	 * @return Renderer
	 */
	public function renderer() {
		return $this->renderer;
	}

	/**
	 * Asset service.
	 *
	 * @return Assets
	 */
	public function assets() {
		return $this->assets;
	}

	/**
	 * Automatic insertion service.
	 *
	 * @return Content_Integration
	 */
	public function content() {
		return $this->content;
	}
}
