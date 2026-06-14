<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * WordPress and WooCommerce Trigger Hook Adapters
 */
class ZapPress_Triggers {

	/**
	 * Constructor to initialize hooks.
	 */
	public function __construct() {
		// Core WP Triggers
		add_action( 'user_register', [ $this, 'wp_user_registered' ], 10, 1 );
		add_action( 'wp_login', [ $this, 'wp_user_login' ], 10, 2 );
		add_action( 'publish_post', [ $this, 'wp_post_published' ], 10, 2 );
		add_action( 'post_updated', [ $this, 'wp_post_updated' ], 10, 3 );
		add_action( 'comment_post', [ $this, 'wp_comment_added' ], 10, 3 );

		// WooCommerce Triggers (Condition Check)
		if ( class_exists( 'WooCommerce' ) ) {
			add_action( 'woocommerce_new_order', [ $this, 'wc_order_created' ], 10, 2 );
			add_action( 'woocommerce_payment_complete', [ $this, 'wc_order_paid' ], 10, 1 );
			add_action( 'woocommerce_order_status_completed', [ $this, 'wc_order_completed' ], 10, 1 );
			add_action( 'woocommerce_order_status_refunded', [ $this, 'wc_order_refunded' ], 10, 1 );
			add_action( 'woocommerce_new_product', [ $this, 'wc_product_created' ], 10, 2 );
			add_action( 'woocommerce_update_product', [ $this, 'wc_product_updated' ], 10, 2 );
		}
	}

	/**
	 * Run workflows matching a specific trigger.
	 */
	private function trigger_workflows( $trigger_type, $context ) {
		$workflows = ZapPress_DB::get_active_workflows_by_trigger( $trigger_type );
		foreach ( $workflows as $w ) {
			ZapPress_Engine::execute_workflow( $w['id'], $context );
		}
	}

	/**
	 * WordPress Triggers
	 */
	public function wp_user_registered( $user_id ) {
		$user = get_userdata( $user_id );
		if ( $user ) {
			$context = [
				'user_id'      => $user_id,
				'user_login'   => $user->user_login,
				'user_email'   => $user->user_email,
				'display_name' => $user->display_name,
			];
			$this->trigger_workflows( 'wp_user_registered', $context );
		}
	}

	public function wp_user_login( $user_login, $user ) {
		if ( $user ) {
			$context = [
				'user_id'      => $user->ID,
				'user_login'   => $user->user_login,
				'user_email'   => $user->user_email,
				'display_name' => $user->display_name,
			];
			$this->trigger_workflows( 'wp_user_login', $context );
		}
	}

	public function wp_post_published( $post_id, $post ) {
		// Ignore revisions & autosaves
		if ( wp_is_post_revision( $post_id ) ) {
			return;
		}
		$context = [
			'post_id'      => $post_id,
			'post_title'   => $post->post_title,
			'post_content' => $post->post_content,
			'post_url'     => get_permalink( $post_id ),
			'author_email' => get_the_author_meta( 'user_email', $post->post_author ),
		];
		$this->trigger_workflows( 'wp_post_published', $context );
	}

	public function wp_post_updated( $post_id, $post_after, $post_before ) {
		// Ignore revisions & autosaves
		if ( wp_is_post_revision( $post_id ) ) {
			return;
		}
		$context = [
			'post_id'      => $post_id,
			'post_title'   => $post_after->post_title,
			'post_content' => $post_after->post_content,
			'post_url'     => get_permalink( $post_id ),
			'author_email' => get_the_author_meta( 'user_email', $post_after->post_author ),
		];
		$this->trigger_workflows( 'wp_post_updated', $context );
	}

	public function wp_comment_added( $comment_id, $comment_approved, $commentdata ) {
		$context = [
			'comment_id'           => $comment_id,
			'comment_author'       => isset( $commentdata['comment_author'] ) ? $commentdata['comment_author'] : '',
			'comment_author_email' => isset( $commentdata['comment_author_email'] ) ? $commentdata['comment_author_email'] : '',
			'comment_content'      => isset( $commentdata['comment_content'] ) ? $commentdata['comment_content'] : '',
		];
		$this->trigger_workflows( 'wp_comment_added', $context );
	}

	/**
	 * WooCommerce Triggers
	 */
	public function wc_order_created( $order_id, $order ) {
		if ( ! $order ) {
			$order = wc_get_order( $order_id );
		}
		if ( $order ) {
			$context = $this->get_wc_order_context( $order );
			$this->trigger_workflows( 'wc_order_created', $context );
		}
	}

	public function wc_order_paid( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( $order ) {
			$context = $this->get_wc_order_context( $order );
			$this->trigger_workflows( 'wc_order_paid', $context );
		}
	}

	public function wc_order_completed( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( $order ) {
			$context = $this->get_wc_order_context( $order );
			$this->trigger_workflows( 'wc_order_completed', $context );
		}
	}

	public function wc_order_refunded( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( $order ) {
			$context = $this->get_wc_order_context( $order );
			$this->trigger_workflows( 'wc_order_refunded', $context );
		}
	}

	public function wc_product_created( $product_id, $product ) {
		if ( ! $product ) {
			$product = wc_get_product( $product_id );
		}
		if ( $product ) {
			$context = [
				'product_id'   => $product_id,
				'product_name' => $product->get_name(),
				'price'        => $product->get_price(),
				'sku'          => $product->get_sku(),
			];
			$this->trigger_workflows( 'wc_product_created', $context );
		}
	}

	public function wc_product_updated( $product_id, $product ) {
		if ( ! $product ) {
			$product = wc_get_product( $product_id );
		}
		if ( $product ) {
			$context = [
				'product_id'   => $product_id,
				'product_name' => $product->get_name(),
				'price'        => $product->get_price(),
				'sku'          => $product->get_sku(),
			];
			$this->trigger_workflows( 'wc_product_updated', $context );
		}
	}

	/**
	 * Helper to convert WC_Order into flat array scope.
	 */
	private function get_wc_order_context( $order ) {
		return [
			'order_id'      => $order->get_id(),
			'order_number'  => $order->get_order_number(),
			'total'         => $order->get_total(),
			'billing_name'  => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
			'billing_email' => $order->get_billing_email(),
			'status'        => $order->get_status(),
		];
	}
}

// Initialize Triggers adapter instance
new ZapPress_Triggers();
