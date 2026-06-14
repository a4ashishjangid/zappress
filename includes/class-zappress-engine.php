<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Workflow execution engine core class
 */
class ZapPress_Engine {

	/**
	 * Run a workflow by ID.
	 */
	public static function execute_workflow( $workflow_id, $initial_context = [] ) {
		$start_time = microtime( true );

		$workflow = ZapPress_DB::get_workflow( $workflow_id );
		if ( ! $workflow ) {
			return false;
		}

		// Fetch all secure connections
		$connections_list = ZapPress_DB::get_connections();
		$connections_context = [];
		foreach ( $connections_list as $conn ) {
			$conn_slug = strtolower( str_replace( ' ', '_', $conn['name'] ) );
			$conn_service = strtolower( $conn['service'] );
			
			$creds = isset( $conn['credentials'] ) ? $conn['credentials'] : [];
			
			// Flat-map custom headers to make them easily accessible in placeholders
			if ( $conn['auth_type'] === 'custom' && isset( $creds['headers'] ) && is_array( $creds['headers'] ) ) {
				foreach ( $creds['headers'] as $header ) {
					if ( ! empty( $header['key'] ) ) {
						$header_slug = strtolower( str_replace( '-', '_', $header['key'] ) );
						$creds[ $header_slug ] = $header['value'];
					}
				}
			}
			
			// Map connection credentials directly under name slug and service type
			$connections_context[ $conn_slug ] = $creds;
			$connections_context[ $conn_service ] = $creds;
		}

		// Prepare initial context
		$context = [
			'site' => [
				'name' => get_bloginfo( 'name' ),
				'url'  => get_bloginfo( 'url' ),
			],
			'connections' => $connections_context,
			'credentials' => $connections_context,
			'trigger'     => $initial_context
		];

		$steps = isset( $workflow['steps'] ) ? $workflow['steps'] : [];
		$status = 'success';
		$error_message = '';
		$step_logs = [];

		foreach ( $steps as $index => $step ) {
			$step_id = isset( $step['id'] ) ? $step['id'] : 'step_' . $index;
			$step_type = isset( $step['type'] ) ? $step['type'] : '';
			$step_config = isset( $step['config'] ) ? $step['config'] : [];

			// Resolve variables in step config recursively
			$resolved_config = self::resolve_config_variables( $step_config, $context );

			// Process by type
			switch ( $step_type ) {
				case 'response_mapping':
					$source_val = isset( $resolved_config['source_value'] ) ? $resolved_config['source_value'] : '';
					$dest_type = isset( $resolved_config['destination_type'] ) ? $resolved_config['destination_type'] : 'user_meta';
					$dest_key = isset( $resolved_config['destination_key'] ) ? $resolved_config['destination_key'] : '';
					$target_id = intval( isset( $resolved_config['target_id'] ) ? $resolved_config['target_id'] : 0 );

					if ( ! $target_id && isset( $context['trigger']['user_id'] ) ) {
						$target_id = intval( $context['trigger']['user_id'] );
					}
					if ( ! $target_id && isset( $context['trigger']['post_id'] ) ) {
						$target_id = intval( $context['trigger']['post_id'] );
					}

					$success = false;
					if ( $target_id && $dest_key ) {
						if ( $dest_type === 'user_meta' ) {
							$meta_updated = update_user_meta( $target_id, $dest_key, $source_val );
							$success = $meta_updated !== false;
						} elseif ( $dest_type === 'post_meta' ) {
							$meta_updated = update_post_meta( $target_id, $dest_key, $source_val );
							$success = $meta_updated !== false;
						} elseif ( $dest_type === 'acf' ) {
							if ( function_exists( 'update_field' ) ) {
								$selector = ( isset( $context['trigger']['user_id'] ) && $target_id === intval( $context['trigger']['user_id'] ) ) ? 'user_' . $target_id : $target_id;
								$success = update_field( $dest_key, $source_val, $selector );
							} else {
								$meta_updated = update_post_meta( $target_id, $dest_key, $source_val );
								$success = $meta_updated !== false;
							}
						}
					}

					$step_logs[] = [
						'step'             => $step_id,
						'type'             => 'response_mapping',
						'status'           => $success ? 'success' : 'failed',
						'destination_type' => $dest_type,
						'destination_key'  => $dest_key,
						'target_id'        => $target_id,
						'value'            => $source_val
					];
					
					if ( ! $success ) {
						$status = 'failed';
						$error_message = 'Response Mapping Failed for key: ' . $dest_key;
						break 2;
					}
					break;

				case 'condition':
					$passed = self::evaluate_condition( $resolved_config, $context );
					$step_logs[] = [
						'step'   => $step_id,
						'type'   => 'condition',
						'status' => $passed ? 'passed' : 'failed',
						'config' => $resolved_config
					];
					if ( ! $passed ) {
						// Conditions failed -> Halt execution (this is normal termination)
						$status = 'success';
						break 2;
					}
					break;

				case 'api_call':
					// Fetch and dynamically inject connection credentials if connection_id is set
					$connection_id = isset( $resolved_config['connection_id'] ) ? intval( $resolved_config['connection_id'] ) : 0;
					if ( $connection_id ) {
						$conn = ZapPress_DB::get_connection( $connection_id );
						if ( $conn && ! empty( $conn['credentials'] ) ) {
							$creds = $conn['credentials'];
							$auth_type = $conn['auth_type'];
							
							if ( ! isset( $resolved_config['headers'] ) || ! is_array( $resolved_config['headers'] ) ) {
								$resolved_config['headers'] = [];
							}
							
							if ( $auth_type === 'bearer' && ! empty( $creds['token'] ) ) {
								$resolved_config['headers'][] = [
									'key'   => 'Authorization',
									'value' => 'Bearer ' . $creds['token']
								];
							} elseif ( $auth_type === 'apikey' && ! empty( $creds['api_key'] ) ) {
								$resolved_config['url'] = add_query_arg( 'api_key', $creds['api_key'], $resolved_config['url'] );
							} elseif ( $auth_type === 'basic' && ! empty( $creds['username'] ) ) {
								$auth_str = base64_encode( $creds['username'] . ':' . ( isset( $creds['password'] ) ? $creds['password'] : '' ) );
								$resolved_config['headers'][] = [
									'key'   => 'Authorization',
									'value' => 'Basic ' . $auth_str
								];
							} elseif ( $auth_type === 'custom' && isset( $creds['headers'] ) && is_array( $creds['headers'] ) ) {
								foreach ( $creds['headers'] as $c_header ) {
									if ( ! empty( $c_header['key'] ) ) {
										$resolved_config['headers'][] = [
											'key'   => $c_header['key'],
											'value' => $c_header['value']
										];
									}
								}
							}
						}
					}

					$response = ZapPress_API_Action::execute( $resolved_config );
					$step_logs[] = [
						'step'     => $step_id,
						'type'     => 'api_call',
						'status'   => $response['success'] ? 'success' : 'failed',
						'request'  => $response['request'],
						'response' => $response['response'],
						'error'    => $response['error']
					];

					if ( ! $response['success'] ) {
						$status = 'failed';
						$error_message = 'API Call Failed: ' . $response['error'];
						self::schedule_step_retry( $workflow_id, $index, $context );
						break 2;
					}

					// Inject response into context for future steps
					$context['steps'][ $step_id ] = $response['data'];
					break;

				case 'openai_ai_action':
					$response = ZapPress_AI_Actions::execute( $resolved_config );
					$step_logs[] = [
						'step'     => $step_id,
						'type'     => 'openai_ai_action',
						'status'   => $response['success'] ? 'success' : 'failed',
						'prompt'   => isset( $resolved_config['prompt'] ) ? $resolved_config['prompt'] : '',
						'task'     => isset( $resolved_config['ai_task'] ) ? $resolved_config['ai_task'] : 'summary',
						'error'    => isset( $response['error'] ) ? $response['error'] : ''
					];

					if ( ! $response['success'] ) {
						$status = 'failed';
						$error_message = 'OpenAI AI Action Failed: ' . $response['error'];
						self::schedule_step_retry( $workflow_id, $index, $context );
						break 2;
					}

					$context['steps'][ $step_id ] = $response['data'];
					break;

				case 'send_email':
					$to = isset( $resolved_config['to'] ) ? $resolved_config['to'] : get_option( 'admin_email' );
					$subject = isset( $resolved_config['subject'] ) ? $resolved_config['subject'] : 'Notification';
					$message = isset( $resolved_config['message'] ) ? $resolved_config['message'] : '';
					
					$sent = wp_mail( $to, $subject, $message, [ 'Content-Type: text/html; charset=UTF-8' ] );
					$step_logs[] = [
						'step'   => $step_id,
						'type'   => 'send_email',
						'status' => $sent ? 'success' : 'failed',
						'to'     => $to,
						'subject'=> $subject
					];
					if ( ! $sent ) {
						$status = 'failed';
						$error_message = 'Failed to send email to ' . $to;
						break 2;
					}
					break;

				case 'create_post':
					$post_title = isset( $resolved_config['title'] ) ? $resolved_config['title'] : '';
					$post_content = isset( $resolved_config['content'] ) ? $resolved_config['content'] : '';
					$post_type = isset( $resolved_config['post_type'] ) ? $resolved_config['post_type'] : 'post';
					$post_status = isset( $resolved_config['post_status'] ) ? $resolved_config['post_status'] : 'draft';

					$post_id = wp_insert_post( [
						'post_title'   => $post_title,
						'post_content' => $post_content,
						'post_type'    => $post_type,
						'post_status'  => $post_status,
					] );

					$success = ! is_wp_error( $post_id ) && $post_id > 0;
					$step_logs[] = [
						'step'    => $step_id,
						'type'    => 'create_post',
						'status'  => $success ? 'success' : 'failed',
						'post_id' => $success ? $post_id : null,
						'error'   => is_wp_error( $post_id ) ? $post_id->get_error_message() : ''
					];

					if ( ! $success ) {
						$status = 'failed';
						$error_message = is_wp_error( $post_id ) ? $post_id->get_error_message() : 'Failed to create post';
						break 2;
					}

					$context['steps'][ $step_id ] = [ 'post_id' => $post_id ];
					break;

				default:
					$step_logs[] = [
						'step'   => $step_id,
						'type'   => $step_type,
						'status' => 'ignored',
						'error'  => 'Unknown action step type'
					];
					break;
			}
		}

		$duration = round( ( microtime( true ) - $start_time ) * 1000 );

		// Save Execution Log
		ZapPress_DB::create_log( [
			'workflow_id'           => $workflow_id,
			'status'                => $status,
			'duration_ms'           => $duration,
			'context_snapshot'      => $context,
			'request_response_data' => $step_logs,
			'error_message'         => $error_message,
		] );

		return $status === 'success';
	}

	/**
	 * Evaluate condition configuration.
	 */
	public static function evaluate_condition( $config, $context ) {
		$field_value = isset( $config['field_value'] ) ? $config['field_value'] : '';
		$operator = isset( $config['operator'] ) ? $config['operator'] : 'equals';
		$compare_value = isset( $config['compare_value'] ) ? $config['compare_value'] : '';

		switch ( $operator ) {
			case 'equals':
				return strval( $field_value ) === strval( $compare_value );
			case 'not_equals':
				return strval( $field_value ) !== strval( $compare_value );
			case 'contains':
				return stripos( strval( $field_value ), strval( $compare_value ) ) !== false;
			case 'starts_with':
				return strpos( strval( $field_value ), strval( $compare_value ) ) === 0;
			case 'ends_with':
				$len = strlen( $compare_value );
				if ( $len === 0 ) {
					return true;
				}
				return substr( strval( $field_value ), -$len ) === strval( $compare_value );
			case 'greater_than':
				return floatval( $field_value ) > floatval( $compare_value );
			case 'less_than':
				return floatval( $field_value ) < floatval( $compare_value );
			case 'empty':
				return empty( $field_value );
			case 'not_empty':
				return ! empty( $field_value );
			default:
				return false;
		}
	}

	/**
	 * Resolve variables in config array/string recursively.
	 */
	public static function resolve_config_variables( $config, $context ) {
		if ( is_string( $config ) ) {
			return self::resolve_variables( $config, $context );
		} elseif ( is_array( $config ) ) {
			foreach ( $config as $key => $val ) {
				$config[ $key ] = self::resolve_config_variables( $val, $context );
			}
		}
		return $config;
	}

	/**
	 * Resolve dynamic curly brace tags with context dot-notation paths.
	 */
	public static function resolve_variables( $string, $context ) {
		return preg_replace_callback( '/\{\{([^}]+)\}\}/', function( $matches ) use ( $context ) {
			$path = explode( '.', trim( $matches[1] ) );
			$value = $context;
			foreach ( $path as $key ) {
				if ( is_array( $value ) && isset( $value[ $key ] ) ) {
					$value = $value[ $key ];
				} elseif ( is_object( $value ) && isset( $value->$key ) ) {
					$value = $value->$key;
				} else {
					return ''; // Return empty string if key not found
				}
			}
			return is_string( $value ) || is_numeric( $value ) ? $value : wp_json_encode( $value );
		}, $string );
	}

	/**
	 * Schedule retry record in custom retries table.
	 */
	public static function schedule_step_retry( $workflow_id, $next_step_index, $context ) {
		global $wpdb;
		$table_retries = $wpdb->prefix . 'zappress_retries';

		$interval = get_option( 'zappress_settings_retry_interval', '5m' );
		$max_retries = intval( get_option( 'zappress_settings_max_retries', 3 ) );

		$minutes = 5;
		if ( $interval === '1m' ) {
			$minutes = 1;
		} elseif ( $interval === '1h' ) {
			$minutes = 60;
		}

		$next_run = gmdate( 'Y-m-d H:i:s', time() + ( $minutes * 60 ) );

		// Record the index to resume from in state snapshot
		$context['next_step_index'] = $next_step_index;

		$wpdb->insert(
			$table_retries,
			[
				'log_id'          => 0,
				'workflow_id'     => $workflow_id,
				'attempt_count'   => 0,
				'max_retries'     => $max_retries,
				'retry_interval'  => $interval,
				'next_run'        => $next_run,
				'execution_state' => wp_json_encode( $context ),
				'status'          => 'pending'
			]
		);
	}

	/**
	 * Resume a partially executed workflow from a context snapshot.
	 */
	public static function resume_workflow( $workflow_id, $state ) {
		$start_time = microtime( true );
		$workflow = ZapPress_DB::get_workflow( $workflow_id );
		if ( ! $workflow ) {
			return false;
		}

		$steps = isset( $workflow['steps'] ) ? $workflow['steps'] : [];
		$start_index = isset( $state['next_step_index'] ) ? intval( $state['next_step_index'] ) : 0;

		$context = $state;
		unset( $context['next_step_index'] );

		if ( empty( $context['connections'] ) ) {
			$connections_list = ZapPress_DB::get_connections();
			$connections_context = [];
			foreach ( $connections_list as $conn ) {
				$conn_slug = strtolower( str_replace( ' ', '_', $conn['name'] ) );
				$conn_service = strtolower( $conn['service'] );
				
				$creds = isset( $conn['credentials'] ) ? $conn['credentials'] : [];
				
				// Flat-map custom headers to make them easily accessible in placeholders
				if ( $conn['auth_type'] === 'custom' && isset( $creds['headers'] ) && is_array( $creds['headers'] ) ) {
					foreach ( $creds['headers'] as $header ) {
						if ( ! empty( $header['key'] ) ) {
							$header_slug = strtolower( str_replace( '-', '_', $header['key'] ) );
							$creds[ $header_slug ] = $header['value'];
						}
					}
				}
				
				// Map connection credentials directly under name slug and service type
				$connections_context[ $conn_slug ] = $creds;
				$connections_context[ $conn_service ] = $creds;
			}
			$context['connections'] = $connections_context;
			$context['credentials'] = $connections_context;
		}

		$status = 'success';
		$error_message = '';
		$step_logs = [];

		for ( $index = $start_index; $index < count( $steps ); $index++ ) {
			$step = $steps[ $index ];
			$step_id = isset( $step['id'] ) ? $step['id'] : 'step_' . $index;
			$step_type = isset( $step['type'] ) ? $step['type'] : '';
			$step_config = isset( $step['config'] ) ? $step['config'] : [];

			$resolved_config = self::resolve_config_variables( $step_config, $context );

			switch ( $step_type ) {
				case 'response_mapping':
					$source_val = isset( $resolved_config['source_value'] ) ? $resolved_config['source_value'] : '';
					$dest_type = isset( $resolved_config['destination_type'] ) ? $resolved_config['destination_type'] : 'user_meta';
					$dest_key = isset( $resolved_config['destination_key'] ) ? $resolved_config['destination_key'] : '';
					$target_id = intval( isset( $resolved_config['target_id'] ) ? $resolved_config['target_id'] : 0 );

					if ( ! $target_id && isset( $context['trigger']['user_id'] ) ) {
						$target_id = intval( $context['trigger']['user_id'] );
					}
					if ( ! $target_id && isset( $context['trigger']['post_id'] ) ) {
						$target_id = intval( $context['trigger']['post_id'] );
					}

					$success = false;
					if ( $target_id && $dest_key ) {
						if ( $dest_type === 'user_meta' ) {
							$meta_updated = update_user_meta( $target_id, $dest_key, $source_val );
							$success = $meta_updated !== false;
						} elseif ( $dest_type === 'post_meta' ) {
							$meta_updated = update_post_meta( $target_id, $dest_key, $source_val );
							$success = $meta_updated !== false;
						} elseif ( $dest_type === 'acf' ) {
							if ( function_exists( 'update_field' ) ) {
								$selector = ( isset( $context['trigger']['user_id'] ) && $target_id === intval( $context['trigger']['user_id'] ) ) ? 'user_' . $target_id : $target_id;
								$success = update_field( $dest_key, $source_val, $selector );
							} else {
								$meta_updated = update_post_meta( $target_id, $dest_key, $source_val );
								$success = $meta_updated !== false;
							}
						}
					}

					$step_logs[] = [
						'step'             => $step_id,
						'type'             => 'response_mapping',
						'status'           => $success ? 'success' : 'failed',
						'destination_type' => $dest_type,
						'destination_key'  => $dest_key,
						'target_id'        => $target_id,
						'value'            => $source_val
					];
					
					if ( ! $success ) {
						$status = 'failed';
						$error_message = 'Response Mapping Failed for key: ' . $dest_key;
						break 2;
					}
					break;

				case 'condition':
					$passed = self::evaluate_condition( $resolved_config, $context );
					$step_logs[] = [
						'step'   => $step_id,
						'type'   => 'condition',
						'status' => $passed ? 'passed' : 'failed',
						'config' => $resolved_config
					];
					if ( ! $passed ) {
						$status = 'success';
						break 2;
					}
					break;

				case 'api_call':
					// Fetch and dynamically inject connection credentials if connection_id is set
					$connection_id = isset( $resolved_config['connection_id'] ) ? intval( $resolved_config['connection_id'] ) : 0;
					if ( $connection_id ) {
						$conn = ZapPress_DB::get_connection( $connection_id );
						if ( $conn && ! empty( $conn['credentials'] ) ) {
							$creds = $conn['credentials'];
							$auth_type = $conn['auth_type'];
							
							if ( ! isset( $resolved_config['headers'] ) || ! is_array( $resolved_config['headers'] ) ) {
								$resolved_config['headers'] = [];
							}
							
							if ( $auth_type === 'bearer' && ! empty( $creds['token'] ) ) {
								$resolved_config['headers'][] = [
									'key'   => 'Authorization',
									'value' => 'Bearer ' . $creds['token']
								];
							} elseif ( $auth_type === 'apikey' && ! empty( $creds['api_key'] ) ) {
								$resolved_config['url'] = add_query_arg( 'api_key', $creds['api_key'], $resolved_config['url'] );
							} elseif ( $auth_type === 'basic' && ! empty( $creds['username'] ) ) {
								$auth_str = base64_encode( $creds['username'] . ':' . ( isset( $creds['password'] ) ? $creds['password'] : '' ) );
								$resolved_config['headers'][] = [
									'key'   => 'Authorization',
									'value' => 'Basic ' . $auth_str
								];
							} elseif ( $auth_type === 'custom' && isset( $creds['headers'] ) && is_array( $creds['headers'] ) ) {
								foreach ( $creds['headers'] as $c_header ) {
									if ( ! empty( $c_header['key'] ) ) {
										$resolved_config['headers'][] = [
											'key'   => $c_header['key'],
											'value' => $c_header['value']
										];
									}
								}
							}
						}
					}

					$response = ZapPress_API_Action::execute( $resolved_config );
					$step_logs[] = [
						'step'     => $step_id,
						'type'     => 'api_call',
						'status'   => $response['success'] ? 'success' : 'failed',
						'request'  => $response['request'],
						'response' => $response['response'],
						'error'    => $response['error']
					];

					if ( ! $response['success'] ) {
						$status = 'failed';
						$error_message = 'API Call Failed: ' . $response['error'];
						self::schedule_step_retry( $workflow_id, $index, $context );
						break 2;
					}

					$context['steps'][ $step_id ] = $response['data'];
					break;

				case 'openai_ai_action':
					$response = ZapPress_AI_Actions::execute( $resolved_config );
					$step_logs[] = [
						'step'     => $step_id,
						'type'     => 'openai_ai_action',
						'status'   => $response['success'] ? 'success' : 'failed',
						'prompt'   => isset( $resolved_config['prompt'] ) ? $resolved_config['prompt'] : '',
						'task'     => isset( $resolved_config['ai_task'] ) ? $resolved_config['ai_task'] : 'summary',
						'error'    => isset( $response['error'] ) ? $response['error'] : ''
					];

					if ( ! $response['success'] ) {
						$status = 'failed';
						$error_message = 'OpenAI AI Action Failed: ' . $response['error'];
						self::schedule_step_retry( $workflow_id, $index, $context );
						break 2;
					}

					$context['steps'][ $step_id ] = $response['data'];
					break;

				case 'send_email':
					$to = isset( $resolved_config['to'] ) ? $resolved_config['to'] : get_option( 'admin_email' );
					$subject = isset( $resolved_config['subject'] ) ? $resolved_config['subject'] : 'Notification';
					$message = isset( $resolved_config['message'] ) ? $resolved_config['message'] : '';
					
					$sent = wp_mail( $to, $subject, $message, [ 'Content-Type: text/html; charset=UTF-8' ] );
					$step_logs[] = [
						'step'   => $step_id,
						'type'   => 'send_email',
						'status' => $sent ? 'success' : 'failed',
						'to'     => $to,
						'subject'=> $subject
					];
					if ( ! $sent ) {
						$status = 'failed';
						$error_message = 'Failed to send email to ' . $to;
						break 2;
					}
					break;

				case 'create_post':
					$post_title = isset( $resolved_config['title'] ) ? $resolved_config['title'] : '';
					$post_content = isset( $resolved_config['content'] ) ? $resolved_config['content'] : '';
					$post_type = isset( $resolved_config['post_type'] ) ? $resolved_config['post_type'] : 'post';
					$post_status = isset( $resolved_config['post_status'] ) ? $resolved_config['post_status'] : 'draft';

					$post_id = wp_insert_post( [
						'post_title'   => $post_title,
						'post_content' => $post_content,
						'post_type'    => $post_type,
						'post_status'  => $post_status,
					] );

					$success = ! is_wp_error( $post_id ) && $post_id > 0;
					$step_logs[] = [
						'step'    => $step_id,
						'type'    => 'create_post',
						'status'  => $success ? 'success' : 'failed',
						'post_id' => $success ? $post_id : null,
						'error'   => is_wp_error( $post_id ) ? $post_id->get_error_message() : ''
					];

					if ( ! $success ) {
						$status = 'failed';
						$error_message = is_wp_error( $post_id ) ? $post_id->get_error_message() : 'Failed to create post';
						break 2;
					}

					$context['steps'][ $step_id ] = [ 'post_id' => $post_id ];
					break;
			}
		}

		$duration = round( ( microtime( true ) - $start_time ) * 1000 );

		ZapPress_DB::create_log( [
			'workflow_id'           => $workflow_id,
			'status'                => $status,
			'duration_ms'           => $duration,
			'context_snapshot'      => $context,
			'request_response_data' => $step_logs,
			'error_message'         => $error_message,
		] );

		return $status === 'success';
	}
}
