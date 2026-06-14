import React, { useState, useEffect } from 'react';
import { Play, Pause, AlertCircle, CheckCircle, RefreshCw, Server, Calendar, TrendingUp } from 'lucide-react';

/**
 * Dashboard Component
 * Renders quick stats counters, recent execution logs feed,
 * API connections statuses, and upcoming scheduled tasks list.
 *
 * @param {object} props
 * @param {function} props.apiRequest REST client request helper
 * @param {function} props.setActiveTab Sidebar tab router switcher
 */
export default function Dashboard({ apiRequest, setActiveTab }) {
  const [stats, setStats] = useState({
    workflows: { total: 0, active: 0, paused: 0, failed: 0 },
    executions: { success: 0, failed: 0 }
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsData = await apiRequest('/stats');
      const logsData  = await apiRequest('/logs?limit=5');
      const connData  = await apiRequest('/connections');
      if (statsData) setStats(statsData);
      if (logsData)  setRecentLogs(logsData);
      if (connData)  setConnections(connData);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <RefreshCw className="animate-spin w-8 h-8" style={{ color: '#2563EB' }} />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Active Workflows',
      value: stats.workflows.active,
      icon: Play,
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
      accent: '#22C55E',
    },
    {
      label: 'Paused',
      value: stats.workflows.paused,
      icon: Pause,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      accent: '#F59E0B',
    },
    {
      label: 'Failed Runs',
      value: stats.executions.failed,
      icon: AlertCircle,
      iconBg: '#FEE2E2',
      iconColor: '#DC2626',
      accent: '#EF4444',
    },
    {
      label: 'Total Workflows',
      value: stats.workflows.total,
      icon: Server,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      accent: '#2563EB',
    },
  ];

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Monitor your automation workflows and execution history.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0', color: '#374151' }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="zappress-card p-5 flex items-center justify-between"
              style={{ borderLeft: `3px solid ${card.accent}` }}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>
                  {card.label}
                </p>
                <p className="text-3xl font-bold mt-1.5 tabular-nums" style={{ color: '#0F172A' }}>
                  {card.value}
                </p>
              </div>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: card.iconBg }}
              >
                <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Executions */}
        <div className="lg:col-span-2 zappress-card">
          <div
            className="flex justify-between items-center px-5 py-4"
            style={{ borderBottom: '1px solid #F1F5F9' }}
          >
            <h3 className="font-semibold text-sm" style={{ color: '#0F172A' }}>
              Recent Executions
            </h3>
            <button
              onClick={() => setActiveTab('logs')}
              className="text-xs font-semibold cursor-pointer border-0 bg-transparent transition-colors"
              style={{ color: '#2563EB' }}
            >
              View all →
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: '#94A3B8' }}>
                No runs recorded yet.
              </p>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between items-center px-5 py-3.5 transition-colors"
                  style={{ cursor: 'default' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#0F172A' }}>
                      {log.workflow_name || 'Deleted Workflow'}
                    </p>
                    <p className="text-[11px] mt-0.5 font-mono" style={{ color: '#94A3B8' }}>
                      {log.created_at} · {log.duration_ms}ms
                    </p>
                  </div>
                  {log.status === 'success' ? (
                    <span className="zappress-badge zappress-badge-success">
                      <CheckCircle className="w-3 h-3 mr-1" /> Success
                    </span>
                  ) : (
                    <span className="zappress-badge zappress-badge-danger">
                      <AlertCircle className="w-3 h-3 mr-1" /> Failed
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">

          {/* Credentials Status */}
          <div className="zappress-card">
            <div
              className="flex justify-between items-center px-5 py-4"
              style={{ borderBottom: '1px solid #F1F5F9' }}
            >
              <h3 className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                Credentials
              </h3>
              <button
                onClick={() => setActiveTab('connections')}
                className="text-xs font-semibold cursor-pointer border-0 bg-transparent"
                style={{ color: '#2563EB' }}
              >
                Manage →
              </button>
            </div>
            <div className="px-5 py-4">
              {connections.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#94A3B8' }}>
                  No credentials configured.
                </p>
              ) : (
                <div className="space-y-3">
                  {connections.map((conn) => (
                    <div key={conn.id} className="flex justify-between items-center">
                      <span className="flex items-center gap-2 text-sm font-medium capitalize" style={{ color: '#374151' }}>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${conn.status === 'connected' ? 'zappress-pulse-green' : ''}`}
                          style={{ background: conn.status === 'connected' ? '#22C55E' : '#EF4444' }}
                        />
                        {conn.service}
                      </span>
                      <span
                        className="zappress-badge"
                        style={conn.status === 'connected'
                          ? { background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }
                          : { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }
                        }
                      >
                        {conn.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Jobs */}
          <div className="zappress-card">
            <div
              className="flex items-center gap-2 px-5 py-4"
              style={{ borderBottom: '1px solid #F1F5F9' }}
            >
              <Calendar className="w-4 h-4" style={{ color: '#06B6D4' }} />
              <h3 className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                Upcoming Jobs
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { name: 'Daily Sales Summary',  time: 'Tonight 12:00 AM' },
                { name: 'CRM Customer Sync',    time: 'Hourly (14 mins)' },
              ].map((job) => (
                <div key={job.name} className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#374151' }}>{job.name}</span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}
                  >
                    {job.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
