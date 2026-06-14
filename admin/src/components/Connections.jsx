import React, { useState, useEffect } from 'react';
import { Plus, Trash, Shield, ShieldCheck, RefreshCw, Key, X } from 'lucide-react';
import { useUI } from '../context/UIContext';

const SERVICE_STYLES = {
  openai:     { accent: '#EC4899', bg: '#FDF2F8', label: 'OpenAI' },
  hubspot:    { accent: '#F59E0B', bg: '#FFFBEB', label: 'HubSpot' },
  salesforce: { accent: '#06B6D4', bg: '#ECFEFF', label: 'Salesforce' },
  twilio:     { accent: '#EF4444', bg: '#FEF2F2', label: 'Twilio' },
  whatsapp:   { accent: '#22C55E', bg: '#F0FDF4', label: 'WhatsApp' },
  stripe:     { accent: '#4F46E5', bg: '#EEF2FF', label: 'Stripe' },
  custom:     { accent: '#2563EB', bg: '#EFF6FF', label: 'Custom' },
};

const AUTH_LABELS = {
  bearer: 'Bearer Token',
  apikey: 'API Key',
  basic:  'Basic Auth',
  custom: 'Custom Headers',
};

/**
 * Connections Component
 * Admin UI for managing encrypted third-party credentials (API keys, oauth headers, custom configs).
 * Handles adding new auth credentials and deleting existing ones.
 *
 * @param {object} props
 * @param {function} props.apiRequest REST client request helper
 */
export default function Connections({ apiRequest }) {
  const { showSuccess, showError, confirm } = useUI();
  const [connections, setConnections]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [name, setName]                   = useState('');
  const [service, setService]             = useState('openai');
  const [authType, setAuthType]           = useState('bearer');
  const [apiKey, setApiKey]               = useState('');
  const [bearerToken, setBearerToken]     = useState('');
  const [username, setUsername]           = useState('');
  const [password, setPassword]           = useState('');
  const [customHeaders, setCustomHeaders] = useState([{ key: '', value: '' }]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/connections');
      if (data) setConnections(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConnections(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    let credentials = {};
    if (authType === 'apikey')  credentials = { api_key: apiKey };
    if (authType === 'bearer')  credentials = { token: bearerToken };
    if (authType === 'basic')   credentials = { username, password };
    if (authType === 'custom')  credentials = { headers: customHeaders.filter(h => h.key.trim()) };
    try {
      await apiRequest('/connections', {
        method: 'POST',
        body: JSON.stringify({ name, service, auth_type: authType, credentials })
      });
      setShowForm(false);
      resetForm();
      showSuccess('Credentials saved successfully!');
      fetchConnections();
    } catch (err) {
      showError('Error saving: ' + (err.message || err));
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await apiRequest(`/connections/${id}`, { method: 'DELETE' });
      if (response?.status === 'conflict') {
        const ok = await confirm({
          title: 'Credential In Use',
          message: `This credential is used by the following workflows:\n\n• ${response.workflows.join('\n• ')}\n\nDelete anyway? Those workflows may stop working.`,
          confirmLabel: 'Delete Anyway',
          cancelLabel: 'Keep It',
          danger: true,
        });
        if (ok) {
          await apiRequest(`/connections/${id}?force=true`, { method: 'DELETE' });
          showSuccess('Credential deleted.');
          fetchConnections();
        }
      } else {
        showSuccess('Credential deleted.');
        fetchConnections();
      }
    } catch (err) { showError('Error: ' + err.message); }
  };

  const resetForm = () => {
    setName(''); setService('openai'); setAuthType('bearer');
    setApiKey(''); setBearerToken(''); setUsername(''); setPassword('');
    setCustomHeaders([{ key: '', value: '' }]);
  };

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <RefreshCw className="animate-spin w-8 h-8" style={{ color: '#2563EB' }} />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>API Credentials</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Securely store authentication credentials for external service integrations.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="zappress-btn-primary flex items-center gap-2 px-4 py-2.5"
        >
          <Plus className="w-4 h-4" /> Add Credentials
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="zappress-modal w-full max-w-lg p-0 overflow-hidden">
            {/* Modal Header */}
            <div
              className="flex justify-between items-center px-6 py-5"
              style={{ borderBottom: '1px solid #E2E8F0' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                  <Shield className="w-4 h-4" style={{ color: '#2563EB' }} />
                </div>
                <h3 className="font-bold text-base" style={{ color: '#0F172A' }}>New API Credentials</h3>
              </div>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-0 bg-transparent"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                    Name *
                  </label>
                  <input type="text" required placeholder="e.g. OpenAI Production" value={name} onChange={e => setName(e.target.value)} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                    Service
                  </label>
                  <select value={service} onChange={e => setService(e.target.value)} className="w-full">
                    <option value="openai">OpenAI (ChatGPT)</option>
                    <option value="hubspot">HubSpot</option>
                    <option value="salesforce">Salesforce</option>
                    <option value="twilio">Twilio SMS</option>
                    <option value="whatsapp">WhatsApp Cloud API</option>
                    <option value="stripe">Stripe</option>
                    <option value="custom">Custom API Endpoint</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                  Authentication Type
                </label>
                <select value={authType} onChange={e => setAuthType(e.target.value)} className="w-full">
                  <option value="bearer">Bearer Token (OAuth2)</option>
                  <option value="apikey">API Key</option>
                  <option value="basic">Basic Auth (Username / Password)</option>
                  <option value="custom">Custom HTTP Headers</option>
                </select>
              </div>

              {authType === 'bearer' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>Bearer Token</label>
                  <input type="password" required placeholder="Paste bearer token…" value={bearerToken} onChange={e => setBearerToken(e.target.value)} className="w-full" style={{ fontFamily: 'monospace' }} />
                </div>
              )}
              {authType === 'apikey' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>API Key</label>
                  <input type="password" required placeholder="Paste API key…" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full" style={{ fontFamily: 'monospace' }} />
                </div>
              )}
              {authType === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>Username</label>
                    <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>Password</label>
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full" />
                  </div>
                </div>
              )}
              {authType === 'custom' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Custom Headers</label>
                    <button type="button" onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
                      className="text-xs font-semibold cursor-pointer border-0 bg-transparent" style={{ color: '#2563EB' }}>
                      + Add Header
                    </button>
                  </div>
                  {customHeaders.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" placeholder="Header Name" value={h.key} onChange={e => { const u=[...customHeaders]; u[i].key=e.target.value; setCustomHeaders(u); }} className="flex-1" />
                      <input type="password" placeholder="Value" value={h.value} onChange={e => { const u=[...customHeaders]; u[i].value=e.target.value; setCustomHeaders(u); }} className="flex-1" />
                      {customHeaders.length > 1 && (
                        <button type="button" onClick={() => setCustomHeaders(customHeaders.filter((_,idx)=>idx!==i))}
                          className="cursor-pointer border-0 bg-transparent" style={{ color: '#EF4444' }}>
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2" style={{ borderTop: '1px solid #F1F5F9', marginTop: '8px', paddingTop: '16px' }}>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="zappress-btn-secondary px-4 py-2 text-sm">
                  Cancel
                </button>
                <button type="submit" className="zappress-btn-primary px-5 py-2 text-sm">
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      {connections.length === 0 ? (
        <div className="zappress-card p-14 text-center">
          <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F1F5F9' }}>
            <Shield className="w-7 h-7" style={{ color: '#94A3B8' }} />
          </div>
          <p className="font-semibold text-base" style={{ color: '#0F172A' }}>No API Credentials</p>
          <p className="text-sm mt-1.5 max-w-sm mx-auto" style={{ color: '#64748B' }}>
            Add credentials to use in outbound API call steps inside your workflows.
          </p>
          <button onClick={() => setShowForm(true)} className="zappress-btn-primary mt-5 px-5 py-2.5 text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add First Credential
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((conn) => {
            const style = SERVICE_STYLES[conn.service] || SERVICE_STYLES.custom;
            return (
              <div
                key={conn.id}
                className="zappress-card p-5 space-y-4"
                style={{ borderLeft: `3px solid ${style.accent}` }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: style.bg }}
                    >
                      <Key className="w-4 h-4" style={{ color: style.accent }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight" style={{ color: '#0F172A' }}>
                        {conn.name}
                      </h3>
                      <p className="text-[11px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: style.accent }}>
                        {style.label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(conn.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-0 bg-transparent transition-colors"
                    style={{ color: '#94A3B8' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div
                  className="flex justify-between items-center pt-3"
                  style={{ borderTop: '1px solid #F1F5F9' }}
                >
                  <span className="text-xs font-medium" style={{ color: '#64748B' }}>
                    {AUTH_LABELS[conn.auth_type] || conn.auth_type}
                  </span>
                  <span
                    className="zappress-badge"
                    style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
                  >
                    <ShieldCheck className="w-3 h-3 mr-1" /> {conn.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
