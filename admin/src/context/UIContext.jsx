import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, AlertOctagon } from 'lucide-react';

/* ── Context ────────────────────────────────────────────────── */
const UIContext = createContext(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}

/* ── Toast colours & icons ──────────────────────────────────── */
const TOAST_STYLES = {
  success: { bg: '#F0FDF4', border: '#86EFAC', color: '#15803D', Icon: CheckCircle },
  error:   { bg: '#FEF2F2', border: '#FCA5A5', color: '#B91C1C', Icon: XCircle     },
  warning: { bg: '#FFFBEB', border: '#FCD34D', color: '#B45309', Icon: AlertTriangle },
  info:    { bg: '#EFF6FF', border: '#93C5FD', color: '#1D4ED8', Icon: Info         },
};

/* ── Individual Toast ───────────────────────────────────────── */
function Toast({ id, type = 'info', message, onDismiss }) {
  const { bg, border, color, Icon } = TOAST_STYLES[type] || TOAST_STYLES.info;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        background: bg, border: `1px solid ${border}`, borderRadius: '10px',
        padding: '12px 14px', boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
        minWidth: '280px', maxWidth: '380px',
        animation: 'zappress-toast-in 0.25s ease',
      }}
    >
      <Icon style={{ color, width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
      <p style={{ flex: 1, fontSize: 13, color: '#0F172A', margin: 0, lineHeight: 1.5 }}>{message}</p>
      <button
        onClick={() => onDismiss(id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', flexShrink: 0 }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

/* ── Confirm Dialog ─────────────────────────────────────────── */
function ConfirmDialog({ config, onResolve }) {
  if (!config) return null;
  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = config;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0',
          boxShadow: '0 20px 60px rgba(15,23,42,0.18)', width: '100%', maxWidth: '420px',
          animation: 'zappress-dialog-in 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 22px 16px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: danger ? '#FEF2F2' : '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertOctagon style={{ width: 18, height: 18, color: danger ? '#EF4444' : '#2563EB' }} />
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{title}</h3>
        </div>

        {/* Body */}
        <p style={{ margin: '0 22px 20px', fontSize: 13, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {message}
        </p>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '14px 22px', borderTop: '1px solid #F1F5F9',
        }}>
          <button
            onClick={() => onResolve(false)}
            className="zappress-btn-secondary"
            style={{ padding: '7px 18px', fontSize: 13 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onResolve(true)}
            className={danger ? 'zappress-btn-danger' : 'zappress-btn-primary'}
            style={{ padding: '7px 18px', fontSize: 13 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Provider ───────────────────────────────────────────────── */
let _toastId = 0;

export function UIProvider({ children }) {
  const [toasts, setToasts]         = useState([]);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const resolveRef = useRef(null);

  /* Toast helpers */
  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => dismissToast(id), duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /* Shorthand helpers */
  const showSuccess = useCallback((msg) => toast(msg, 'success'), [toast]);
  const showError   = useCallback((msg) => toast(msg, 'error', 5000), [toast]);
  const showWarning = useCallback((msg) => toast(msg, 'warning'), [toast]);
  const showInfo    = useCallback((msg) => toast(msg, 'info'), [toast]);

  /* Confirm dialog — returns a Promise<boolean> */
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmConfig(typeof options === 'string' ? { title: 'Confirm', message: options } : options);
    });
  }, []);

  const handleConfirmResolve = (value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setConfirmConfig(null);
  };

  return (
    <UIContext.Provider value={{ toast, showSuccess, showError, showWarning, showInfo, confirm }}>
      {children}

      {/* Toast stack — top-right */}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 999998,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast id={t.id} type={t.type} message={t.message} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog config={confirmConfig} onResolve={handleConfirmResolve} />

      {/* Keyframe animations */}
      <style>{`
        @keyframes zappress-toast-in {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes zappress-dialog-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </UIContext.Provider>
  );
}
