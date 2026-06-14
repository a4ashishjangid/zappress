import React from 'react';
import { Database, ShieldCheck, Zap, GitBranch, Mail } from 'lucide-react';

/**
 * Help Component
 * Displays help documentation, variables selectors references, and custom development contact banners.
 */
export default function Help() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Help & Documentation</h1>
        <p className="text-sm mt-0.5 text-slate-500 font-medium">
          Learn how to build automations, reference dynamic variables, and configure integrations.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Variables Reference */}
        <div className="zappress-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
              <Database className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Dynamic Variables</h3>
              <p className="text-xs mt-0.5 text-slate-500">Pass trigger data into step fields</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'WooCommerce Triggers',
                vars: ['{{trigger.order_id}}', '{{trigger.total}}', '{{trigger.billing_email}}'],
                colorClasses: 'bg-amber-100 text-amber-700 border-amber-200'
              },
              {
                label: 'WordPress Triggers',
                vars: ['{{trigger.post_title}}', '{{trigger.user_email}}', '{{site.name}}'],
                colorClasses: 'bg-blue-50 text-blue-700 border-blue-200'
              },
              {
                label: 'Webhook Triggers',
                vars: ['{{trigger.body.email}}', '{{trigger.query.user_id}}'],
                colorClasses: 'bg-cyan-50 text-cyan-700 border-cyan-200'
              }
            ].map((group) => (
              <div
                key={group.label}
                className="rounded-lg p-3.5 bg-slate-50 border border-slate-200"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 text-slate-500">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.vars.map((v) => (
                    <code
                      key={v}
                      className={`text-[11px] px-2 py-0.5 rounded-md font-mono border ${group.colorClasses}`}
                    >
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Concepts */}
        <div className="zappress-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-50">
              <GitBranch className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Workflow Structure</h3>
              <p className="text-xs mt-0.5 text-slate-500">Trigger → Conditions → Actions</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { num: '1', label: 'Trigger',    desc: 'Events inside WordPress that launch automation (e.g. WooCommerce order, post published).', colorClass: 'text-blue-600 bg-blue-50' },
              { num: '2', label: 'Conditions', desc: 'Logical tests to decide whether to continue (e.g. order total > $200).', colorClass: 'text-amber-600 bg-amber-50' },
              { num: '3', label: 'Actions',    desc: 'Operations on external APIs or WordPress functions (API calls, emails, post creation, AI).', colorClass: 'text-emerald-600 bg-emerald-50' },
            ].map((step) => (
              <div key={step.num} className="flex gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${step.colorClass}`}
                >
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                  <p className="text-xs mt-0.5 leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Authentication Guide */}
        <div className="zappress-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Authentication Types</h3>
              <p className="text-xs mt-0.5 text-slate-500">How credentials are applied to API calls</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { type: 'Bearer Token', desc: 'Adds Authorization: Bearer header automatically.' },
              { type: 'API Key',      desc: 'Appends api_key parameter to the request.' },
              { type: 'Basic Auth',   desc: 'Encodes username:password as Base64 header.' },
              { type: 'Custom',       desc: 'Injects any custom key-value HTTP headers.' },
            ].map((auth) => (
              <div
                key={auth.type}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200"
              >
                <code
                  className="text-[11px] font-mono font-bold shrink-0 mt-0.5 px-2 py-0.5 rounded bg-blue-50 text-blue-600"
                >
                  {auth.type}
                </code>
                <p className="text-xs text-slate-500">{auth.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="zappress-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-fuchsia-50">
              <Zap className="w-4 h-4 text-fuchsia-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Integration Tips</h3>
              <p className="text-xs mt-0.5 text-slate-500">Best practices for reliable workflows</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {[
              'Use <strong>{{trigger.*}}</strong> variables only in matching trigger categories.',
              'Test API connections using the <strong>Test API</strong> button before going live.',
              'Use <strong>Conditions</strong> to filter unwanted triggers (e.g. order status checks).',
              'Webhook URLs are unique per workflow — regenerate if compromised.',
              'Response Mapping stores API return values as user/post meta for reuse.',
            ].map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-slate-500">
                <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-blue-50 text-blue-600">
                  {i + 1}
                </span>
                <span dangerouslySetInnerHTML={{ __html: tip }} />
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Support / Contact Banner */}
      <div className="zappress-card p-6 bg-slate-900 border-slate-800 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-400" />
            Need Custom Integrations?
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Whether you require custom trigger events, private action nodes, or proprietary CRM integrations, we can help build them for you.
          </p>
        </div>
        <div className="shrink-0">
          <a
            href="mailto:a4ashishjangid@gmail.com"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors rounded-lg border border-transparent shadow-sm"
          >
            Contact Developer
          </a>
        </div>
      </div>
    </div>
  );
}
