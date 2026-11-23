<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Database manager class for Custom Tables
 */
class ZapPress_DB {
	use ZapPress_Logger;

	/**
	 * Get workflows.
	 */
	public static function get_workflows() {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_workflows';
		$results = $wpdb->get_results( "SELECT * FROM $table ORDER BY id DESC", ARRAY_A );

		// Decode JSON columns
		foreach ( $results as &$row ) {
			$row['trigger_config'] = json_decode( $row['trigger_config'], true ) ?: [];
			$row['steps'] = json_decode( $row['steps'], true ) ?: [];
		}
		return $results;
	}

	/**
	 * Get workflow by ID.
	 */
	public static function get_workflow( $id ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_workflows';
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $id ), ARRAY_A );
		if ( $row ) {
			$row['trigger_config'] = json_decode( $row['trigger_config'], true ) ?: [];
			$row['steps'] = json_decode( $row['steps'], true ) ?: [];
		}
		return $row;
	}

	/**
	 * Get active workflows by trigger type.
	 */
	public static function get_active_workflows_by_trigger( $trigger_type ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_workflows';
		$results = $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM $table WHERE status = 'active' AND trigger_type = %s", $trigger_type ),
			ARRAY_A
		);
		foreach ( $results as &$row ) {
			$row['trigger_config'] = json_decode( $row['trigger_config'], true ) ?: [];
			$row['steps'] = json_decode( $row['steps'], true ) ?: [];
		}
		return $results;
	}

	/**
	 * Create workflow.
	 */
	public static function create_workflow( $data ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_workflows';

		$inserted = $wpdb->insert(
			$table,
			[
				'name'           => sanitize_text_field( $data['name'] ),
				'description'    => sanitize_textarea_field( isset( $data['description'] ) ? $data['description'] : '' ),
				'status'         => sanitize_text_field( isset( $data['status'] ) ? $data['status'] : 'paused' ),
				'trigger_type'   => sanitize_text_field( $data['trigger_type'] ),
				'trigger_config' => wp_json_encode( isset( $data['trigger_config'] ) ? $data['trigger_config'] : [] ),
				'steps'          => wp_json_encode( isset( $data['steps'] ) ? $data['steps'] : [] ),
				'created_at'     => current_time( 'mysql' ),
				'updated_at'     => current_time( 'mysql' ),
			]
		);

		return $inserted ? $wpdb->insert_id : false;
	}

	/**
	 * Update workflow.
	 */
	public static function update_workflow( $id, $data ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_workflows';

		$fields = [];
		if ( isset( $data['name'] ) ) {
			$fields['name'] = sanitize_text_field( $data['name'] );
		}
		if ( isset( $data['description'] ) ) {
			$fields['description'] = sanitize_textarea_field( $data['description'] );
		}
		if ( isset( $data['status'] ) ) {
			$fields['status'] = sanitize_text_field( $data['status'] );
		}
		if ( isset( $data['trigger_type'] ) ) {
			$fields['trigger_type'] = sanitize_text_field( $data['trigger_type'] );
		}
		if ( isset( $data['trigger_config'] ) ) {
			$fields['trigger_config'] = wp_json_encode( $data['trigger_config'] );
		}
		if ( isset( $data['steps'] ) ) {
			$fields['steps'] = wp_json_encode( $data['steps'] );
		}

		if ( empty( $fields ) ) {
			return false;
		}

		$fields['updated_at'] = current_time( 'mysql' );

		$updated = $wpdb->update( $table, $fields, [ 'id' => $id ] );
		return $updated !== false;
	}

	/**
	 * Delete workflow.
	 */
	public static function delete_workflow( $id ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_workflows';
		return $wpdb->delete( $table, [ 'id' => $id ] ) !== false;
	}

	/**
	 * Get connections.
	 */
	public static function get_connections() {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_connections';
		$results = $wpdb->get_results( "SELECT * FROM $table ORDER BY id DESC", ARRAY_A );

		foreach ( $results as &$row ) {
			$decrypted = ZapPress_Encryption::decrypt( $row['credentials'] );
			$row['credentials'] = json_decode( $decrypted, true ) ?: [];
		}
		return $results;
	}

	/**
	 * Get connection by ID.
	 */
	public static function get_connection( $id ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_connections';
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $id ), ARRAY_A );
		if ( $row ) {
			$decrypted = ZapPress_Encryption::decrypt( $row['credentials'] );
			$row['credentials'] = json_decode( $decrypted, true ) ?: [];
		}
		return $row;
	}

	/**
	 * Create connection.
	 */
	public static function create_connection( $data ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_connections';

		$creds_json = wp_json_encode( isset( $data['credentials'] ) ? $data['credentials'] : [] );
		$encrypted_creds = ZapPress_Encryption::encrypt( $creds_json );

		$inserted = $wpdb->insert(
			$table,
			[
				'name'        => sanitize_text_field( $data['name'] ),
				'service'     => sanitize_text_field( $data['service'] ),
				'auth_type'   => sanitize_text_field( $data['auth_type'] ),
				'credentials' => $encrypted_creds,
				'status'      => sanitize_text_field( isset( $data['status'] ) ? $data['status'] : 'connected' ),
				'created_at'  => current_time( 'mysql' ),
				'updated_at'  => current_time( 'mysql' ),
			]
		);

		return $inserted ? $wpdb->insert_id : false;
	}

	/**
	 * Update connection.
	 */
	public static function update_connection( $id, $data ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_connections';

		$fields = [];
		if ( isset( $data['name'] ) ) {
			$fields['name'] = sanitize_text_field( $data['name'] );
		}
		if ( isset( $data['service'] ) ) {
			$fields['service'] = sanitize_text_field( $data['service'] );
		}
		if ( isset( $data['auth_type'] ) ) {
			$fields['auth_type'] = sanitize_text_field( $data['auth_type'] );
		}
		if ( isset( $data['credentials'] ) ) {
			$creds_json = wp_json_encode( $data['credentials'] );
			$fields['credentials'] = ZapPress_Encryption::encrypt( $creds_json );
		}
		if ( isset( $data['status'] ) ) {
			$fields['status'] = sanitize_text_field( $data['status'] );
		}

		if ( empty( $fields ) ) {
			return false;
		}

		$fields['updated_at'] = current_time( 'mysql' );

		$updated = $wpdb->update( $table, $fields, [ 'id' => $id ] );
		return $updated !== false;
	}

	/**
	 * Delete connection.
	 */
	public static function delete_connection( $id ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_connections';
		return $wpdb->delete( $table, [ 'id' => $id ] ) !== false;
	}

	/**
	 * Create log entry.
	 */
	public static function create_log( $data ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_logs';

		$inserted = $wpdb->insert(
			$table,
			[
				'workflow_id'           => intval( $data['workflow_id'] ),
				'status'                => sanitize_text_field( $data['status'] ),
				'duration_ms'           => intval( isset( $data['duration_ms'] ) ? $data['duration_ms'] : 0 ),
				'context_snapshot'      => wp_json_encode( isset( $data['context_snapshot'] ) ? $data['context_snapshot'] : [] ),
				'request_response_data' => wp_json_encode( isset( $data['request_response_data'] ) ? $data['request_response_data'] : [] ),
				'error_message'         => sanitize_textarea_field( isset( $data['error_message'] ) ? $data['error_message'] : '' ),
				'created_at'            => current_time( 'mysql' ),
			]
		);

		// Also write to files in uploads directory using the Logger trait
		$workflow_id = intval( $data['workflow_id'] );
		self::write_file_log( $workflow_id, $data );

		return $inserted ? $wpdb->insert_id : false;
	}

	/**
	 * Fetch logs with filtering.
	 */
	public static function get_logs( $filters = [], $limit = 50, $offset = 0 ) {
		global $wpdb;
		$table_logs = $wpdb->prefix . 'zappress_logs';
		$table_workflows = $wpdb->prefix . 'zappress_workflows';

		$where = [ '1=1' ];
		$params = [];

		if ( ! empty( $filters['workflow_id'] ) ) {
			$where[] = 'l.workflow_id = %d';
			$params[] = intval( $filters['workflow_id'] );
		}
		if ( ! empty( $filters['status'] ) ) {
			$where[] = 'l.status = %s';
			$params[] = sanitize_text_field( $filters['status'] );
		}

		$where_str = implode( ' AND ', $where );
		$query = "SELECT l.*, w.name as workflow_name 
				  FROM $table_logs l 
				  LEFT JOIN $table_workflows w ON l.workflow_id = w.id 
				  WHERE $where_str 
				  ORDER BY l.id DESC 
				  LIMIT %d OFFSET %d";

		$params[] = intval( $limit );
		$params[] = intval( $offset );

		$results = $wpdb->get_results( $wpdb->prepare( $query, ...$params ), ARRAY_A );

		foreach ( $results as &$row ) {
			$row['context_snapshot'] = json_decode( $row['context_snapshot'], true ) ?: [];
			$row['request_response_data'] = json_decode( $row['request_response_data'], true ) ?: [];
		}

		return $results;
	}

	/**
	 * Get Workflow execution statistics.
	 */
	public static function get_workflow_stats() {
		global $wpdb;
		$table_workflows = $wpdb->prefix . 'zappress_workflows';
		$table_logs = $wpdb->prefix . 'zappress_logs';

		$workflows = $wpdb->get_results( "SELECT status, COUNT(*) as count FROM $table_workflows GROUP BY status", ARRAY_A );
		$logs = $wpdb->get_results( "SELECT status, COUNT(*) as count FROM $table_logs GROUP BY status", ARRAY_A );

		$stats = [
			'workflows' => [
				'total'  => 0,
				'active' => 0,
				'paused' => 0,
				'failed' => 0, // In standard dashboard, counts paused or logs failures
			],
			'executions' => [
				'success' => 0,
				'failed'  => 0,
			]
		];

		foreach ( $workflows as $w ) {
			if ( $w['status'] === 'active' ) {
				$stats['workflows']['active'] = intval( $w['count'] );
			} elseif ( $w['status'] === 'paused' ) {
				$stats['workflows']['paused'] = intval( $w['count'] );
			}
			$stats['workflows']['total'] += intval( $w['count'] );
		}

		foreach ( $logs as $l ) {
			if ( $l['status'] === 'success' ) {
				$stats['executions']['success'] = intval( $l['count'] );
			} elseif ( $l['status'] === 'failed' ) {
				$stats['executions']['failed'] = intval( $l['count'] );
			}
		}

		return $stats;
	}

	/**
	 * Get active workflow matching exact webhook token via targeted SQL query.
	 *
	 * @param string $token Incoming webhook secret token.
	 * @return array|null Matched workflow record or null.
	 */
	public static function get_active_workflow_by_webhook_token( $token ) {
		global $wpdb;
		$table = $wpdb->prefix . 'zappress_workflows';
		$token_clean = sanitize_text_field( $token );
		if ( empty( $token_clean ) ) {
			return null;
		}

		$token_like = '%' . $wpdb->esc_like( $token_clean ) . '%';
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM $table WHERE status = 'active' AND trigger_type = 'webhook' AND trigger_config LIKE %s",
				$token_like
			),
			ARRAY_A
		);

		if ( ! empty( $rows ) ) {
			foreach ( $rows as $row ) {
				$config = json_decode( $row['trigger_config'], true );
				if ( is_array( $config ) && isset( $config['webhook_token'] ) ) {
					// Strict constant-time string comparison for exact token match
					if ( hash_equals( (string) $config['webhook_token'], (string) $token_clean ) ) {
						$row['trigger_config'] = $config;
						$row['steps'] = json_decode( $row['steps'], true ) ?: [];
						return $row;
					}
				}
			}
		}

		return null;
	}

	/**
	 * Purge execution logs older than a retention threshold (default 30 days).
	 *
	 * @param int $days Number of days to retain logs.
	 * @return int|false Number of deleted rows.
	 */
	public static function purge_expired_logs( $days = 30 ) {
		global $wpdb;
		$table_logs = $wpdb->prefix . 'zappress_logs';
		$days = max( 1, intval( $days ) );
		$cutoff_mysql = gmdate( 'Y-m-d H:i:s', time() - ( $days * DAY_IN_SECONDS ) );

		return $wpdb->query(
			$wpdb->prepare( "DELETE FROM $table_logs WHERE created_at < %s", $cutoff_mysql )
		);
	}
}
