import React, { useState, useEffect } from 'react';
import { Search, Eye, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Logs Component
 * Displays execution logs list of all run workflows.
 * Allows filtering by status and inspects details of individual execution steps inside a sliding drawer.
 *
 * @param {object} props
 * @param {function} props.apiRequest REST client request helper
 */
export default function Logs({ apiRequest }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/logs?status=${filterStatus}`);
      if (data) setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [filterStatus]);

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center py-24">
        <RefreshCw className="animate-spin w-8 h-8" style={{ color: '#2563EB' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>Execution Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Analyze flow execution outcomes, payloads, and API responses.
          </p>
        </div>
        <div className="flex gap-2.5">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm font-medium cursor-pointer"
            style={{ background: '#FFFFFF', borderColor: '#E2E8F0', color: '#374151' }}
          >
            <option value="">All Outcomes</option>
            <option value="success">Success Only</option>
            <option value="failed">Failed Only</option>
          </select>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border"
            style={{ background: '#FFFFFF', borderColor: '#E2E8F0', color: '#374151' }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="zappress-card overflow-hidden">
        <table className="min-w-full zappress-table">
          <thead>
            <tr>
              <th>Execution Time</th>
              <th>Workflow</th>
              <th>Duration</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-14" style={{ color: '#94A3B8' }}>
                  No execution history recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap font-mono text-xs" style={{ color: '#64748B' }}>
                    {log.created_at}
                  </td>
                  <td className="font-semibold" style={{ color: '#0F172A' }}>
                    {log.workflow_name || 'Deleted Workflow'}
                  </td>
                  <td className="font-mono text-xs" style={{ color: '#64748B' }}>
                    {log.duration_ms}ms
                  </td>
                  <td>
                    {log.status === 'success' ? (
                      <span className="zappress-badge zappress-badge-success">
                        <CheckCircle className="w-3 h-3 mr-1" /> Success
                      </span>
                    ) : (
                      <span className="zappress-badge zappress-badge-danger">
                        <AlertCircle className="w-3 h-3 mr-1" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1 text-sm font-semibold cursor-pointer border-0 bg-transparent"
                      style={{ color: '#2563EB' }}
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Log Drawer */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <div className="fixed inset-0" onClick={() => setSelectedLog(null)} />
          <div
            className="relative w-full max-w-2xl h-full overflow-y-auto flex flex-col z-10"
            style={{ background: '#FFFFFF', borderLeft: '1px solid #E2E8F0', boxShadow: '-8px 0 32px rgba(15,23,42,0.12)' }}
          >
            {/* Drawer Header */}
            <div
              className="flex justify-between items-center px-6 py-5 sticky top-0"
              style={{ background: '#FFFFFF', borderBottom: '1px solid #F1F5F9', zIndex: 10 }}
            >
              <div>
                <h3 className="font-bold text-base" style={{ color: '#0F172A' }}>
                  {selectedLog.workflow_name || 'Deleted Workflow'}
                </h3>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: '#94A3B8' }}>
                  Run #{selectedLog.id} · {selectedLog.created_at}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-0 bg-transparent transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#374151'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-6">
              {/* Summary Stats */}
              <div
                className="grid grid-cols-3 gap-4 rounded-xl p-4"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Status</p>
                  <p className={`font-bold text-sm mt-1 capitalize ${selectedLog.status === 'success' ? '' : ''}`}
                    style={{ color: selectedLog.status === 'success' ? '#16A34A' : '#DC2626' }}>
                    {selectedLog.status}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Duration</p>
                  <p className="font-bold text-sm mt-1 font-mono" style={{ color: '#0F172A' }}>{selectedLog.duration_ms}ms</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Errors</p>
                  <p className="font-bold text-sm mt-1" style={{ color: '#0F172A' }}>
                    {selectedLog.error_message ? 'Yes' : 'None'}
                  </p>
                </div>
              </div>

              {/* Error */}
              {selectedLog.error_message && (
                <div className="rounded-xl p-4 space-y-1.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#B91C1C' }}>Error</p>
                  <p className="text-sm font-mono leading-relaxed" style={{ color: '#991B1B' }}>
                    {selectedLog.error_message}
                  </p>
                </div>
              )}

              {/* Step Logs */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm" style={{ color: '#0F172A' }}>Executed Steps</h4>
                {selectedLog.request_response_data?.map((step, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
                    <div
                      className="flex justify-between items-center px-4 py-3"
                      style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}
                    >
                      <span className="font-semibold text-sm capitalize" style={{ color: '#0F172A' }}>
                        {step.type?.replace(/_/g, ' ')} ({step.step})
                      </span>
                      <span
                        className="zappress-badge"
                        style={step.status === 'success' || step.status === 'passed'
                          ? { background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }
                          : { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }
                        }
                      >
                        {step.status}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      {step.request && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
                            Request · <span className="font-mono normal-case" style={{ color: '#2563EB' }}>{step.request.method}</span> {step.request.url}
                          </p>
                          <pre className="zappress-code overflow-x-auto">
                            {typeof step.request.body === 'string' ? step.request.body : JSON.stringify(step.request.body, null, 2)}
                          </pre>
                        </div>
                      )}
                      {step.response && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
                            Response · HTTP {step.response.code}
                          </p>
                          <pre className="zappress-code overflow-x-auto">
                            {typeof step.response.body === 'string' ? step.response.body : JSON.stringify(step.response.body, null, 2)}
                          </pre>
                        </div>
                      )}
                      {!step.request && !step.response && (
                        <pre className="zappress-code overflow-x-auto">{JSON.stringify(step, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Context Snapshot */}
              <div>
                <h4 className="font-semibold text-sm mb-2" style={{ color: '#0F172A' }}>Runtime Context</h4>
                <pre className="zappress-code overflow-x-auto max-h-64">
                  {JSON.stringify(selectedLog.context_snapshot, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
