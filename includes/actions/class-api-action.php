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
			'sslverify'   => false, // Allow local testing SSL bypass
		];

		$response = wp_remote_request( $url, $args );

		$request_log = [
			'method'  => $method,
			'url'     => $url,
			'headers' => $headers,
			'body'    => $body
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
			'headers' => (array) $response_headers,
			'body'    => $response_body
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
}
