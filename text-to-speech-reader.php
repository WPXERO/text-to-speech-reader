<?php
/**
 * Plugin Name:       Text to Speech Reader
 * Plugin URI:        https://github.com/WPXERO/text-to-speech-reader
 * Description:       Adds an accessible "Listen" player that reads posts and pages aloud using the visitor's own browser voices. No accounts, API keys or external services.
 * Version:           1.0.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            WPXERO
 * Author URI:        https://github.com/WPXERO
 * License:           GPL-3.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain:       text-to-speech-reader
 * Domain Path:       /languages
 *
 * @package TTSR
 */

defined( 'ABSPATH' ) || exit;

define( 'TTSR_VERSION', '1.0.0' );

/*
 * Version of the extension contract (PHP hooks + window.TTSR). Incremented
 * only for breaking changes; see docs/integration-api.md.
 */
define( 'TTSR_API_VERSION', 1 );
define( 'TTSR_FILE', __FILE__ );
define( 'TTSR_PATH', plugin_dir_path( __FILE__ ) );
define( 'TTSR_URL', plugin_dir_url( __FILE__ ) );

spl_autoload_register(
	static function ( $class_name ) {
		if ( 0 !== strpos( $class_name, 'TTSR\\' ) ) {
			return;
		}
		$file = TTSR_PATH . 'includes/' . str_replace( '\\', '/', substr( $class_name, 5 ) ) . '.php';
		if ( is_readable( $file ) ) {
			require $file;
		}
	}
);

register_activation_hook( __FILE__, array( 'TTSR\\Lifecycle', 'activate' ) );

/**
 * The running plugin instance.
 *
 * @return TTSR\Plugin
 */
function ttsr() {
	return TTSR\Plugin::instance();
}

ttsr()->boot();
