<?php
/**
 * Activation and upgrades.
 *
 * @package TTSR
 */

namespace TTSR;

defined( 'ABSPATH' ) || exit;

/**
 * Installs defaults once and runs migrations when the stored version changes.
 */
final class Lifecycle {

	const VERSION_OPTION = 'ttsr_version';
	const WELCOME_OPTION = 'ttsr_show_welcome';

	/**
	 * Hooks the upgrade check.
	 */
	public static function register() {
		add_action( 'admin_init', array( __CLASS__, 'maybe_upgrade' ) );
	}

	/**
	 * Activation hook. Never overwrites existing settings.
	 */
	public static function activate() {
		add_option( Settings::OPTION, ( new Settings() )->defaults() );
		add_option( self::WELCOME_OPTION, 1 );
		self::maybe_upgrade();
	}

	/**
	 * Records the installed version and runs migrations for older data.
	 */
	public static function maybe_upgrade() {
		$installed = (string) get_option( self::VERSION_OPTION, '' );
		if ( TTSR_VERSION === $installed ) {
			return;
		}

		/*
		 * Migrations go here, keyed on $installed, for example:
		 * if ( version_compare( $installed, '1.1.0', '<' ) ) { ... }
		 * There are none for 1.0.0.
		 */

		/**
		 * Fires after WPXERO Text to Speech is installed or updated.
		 *
		 * @since 1.0.0
		 *
		 * @param string $installed Previously installed version ('' on first install).
		 * @param string $current   Current version.
		 */
		do_action( 'ttsr_upgraded', $installed, TTSR_VERSION );
		update_option( self::VERSION_OPTION, TTSR_VERSION );
	}
}
