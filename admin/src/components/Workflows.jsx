import React, { useState, useEffect } from 'react';
import { Plus, Trash, Play, Pause, Edit, ArrowRight, ArrowDown, ChevronUp, ChevronDown, Check, RefreshCw, Send, AlertTriangle, Share2 } from 'lucide-react';
import VariableSelector from './VariableSelector';
import { useUI } from '../context/UIContext';

/**
 * Workflows Component
 * Renders the main workflow manager wizard including trigger choices, execution step logic list,
 * conditional logic gates, API test triggers, status pausing/activation, and workflow deletions.
 *
 * @param {object} props
 * @param {function} props.apiRequest REST client request helper
 */
export default function Workflows({ apiRequest }) {
  const { showSuccess, showError, showInfo, confirm } = useUI();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Wizard State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('wp_post_published');
  const [triggerConfig, setTriggerConfig] = useState({});
  const [steps, setSteps] = useState([]);

  // API Tester logs
  const [testResults, setTestResults] = useState({});
  const [testingStepId, setTestingStepId] = useState(null);
  const [connections, setConnections] = useState([]);

  const fetchWorkflows = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiRequest('/workflows');
      if (data) setWorkflows(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    apiRequest('/connections').then(data => {
      if (data) setConnections(data);
    }).catch(err => console.error(err));
  }, []);

  const handleCreateNew = () => {
    setName('New Workflow');
    setDescription('');
    setTriggerType('wp_post_published');
    setTriggerConfig({});
    setSteps([]);
    setEditingWorkflow(null);
    setShowWizard(true);
  };

  const handleEdit = (w) => {
    setEditingWorkflow(w.id);
    setName(w.name);
    setDescription(w.description);
    setTriggerType(w.trigger_type);
    setTriggerConfig(w.trigger_config);
    setSteps(w.steps || []);
    setShowWizard(true);
  };

  const handleStatusToggle = async (w) => {
    const nextStatus = w.status === 'active' ? 'paused' : 'active';
    // Optimistic UI toggle to avoid reloading/flashing loading indicator
    setWorkflows(prev => prev.map(item => item.id === w.id ? { ...item, status: nextStatus } : item));
    try {
      await apiRequest(`/workflows/${w.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      fetchWorkflows(true);
    } catch (err) {
      // Revert if API request fails
      setWorkflows(prev => prev.map(item => item.id === w.id ? { ...item, status: w.status } : item));
      showError('Error updating status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Workflow',
      message: 'Are you sure you want to delete this workflow? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    try {
      await apiRequest(`/workflows/${id}`, { method: 'DELETE' });
      showSuccess('Workflow deleted successfully.');
      fetchWorkflows();
    } catch (err) {
      showError('Error deleting: ' + err.message);
    }
  };

  // Variable insertion handler
  const insertVariable = (stepIndex, fieldPath, variable) => {
    const updatedSteps = [...steps];
    const step = updatedSteps[stepIndex];
    
    // Check if fieldPath is nested (like headers.0.key)
    const parts = fieldPath.split('.');
    if (parts.length === 1) {
      step.config[parts[0]] = (step.config[parts[0]] || '') + variable;
    } else if (parts.length === 3 && parts[0] === 'headers') {
      const idx = parseInt(parts[1]);
      step.config.headers[idx][parts[2]] = (step.config.headers[idx][parts[2]] || '') + variable;
    }
    setSteps(updatedSteps);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const body = {
      name,
      description,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      steps
    };

    try {
      if (editingWorkflow) {
        await apiRequest(`/workflows/${editingWorkflow}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        await apiRequest('/workflows', {
          method: 'POST',
          body: JSON.stringify({ ...body, status: 'paused' })
        });
      }
      setShowWizard(false);
      showSuccess(editingWorkflow ? 'Workflow updated!' : 'Workflow created!');
      fetchWorkflows();
    } catch (err) {
      showError('Save failed: ' + err.message);
    }
  };

  // Step Management
  const addStep = (type) => {
    const stepId = `step_${Date.now()}`;
    let config = {};
    
    if (type === 'api_call') {
      config = { connection_id: '', method: 'POST', url: '', headers: [{ key: 'Content-Type', value: 'application/json' }], body: '' };
    } else if (type === 'condition') {
      config = { field_value: '', operator: 'equals', compare_value: '' };
    } else if (type === 'send_email') {
      config = { to: '{{site.admin_email}}', subject: 'Workflow Notification', message: 'Hello!' };
    } else if (type === 'create_post') {
      config = { title: '', content: '', post_type: 'post', post_status: 'draft' };
    } else if (type === 'response_mapping') {
      config = { source_value: '', destination_type: 'user_meta', destination_key: '', target_id: '' };
    } else if (type === 'openai_ai_action') {
      config = { connection_id: '', ai_task: 'summary', prompt: '' };
    }

    setSteps([...steps, { id: stepId, type, config }]);
  };

  const removeStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const newSteps = [...steps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setSteps(newSteps);
  };

  const handleTestApi = async (index, config) => {
    setTestingStepId(index);
    try {
      const response = await apiRequest('/api/test', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      setTestResults({ ...testResults, [index]: response });
    } catch (err) {
      setTestResults({ ...testResults, [index]: { success: false, error: err.message || "Failed request" } });
    } finally {
      setTestingStepId(null);
    }
  };

  if (loading && !showWizard) {
    return (
      <div className="flex justify-center items-center py-24">
        <RefreshCw className="animate-spin w-8 h-8" style={{ color: '#2563EB' }} />
      </div>
    );
  }

  const renderWorkflowPipeline = (w) => {
    const stepsList = w.steps || [];
    return (
      <div className="flex items-center gap-1.5 flex-wrap text-[10px]" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
        <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>{w.trigger_type.replace(/_/g, ' ')}</span>
        {stepsList.map((step, idx) => (
          <React.Fragment key={step.id}>
            <ArrowRight className="w-3 h-3 shrink-0" style={{ color: '#CBD5E1' }} />
            <span className="font-semibold capitalize shrink-0 px-2 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>{step.type.replace(/_/g, ' ')}</span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const filteredWorkflows = workflows.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          w.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || w.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {!showWizard ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>Workflows</h1>
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Automate business integrations by sequencing events, logic, and APIs.</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="zappress-btn-primary flex items-center gap-2 px-4 py-2.5"
            >
              <Plus className="w-4 h-4" /> Create Workflow
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center p-3 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <div className="relative flex-1 w-full">
              <span className="absolute left-3 top-2.5" style={{ color: '#94A3B8' }}>🔍</span>
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4"
                style={{ paddingTop: '7px', paddingBottom: '7px' }}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="paused">Paused Only</option>
              </select>
            </div>
          </div>

          {filteredWorkflows.length === 0 ? (
            <div className="zappress-card p-14 text-center max-w-xl mx-auto w-full">
              <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F1F5F9' }}>
                <Share2 className="w-7 h-7" style={{ color: '#94A3B8' }} />
              </div>
              <p className="font-bold text-base" style={{ color: '#0F172A' }}>No Workflows Found</p>
              <p className="text-sm mt-1.5 max-w-sm mx-auto" style={{ color: '#64748B' }}>
                Automations execute actions on events. Create a new workflow or adjust your search filters to get started.
              </p>
              <button onClick={handleCreateNew} className="zappress-btn-primary mt-5 px-5 py-2.5 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create First Workflow
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWorkflows.map((w) => (
                <div key={w.id} className="zappress-card p-5 space-y-4" style={{ borderLeft: '3px solid #2563EB' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm leading-tight" style={{ color: '#0F172A' }}>{w.name}</h3>
                      <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: '#64748B' }}>{w.description || 'No description provided.'}</p>
                    </div>
                    {/* Toggle Switch */}
                    <label className="zappress-switch shrink-0 ml-4">
                      <input
                        type="checkbox"
                        checked={w.status === 'active'}
                        onChange={() => handleStatusToggle(w)}
                      />
                      <span className="zappress-slider"></span>
                    </label>
                  </div>

                  {renderWorkflowPipeline(w)}

                  <div className="pt-3.5 flex justify-between items-center" style={{ borderTop: '1px solid #F1F5F9' }}>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>
                      {w.steps ? w.steps.length : 0} Steps
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(w)}
                        className="text-sm font-semibold bg-transparent border-0 cursor-pointer"
                        style={{ color: '#2563EB' }}
                      >
                        Edit →
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="text-sm font-semibold bg-transparent border-0 cursor-pointer"
                        style={{ color: '#EF4444' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* WORKFLOW BUILDER */
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>Workflow Builder</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block text-xl font-bold bg-transparent p-0 w-full mt-1"
                style={{ border: 'none', outline: 'none', color: '#0F172A', borderBottom: '2px dashed #E2E8F0' }}
                onFocus={e => e.target.style.borderBottomColor = '#2563EB'}
                onBlur={e => e.target.style.borderBottomColor = '#E2E8F0'}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="zappress-btn-primary px-4 py-2"
              >
                Save Workflow
              </button>
              <button
                onClick={() => setShowWizard(false)}
                className="zappress-btn-secondary px-4 py-2"
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Builder Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* TRIGGER CONFIG BLOCK */}
              <div className="zappress-card p-5" style={{ borderLeft: '3px solid #2563EB' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base" style={{ color: '#0F172A' }}>⚡ Trigger Event</h3>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>This event starts the workflow automatically.</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Trigger Event</label>
                    <select
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value)}
                      className="w-full border border-slate-800 bg-[#0B0F19] text-white rounded px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                    >
                      <optgroup label="WordPress Core Hooks">
                        <option value="wp_post_published">Post Published</option>
                        <option value="wp_post_updated">Post Updated</option>
                        <option value="wp_user_registered">User Registered</option>
                        <option value="wp_user_login">User Login</option>
                        <option value="wp_comment_added">Comment Added</option>
                      </optgroup>
                      <optgroup label="WooCommerce Hooks">
                        <option value="wc_order_created">Order Created</option>
                        <option value="wc_order_paid">Order Payment Completed</option>
                        <option value="wc_order_completed">Order Status Completed</option>
                        <option value="wc_order_refunded">Order Refunded</option>
                        <option value="wc_product_created">Product Created</option>
                      </optgroup>
                      <optgroup label="Automated Ticker">
                        <option value="scheduler">Clock-based Scheduler</option>
                      </optgroup>
                      <optgroup label="Webhooks Link">
                        <option value="webhook">Incoming Webhook Call</option>
                      </optgroup>
                    </select>
                  </div>

                  {triggerType === 'scheduler' && (
                    <div className="grid grid-cols-2 gap-4 col-span-2 pt-3 mt-1" style={{ borderTop: '1px solid #F1F5F9' }}>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>Execution Interval</label>
                        <select
                          value={triggerConfig.interval || 'hourly'}
                          onChange={(e) => setTriggerConfig({ ...triggerConfig, interval: e.target.value })}
                          className="w-full"
                        >
                          <option value="every_minute">Every Minute</option>
                          <option value="every_5_minutes">Every 5 Minutes</option>
                          <option value="hourly">Every Hour</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="custom">Custom Cron Expression</option>
                        </select>
                      </div>

                      {triggerConfig.interval === 'custom' && (
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>Cron Expression</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 0 7 * * MON"
                            value={triggerConfig.cron_expression || ''}
                            onChange={(e) => setTriggerConfig({ ...triggerConfig, cron_expression: e.target.value })}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {triggerType === 'webhook' && (
                    <div className="col-span-2 pt-3 mt-1 space-y-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>Inbound Webhook URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={
                            triggerConfig.webhook_token
                              ? `${window.zapPressSettings?.root || '/wp-json/'}zappress/v1/webhook/${triggerConfig.webhook_token}`
                              : 'Save workflow to generate unique webhook URL'
                          }
                          className="w-full"
                          style={{ fontFamily: 'monospace', fontSize: '11px' }}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!triggerConfig.webhook_token) {
                              try {
                                const res = await apiRequest('/webhook/generate-token');
                                if (res && res.token) {
                                  setTriggerConfig({ ...triggerConfig, webhook_token: res.token });
                                }
                              } catch (err) {
                                showError('Failed to generate token: ' + err.message);
                              }
                            } else {
                              navigator.clipboard.writeText(`${window.zapPressSettings?.root || '/wp-json/'}zappress/v1/webhook/${triggerConfig.webhook_token}`);
                              showInfo('Webhook URL copied to clipboard!');
                            }
                          }}
                          className="zappress-btn-primary px-3.5 py-1.5 shrink-0"
                        >
                          {triggerConfig.webhook_token ? 'Copy URL' : 'Generate'}
                        </button>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: '#64748B' }}>POST JSON payloads; access data via <code style={{ background: '#EFF6FF', color: '#2563EB', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>{`{{trigger.body.customer.email}}`}</code>.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Steps Divider Line */}
              {steps.length > 0 && (
                <div className="flex justify-center my-2">
                  <div className="h-6 w-px" style={{ background: '#CBD5E1' }}></div>
                </div>
              )}

              {/* WORKFLOW STEPS LIST */}
              <div className="space-y-0">
                {steps.map((step, idx) => {
                  const stepStyles = {
                    api_call:         { accent: '#4F46E5', bg: '#EEF2FF', color: '#4338CA' },
                    condition:        { accent: '#F59E0B', bg: '#FEF3C7', color: '#D97706' },
                    send_email:       { accent: '#10B981', bg: '#DCFCE7', color: '#059669' },
                    create_post:      { accent: '#2563EB', bg: '#EFF6FF', color: '#1D4ED8' },
                    response_mapping: { accent: '#06B6D4', bg: '#CFFAFE', color: '#0E7490' },
                    openai_ai_action: { accent: '#A855F7', bg: '#F5F3FF', color: '#7C3AED' },
                  };
                  const currentStyle = stepStyles[step.type] || { accent: '#64748B', bg: '#F1F5F9', color: '#475569' };

                  return (
                    <React.Fragment key={step.id}>
                      <div className="zappress-card p-5 relative space-y-4" style={{ borderLeft: `3px solid ${currentStyle.accent}` }}>
                        
                        {/* Step Header */}
                        <div className="flex justify-between items-center pb-2.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                              style={{ background: currentStyle.bg, color: currentStyle.color }}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-sm capitalize" style={{ color: '#0F172A' }}>
                              {step.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveStep(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 disabled:opacity-30 transition-colors bg-transparent border-0 cursor-pointer rounded"
                              style={{ color: '#94A3B8' }}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(idx, 'down')}
                              disabled={idx === steps.length - 1}
                              className="p-1 disabled:opacity-30 transition-colors bg-transparent border-0 cursor-pointer rounded"
                              style={{ color: '#94A3B8' }}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStep(idx)}
                              className="p-1 ml-1 transition-colors bg-transparent border-0 cursor-pointer rounded"
                              style={{ color: '#94A3B8' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                              onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      {/* API Call Form */}
                      {step.type === 'api_call' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">API Credentials (Optional)</label>
                            <select
                              value={step.config.connection_id || ''}
                              onChange={(e) => {
                                const updated = [...steps];
                                updated[idx].config.connection_id = e.target.value;
                                setSteps(updated);
                              }}
                              className="w-full border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none bg-[#0B0F19] text-white text-xs"
                            >
                              <option value="">No Credentials (Use Manual Headers)</option>
                              {connections.map(c => {
                                const authLabel = c.auth_type === 'bearer' ? 'Bearer Token' :
                                                  c.auth_type === 'apikey' ? 'API Key' :
                                                  c.auth_type === 'basic' ? 'Basic Auth' :
                                                  c.auth_type === 'custom' ? 'Custom Headers' : c.auth_type;
                                return (
                                  <option key={c.id} value={c.id}>
                                    {c.name} ({c.service} - {authLabel})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">HTTP Method</label>
                              <select
                                value={step.config.method}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.method = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                              >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="PATCH">PATCH</option>
                                <option value="DELETE">DELETE</option>
                              </select>
                            </div>

                            <div className="col-span-3">
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-slate-400 uppercase">Request Endpoint URL</label>
                                <VariableSelector onSelect={(v) => insertVariable(idx, 'url', v)} />
                              </div>
                              <input
                                type="url"
                                required
                                placeholder="https://api.crm.com/v1/contacts"
                                value={step.config.url}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.url = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {/* Headers key-value tables */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="block text-xs font-semibold text-slate-400 uppercase">Headers Table</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...steps];
                                  updated[idx].config.headers.push({ key: '', value: '' });
                                  setSteps(updated);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-semibold bg-transparent border-0 cursor-pointer"
                              >
                                + Add Header Row
                              </button>
                            </div>
                            {step.config.headers.map((header, hIdx) => (
                              <div key={hIdx} className="flex gap-2 items-center">
                                <div className="w-1/2 flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Header Key"
                                    value={header.key}
                                    onChange={(e) => {
                                      const updated = [...steps];
                                      updated[idx].config.headers[hIdx].key = e.target.value;
                                      setSteps(updated);
                                    }}
                                    className="w-full border border-slate-800 rounded px-2.5 py-1 focus:outline-none text-xs bg-[#0B0F19] text-white focus:border-blue-500"
                                  />
                                  <VariableSelector onSelect={(v) => insertVariable(idx, `headers.${hIdx}.key`, v)} />
                                </div>
                                <div className="w-1/2 flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Header Value"
                                    value={header.value}
                                    onChange={(e) => {
                                      const updated = [...steps];
                                      updated[idx].config.headers[hIdx].value = e.target.value;
                                      setSteps(updated);
                                    }}
                                    className="w-full border border-slate-800 rounded px-2.5 py-1 focus:outline-none text-xs bg-[#0B0F19] text-white focus:border-blue-500"
                                  />
                                  <VariableSelector onSelect={(v) => insertVariable(idx, `headers.${hIdx}.value`, v)} />
                                </div>
                                {step.config.headers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...steps];
                                      updated[idx].config.headers = updated[idx].config.headers.filter((_, i) => i !== hIdx);
                                      setSteps(updated);
                                    }}
                                    className="text-rose-500 hover:text-rose-450 bg-transparent border-0 cursor-pointer"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Raw body text editor */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-slate-400 uppercase">JSON Body Builder</label>
                              <VariableSelector onSelect={(v) => insertVariable(idx, 'body', v)} />
                            </div>
                            <textarea
                              rows="4"
                              placeholder={`{\n  "email": "{{trigger.billing_email}}",\n  "name": "{{trigger.billing_name}}"\n}`}
                              value={step.config.body}
                              onChange={(e) => {
                                const updated = [...steps];
                                updated[idx].config.body = e.target.value;
                                setSteps(updated);
                              }}
                              className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none font-mono text-xs bg-[#0B0F19] text-white focus:border-blue-500"
                            ></textarea>
                          </div>

                          <div className="pt-2 flex justify-between items-center" style={{ borderTop: '1px solid #F1F5F9' }}>
                            <button
                              type="button"
                              onClick={() => handleTestApi(idx, step.config)}
                              disabled={testingStepId === idx}
                              className="zappress-btn-primary flex items-center gap-2 px-3 py-1.5"
                              style={{ background: testingStepId === idx ? '#93C5FD' : undefined }}
                            >
                              <Send className="w-3.5 h-3.5" /> {testingStepId === idx ? 'Testing...' : 'Test API'}
                            </button>
                          </div>

                          {testResults[idx] && (
                            <div className="zappress-code overflow-x-auto max-h-40 space-y-2">
                              <p className="font-bold text-[10px] uppercase tracking-wider" style={{ color: '#64748B' }}>Test Outcome:</p>
                              {testResults[idx].success ? (
                                <>
                                  <p className="font-semibold" style={{ color: '#16A34A' }}>✓ HTTP {testResults[idx].response?.code || 200}</p>
                                  <pre className="text-[11px]" style={{ color: '#374151' }}>{JSON.stringify(testResults[idx].data, null, 2)}</pre>
                                </>
                              ) : (
                                <p className="font-semibold" style={{ color: '#DC2626' }}>✗ {testResults[idx].error}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Logical Condition Form */}
                      {step.type === 'condition' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-slate-400 uppercase">Input Value Field</label>
                                <VariableSelector onSelect={(v) => insertVariable(idx, 'field_value', v)} />
                              </div>
                              <input
                                type="text"
                                placeholder="e.g. {{trigger.total}}"
                                value={step.config.field_value}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.field_value = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Matching Operator</label>
                              <select
                                value={step.config.operator}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.operator = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                              >
                                <option value="equals">Equals</option>
                                <option value="not_equals">Not Equals</option>
                                <option value="contains">Contains</option>
                                <option value="starts_with">Starts With</option>
                                <option value="ends_with">Ends With</option>
                                <option value="greater_than">Greater Than</option>
                                <option value="less_than">Less Than</option>
                                <option value="empty">Is Empty</option>
                                <option value="not_empty">Is Not Empty</option>
                              </select>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-slate-400 uppercase">Comparison Value</label>
                                <VariableSelector onSelect={(v) => insertVariable(idx, 'compare_value', v)} />
                              </div>
                              <input
                                type="text"
                                placeholder="e.g. 500"
                                value={step.config.compare_value}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.compare_value = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Send Email Form */}
                      {step.type === 'send_email' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-slate-400 uppercase">To Recipient</label>
                                <VariableSelector onSelect={(v) => insertVariable(idx, 'to', v)} />
                              </div>
                              <input
                                type="text"
                                required
                                value={step.config.to}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.to = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-slate-400 uppercase">Subject</label>
                                <VariableSelector onSelect={(v) => insertVariable(idx, 'subject', v)} />
                              </div>
                              <input
                                type="text"
                                required
                                value={step.config.subject}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.subject = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-slate-400 uppercase">HTML Email Message</label>
                              <VariableSelector onSelect={(v) => insertVariable(idx, 'message', v)} />
                            </div>
                            <textarea
                              rows="3"
                              value={step.config.message}
                              onChange={(e) => {
                                const updated = [...steps];
                                updated[idx].config.message = e.target.value;
                                setSteps(updated);
                              }}
                              className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none text-xs bg-[#0B0F19] text-white focus:border-blue-500"
                            ></textarea>
                          </div>
                        </div>
                      )}

                      {/* Create Post Form */}
                      {step.type === 'create_post' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-slate-400 uppercase">Post Title</label>
                                <VariableSelector onSelect={(v) => insertVariable(idx, 'title', v)} />
                              </div>
                              <input
                                type="text"
                                required
                                value={step.config.title}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.title = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-3 py-1.5 bg-[#0B0F19] text-white focus:outline-none focus:border-blue-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Post Type</label>
                                <select
                                  value={step.config.post_type}
                                  onChange={(e) => {
                                    const updated = [...steps];
                                    updated[idx].config.post_type = e.target.value;
                                    setSteps(updated);
                                  }}
                                  className="w-full border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none bg-[#0B0F19] text-white text-xs"
                                >
                                  <option value="post">Post</option>
                                  <option value="page">Page</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Status</label>
                                <select
                                  value={step.config.post_status}
                                  onChange={(e) => {
                                    const updated = [...steps];
                                    updated[idx].config.post_status = e.target.value;
                                    setSteps(updated);
                                  }}
                                  className="w-full border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none bg-[#0B0F19] text-white text-xs"
                                >
                                  <option value="draft">Draft</option>
                                  <option value="publish">Published</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-slate-400 uppercase">Post Body Content</label>
                              <VariableSelector onSelect={(v) => insertVariable(idx, 'content', v)} />
                            </div>
                            <textarea
                              rows="3"
                              value={step.config.content}
                              onChange={(e) => {
                                const updated = [...steps];
                                updated[idx].config.content = e.target.value;
                                setSteps(updated);
                              }}
                              className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500 text-xs"
                            ></textarea>
                          </div>
                        </div>
                      )}
                      {/* OpenAI AI Action Form */}
                      {step.type === 'openai_ai_action' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">OpenAI API Credentials</label>
                              <select
                                value={step.config.connection_id || ''}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.connection_id = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none bg-[#0B0F19] text-white text-xs"
                              >
                                <option value="">Select Credentials</option>
                                {connections.filter(c => c.service === 'openai').map(c => {
                                  const authLabel = c.auth_type === 'bearer' ? 'Bearer Token' :
                                                    c.auth_type === 'apikey' ? 'API Key' :
                                                    c.auth_type === 'basic' ? 'Basic Auth' :
                                                    c.auth_type === 'custom' ? 'Custom Headers' : c.auth_type;
                                  return (
                                    <option key={c.id} value={c.id}>{c.name} ({authLabel})</option>
                                  );
                                })}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">AI Output Task</label>
                              <select
                                value={step.config.ai_task || 'summary'}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.ai_task = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none bg-[#0B0F19] text-white text-xs"
                              >
                                <option value="summary">Generate Summary</option>
                                <option value="blog">Generate Blog Post</option>
                                <option value="tags">Generate Tags list</option>
                                <option value="description">Generate SEO Meta Description</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-slate-400 uppercase">Input Text / Prompt Content</label>
                              <VariableSelector onSelect={(v) => insertVariable(idx, 'prompt', v)} />
                            </div>
                            <textarea
                              rows="4"
                              placeholder="Insert text or variables (e.g. {{trigger.post_content}})"
                              value={step.config.prompt}
                              onChange={(e) => {
                                const updated = [...steps];
                                updated[idx].config.prompt = e.target.value;
                                setSteps(updated);
                              }}
                              className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500 text-xs"
                            ></textarea>
                          </div>
                        </div>
                      )}

                      {/* Response Mapping Form */}
                      {step.type === 'response_mapping' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-slate-400 uppercase">Source Value</label>
                                <VariableSelector onSelect={(v) => insertVariable(idx, 'source_value', v)} />
                              </div>
                              <input
                                type="text"
                                required
                                placeholder="e.g. {{steps.step_1.customer_id}}"
                                value={step.config.source_value}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].config.source_value = e.target.value;
                                  setSteps(updated);
                                }}
                                className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Destination Type</label>
                                <select
                                  value={step.config.destination_type}
                                  onChange={(e) => {
                                    const updated = [...steps];
                                    updated[idx].config.destination_type = e.target.value;
                                    setSteps(updated);
                                  }}
                                  className="w-full border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none bg-[#0B0F19] text-white text-xs"
                                >
                                  <option value="user_meta">User Meta</option>
                                  <option value="post_meta">Post Meta</option>
                                  <option value="acf">ACF Field</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Destination Key</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. crm_user_id"
                                  value={step.config.destination_key}
                                  onChange={(e) => {
                                    const updated = [...steps];
                                    updated[idx].config.destination_key = e.target.value;
                                    setSteps(updated);
                                  }}
                                  className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-slate-400 uppercase">Target Object ID (Optional)</label>
                              <VariableSelector onSelect={(v) => insertVariable(idx, 'target_id', v)} />
                            </div>
                            <input
                              type="text"
                              placeholder="Defaults to active Trigger User ID / Post ID"
                              value={step.config.target_id}
                              onChange={(e) => {
                                const updated = [...steps];
                                updated[idx].config.target_id = e.target.value;
                                setSteps(updated);
                              }}
                              className="w-full border border-slate-800 rounded px-3 py-1.5 focus:outline-none bg-[#0B0F19] text-white focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      </div>

                      {/* Connector */}
                      {idx < steps.length - 1 && (
                        <div className="flex justify-center my-2">
                          <div className="h-5 w-px" style={{ background: '#CBD5E1' }}></div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {steps.length > 0 && (
                <div className="flex justify-center my-2">
                  <div className="h-5 w-px" style={{ background: '#CBD5E1' }}></div>
                </div>
              )}

              {/* ADD STEP PANEL */}
              <div className="zappress-card p-5 text-center space-y-4" style={{ borderStyle: 'dashed', borderColor: '#CBD5E1' }}>
                <p className="font-semibold text-sm" style={{ color: '#64748B' }}>+ Add Next Step</p>
                <div className="flex gap-2.5 justify-center flex-wrap">
                  {[
                    { type: 'api_call',         label: 'API Call',        accent: '#4F46E5', bg: '#EEF2FF' },
                    { type: 'condition',         label: 'Condition',       accent: '#F59E0B', bg: '#FEF3C7' },
                    { type: 'send_email',        label: 'Send Email',      accent: '#10B981', bg: '#DCFCE7' },
                    { type: 'create_post',       label: 'Create Post',     accent: '#2563EB', bg: '#EFF6FF' },
                    { type: 'response_mapping',  label: 'Map Response',    accent: '#06B6D4', bg: '#CFFAFE' },
                    { type: 'openai_ai_action',  label: 'OpenAI Action',   accent: '#A855F7', bg: '#F5F3FF' },
                  ].map((s) => (
                    <button
                      key={s.type}
                      type="button"
                      onClick={() => addStep(s.type)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold cursor-pointer border transition-all"
                      style={{ background: s.bg, color: s.accent, borderColor: s.bg }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = s.bg; }}
                    >
                      <Plus className="w-3.5 h-3.5" /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>


            {/* Right Sidebar */}
            <div className="space-y-5">
              <div className="zappress-card p-5 space-y-3">
                <h4 className="font-semibold text-sm pb-2.5" style={{ color: '#0F172A', borderBottom: '1px solid #F1F5F9' }}>Workflow Notes</h4>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>Description</label>
                  <textarea
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this workflow does…"
                    className="w-full"
                  ></textarea>
                </div>
              </div>

              <div className="zappress-card p-5 space-y-3">
                <h4 className="font-semibold text-sm pb-2.5 flex items-center gap-2" style={{ color: '#0F172A', borderBottom: '1px solid #F1F5F9' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} /> Tips
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
                  Use variables that match the trigger category:
                </p>
                <ul className="list-disc pl-4 text-xs space-y-1.5" style={{ color: '#64748B' }}>
                  <li><code style={{ background: '#FEF3C7', color: '#D97706', padding: '1px 4px', borderRadius: '3px' }}>{`{{trigger.billing_email}}`}</code> — WooCommerce only.</li>
                  <li><code style={{ background: '#EFF6FF', color: '#2563EB', padding: '1px 4px', borderRadius: '3px' }}>{`{{trigger.post_title}}`}</code> — Post events.</li>
                  <li><code style={{ background: '#F1F5F9', color: '#475569', padding: '1px 4px', borderRadius: '3px' }}>{`{{site.name}}`}</code> — Any trigger.</li>
                </ul>
              </div>
            </div>
      </div>
    </div>
  )}
</div>
  );
}
