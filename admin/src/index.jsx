import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './components/Dashboard';
import Workflows from './components/Workflows';
import Connections from './components/Connections';
import Logs from './components/Logs';
import Settings from './components/Settings';
import Help from './components/Help';
import Templates from './components/Templates';
import { UIProvider } from './context/UIContext';
import './tailwind.css';

import { LayoutDashboard, Share2, LayoutGrid, Shield, FileText, Settings as SettingsIcon, HelpCircle, LogOut, Zap } from 'lucide-react';

/**
 * Main Application Shell Component
 * Acts as the entry point and sidebar layout router for ZapPress admin.
 * Provides global toast/modal UI notifications context.
 */
function App() {
  const [activeTab, setActiveTab] = useState(window.zapPressSettings?.current_tab || 'dashboard');

  const apiRequest = async (path, options = {}) => {
    const rootUrl = window.zapPressSettings?.root || '/wp-json/';
    const nonce = window.zapPressSettings?.nonce;
    const url = `${rootUrl}zappress/v1${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
      ...(options.headers || {})
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'REST Request failed');
    }
    if (response.status === 204) return null;
    return response.json();
  };

  const menuItems = [
    { id: 'dashboard',   name: 'Dashboard',       icon: LayoutDashboard },
    { id: 'workflows',   name: 'Workflows',        icon: Share2 },
    { id: 'templates',   name: 'Templates',        icon: LayoutGrid },
    { id: 'connections', name: 'API Credentials',  icon: Shield },
    { id: 'logs',        name: 'Execution Logs',   icon: FileText },
    { id: 'settings',   name: 'Settings',          icon: SettingsIcon },
    { id: 'help',        name: 'Help & Docs',      icon: HelpCircle },
  ];

  return (
    <div className="w-full h-full flex overflow-hidden bg-slate-50">

      {/* ── Sidebar ── */}
      <aside
        className="w-60 flex flex-col justify-between select-none bg-white border-r border-slate-200 min-w-[240px]"
      >
        {/* Brand */}
        <div>
          <div className="px-5 py-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-600"
              >
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-bold text-sm leading-none text-slate-900">
                  ZapPress
                </p>
                <p className="text-[10px] mt-0.5 font-medium text-slate-400">
                  Workflow Platform
                </p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-3 space-y-0.5">
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Navigation
            </p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', item.id);
                    window.history.replaceState({}, '', url.toString());
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 text-left cursor-pointer border-0 ${
                    isActive ? 'bg-blue-55 text-blue-600 font-semibold bg-blue-50' : 'bg-transparent text-slate-500 font-medium hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                  />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200">
          <a
            href={window.zapPressSettings?.admin_url || '/wp-admin/'}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer border-0 no-underline text-slate-500 bg-transparent hover:bg-slate-50 hover:text-slate-700"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            Back to WordPress
          </a>
          <div
            className="mt-2 px-3 py-1.5 rounded-lg text-[10px] text-center font-medium bg-slate-50 text-slate-400 border border-slate-200"
          >
            ZapPress v{window.zapPressSettings?.version || '1.0.0'}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main
        className="flex-1 overflow-y-auto bg-slate-50"
      >
        <div className="max-w-5xl mx-auto px-8 py-8">
          {activeTab === 'dashboard'   && <Dashboard   apiRequest={apiRequest} setActiveTab={setActiveTab} />}
          {activeTab === 'workflows'   && <Workflows   apiRequest={apiRequest} />}
          {activeTab === 'templates'   && <Templates   apiRequest={apiRequest} setActiveTab={setActiveTab} />}
          {activeTab === 'connections' && <Connections apiRequest={apiRequest} />}
          {activeTab === 'logs'        && <Logs        apiRequest={apiRequest} />}
          {activeTab === 'settings'    && <Settings apiRequest={apiRequest} />}
          {activeTab === 'help'        && <Help apiRequest={apiRequest} />}
        </div>
      </main>
    </div>
  );
}

const rootElement = document.getElementById('zappress-admin-root');
if (rootElement) {
  createRoot(rootElement).render(
    <UIProvider>
      <App />
    </UIProvider>
  );
}
