# ZapPress — Self-Hosted WordPress Automation Engine

ZapPress is a powerful, self-hosted automation platform for WordPress. It lets you create complex workflows that connect WordPress and WooCommerce events to external APIs, databases, or AI nodes—without writing code.

---

## ⚡ Key Functionality

### 1. Event Triggers
Workflows can be launched automatically when events occur within your site:
* **WordPress Core Hooks**:
  * User Registration (`user_register`)
  * User Login (`wp_login`)
  * Post Published (`publish_post`)
  * Post Updated (`post_updated`)
  * Comment Added (`comment_post`)
* **WooCommerce Store Hooks**:
  * Order Created (`woocommerce_new_order`)
  * Payment Completed (`woocommerce_payment_complete`)
  * Order Status Completed (`woocommerce_order_status_completed`)
  * Order Refunded (`woocommerce_order_status_refunded`)
  * Product Created (`woocommerce_new_product`)
  * Product Updated (`woocommerce_update_product`)
* **Automated Ticker**: Clock-based heartbeats running every minute, 5 minutes, hourly, daily, weekly, monthly, or customized via standard **5-part cron syntax expressions** (e.g. `*/15 * * * *`).
* **Inbound Webhooks**: Custom unique endpoints supporting JSON payloads.

### 2. Action Steps & Logic
Sequence multiple actions dynamically inside a single workflow:
* **Outbound HTTP Calls**: Custom GET, POST, PUT, PATCH, and DELETE calls with parameter injection, custom headers, and request body templates.
* **OpenAI AI Actions**: Automatic text summarization, meta description writing, or tag extraction.
* **Email Delivery**: Send customized HTML email alerts to site administrators or customers.
* **WordPress Post Creation**: Automatically generate drafts or publish new posts.
* **Response Meta Mapping**: Extract values returned from API responses and save them as User Meta, Post Meta, or Advanced Custom Fields (ACF).
* **Conditional Logic Gates**: Control workflow execution paths with filters (equals, contains, starts with, ends with, greater than, less than, is empty, is not empty).

### 3. Enterprise-Grade Execution Engine
* **Automatic Error Retries**: Failed API or database steps record execution contexts and automatically retry at customizable intervals (e.g. 1m, 5m, 1h) up to 10 attempts via the WordPress cron schedule.
* **Secure AES-256-CTR Encryption**: All secure connections and third-party credentials (passwords, tokens, API keys) are fully encrypted before writing to database custom tables.
* **Dynamic Variable Parser**: Reference event data down to nested JSON fields using dot-notation syntax (e.g., `{{trigger.billing.address.city}}` or `{{steps.api_call_step.id}}`).

---

## 🔌 Integrated Third-Party Services

ZapPress includes native authorization handlers and prebuilt templates for popular external platforms:

### 1. OpenAI (Native Integration)
* **Status**: Fully Integrated.
* **Authentication**: Bearer token credentials.
* **Details**: Powered by the highly cost-efficient `gpt-4o-mini` model. Allows summarizing content, auto-generating SEO meta descriptions, or extracting keywords on triggers.

### 2. HubSpot CRM (Template Integration)
* **Status**: Prebuilt Template.
* **Authentication**: Bearer Token or Custom Header.
* **Details**: Synchronizes customer order data to CRM databases instantly on payment completions.

### 3. Google Sheets (Template Integration)
* **Status**: Prebuilt Template.
* **Authentication**: Webhook Endpoint.
* **Details**: Submits incoming lead webhooks directly to Google Sheets macro macros.

### 4. LinkedIn (Template Integration)
* **Status**: Prebuilt Template.
* **Authentication**: OAuth Bearer Token.
* **Details**: Automatically shares summaries of new WordPress blog posts to user profiles.

### 5. Slack, Discord, & Custom Webhooks (Settings Integration)
* **Status**: Out-of-the-Box.
* **Authentication**: Payload Endpoints.
* **Details**: Triggers notifications on fatal workflow execution failures directly to your developer channels.

---

## 📚 Prebuilt Workflow Templates

ZapPress features a built-in template library to deploy workflows in seconds:

1. **WooCommerce to HubSpot CRM Sync**
   * **Trigger**: Order Created (`wc_order_created`)
   * **Flow**: Post billing properties to HubSpot CRM endpoint → map CRM contact ID (`vid`) back to WooCommerce post metadata.
2. **WordPress Post Auto-Summarize & Share**
   * **Trigger**: Post Published (`wp_post_published`)
   * **Flow**: Extract post contents → run OpenAI summary model → compose and send LinkedIn update feed.
3. **Contact Lead Webhook to Google Sheets**
   * **Trigger**: Inbound Webhook (`webhook`)
   * **Flow**: Accept contact parameters → append row structure payload directly to Google Apps Script.
4. **Auto-Generate SEO Title & Meta Description**
   * **Trigger**: Post Published (`wp_post_published`)
   * **Flow**: Analyze article content → invoke OpenAI description task → save text directly to Yoast SEO metadata (`_yoast_wpseo_metadesc`).

---

## 🗂️ Database & Directories Schema

On activation, ZapPress builds 4 custom tables:
* `wp_zappress_workflows` — Workflow triggers, steps structure, and settings.
* `wp_zappress_connections` — Encrypted API credentials.
* `wp_zappress_logs` — Execution histories, durations, snapshots, and outcomes.
* `wp_zappress_retries` — Background queue for failed tasks.

Log archives are stored securely in `/wp-content/uploads/zappress-logs/` with zero folder index browsing capabilities.

---

## 📩 Custom Integrations & Support

Need custom trigger events, private action nodes, or proprietary CRM integrations? 
Reach out directly via email at [a4ashishjangid@gmail.com](mailto:a4ashishjangid@gmail.com) for custom developments.

---

## 📄 License

ZapPress is licensed under the GPL v2 or later.
