<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Admin Screen Enqueuer and Menu Registrar
 */
class ZapPress_Admin {

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
		add_action( 'admin_menu', [ $this, 'register_menu_pages' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
	}

	/**
	 * Register sidebar admin menus.
	 */
	public function register_menu_pages() {
		$capability = 'manage_options';

		// Main Parent Page
		add_menu_page(
			__( 'ZapPress Automation', 'zappress' ),
			__( 'ZapPress', 'zappress' ),
			$capability,
			'zappress-platform',
			[ $this, 'render_admin_page' ],
			'dashicons-share-alt2',
			58
		);

		// Submenus mapping directly to the React Router tabs
		$subpages = [
			'dashboard'   => __( 'Dashboard', 'zappress' ),
			'workflows'   => __( 'Workflows', 'zappress' ),
			'templates'   => __( 'Templates', 'zappress' ),
			'connections' => __( 'API Credentials', 'zappress' ),
			'logs'        => __( 'Logs', 'zappress' ),
			'settings'    => __( 'Settings', 'zappress' ),
			'help'        => __( 'Help', 'zappress' ),
		];

		// Remove the default duplicate parent submenu
		remove_submenu_page( 'zappress-platform', 'zappress-platform' );

		foreach ( $subpages as $tab => $title ) {
			add_submenu_page(
				'zappress-platform',
				$title,
				$title,
				$capability,
				'zappress-platform&tab=' . $tab,
				[ $this, 'render_admin_page' ]
			);
		}
	}

	/**
	 * HTML Wrapper node for React SPA mount.
	 */
	public function render_admin_page() {
		echo '<div id="zappress-admin-root" class="zappress-admin-wrap"></div>';
	}

	/**
	 * Enqueue frontend compiled bundle files.
	 */
	public function enqueue_assets( $hook ) {
		// Only enqueue on our plugin pages
		if ( strpos( $hook, 'zappress-platform' ) === false ) {
			return;
		}

		// Inject React resources
		wp_enqueue_script(
			'zappress-admin-js',
			ZAPPRESS_PLUGIN_URL . 'admin/build/index.js',
			[ 'wp-element', 'wp-api-fetch' ],
			ZAPPRESS_VERSION,
			true
		);

		// Localize REST variables and current tab context
		$current_tab = isset( $_GET['tab'] ) ? sanitize_text_field( $_GET['tab'] ) : 'dashboard';
		wp_localize_script( 'zappress-admin-js', 'zapPressSettings', [
			'root'        => esc_url_raw( rest_url() ),
			'nonce'       => wp_create_nonce( 'wp_rest' ),
			'current_tab' => $current_tab,
			'admin_url'   => admin_url(),
			'version'     => ZAPPRESS_VERSION,
		] );

		wp_enqueue_style(
			'zappress-admin-css',
			ZAPPRESS_PLUGIN_URL . 'admin/build/index.css',
			[],
			ZAPPRESS_VERSION
		);
	}
}
