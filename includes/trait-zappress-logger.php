<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Trait for managing log file actions.
 *
 * @since 1.0.0
 */
trait ZapPress_Logger {

	/**
	 * Write a log entry payload directly to a flat file.
	 * Disabled by default to protect sensitive runtime telemetry from unauthenticated access.
	 *
	 * @param int   $workflow_id Workflow ID.
	 * @param array $data        Log context details.
	 */
	public static function write_file_log( $workflow_id, $data ) {
		// Flat-file logging is disabled by default; database logging in wp_zappress_logs is used
		if ( ! apply_filters( 'zappress_enable_file_logging', false ) ) {
			return;
		}

		$upload_dir = wp_upload_dir();
		if ( ! empty( $upload_dir['error'] ) ) {
			return;
		}

		$zappress_logs_dir = $upload_dir['basedir'] . '/zappress-logs';
		$workflow_dir      = $zappress_logs_dir . '/workflow-' . $workflow_id;

		// Create main logs directory if it does not exist
		if ( ! file_exists( $zappress_logs_dir ) ) {
			wp_mkdir_p( $zappress_logs_dir );
			file_put_contents( $zappress_logs_dir . '/index.php', '<?php // Silence is golden' );
			file_put_contents( $zappress_logs_dir . '/.htaccess', "Deny from all\n" );
		}

		// Create workflow specific directory
		if ( ! file_exists( $workflow_dir ) ) {
			wp_mkdir_p( $workflow_dir );
			file_put_contents( $workflow_dir . '/index.php', '<?php // Silence is golden' );
		}

		// Date-specific log file (e.g., 2026-06-12.log)
		$date_str = gmdate( 'Y-m-d' );
		$log_file = $workflow_dir . '/' . $date_str . '.log';

		// Build log line payload
		$log_line = wp_json_encode( [
			'timestamp'             => current_time( 'mysql' ),
			'status'                => sanitize_text_field( $data['status'] ),
			'duration_ms'           => intval( isset( $data['duration_ms'] ) ? $data['duration_ms'] : 0 ),
			'error_message'         => sanitize_textarea_field( isset( $data['error_message'] ) ? $data['error_message'] : '' ),
			'context_snapshot'      => isset( $data['context_snapshot'] ) ? $data['context_snapshot'] : [],
			'request_response_data' => isset( $data['request_response_data'] ) ? $data['request_response_data'] : [],
		] ) . "\n";

		// Append log entry to the file
		file_put_contents( $log_file, $log_line, FILE_APPEND | LOCK_EX );
	}

	/**
	 * Securely clean up legacy public log files.
	 */
	public static function cleanup_legacy_log_files() {
		$upload_dir = wp_upload_dir();
		if ( empty( $upload_dir['error'] ) ) {
			$zappress_logs_dir = $upload_dir['basedir'] . '/zappress-logs';
			if ( file_exists( $zappress_logs_dir ) ) {
				self::delete_directory( $zappress_logs_dir );
			}
		}
	}

	/**
	 * Recursively delete directory helper.
	 */
	public static function delete_directory( $dir ) {
		if ( ! file_exists( $dir ) ) {
			return;
		}
		$files = array_diff( scandir( $dir ), [ '.', '..' ] );
		foreach ( $files as $file ) {
			if ( is_dir( "$dir/$file" ) ) {
				self::delete_directory( "$dir/$file" );
			} else {
				@unlink( "$dir/$file" );
			}
		}
		return @rmdir( $dir );
	}
}
