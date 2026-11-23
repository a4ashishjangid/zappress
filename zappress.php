<?php
/**
 * Plugin Name:       ZapPress
 * Description:       Create automated workflows using WordPress data, API connections, schedules, and conditions without coding. For custom integration requests, contact: a4ashishjangid@gmail.com
 * Version:           1.0.0
 * Author:            Aashish Kumar Jangid
 * Author URI: https://github.com/a4ashishjangid
 * License:           GPL-2.0+
 * Text Domain:       zappress
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

// Define plugin constants
define( 'ZAPPRESS_VERSION', '1.0.0' );
define( 'ZAPPRESS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ZAPPRESS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Include activator and deactivator classes
require_once ZAPPRESS_PLUGIN_DIR . 'includes/class-zappress-activator.php';
require_once ZAPPRESS_PLUGIN_DIR . 'includes/class-zappress-deactivator.php';

// Activation & Deactivation Hooks
register_activation_hook( __FILE__, [ 'ZapPress_Activator', 'activate' ] );
register_deactivation_hook( __FILE__, [ 'ZapPress_Deactivator', 'deactivate' ] );

// Initialize the plugin
add_action( 'plugins_loaded', 'zappress_init' );

/**
 * Initialize all core plugin dependencies, REST routers, action templates,
 * hooks, and custom triggers adapters when plugins are loaded.
 */
function zappress_init() {
	// Include encryption
	require_once ZAPPRESS_PLUGIN_DIR . 'includes/class-zappress-encryption.php';

	// Include Logger Trait
	require_once ZAPPRESS_PLUGIN_DIR . 'includes/trait-zappress-logger.php';

	// Include DB manager
	require_once ZAPPRESS_PLUGIN_DIR . 'includes/class-zappress-db.php';

	// Database schema & legacy log cleanup migration check
	if ( get_option( 'zappress_db_version' ) !== '1.0.1' ) {
		ZapPress_Activator::activate();
		ZapPress_DB::cleanup_legacy_log_files();
		update_option( 'zappress_db_version', '1.0.1' );
	}

	// Include core workflow runner & engine
	require_once ZAPPRESS_PLUGIN_DIR . 'includes/class-zappress-engine.php';

	// Include scheduler
	require_once ZAPPRESS_PLUGIN_DIR . 'includes/class-zappress-scheduler.php';
	ZapPress_Scheduler::init();

	// Include trigger classes
	require_once ZAPPRESS_PLUGIN_DIR . 'includes/triggers/class-wp-triggers.php';

	// Include action step runners
	require_once ZAPPRESS_PLUGIN_DIR . 'includes/actions/class-api-action.php';
	require_once ZAPPRESS_PLUGIN_DIR . 'includes/actions/class-ai-actions.php';

	// Include REST API Controller
	require_once ZAPPRESS_PLUGIN_DIR . 'includes/class-zappress-api.php';
	ZapPress_API::get_instance();

	// Include admin dashboard setup
	if ( is_admin() ) {
		require_once ZAPPRESS_PLUGIN_DIR . 'admin/class-zappress-admin.php';
		ZapPress_Admin::get_instance();
	}
}
