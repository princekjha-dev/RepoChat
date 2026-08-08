import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', icon: '#10B981', text: '#34D399' },
  error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', icon: '#EF4444', text: '#F87171' },
  warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', icon: '#F59E0B', text: '#FCD34D' },
  info: { bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.25)', icon: '#8B5CF6', text: '#A78BFA' },
};

function Toast({ toast }) {
  const removeToast = useStore((s) => s.removeToast);
  const [exiting, setExiting] = useState(false);
  const colors = COLORS[toast.type] || COLORS.info;

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => removeToast(toast.id), 200);
  };

  return (
    <div
      className={exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 16px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '10px',
        backdropFilter: 'blur(12px)',
        minWidth: '280px',
        maxWidth: '400px',
        cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
      onClick={handleClose}
    >
      <span style={{ color: colors.icon, fontSize: '14px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>
        {ICONS[toast.type]}
      </span>
      <span style={{ color: colors.text, fontSize: '13px', lineHeight: '1.5', flex: 1 }}>
        {toast.message}
      </span>
      <button
        style={{ color: '#5A5A7A', fontSize: '16px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <Toast toast={t} />
        </div>
      ))}
    </div>
  );
}

export function addToast(message, type = 'info') {
  useStore.getState().addToast(message, type);
}
