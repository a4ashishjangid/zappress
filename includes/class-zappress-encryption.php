<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Encryption helper using AES-256-CTR
 */
class ZapPress_Encryption {

	/**
	 * Get encryption key from wp-config or fallback.
	 */
	private static function get_key() {
		if ( defined( 'SECURE_AUTH_KEY' ) && SECURE_AUTH_KEY ) {
			return SECURE_AUTH_KEY;
		}
		if ( defined( 'AUTH_KEY' ) && AUTH_KEY ) {
			return AUTH_KEY;
		}
		
		$key = get_option( 'zappress_encryption_key' );
		if ( ! $key ) {
			$key = wp_generate_password( 64, true, true );
			update_option( 'zappress_encryption_key', $key, false );
		}
		return $key;
	}

	/**
	 * Encrypt a string.
	 */
	public static function encrypt( $value ) {
		if ( empty( $value ) ) {
			return '';
		}
		$key = self::get_key();
		$method = 'aes-256-ctr';
		$iv_length = openssl_cipher_iv_length( $method );
		$iv = openssl_random_pseudo_bytes( $iv_length );
		$encrypted = openssl_encrypt( $value, $method, $key, 0, $iv );
		return base64_encode( $iv . $encrypted );
	}

	/**
	 * Decrypt a string.
	 */
	public static function decrypt( $value ) {
		if ( empty( $value ) ) {
			return '';
		}
		$key = self::get_key();
		$method = 'aes-256-ctr';
		$data = base64_decode( $value );
		$iv_length = openssl_cipher_iv_length( $method );
		if ( strlen( $data ) <= $iv_length ) {
			return $value; // Return as-is if invalid
		}
		$iv = substr( $data, 0, $iv_length );
		$encrypted = substr( $data, $iv_length );
		$decrypted = openssl_decrypt( $encrypted, $method, $key, 0, $iv );
		return $decrypted !== false ? $decrypted : $value;
	}
}
