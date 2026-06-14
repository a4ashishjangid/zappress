import React, { useState, useEffect } from 'react';
import { LayoutGrid, Search, ArrowRight, Download, Eye, CheckCircle, HelpCircle, Sparkles, MessageSquare, Database, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useUI } from '../context/UIContext';

const iconMap = {
  Database: Database,
  Sparkles: Sparkles,
  FileSpreadsheet: FileSpreadsheet,
};

/**
 * Templates Component
 * Displays a library of pre-built workflow templates that can be reviewed,
 * previewed, and deployed with a single click.
 *
 * @param {object} props
 * @param {function} props.apiRequest REST client request helper
 * @param {function} props.setActiveTab Sidebar tab router switcher
 */
export default function Templates({ apiRequest, setActiveTab }) {
  const { showSuccess, showError } = useUI();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [installingId, setInstallingId] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const categories = ['All', 'CRM', 'AI & Social', 'Lead Gen'];

  useEffect(() => {
    let active = true;
    const fetchTemplates = async () => {
      try {
        const data = await apiRequest('/templates');
        if (active) {
          setTemplates(data || []);
        }
      } catch (err) {
        showError('Failed to load templates: ' + err.message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchTemplates();
    return () => { active = false; };
  }, []);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = async (template) => {
    setInstallingId(template.id);
    try {
      // Post template config to workflow endpoint
      await apiRequest('/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name: `${template.name} (Installed)`,
          description: template.description,
          trigger_type: template.trigger_type,
          trigger_config: template.trigger_config,
          steps: template.steps,
          status: 'paused'
        })
      });

      setSuccessId(template.id);
      showSuccess(`"${template.name}" installed! Redirecting to Workflows...`);
      setTimeout(() => {
        setSuccessId(null);
        setActiveTab('workflows');
      }, 1500);
    } catch (err) {
      showError('Failed to install template: ' + err.message);
    } finally {
      setInstallingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading templates library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Template Library</h1>
          <p className="text-sm mt-0.5 text-slate-500 font-medium">Deploy pre-built automation workflows with one click.</p>
        </div>
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 pb-3 border-b border-slate-200">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer border-0 ${
              activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredTemplates.map((template) => {
          const Icon = iconMap[template.icon] || HelpCircle;
          const isInstalling = installingId === template.id;
          const isSuccess = successId === template.id;
          const ICON_COLORS = {
            'from-orange-500 to-amber-600': { bgClass: 'bg-amber-100', colorClass: 'text-amber-600' },
            'from-blue-500 to-indigo-600':  { bgClass: 'bg-blue-50', colorClass: 'text-blue-600' },
            'from-emerald-500 to-teal-600': { bgClass: 'bg-emerald-50', colorClass: 'text-emerald-600' },
            'from-purple-500 to-pink-600':  { bgClass: 'bg-purple-50', colorClass: 'text-purple-600' },
            'from-pink-500 to-rose-600':    { bgClass: 'bg-rose-50', colorClass: 'text-rose-600' },
            'from-cyan-500 to-blue-600':    { bgClass: 'bg-cyan-50', colorClass: 'text-cyan-600' },
          };
          const iconStyle = ICON_COLORS[template.color] || { bgClass: 'bg-blue-50', colorClass: 'text-blue-600' };

          return (
            <div
              key={template.id}
              className="zappress-card group flex flex-col justify-between p-5"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconStyle.bgClass}`}>
                    <Icon className={`w-5 h-5 ${iconStyle.colorClass}`} />
                  </div>
                  <span className="zappress-badge bg-slate-100 text-slate-500 border border-slate-200">
                    {template.category}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    {template.name}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed text-slate-500">
                    {template.description}
                  </p>
                </div>

                {/* Trigger Preview */}
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trigger:</span>
                  <span className="text-xs font-semibold capitalize text-slate-700">
                    {template.trigger_type.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setPreviewTemplate(template)}
                  className="zappress-btn-secondary flex items-center gap-1.5 px-3 py-2"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  disabled={isInstalling || isSuccess}
                  onClick={() => handleInstall(template)}
                  className={`zappress-btn-primary flex-1 flex items-center justify-center gap-1.5 px-4 py-2 ${
                    isSuccess ? 'bg-emerald-500 border-emerald-500' : ''
                  }`}
                >
                  {isSuccess ? (
                    <><CheckCircle className="w-3.5 h-3.5" /> Installed!</>
                  ) : isInstalling ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Installing...</>
                  ) : (
                    <><Download className="w-3.5 h-3.5" /> Import Template</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="zappress-modal w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900">
                <LayoutGrid className="w-4 h-4 text-blue-600" /> Template Preview
              </h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-0 bg-transparent text-lg font-bold text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <h4 className="font-semibold text-sm text-slate-900">{previewTemplate.name}</h4>
                <p className="text-xs mt-1 leading-relaxed text-slate-500">{previewTemplate.description}</p>
              </div>

              <div className="space-y-3">
                <h5 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Workflow Nodes</h5>

                {/* Trigger Node */}
                <div className="relative pl-6 pb-2 border-l-2 border-blue-200">
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-blue-600" />
                  <div className="rounded-lg p-3 bg-blue-50 border border-blue-200">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Trigger</p>
                    <p className="text-sm font-semibold capitalize mt-0.5 text-blue-800">{previewTemplate.trigger_type.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                {/* Steps */}
                {previewTemplate.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`relative pl-6 pb-2 ${
                      idx === previewTemplate.steps.length - 1 ? 'border-l-0' : 'border-l-2 border-slate-200'
                    }`}
                  >
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-slate-300" />
                    <div className="rounded-lg p-3 bg-slate-50 border border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Step {idx + 1}: {step.type.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-mono text-slate-400">#{step.id}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {step.type === 'api_call' && (
                          <>
                            <div className="text-xs"><span className="font-semibold text-slate-500">Method:</span> <code className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">{step.config.method}</code></div>
                            <div className="text-xs truncate"><span className="font-semibold text-slate-500">URL:</span> <code className="text-[10px] text-slate-700">{step.config.url}</code></div>
                          </>
                        )}
                        {step.type === 'openai_ai_action' && (
                          <>
                            <div className="text-xs"><span className="font-semibold text-slate-500">Task:</span> <span className="capitalize font-semibold text-slate-900">{step.config.ai_task}</span></div>
                          </>
                        )}
                        {step.type === 'response_mapping' && (
                          <div className="text-xs"><span className="font-semibold text-slate-500">Destination:</span> <code className="text-[10px] text-slate-700">{step.config.destination_type} ({step.config.destination_key})</code></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setPreviewTemplate(null)} className="zappress-btn-secondary px-4 py-2">Close</button>
              <button
                onClick={() => { setPreviewTemplate(null); handleInstall(previewTemplate); }}
                className="zappress-btn-primary px-4 py-2"
              >
                Import Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
