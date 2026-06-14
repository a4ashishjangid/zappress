=== ZapPress ===
Contributors: zappressteam
Donate link: https://zappress.org/
Tags: automation, workflows, webhooks, api, integration
Requires at least: 5.8
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Create automated workflows using WordPress data, API connections, schedules, and conditions without coding.

== Description ==

ZapPress is a powerful, self-hosted automation engine for WordPress. It allows you to build custom automated workflows triggered by WordPress events (such as user registrations, logins, post publications, updates, comment additions) or WooCommerce events, and connect them to third-party APIs or AI actions.

Need custom trigger events, private action nodes, or proprietary CRM integrations? Reach out directly via email at a4ashishjangid@gmail.com for custom developments.

### Features
* **WordPress Triggers**: User registrations, logins, post publication, updates, comments.
* **WooCommerce Triggers**: Order created, paid, completed, product created, updated.
* **Action Steps**: HTTP API calls, OpenAI AI automation, email delivery, post creation, and user/post meta mappings.
* **Conditions**: Conditional path execution (equals, contains, greater than, etc.).
* **Advanced Scheduling**: Background heartbeat intervals and standard 5-part cron syntax parser.
* **Secure Encryption**: Automatically encrypts API credentials in the database using AES-256-CTR.

== Installation ==

1. Upload the `zappress` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Access ZapPress in your WordPress admin sidebar menu.

== Frequently Asked Questions ==

= Is this plugin safe to use? =
Yes, ZapPress uses AES-256-CTR encryption to secure all API credentials in your database.

= Do I need a third-party subscription? =
No, ZapPress runs entirely on your own WordPress server. You only pay for your own third-party API keys (e.g. OpenAI) if you choose to connect to them.

== Changelog ==

= 1.0.0 =
* Initial release.
