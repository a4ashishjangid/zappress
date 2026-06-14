<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * Fired during plugin deactivation.
 */
class ZapPress_Deactivator {
	/**
	 * Deactivate callback.
	 */
	public static function deactivate() {
		// Clear any scheduled Cron tasks that the plugin registered
		wp_clear_scheduled_hook( 'zappress_scheduler_cron_event' );
	}
}
