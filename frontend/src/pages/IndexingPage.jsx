import React from 'react';
import ProgressBar from '../components/ProgressBar';

export default function IndexingPage({ task, onCancel }) {
  if (!task) return null;
  const { slug, percent, current_file, status, processed_files = 0, total_files = 0, files = [], error } = task;

  const formatSlug = (s) => {
    if (!s) return '';
    const parts = s.split('_');
    return parts.length >= 2 ? `${parts.slice(0, -1).join('_')}/${parts[parts.length - 1]}` : s;
  };

  const getEta = () => {
    const remaining = total_files - processed_files;
    if (remaining <= 0 || status === 'completed') return 'Finishing up...';
    const secs = Math.ceil(remaining * 1.5);
    return secs < 60 ? `~${secs}s remaining` : `~${Math.ceil(secs / 60)}m remaining`;
  };

  const PHASE_LABELS = {
    pending: 'Queued',
    cloning: 'Cloning repository',
    traversing: 'Scanning files',
    chunking: 'AST chunking',
    embedding: 'Generating embeddings',
    saving: 'Saving to cache',
    completed: 'Complete',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  const PHASES = ['cloning', 'traversing', 'chunking', 'embedding', 'saving', 'completed'];
  const currentPhaseIdx = PHASES.indexOf(status);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          position: 'relative',
        }}
      >
        {/* Left: Progress panel */}
        <div
          className="apple-card"
          style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: status === 'failed' ? '#FF453A' : status === 'completed' ? '#30D158' : '#2997FF',
                }}
              />
              <span style={{ fontSize: '11px', color: '#86868B', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Indexing Repository
              </span>
            </div>
            <h2 className="headline-gradient" style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              {formatSlug(slug)}
            </h2>
          </div>

          {/* Progress */}
          <div>
            <ProgressBar progress={percent} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ fontSize: '12px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>
                {PHASE_LABELS[status] || status}
              </span>
              <span style={{ fontSize: '12px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>
                {processed_files}/{total_files} files
              </span>
            </div>
          </div>

          {/* Phase pipeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PHASES.filter(p => p !== 'completed').map((phase, i) => {
              const isDone = currentPhaseIdx > i;
              const isCurrent = currentPhaseIdx === i;
              return (
                <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: isDone
                        ? 'rgba(48,209,88,0.15)'
                        : isCurrent
                        ? '#2997FF'
                        : 'rgba(255,255,255,0.06)',
                      border: isDone ? '1px solid rgba(48,209,88,0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: isDone ? '#30D158' : isCurrent ? '#000000' : '#86868B',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      color: isDone ? '#30D158' : isCurrent ? '#F5F5F7' : '#6E6E73',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: isCurrent ? 500 : 400,
                    }}
                  >
                    {PHASE_LABELS[phase]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Current file */}
          {current_file && status !== 'completed' && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#86868B',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: '#2997FF' }}>→ </span>{current_file}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '12px',
                background: 'rgba(255,69,58,0.08)',
                border: '1px solid rgba(255,69,58,0.2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#FF453A',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '12px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>
              {getEta()}
            </span>
            {status !== 'completed' && status !== 'failed' && status !== 'cancelled' && (
              <button
                onClick={() => onCancel(slug)}
                className="btn-apple-secondary"
                style={{ padding: '4px 12px', fontSize: '11px' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Right: File tree preview */}
        <div
          className="apple-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
            <p style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              File Tree Preview
            </p>
            <span style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>
              {files.length} files
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {files.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '14px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.04)',
                      width: `${60 + Math.random() * 30}%`,
                    }}
                  />
                ))}
              </div>
            ) : (
              [...files].sort().map((file) => {
                const isCurrent = file === current_file;
                return (
                  <div
                    key={file}
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: isCurrent ? '#2997FF' : '#86868B',
                      padding: '3px 0',
                      paddingLeft: isCurrent ? '6px' : '0px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isCurrent && <span style={{ color: '#2997FF', marginRight: '4px' }}>›</span>}
                    {file}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
