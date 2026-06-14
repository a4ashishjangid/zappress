import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, RefreshCw } from 'lucide-react';
import { useUI } from '../context/UIContext';

/**
 * Settings Component
 * Handles editing and saving failure alerts, Slack/Discord notification webhooks,
 * error handling options, and maximum automation execution retries limit.
 *
 * @param {object} props
 * @param {function} props.apiRequest REST client request helper
 */
export default function Settings({ apiRequest }) {
  const { showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form State
  const [retries, setRetries] = useState(3);
  const [retryInterval, setRetryInterval] = useState('5m');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySlack, setNotifySlack] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const data = await apiRequest('/settings');
        if (active && data) {
          setRetries(data.max_retries ?? 3);
          setRetryInterval(data.retry_interval ?? '5m');
          setNotifyEmail(!!data.notify_email);
          setNotifySlack(!!data.notify_webhook);
          setSlackWebhook(data.webhook_url ?? '');
        }
      } catch (err) {
        showError('Failed to load settings: ' + err.message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchSettings();
    return () => { active = false; };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await apiRequest('/settings', {
        method: 'POST',
        body: JSON.stringify({
          max_retries: parseInt(retries, 10),
          retry_interval: retryInterval,
          notify_email: notifyEmail,
          notify_webhook: notifySlack,
          webhook_url: slackWebhook,
        })
      });
      setSaved(true);
      showSuccess('Settings saved successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      showError('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm mt-0.5 text-slate-500">
          Configure error retry behavior and failure notification channels.
        </p>
      </div>

      {saved && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium animate-fade-in bg-emerald-50 border border-emerald-200 text-emerald-700"
        >
          ✓ Settings saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 max-w-2xl">

        {/* Error Handling */}
        <div className="zappress-card p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3.5 mb-1">
            <h3 className="font-semibold text-base text-slate-900">Error Handling & Retries</h3>
            <p className="text-sm mt-0.5 text-slate-500">
              Control how failed workflow steps are automatically retried.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-slate-500">
                Max Retry Attempts
              </label>
              <select value={retries} onChange={(e) => setRetries(parseInt(e.target.value, 10))}>
                <option value="1">1 Attempt</option>
                <option value="3">3 Attempts</option>
                <option value="5">5 Attempts</option>
                <option value="10">10 Attempts</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-slate-500">
                Retry Delay Interval
              </label>
              <select value={retryInterval} onChange={(e) => setRetryInterval(e.target.value)}>
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="1h">1 Hour</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="zappress-card p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3.5 mb-1">
            <h3 className="font-semibold text-base text-slate-900">Failure Notifications</h3>
            <p className="text-sm mt-0.5 text-slate-500">
              Choose how you want to be alerted when workflows fail.
            </p>
          </div>

          <div className="space-y-4">
            <label
              className="flex items-start gap-3 cursor-pointer text-slate-700"
            >
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Email notifications
                </p>
                <p className="text-xs mt-0.5 text-slate-500">
                  Send failure alerts to the WordPress site administrator email.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={notifySlack}
                onChange={(e) => setNotifySlack(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Webhook notifications
                </p>
                <p className="text-xs mt-0.5 text-slate-500">
                  Trigger a Slack, Discord, or custom webhook on failure.
                </p>
              </div>
            </label>

            {notifySlack && (
              <div className="ml-7 animate-fade-in">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-slate-500">
                  Webhook URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  className="w-full font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between font-medium">
          <div className="flex items-center gap-2 text-sm animate-pulse text-amber-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Retries execute via WordPress cron.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="zappress-btn-primary flex items-center gap-2 px-5 py-2.5 cursor-pointer border-0"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
