<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * Fired during plugin activation.
 */
class ZapPress_Activator {
	/**
	 * Activate callback.
	 */
	public static function activate() {
		global $wpdb;

		$charset_collate = $wpdb->get_charset_collate();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// Workflows table
		$table_workflows = $wpdb->prefix . 'zappress_workflows';
		$sql_workflows = "CREATE TABLE $table_workflows (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			name varchar(255) NOT NULL,
			description text NOT NULL,
			status varchar(50) DEFAULT 'paused' NOT NULL,
			trigger_type varchar(100) NOT NULL,
			trigger_config longtext NOT NULL,
			steps longtext NOT NULL,
			created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
			updated_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
			PRIMARY KEY  (id),
			KEY status_trigger (status, trigger_type)
		) $charset_collate;";

		// Connections table (encrypted API credentials)
		$table_connections = $wpdb->prefix . 'zappress_connections';
		$sql_connections = "CREATE TABLE $table_connections (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			name varchar(255) NOT NULL,
			service varchar(100) NOT NULL,
			auth_type varchar(50) NOT NULL,
			credentials longtext NOT NULL,
			status varchar(50) DEFAULT 'connected' NOT NULL,
			created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
			updated_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
			PRIMARY KEY  (id)
		) $charset_collate;";

		// Logs table
		$table_logs = $wpdb->prefix . 'zappress_logs';
		$sql_logs = "CREATE TABLE $table_logs (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			workflow_id bigint(20) NOT NULL,
			status varchar(50) NOT NULL,
			duration_ms bigint(20) DEFAULT 0 NOT NULL,
			context_snapshot longtext NOT NULL,
			request_response_data longtext NOT NULL,
			error_message text NOT NULL,
			created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
			PRIMARY KEY  (id),
			KEY workflow_id (workflow_id),
			KEY status (status)
		) $charset_collate;";

		// Retries table
		$table_retries = $wpdb->prefix . 'zappress_retries';
		$sql_retries = "CREATE TABLE $table_retries (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			log_id bigint(20) NOT NULL,
			workflow_id bigint(20) NOT NULL,
			attempt_count int(11) DEFAULT 0 NOT NULL,
			max_retries int(11) DEFAULT 3 NOT NULL,
			retry_interval varchar(50) DEFAULT '5m' NOT NULL,
			next_run datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
			execution_state longtext NOT NULL,
			status varchar(50) DEFAULT 'pending' NOT NULL,
			PRIMARY KEY  (id),
			KEY workflow_id (workflow_id),
			KEY status (status),
			KEY status_next_run (status, next_run)
		) $charset_collate;";

		dbDelta( $sql_workflows );
		dbDelta( $sql_connections );
		dbDelta( $sql_logs );
		dbDelta( $sql_retries );
	}
}
