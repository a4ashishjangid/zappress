<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Cron scheduler core manager
 */
class ZapPress_Scheduler {

	/**
	 * Hook scheduler actions.
	 */
	public static function init() {
		add_filter( 'cron_schedules', [ __CLASS__, 'add_cron_intervals' ] );
		add_action( 'zappress_scheduler_cron_event', [ __CLASS__, 'run_scheduler_jobs' ] );

		// Hook cron activation helper
		add_action( 'init', [ __CLASS__, 'schedule_heartbeat' ] );
	}

	/**
	 * Add custom intervals to WordPress schedules.
	 */
	public static function add_cron_intervals( $schedules ) {
		$schedules['zappress_minute'] = [
			'interval' => 60,
			'display'  => esc_html__( 'Every Minute (ZapPress)', 'zappress' ),
		];
		$schedules['zappress_5_minutes'] = [
			'interval' => 300,
			'display'  => esc_html__( 'Every 5 Minutes (ZapPress)', 'zappress' ),
		];
		return $schedules;
	}

	/**
	 * Register recurring event if not registered.
	 */
	public static function schedule_heartbeat() {
		if ( ! wp_next_scheduled( 'zappress_scheduler_cron_event' ) ) {
			wp_schedule_event( time(), 'zappress_minute', 'zappress_scheduler_cron_event' );
		}
	}

	/**
	 * Run due scheduler jobs.
	 */
	public static function run_scheduler_jobs() {
		$workflows = ZapPress_DB::get_active_workflows_by_trigger( 'scheduler' );
		if ( empty( $workflows ) ) {
			return;
		}

		$now = time();

		foreach ( $workflows as $w ) {
			$config = $w['trigger_config'];
			$interval = isset( $config['interval'] ) ? $config['interval'] : 'hourly';
			$cron_expr = isset( $config['cron_expression'] ) ? $config['cron_expression'] : '';
			
			$last_run = intval( get_option( 'zappress_workflow_last_run_' . $w['id'], 0 ) );
			$is_due = false;

			switch ( $interval ) {
				case 'every_minute':
					$is_due = ( $now - $last_run >= 58 );
					break;
				case 'every_5_minutes':
					$is_due = ( $now - $last_run >= 295 );
					break;
				case 'hourly':
					$is_due = ( $now - $last_run >= 3590 );
					break;
				case 'daily':
					$is_due = ( $now - $last_run >= 86350 );
					break;
				case 'weekly':
					$is_due = ( $now - $last_run >= 604750 );
					break;
				case 'monthly':
					$is_due = ( $now - $last_run >= 2591900 );
					break;
				case 'custom':
					if ( ! empty( $cron_expr ) ) {
						$is_due = self::is_cron_due( $cron_expr, $last_run );
					}
					break;
			}

			if ( $is_due ) {
				update_option( 'zappress_workflow_last_run_' . $w['id'], $now );
				// Context includes run timestamps
				$context = [
					'timestamp' => $now,
					'date'      => gmdate( 'Y-m-d H:i:s', $now ),
				];
				ZapPress_Engine::execute_workflow( $w['id'], $context );
			}
		}

		// Process pending retries
		self::process_pending_retries();
	}

	/**
	 * Process execution retries that are due.
	 */
	public static function process_pending_retries() {
		global $wpdb;
		$table_retries = $wpdb->prefix . 'zappress_retries';
		$now_mysql = current_time( 'mysql' );

		$retries = $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM $table_retries WHERE status = 'pending' AND next_run <= %s", $now_mysql ),
			ARRAY_A
		);

		foreach ( $retries as $r ) {
			$execution_state = json_decode( $r['execution_state'], true );
			$workflow_id = intval( $r['workflow_id'] );
			$attempt = intval( $r['attempt_count'] ) + 1;
			$max = intval( $r['max_retries'] );

			// Try resuming the workflow
			$success = ZapPress_Engine::resume_workflow( $workflow_id, $execution_state );

			if ( $success ) {
				$wpdb->update( $table_retries, [ 'status' => 'completed', 'attempt_count' => $attempt ], [ 'id' => $r['id'] ] );
			} else {
				if ( $attempt >= $max ) {
					$wpdb->update( $table_retries, [ 'status' => 'failed', 'attempt_count' => $attempt ], [ 'id' => $r['id'] ] );
					self::trigger_failure_notifications( $workflow_id, "Max retry limit reached ($max attempts)." );
				} else {
					$interval_str = $r['retry_interval'];
					$minutes = 5;
					if ( $interval_str === '1m' ) {
						$minutes = 1;
					} elseif ( $interval_str === '1h' ) {
						$minutes = 60;
					}

					$next_run = gmdate( 'Y-m-d H:i:s', time() + ( $minutes * 60 ) );
					$wpdb->update( $table_retries, [
						'attempt_count' => $attempt,
						'next_run'      => $next_run
					], [ 'id' => $r['id'] ] );
				}
			}
		}
	}

	/**
	 * Trigger email notifications on fatal workflow failures.
	 */
	public static function trigger_failure_notifications( $workflow_id, $reason ) {
		$workflow = ZapPress_DB::get_workflow( $workflow_id );
		$name = $workflow ? $workflow['name'] : 'Unknown Workflow';

		// Email notification
		if ( get_option( 'zappress_settings_notify_email', 'yes' ) === 'yes' ) {
			$to = get_option( 'admin_email' );
			$subject = sprintf( '[Alert] Workflow Execution Failed: %s', $name );
			$message = sprintf(
				'<p>The workflow <strong>%s</strong> (ID: %d) has reached the maximum retry limit and failed.</p><p>Reason: %s</p><p>Please inspect logs in the ZapPress dashboard.</p>',
				esc_html( $name ),
				$workflow_id,
				esc_html( $reason )
			);
			wp_mail( $to, $subject, $message, [ 'Content-Type: text/html; charset=UTF-8' ] );
		}

		// Webhook notification
		if ( get_option( 'zappress_settings_notify_webhook', 'no' ) === 'yes' ) {
			$webhook_url = get_option( 'zappress_settings_webhook_url', '' );
			if ( ! empty( $webhook_url ) ) {
				wp_remote_post( $webhook_url, [
					'headers'  => [ 'Content-Type' => 'application/json' ],
					'body'     => wp_json_encode( [
						'text' => sprintf( "🚨 [ZapPress Alert] Workflow execution failed for '%s' (ID: %d).\nReason: %s", $name, $workflow_id, $reason )
					] ),
					'blocking' => false,
				] );
			}
		}
	}

	/**
	 * Evaluate standard 5-part cron syntax matching.
	 */
	public static function is_cron_due( $cron_expression, $last_run_time ) {
		$now = time();
		// Throttle execution to once per minute
		if ( $now - $last_run_time < 59 ) {
			return false;
		}

		$parts = explode( ' ', trim( $cron_expression ) );
		if ( count( $parts ) < 5 ) {
			return false;
		}

		$min  = $parts[0];
		$hour = $parts[1];
		$dom  = $parts[2];
		$mon  = $parts[3];
		$dow  = $parts[4];

		$current_min  = intval( gmdate( 'i', $now ) );
		$current_hour = intval( gmdate( 'H', $now ) ); // 24-hour format
		$current_dom  = intval( gmdate( 'd', $now ) );
		$current_mon  = intval( gmdate( 'm', $now ) );
		$current_dow  = intval( gmdate( 'w', $now ) ); // 0 (Sunday) to 6 (Saturday)

		$match = function( $pattern, $current ) {
			if ( $pattern === '*' ) {
				return true;
			}
			if ( strpos( $pattern, '*/' ) === 0 ) {
				$step = intval( substr( $pattern, 2 ) );
				return $step > 0 && ( $current % $step ) === 0;
			}
			
			$list = explode( ',', $pattern );
			foreach ( $list as $part ) {
				if ( intval( $part ) === $current ) {
					return true;
				}
				if ( strpos( $part, '-' ) !== false ) {
					list( $start, $end ) = explode( '-', $part );
					if ( $current >= intval( $start ) && $current <= intval( $end ) ) {
						return true;
					}
				}
			}
			return false;
		};

		// Normalize DOW literals
		$dow_map = [ 'sun' => 0, 'mon' => 1, 'tue' => 2, 'wed' => 3, 'thu' => 4, 'fri' => 5, 'sat' => 6 ];
		$dow_lower = strtolower( $dow );
		if ( isset( $dow_map[ $dow_lower ] ) ) {
			$dow = $dow_map[ $dow_lower ];
		}

		return $match( $min, $current_min ) &&
			   $match( $hour, $current_hour ) &&
			   $match( $dom, $current_dom ) &&
			   $match( $mon, $current_mon ) &&
			   $match( $dow, $current_dow );
	}
}
