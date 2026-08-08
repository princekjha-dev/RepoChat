import React from 'react';

/**
 * ProgressBar — Animated gradient progress bar with percentage and label.
 */
export default function ProgressBar({ progress = 0, label = '', showPercent = true }) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {(label || showPercent) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && (
            <span style={{ fontSize: '11px', color: '#5A5A7A', fontFamily: 'JetBrains Mono, monospace' }}>
              {label}
            </span>
          )}
          {showPercent && (
            <span
              style={{
                fontSize: '11px',
                color: '#8B5CF6',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                marginLeft: 'auto',
              }}
            >
              {pct}%
            </span>
          )}
        </div>
      )}
      <div
        style={{
          height: '4px',
          background: '#1E1E2E',
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #7C3AED 0%, #8B5CF6 50%, #A78BFA 100%)',
            borderRadius: '2px',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
          }}
        />
      </div>
    </div>
  );
}
