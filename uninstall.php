<?php
/**
 * Removes plugin data on uninstall, but only when the administrator opted in
 * with "Delete settings when the plugin is deleted".
 *
 * @package TTSR
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

/**
 * Deletes this plugin's data from the current site if the site opted in.
 */
function ttsr_uninstall_site() {
	$settings = get_option( 'ttsr_settings', array() );
	if ( ! is_array( $settings ) || empty( $settings['delete_data_on_uninstall'] ) ) {
		return;
	}
	delete_option( 'ttsr_settings' );
	delete_option( 'ttsr_version' );
	delete_option( 'ttsr_show_welcome' );
	delete_post_meta_by_key( '_ttsr_disable_auto' );
}

if ( is_multisite() ) {
	foreach ( get_sites( array( 'fields' => 'ids' ) ) as $ttsr_site_id ) {
		switch_to_blog( $ttsr_site_id );
		ttsr_uninstall_site();
		restore_current_blog();
	}
} else {
	ttsr_uninstall_site();
}
