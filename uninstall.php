<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * @since 1.0.0
 */

// If uninstall not called from WordPress, exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// Drop custom database tables
$tables = [
	$wpdb->prefix . 'zappress_workflows',
	$wpdb->prefix . 'zappress_connections',
	$wpdb->prefix . 'zappress_logs',
	$wpdb->prefix . 'zappress_retries',
];

foreach ( $tables as $table ) {
	$wpdb->query( "DROP TABLE IF EXISTS $table" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
}

// Delete options
delete_option( 'zappress_encryption_key' );
delete_option( 'zappress_settings_retry_interval' );
delete_option( 'zappress_settings_max_retries' );

// Delete any option that begins with zappress_workflow_last_run_
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE 'zappress_workflow_last_run_%'" );

// Delete cached logs directory if it exists
$upload_dir = wp_upload_dir();
if ( empty( $upload_dir['error'] ) ) {
	$zappress_logs_dir = $upload_dir['basedir'] . '/zappress-logs';
	if ( file_exists( $zappress_logs_dir ) ) {
		zappress_uninstall_delete_directory( $zappress_logs_dir );
	}
}

/**
 * Recursively delete directory helper.
 *
 * @param string $dir Directory path.
 */
function zappress_uninstall_delete_directory( $dir ) {
	if ( ! file_exists( $dir ) ) {
		return;
	}
	$files = array_diff( scandir( $dir ), [ '.', '..' ] );
	foreach ( $files as $file ) {
		if ( is_dir( "$dir/$file" ) ) {
			zappress_uninstall_delete_directory( "$dir/$file" );
		} else {
			unlink( "$dir/$file" );
		}
	}
	return rmdir( $dir );
}
