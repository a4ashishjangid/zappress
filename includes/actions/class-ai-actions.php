<?php
// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * OpenAI AI Action Executor
 */
class ZapPress_AI_Actions {

	/**
	 * Execute the OpenAI completion task.
	 */
	public static function execute( $config ) {
		$connection_id = isset( $config['connection_id'] ) ? intval( $config['connection_id'] ) : 0;
		$prompt = isset( $config['prompt'] ) ? $config['prompt'] : '';
		$ai_task = isset( $config['ai_task'] ) ? $config['ai_task'] : 'summary';

		$max_tokens = 500;
		if ( $ai_task === 'blog' ) {
			$max_tokens = 1500;
		} elseif ( $ai_task === 'tags' || $ai_task === 'description' ) {
			$max_tokens = 150;
		}

		// Retrieve OpenAI secure API connection credentials
		$connection = ZapPress_DB::get_connection( $connection_id );
		if ( ! $connection || empty( $connection['credentials']['token'] ) ) {
			return [
				'success' => false,
				'error'   => 'Missing valid OpenAI API Connection'
			];
		}

		$api_key = $connection['credentials']['token'];

		// Tailor prompts based on specific tasks
		$final_prompt = $prompt;
		if ( $ai_task === 'summary' ) {
			$final_prompt = "Provide a concise summary of the following content:\n\n" . $prompt;
		} elseif ( $ai_task === 'tags' ) {
			$final_prompt = "Generate a comma-separated list of 5 relevant tags for the following content. Output only the comma-separated list, nothing else:\n\n" . $prompt;
		} elseif ( $ai_task === 'description' ) {
			$final_prompt = "Provide a compelling search engine SEO meta description (under 160 characters) for the following content:\n\n" . $prompt;
		}

		$url = 'https://api.openai.com/v1/chat/completions';
		$headers = [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $api_key,
		];

		$body = wp_json_encode( [
			'model'       => 'gpt-4o-mini',
			'messages'    => [
				[ 'role' => 'user', 'content' => $final_prompt ]
			],
			'max_tokens'  => $max_tokens,
			'temperature' => 0.7,
		] );

		$response = wp_remote_post( $url, [
			'headers'   => $headers,
			'body'      => $body,
			'timeout'   => 45,
			'sslverify' => apply_filters( 'zappress_sslverify', true ),
		] );

		if ( is_wp_error( $response ) ) {
			return [
				'success' => false,
				'error'   => $response->get_error_message()
			];
		}

		$code = wp_remote_retrieve_response_code( $response );
		$res_body = wp_remote_retrieve_body( $response );

		if ( $code < 200 || $code >= 300 ) {
			$err_msg = 'OpenAI API returned status ' . $code;
			$decoded = json_decode( $res_body, true );
			if ( isset( $decoded['error']['message'] ) ) {
				$err_msg .= ': ' . $decoded['error']['message'];
			}
			return [
				'success' => false,
				'error'   => $err_msg
			];
		}

		$decoded = json_decode( $res_body, true );
		$ai_output = isset( $decoded['choices'][0]['message']['content'] ) ? trim( $decoded['choices'][0]['message']['content'] ) : '';

		return [
			'success' => true,
			'data'    => [
				'text' => $ai_output
			]
		];
	}
}
