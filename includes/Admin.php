<?php
/**
 * Admin screen.
 *
 * @package TTSR
 */

namespace TTSR;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the settings page that hosts the React admin app.
 */
final class Admin {

	const PAGE   = 'wpxero-text-to-speech';
	const HANDLE = 'ttsr-admin';

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
	 * Hook suffix of the settings page.
	 *
	 * @var string
	 */
	private $hook_suffix = '';

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
	 * Hooks the menu, assets, notice and action link.
	 */
	public function register_hooks() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
		add_action( 'admin_notices', array( $this, 'welcome_notice' ) );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( TTSR_FILE ), array( $this, 'action_links' ) );
	}

	/**
	 * Adds the top-level menu.
	 */
	public function add_menu() {
		$this->hook_suffix = (string) add_menu_page(
			__( 'WPXERO Text to Speech', 'wpxero-text-to-speech' ),
			__( 'Speech Reader', 'wpxero-text-to-speech' ),
			'manage_options',
			self::PAGE,
			array( $this, 'render_page' ),
			'dashicons-controls-volumeon',
			81
		);
	}

	/**
	 * Marks the settings page so the app can use the full content width.
	 *
	 * @param string $classes Space-separated body classes.
	 * @return string
	 */
	public function body_class( $classes ) {
		$screen = get_current_screen();
		if ( $screen && $this->hook_suffix && $screen->id === $this->hook_suffix ) {
			$classes .= ' ttsr-admin-page';
		}
		return $classes;
	}

	/**
	 * Settings URL, optionally for a section of the app.
	 *
	 * @param string $section Section id.
	 * @return string
	 */
	public static function url( $section = '' ) {
		$url = admin_url( 'admin.php?page=' . self::PAGE );
		return $section ? $url . '#/' . rawurlencode( $section ) : $url;
	}

	/**
	 * Page container for the React app.
	 */
	public function render_page() {
		delete_option( Lifecycle::WELCOME_OPTION );
		?>
		<div class="wrap ttsr-admin-wrap">
			<hr class="wp-header-end">
			<div id="ttsr-admin-root">
				<p class="ttsr-admin-loading"><?php esc_html_e( 'Loading settings…', 'wpxero-text-to-speech' ); ?></p>
			</div>
			<noscript>
				<div class="notice notice-error"><p><?php esc_html_e( 'The WPXERO Text to Speech settings need JavaScript.', 'wpxero-text-to-speech' ); ?></p></div>
			</noscript>
		</div>
		<?php
	}

	/**
	 * Enqueues the admin app on its own page only.
	 *
	 * @param string $hook_suffix Current admin page.
	 */
	public function enqueue( $hook_suffix ) {
		if ( $hook_suffix !== $this->hook_suffix ) {
			return;
		}

		/**
		 * Fires before the admin app is enqueued.
		 *
		 * Extensions register their admin scripts here and add the handles
		 * with `ttsr_admin_script_dependencies` so they run before the app
		 * mounts and can add sections through the `ttsr.admin.sections`
		 * JavaScript filter.
		 *
		 * @since 1.0.0
		 */
		do_action( 'ttsr_admin_enqueue' );

		/**
		 * Filters extra script handles the admin app depends on.
		 *
		 * @since 1.0.0
		 *
		 * @param string[] $handles Script handles.
		 */
		$extra = (array) apply_filters( 'ttsr_admin_script_dependencies', array() );
		Assets::register_entry( self::HANDLE, 'admin', array(), array_values( array_filter( $extra, 'is_string' ) ) );

		wp_enqueue_script( self::HANDLE );
		wp_enqueue_style( 'wp-components' );
		wp_enqueue_style( Assets::ADMIN_UI_HANDLE );
		wp_enqueue_style( self::HANDLE );
		// The preview uses the real frontend player.
		$this->assets->enqueue_player();

		wp_add_inline_script( self::HANDLE, 'window.ttsrAdmin = ' . wp_json_encode( $this->app_data() ) . ';', 'before' );
	}

	/**
	 * Data the admin app boots with.
	 *
	 * @return array
	 */
	private function app_data() {
		$options = static function ( array $map ) {
			$list = array();
			foreach ( $map as $value => $label ) {
				$list[] = array(
					'value' => (string) $value,
					'label' => (string) $label,
				);
			}
			return $list;
		};

		$data = array(
			'version'      => TTSR_VERSION,
			'apiVersion'   => TTSR_API_VERSION,
			'settings'     => $this->settings->get(),
			'defaults'     => $this->settings->defaults(),
			'postTypes'    => $options( $this->settings->eligible_post_types() ),
			'layouts'      => $options( $this->settings->layouts() ),
			'placements'   => $options( $this->settings->placements() ),
			'siteLanguage' => get_bloginfo( 'language' ),
			'labels'       => array(
				'listen' => __( 'Listen', 'wpxero-text-to-speech' ),
				'pause'  => __( 'Pause', 'wpxero-text-to-speech' ),
				'resume' => __( 'Resume', 'wpxero-text-to-speech' ),
				'stop'   => __( 'Stop', 'wpxero-text-to-speech' ),
			),
			'links'        => array(
				'newPost'    => admin_url( 'post-new.php' ),
				'plugins'    => admin_url( 'plugins.php' ),
				'samplePost' => $this->sample_post_url(),
			),
			'extensions'   => array(),
		);

		/**
		 * Filters the data the admin app boots with.
		 *
		 * Extensions should describe themselves in `extensions` as
		 * `array( 'id' => ..., 'name' => ..., 'version' => ... )`.
		 *
		 * @since 1.0.0
		 *
		 * @param array $data App data.
		 */
		return apply_filters( 'ttsr_admin_data', $data );
	}

	/**
	 * Permalink of the latest published post that shows the automatic player.
	 *
	 * @return string Empty when there is none.
	 */
	private function sample_post_url() {
		$types = array_values( array_filter( (array) $this->settings->value( 'post_types' ), 'post_type_exists' ) );
		if ( ! $types ) {
			return '';
		}
		$posts = get_posts(
			array(
				'post_type'        => $types,
				'post_status'      => 'publish',
				'numberposts'      => 1,
				'has_password'     => false,
				'suppress_filters' => false,
			)
		);
		return $posts ? (string) get_permalink( $posts[0] ) : '';
	}

	/**
	 * One-time notice after activation pointing to the settings.
	 */
	public function welcome_notice() {
		$screen = get_current_screen();
		if ( ! $screen || 'plugins' !== $screen->id || ! current_user_can( 'manage_options' ) || ! get_option( Lifecycle::WELCOME_OPTION ) ) {
			return;
		}
		delete_option( Lifecycle::WELCOME_OPTION );
		printf(
			'<div class="notice notice-success is-dismissible"><p>%1$s <a href="%2$s">%3$s</a></p></div>',
			esc_html__( 'WPXERO Text to Speech is active. A Listen player now appears on your posts.', 'wpxero-text-to-speech' ),
			esc_url( self::url() ),
			esc_html__( 'Review the settings', 'wpxero-text-to-speech' )
		);
	}

	/**
	 * Adds a Settings link on the Plugins screen.
	 *
	 * @param string[] $links Action links.
	 * @return string[]
	 */
	public function action_links( $links ) {
		array_unshift(
			$links,
			sprintf( '<a href="%1$s">%2$s</a>', esc_url( self::url() ), esc_html__( 'Settings', 'wpxero-text-to-speech' ) )
		);
		return $links;
	}
}
