import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { streamRepoSummary } from '../api/client';
import { useStore } from '../store/useStore';
import { addToast } from './Toast';
import CodeBlock from './CodeBlock';
import ArchitectureGraph from './ArchitectureGraph';

const markdownComponents = {
  code({ node, inline, className, children }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeText = String(children).replace(/\n$/, '');
    if (!inline && (match || codeText.includes('\n'))) {
      return <CodeBlock code={codeText} language={match?.[1] || 'text'} />;
    }
    return (
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '0.1em 0.35em', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#2997FF', border: '1px solid rgba(255,255,255,0.12)' }}>
        {children}
      </code>
    );
  },
};

const StatIcons = {
  files: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  chunks: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  size: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  lang: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

export default function RepoSummary({ slug, activeRepo, repoMeta }) {
  const currentSlug = slug || activeRepo;
  const { summaryContent, setSummaryContent } = useStore();
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);

  const cachedContent = summaryContent[currentSlug] || '';

  const handleGenerate = async () => {
    if (!currentSlug) {
      addToast('No active repository selected for summary generation.', 'warning');
      return;
    }

    if (streaming) {
      abortRef.current?.abort();
      return;
    }

    setSummaryContent(currentSlug, '');
    setStreaming(true);
    abortRef.current = new AbortController();

    let accumulated = '';

    await streamRepoSummary(
      currentSlug,
      {
        onToken: (token) => {
          accumulated += token;
          setSummaryContent(currentSlug, accumulated);
        },
        onError: (err) => {
          addToast(err.message || 'Summary generation failed.', 'error');
          setStreaming(false);
        },
        onComplete: () => {
          setStreaming(false);
        },
      },
      abortRef.current.signal
    );
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000000', overflowY: 'auto' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', width: '100%', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h2 className="headline-gradient" style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '6px' }}>
              Repository Analysis
            </h2>
            <p style={{ fontSize: '14px', color: '#86868B' }}>
              Deep AI analysis of {currentSlug?.replace('_', '/')} — architecture, tech stack, and code patterns.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className={streaming ? '' : 'btn-apple-primary'}
            style={{
              padding: '10px 20px',
              background: streaming ? 'rgba(255,69,58,0.1)' : '#F5F5F7',
              border: streaming ? '1px solid rgba(255,69,58,0.3)' : 'none',
              color: streaming ? '#FF453A' : '#000000',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {streaming ? (
              <>
                <div style={{ width: 10, height: 10, borderRadius: '2px', background: '#FF453A' }} />
                Stop
              </>
            ) : cachedContent ? (
              'Regenerate Analysis'
            ) : (
              'Generate Analysis'
            )}
          </button>
        </div>

        {/* Repo quick stats */}
        {repoMeta && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            {[
              { label: 'Files Indexed', value: repoMeta.file_count || 0, icon: StatIcons.files },
              { label: 'Code Chunks', value: repoMeta.chunk_count || 0, icon: StatIcons.chunks },
              {
                label: 'Repository Size',
                value: repoMeta.total_size ? `${(repoMeta.total_size / 1024).toFixed(1)} KB` : '—',
                icon: StatIcons.size,
              },
              {
                label: 'Languages',
                value: Object.keys(repoMeta.languages || {}).length,
                icon: StatIcons.lang,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="apple-card"
                style={{
                  padding: '18px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'inline-flex', color: '#86868B', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#F5F5F7', fontFamily: 'var(--font-mono)' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '11px', color: '#6E6E73', marginTop: '4px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Language breakdown */}
        {repoMeta?.languages && Object.keys(repoMeta.languages).length > 0 && (
          <div
            className="apple-card"
            style={{
              padding: '16px 20px',
              marginBottom: '32px',
            }}
          >
            <p style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              Language Distribution
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(repoMeta.languages).map(([ext, count]) => (
                <span
                  key={ext}
                  style={{
                    padding: '4px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '12px',
                    color: '#86868B',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {ext.slice(1).toUpperCase()} · {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Architecture SVG Map */}
        {repoMeta && (
          <ArchitectureGraph repoMeta={repoMeta} files={repoMeta.processed_files || []} />
        )}

        {/* Summary content */}
        {!cachedContent && !streaming && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: '#6E6E73',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#86868B', marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p style={{ fontSize: '15px', color: '#F5F5F7', marginBottom: '6px', fontWeight: 500 }}>
              No analysis generated yet
            </p>
            <p style={{ fontSize: '13px', color: '#86868B' }}>
              Click "Generate Analysis" to create an AI-powered architectural review.
            </p>
          </div>
        )}

        {cachedContent && (
          <div
            className="apple-card"
            style={{
              padding: '28px',
            }}
          >
            <div className="markdown-content">
              <ReactMarkdown components={markdownComponents}>
                {cachedContent}
              </ReactMarkdown>
              {streaming && <span className="streaming-cursor" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
