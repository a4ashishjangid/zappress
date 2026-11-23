<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * REST API Controller for React admin page
 */
class ZapPress_API extends WP_REST_Controller {

	private static $instance = null;

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->namespace = 'zappress/v1';
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
	}

	/**
	 * Register routes.
	 */
	public function register_routes() {
		// Workflows
		register_rest_route( $this->namespace, '/workflows', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_workflows' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'create_workflow' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
		] );

		register_rest_route( $this->namespace, '/workflows/(?P<id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_workflow' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
			[
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => [ $this, 'update_workflow' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
			[
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'delete_workflow' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
		] );

		// Connections
		register_rest_route( $this->namespace, '/connections', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_connections' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'create_connection' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
		] );

		register_rest_route( $this->namespace, '/connections/(?P<id>\d+)', [
			[
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => [ $this, 'update_connection' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
			[
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'delete_connection' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
		] );

		// Logs
		register_rest_route( $this->namespace, '/logs', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_logs' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			]
		] );

		// Stats
		register_rest_route( $this->namespace, '/stats', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_stats' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			]
		] );

		// API Tester
		register_rest_route( $this->namespace, '/api/test', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'test_api_call' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			]
		] );

		// Templates
		register_rest_route( $this->namespace, '/templates', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_templates' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			]
		] );

		// Settings
		register_rest_route( $this->namespace, '/settings', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_settings' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'update_settings' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			],
		] );

		// Webhook Token Generator (Secure Server-Side Token Generation)
		register_rest_route( $this->namespace, '/webhook/generate-token', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'generate_webhook_token' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			]
		] );

		// Webhook Receiver (Public Access)
		register_rest_route( $this->namespace, '/webhook/(?P<token>[a-zA-Z0-9_-]+)', [
			[
				'methods'             => WP_REST_Server::ALLMETHODS,
				'callback'            => [ $this, 'handle_webhook' ],
				'permission_callback' => '__return_true',
			]
		] );
	}

	/**
	 * Permission check callback.
	 */
	public function permissions_check( $request ) {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Get Workflows list.
	 */
	public function get_workflows( $request ) {
		$workflows = ZapPress_DB::get_workflows();
		return new WP_REST_Response( $workflows, 200 );
	}

	/**
	 * Get single workflow.
	 */
	public function get_workflow( $request ) {
		$id = intval( $request['id'] );
		$workflow = ZapPress_DB::get_workflow( $id );
		if ( ! $workflow ) {
			return new WP_Error( 'not_found', 'Workflow not found', [ 'status' => 404 ] );
		}
		return new WP_REST_Response( $workflow, 200 );
	}

	/**
	 * Create workflow.
	 */
	public function create_workflow( $request ) {
		$params = $request->get_json_params();
		if ( empty( $params['name'] ) || empty( $params['trigger_type'] ) ) {
			return new WP_Error( 'missing_fields', 'Name and Trigger Type are required', [ 'status' => 400 ] );
		}

		// Ensure cryptographically secure token and uniqueness for webhook triggers
		if ( $params['trigger_type'] === 'webhook' ) {
			if ( ! isset( $params['trigger_config'] ) || ! is_array( $params['trigger_config'] ) ) {
				$params['trigger_config'] = [];
			}
			if ( empty( $params['trigger_config']['webhook_token'] ) ) {
				$params['trigger_config']['webhook_token'] = wp_generate_password( 32, false, false );
			} else {
				$token = sanitize_text_field( $params['trigger_config']['webhook_token'] );
				$existing = ZapPress_DB::get_active_workflow_by_webhook_token( $token );
				if ( $existing ) {
					return new WP_Error( 'duplicate_token', 'Webhook token is already in use by another workflow.', [ 'status' => 400 ] );
				}
			}
		}

		$workflow_id = ZapPress_DB::create_workflow( $params );
		if ( ! $workflow_id ) {
			return new WP_Error( 'db_error', 'Failed to create workflow', [ 'status' => 500 ] );
		}

		return new WP_REST_Response( [ 'id' => $workflow_id, 'message' => 'Workflow created successfully' ], 201 );
	}

	/**
	 * Update workflow.
	 */
	public function update_workflow( $request ) {
		$id = intval( $request['id'] );
		$params = $request->get_json_params();

		$workflow = ZapPress_DB::get_workflow( $id );
		if ( ! $workflow ) {
			return new WP_Error( 'not_found', 'Workflow not found', [ 'status' => 404 ] );
		}

		// Validate webhook token uniqueness on update
		$trigger_type = isset( $params['trigger_type'] ) ? $params['trigger_type'] : $workflow['trigger_type'];
		if ( $trigger_type === 'webhook' && isset( $params['trigger_config']['webhook_token'] ) ) {
			$token = sanitize_text_field( $params['trigger_config']['webhook_token'] );
			if ( ! empty( $token ) ) {
				$existing = ZapPress_DB::get_active_workflow_by_webhook_token( $token );
				if ( $existing && intval( $existing['id'] ) !== $id ) {
					return new WP_Error( 'duplicate_token', 'Webhook token is already in use by another workflow.', [ 'status' => 400 ] );
				}
			} else {
				$params['trigger_config']['webhook_token'] = wp_generate_password( 32, false, false );
			}
		}

		$updated = ZapPress_DB::update_workflow( $id, $params );
		if ( ! $updated ) {
			return new WP_Error( 'db_error', 'Failed to update workflow or no changes made', [ 'status' => 500 ] );
		}

		return new WP_REST_Response( [ 'message' => 'Workflow updated successfully' ], 200 );
	}

	/**
	 * Delete workflow.
	 */
	public function delete_workflow( $request ) {
		$id = intval( $request['id'] );
		$workflow = ZapPress_DB::get_workflow( $id );
		if ( ! $workflow ) {
			return new WP_Error( 'not_found', 'Workflow not found', [ 'status' => 404 ] );
		}

		$deleted = ZapPress_DB::delete_workflow( $id );
		if ( ! $deleted ) {
			return new WP_Error( 'db_error', 'Failed to delete workflow', [ 'status' => 500 ] );
		}

		return new WP_REST_Response( [ 'message' => 'Workflow deleted successfully' ], 200 );
	}

	/**
	 * Get Connections list.
	 */
	public function get_connections( $request ) {
		$connections = ZapPress_DB::get_connections();
		return new WP_REST_Response( $connections, 200 );
	}

	/**
	 * Create Connection.
	 */
	public function create_connection( $request ) {
		$params = $request->get_json_params();
		if ( empty( $params['name'] ) || empty( $params['service'] ) || empty( $params['auth_type'] ) ) {
			return new WP_Error( 'missing_fields', 'Name, Service, and Auth Type are required', [ 'status' => 400 ] );
		}

		$connection_id = ZapPress_DB::create_connection( $params );
		if ( ! $connection_id ) {
			return new WP_Error( 'db_error', 'Failed to save connection', [ 'status' => 500 ] );
		}

		return new WP_REST_Response( [ 'id' => $connection_id, 'message' => 'Connection added successfully' ], 201 );
	}

	/**
	 * Update Connection.
	 */
	public function update_connection( $request ) {
		$id = intval( $request['id'] );
		$params = $request->get_json_params();

		$connection = ZapPress_DB::get_connection( $id );
		if ( ! $connection ) {
			return new WP_Error( 'not_found', 'Connection not found', [ 'status' => 404 ] );
		}

		$updated = ZapPress_DB::update_connection( $id, $params );
		if ( ! $updated ) {
			return new WP_Error( 'db_error', 'Failed to update connection', [ 'status' => 500 ] );
		}

		return new WP_REST_Response( [ 'message' => 'Connection updated successfully' ], 200 );
	}

	/**
	 * Delete Connection.
	 */
	public function delete_connection( $request ) {
		$id = intval( $request['id'] );
		$connection = ZapPress_DB::get_connection( $id );
		if ( ! $connection ) {
			return new WP_Error( 'not_found', 'Connection not found', [ 'status' => 404 ] );
		}

		$force = $request->get_param( 'force' ) === 'true';

		if ( ! $force ) {
			$workflows = ZapPress_DB::get_workflows();
			$used_in = [];
			foreach ( $workflows as $w ) {
				$steps = isset( $w['steps'] ) ? $w['steps'] : [];
				foreach ( $steps as $step ) {
					if ( isset( $step['config']['connection_id'] ) && intval( $step['config']['connection_id'] ) === $id ) {
						$used_in[] = $w['name'];
						break;
					}
				}
			}

			if ( ! empty( $used_in ) ) {
				return new WP_REST_Response( [
					'status'    => 'conflict',
					'message'   => 'This connection is currently in use.',
					'workflows' => $used_in
				], 200 );
			}
		}

		$deleted = ZapPress_DB::delete_connection( $id );
		if ( ! $deleted ) {
			return new WP_Error( 'db_error', 'Failed to delete connection', [ 'status' => 500 ] );
		}

		return new WP_REST_Response( [ 'status' => 'success', 'message' => 'Connection deleted successfully' ], 200 );
	}

	/**
	 * Get Logs list.
	 */
	public function get_logs( $request ) {
		$workflow_id = $request->get_param( 'workflow_id' );
		$status = $request->get_param( 'status' );
		$limit = $request->get_param( 'limit' ) ? intval( $request->get_param( 'limit' ) ) : 50;
		$page = $request->get_param( 'page' ) ? intval( $request->get_param( 'page' ) ) : 1;
		$offset = ( $page - 1 ) * $limit;

		$filters = [];
		if ( ! empty( $workflow_id ) ) {
			$filters['workflow_id'] = intval( $workflow_id );
		}
		if ( ! empty( $status ) ) {
			$filters['status'] = sanitize_text_field( $status );
		}

		$logs = ZapPress_DB::get_logs( $filters, $limit, $offset );
		return new WP_REST_Response( $logs, 200 );
	}

	/**
	 * Get Stats summary.
	 */
	public function get_stats( $request ) {
		$stats = ZapPress_DB::get_workflow_stats();
		return new WP_REST_Response( $stats, 200 );
	}

	/**
	 * Test API Call (synchronous sandbox run).
	 */
	public function test_api_call( $request ) {
		$params = $request->get_json_params();
		if ( empty( $params['url'] ) ) {
			return new WP_Error( 'missing_url', 'API URL is required', [ 'status' => 400 ] );
		}

		$result = ZapPress_API_Action::execute( $params );
		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * Generate a cryptographically secure token for incoming webhooks.
	 */
	public function generate_webhook_token( $request ) {
		$token = wp_generate_password( 32, false, false );
		return new WP_REST_Response( [ 'token' => $token ], 200 );
	}

	/**
	 * Handle incoming webhook calls and execute matching active workflows.
	 */
	public function handle_webhook( $request ) {
		$token = sanitize_text_field( $request['token'] );
		$matched_workflow = ZapPress_DB::get_active_workflow_by_webhook_token( $token );

		if ( ! $matched_workflow ) {
			return new WP_Error( 'not_found', 'Invalid or inactive webhook token', [ 'status' => 404 ] );
		}

		// Compile incoming webhook parameters context
		$context = [
			'headers' => $request->get_headers(),
			'query'   => $request->get_query_params(),
			'body'    => $request->get_json_params() ?: ( $request->get_body_params() ?: $request->get_body() ),
		];

		// Trigger workflow execution
		$success = ZapPress_Engine::execute_workflow( $matched_workflow['id'], $context );

		if ( $success ) {
			return new WP_REST_Response( [
				'status'  => 'success',
				'message' => 'Workflow triggered successfully.'
			], 200 );
		} else {
			return new WP_REST_Response( [
				'status'  => 'failed',
				'message' => 'Workflow execution encountered errors.'
			], 500 );
		}
	}

	/**
	 * Get prebuilt templates library.
	 */
	public function get_templates( $request ) {
		$templates = [
			[
				'id'             => 'woocommerce_hubspot_sync',
				'name'           => __( 'WooCommerce to HubSpot CRM Sync', 'zappress' ),
				'description'    => __( 'Automatically push WooCommerce new order details to HubSpot CRM contacts database in real time.', 'zappress' ),
				'category'       => 'CRM',
				'icon'           => 'Database',
				'color'          => 'from-orange-500 to-amber-600',
				'trigger_type'   => 'wc_order_created',
				'trigger_config' => (object) [],
				'steps'          => [
					[
						'id'     => 'step_crm_post',
						'type'   => 'api_call',
						'config' => [
							'method'  => 'POST',
							'url'     => 'https://api.hubapi.com/contacts/v1/contact',
							'headers' => [
								[ 'key' => 'Content-Type', 'value' => 'application/json' ],
								[ 'key' => 'Authorization', 'value' => 'Bearer {{connections.hubspot.token}}' ]
							],
							'body'    => "{\n  \"properties\": [\n    { \"property\": \"email\", \"value\": \"{{trigger.billing.email}}\" },\n    { \"property\": \"firstname\", \"value\": \"{{trigger.billing.first_name}}\" },\n    { \"property\": \"lastname\", \"value\": \"{{trigger.billing.last_name}}\" }\n  ]\n}"
						]
					],
					[
						'id'     => 'step_map_meta',
						'type'   => 'response_mapping',
						'config' => [
							'source_value'     => '{{steps.step_crm_post.vid}}',
							'destination_type' => 'post_meta',
							'destination_key'  => '_hubspot_contact_id',
							'target_id'        => '{{trigger.id}}'
						]
					]
				]
			],
			[
				'id'             => 'post_linkedin_ai_share',
				'name'           => __( 'WordPress Post Auto-Summarize & Share', 'zappress' ),
				'description'    => __( 'Generate an AI summary of a newly published WordPress post using OpenAI, then automatically post it to LinkedIn.', 'zappress' ),
				'category'       => 'AI & Social',
				'icon'           => 'Sparkles',
				'color'          => 'from-blue-500 to-indigo-600',
				'trigger_type'   => 'wp_post_published',
				'trigger_config' => (object) [],
				'steps'          => [
					[
						'id'     => 'step_ai_summary',
						'type'   => 'openai_ai_action',
						'config' => [
							'connection_id' => '',
							'ai_task'       => 'summary',
							'prompt'        => "Title: {{trigger.post_title}}\nContent: {{trigger.post_content}}"
						]
					],
					[
						'id'     => 'step_linkedin_share',
						'type'   => 'api_call',
						'config' => [
							'method'  => 'POST',
							'url'     => 'https://api.linkedin.com/v2/ugcPosts',
							'headers' => [
								[ 'key' => 'Content-Type', 'value' => 'application/json' ],
								[ 'key' => 'Authorization', 'value' => 'Bearer {{connections.linkedin.token}}' ]
							],
							'body'    => "{\n  \"author\": \"urn:li:person:YOUR_PERSON_ID\",\n  \"lifecycleState\": \"PUBLISHED\",\n  \"specificContent\": {\n    \"com.linkedin.ugc.ShareContent\": {\n      \"shareCommentary\": {\n        \"text\": \"{{steps.step_ai_summary.text}} - Read more at {{trigger.post_url}}\"\n      },\n      \"shareMediaCategory\": \"NONE\"\n    }\n  },\n  \"visibility\": {\n    \"com.linkedin.ugc.MemberNetworkVisibility\": \"PUBLIC\"\n  }\n}"
						]
					]
				]
			],
			[
				'id'             => 'webhook_google_sheets_lead',
				'name'           => __( 'Contact Lead Webhook to Google Sheets', 'zappress' ),
				'description'    => __( 'Receive custom inbound webhook payloads and write details straight to a Google Spreadsheet row.', 'zappress' ),
				'category'       => 'Lead Gen',
				'icon'           => 'FileSpreadsheet',
				'color'          => 'from-emerald-500 to-teal-600',
				'trigger_type'   => 'webhook',
				'trigger_config' => [
					'webhook_token' => 'lead-collector-token'
				],
				'steps'          => [
					[
						'id'     => 'step_gsheet_post',
						'type'   => 'api_call',
						'config' => [
							'method'  => 'POST',
							'url'     => 'https://script.google.com/macros/s/YOUR_MACRO_ID/exec',
							'headers' => [
								[ 'key' => 'Content-Type', 'value' => 'application/json' ]
							],
							'body'    => "{\n  \"name\": \"{{trigger.body.name}}\",\n  \"email\": \"{{trigger.body.email}}\",\n  \"message\": \"{{trigger.body.message}}\",\n  \"site_url\": \"{{site.url}}\"\n}"
						]
					]
				]
			],
			[
				'id'             => 'openai_auto_seo_description',
				'name'           => __( 'Auto-Generate SEO Title & Meta Description', 'zappress' ),
				'description'    => __( 'Leverage OpenAI to review new post content, generate an SEO description, and store it in post metadata.', 'zappress' ),
				'category'       => 'AI & Social',
				'icon'           => 'Sparkles',
				'color'          => 'from-purple-500 to-pink-600',
				'trigger_type'   => 'wp_post_published',
				'trigger_config' => (object) [],
				'steps'          => [
					[
						'id'     => 'step_ai_meta',
						'type'   => 'openai_ai_action',
						'config' => [
							'connection_id' => '',
							'ai_task'       => 'description',
							'prompt'        => "Content: {{trigger.post_content}}"
						]
					],
					[
						'id'     => 'step_store_seo',
						'type'   => 'response_mapping',
						'config' => [
							'source_value'     => '{{steps.step_ai_meta.text}}',
							'destination_type' => 'post_meta',
							'destination_key'  => '_yoast_wpseo_metadesc',
							'target_id'        => '{{trigger.post_id}}'
						]
					]
				]
			]
		];

		return new WP_REST_Response( $templates, 200 );
	}

	/**
	 * Get Plugin Settings.
	 */
	public function get_settings( $request ) {
		$settings = [
			'retry_interval' => get_option( 'zappress_settings_retry_interval', '5m' ),
			'max_retries'    => intval( get_option( 'zappress_settings_max_retries', 3 ) ),
			'notify_email'   => get_option( 'zappress_settings_notify_email', 'yes' ) === 'yes',
			'notify_webhook' => get_option( 'zappress_settings_notify_webhook', 'no' ) === 'yes',
			'webhook_url'    => get_option( 'zappress_settings_webhook_url', '' ),
		];
		return new WP_REST_Response( $settings, 200 );
	}

	/**
	 * Update Plugin Settings.
	 */
	public function update_settings( $request ) {
		$params = $request->get_json_params();

		if ( isset( $params['retry_interval'] ) ) {
			$retry_interval = sanitize_text_field( $params['retry_interval'] );
			if ( in_array( $retry_interval, [ '1m', '5m', '1h' ], true ) ) {
				update_option( 'zappress_settings_retry_interval', $retry_interval );
			}
		}

		if ( isset( $params['max_retries'] ) ) {
			$max_retries = intval( $params['max_retries'] );
			if ( $max_retries >= 0 && $max_retries <= 10 ) {
				update_option( 'zappress_settings_max_retries', $max_retries );
			}
		}

		if ( isset( $params['notify_email'] ) ) {
			update_option( 'zappress_settings_notify_email', $params['notify_email'] ? 'yes' : 'no' );
		}

		if ( isset( $params['notify_webhook'] ) ) {
			update_option( 'zappress_settings_notify_webhook', $params['notify_webhook'] ? 'yes' : 'no' );
		}

		if ( isset( $params['webhook_url'] ) ) {
			update_option( 'zappress_settings_webhook_url', esc_url_raw( $params['webhook_url'] ) );
		}

		return new WP_REST_Response( [
			'status'  => 'success',
			'message' => __( 'Settings updated successfully.', 'zappress' )
		], 200 );
	}
}
