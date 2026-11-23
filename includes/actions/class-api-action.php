<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * Outbound HTTP API Action Executor class
 */
class ZapPress_API_Action {

	/**
	 * Execute the HTTP request.
	 */
	public static function execute( $config ) {
		$method = isset( $config['method'] ) ? strtoupper( $config['method'] ) : 'GET';
		$url = isset( $config['url'] ) ? esc_url_raw( $config['url'] ) : '';
		
		// Parse headers array
		$headers = [];
		if ( isset( $config['headers'] ) && is_array( $config['headers'] ) ) {
			foreach ( $config['headers'] as $header ) {
				if ( ! empty( $header['key'] ) ) {
					$headers[ $header['key'] ] = $header['value'];
				}
			}
		}

		$body = isset( $config['body'] ) ? $config['body'] : '';

		// If headers indicate JSON body but body is array, encode it
		if ( isset( $headers['Content-Type'] ) && stripos( $headers['Content-Type'], 'application/json' ) !== false ) {
			if ( is_array( $body ) ) {
				$body = wp_json_encode( $body );
			}
		}

		$args = [
			'method'      => $method,
			'headers'     => $headers,
			'body'        => $body,
			'timeout'     => 30,
			'redirection' => 5,
			'httpversion' => '1.0',
			'blocking'    => true,
			'sslverify'   => apply_filters( 'zappress_sslverify', true ),
		];

		$response = wp_remote_request( $url, $args );

		$request_log = [
			'method'  => $method,
			'url'     => self::sanitize_url( $url ),
			'headers' => self::sanitize_headers( $headers ),
			'body'    => self::sanitize_body( $body )
		];

		if ( is_wp_error( $response ) ) {
			return [
				'success'  => false,
				'request'  => $request_log,
				'response' => null,
				'data'     => [],
				'error'    => $response->get_error_message()
			];
		}

		$response_code = wp_remote_retrieve_response_code( $response );
		$response_body = wp_remote_retrieve_body( $response );
		$response_headers = wp_remote_retrieve_headers( $response );

		$response_log = [
			'code'    => $response_code,
			'headers' => self::sanitize_headers( (array) $response_headers ),
			'body'    => self::sanitize_body( $response_body )
		];

		$is_success = ( $response_code >= 200 && $response_code < 300 );
		$parsed_data = [];

		if ( ! empty( $response_body ) ) {
			$decoded = json_decode( $response_body, true );
			if ( json_last_error() === JSON_ERROR_NONE ) {
				$parsed_data = $decoded;
			} else {
				$parsed_data = [ 'raw_body' => $response_body ];
			}
		}

		return [
			'success'  => $is_success,
			'request'  => $request_log,
			'response' => $response_log,
			'data'     => $parsed_data,
			'error'    => $is_success ? '' : 'HTTP status ' . $response_code
		];
	}

	/**
	 * Redact sensitive query parameters from URLs in logs.
	 */
	public static function sanitize_url( $url ) {
		if ( empty( $url ) || ! is_string( $url ) ) {
			return $url;
		}
		return preg_replace( '/([?&](?:api_key|token|key|secret|password|access_token)=)[^&]+/i', '$1[REDACTED]', $url );
	}

	/**
	 * Redact sensitive headers for execution logging.
	 */
	public static function sanitize_headers( $headers ) {
		if ( ! is_array( $headers ) ) {
			return $headers;
		}
		$redacted = [];
		$sensitive_keys = [
			'authorization',
			'proxy-authorization',
			'x-api-key',
			'api-key',
			'apikey',
			'token',
			'x-auth-token',
			'secret'
		];
		foreach ( $headers as $key => $val ) {
			$lower = strtolower( trim( (string) $key ) );
			$is_sensitive = in_array( $lower, $sensitive_keys, true )
				|| strpos( $lower, 'auth' ) !== false
				|| strpos( $lower, 'token' ) !== false
				|| strpos( $lower, 'secret' ) !== false
				|| strpos( $lower, 'password' ) !== false;
			$redacted[ $key ] = $is_sensitive ? '[REDACTED]' : $val;
		}
		return $redacted;
	}

	/**
	 * Mask sensitive fields in body before logging.
	 */
	public static function sanitize_body( $body ) {
		if ( empty( $body ) ) {
			return $body;
		}

		$sensitive_keys = [
			'token',
			'access_token',
			'refresh_token',
			'id_token',
			'auth_token',
			'api_key',
			'apikey',
			'password',
			'passwd',
			'secret',
			'client_secret',
			'authorization',
			'private_key',
		];

		if ( is_string( $body ) ) {
			$decoded = json_decode( $body, true );
			if ( json_last_error() === JSON_ERROR_NONE && is_array( $decoded ) ) {
				return wp_json_encode( self::sanitize_body( $decoded ) );
			}
			// Fallback regex for raw or partial JSON string payloads
			$pattern = '/"(token|access_token|refresh_token|id_token|auth_token|api_key|apikey|password|passwd|secret|client_secret|authorization|private_key)"\s*:\s*(?:"[^"]*"|[^\s,}]+)/i';
			return preg_replace( $pattern, '"$1":"[REDACTED]"', $body );
		}

		if ( is_array( $body ) ) {
			$sanitized = [];
			foreach ( $body as $k => $v ) {
				$lower = strtolower( trim( (string) $k ) );
				if ( in_array( $lower, $sensitive_keys, true ) ) {
					$sanitized[ $k ] = '[REDACTED]';
				} else {
					$sanitized[ $k ] = is_array( $v ) ? self::sanitize_body( $v ) : $v;
				}
			}
			return $sanitized;
		}

		return $body;
	}
}
