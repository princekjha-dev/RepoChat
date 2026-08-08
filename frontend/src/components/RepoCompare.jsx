import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { streamCompare } from '../api/client';
import { useStore } from '../store/useStore';
import { addToast } from './Toast';
import CodeBlock from './CodeBlock';

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

function formatSlug(slug) {
  if (!slug) return '—';
  const parts = slug.split('_');
  return parts.length >= 2 ? `${parts.slice(0, -1).join('_')}/${parts[parts.length - 1]}` : slug;
}

const CompareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
    <line x1="6" y1="9" x2="6" y2="21" />
  </svg>
);

export default function RepoCompare({ repos = [], activeRepo }) {
  const { compareContent, setCompareContent, compareRepo1, setCompareRepo1, compareRepo2, setCompareRepo2 } = useStore();
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);

  React.useEffect(() => {
    if (activeRepo && !compareRepo1) {
      setCompareRepo1(activeRepo);
    }
  }, [activeRepo, compareRepo1, setCompareRepo1]);

  const handleCompare = async () => {
    if (streaming) {
      abortRef.current?.abort();
      setStreaming(false);
      return;
    }

    if (!compareRepo1 || !compareRepo2) {
      addToast('Please select two repositories to compare.', 'warning');
      return;
    }

    if (compareRepo1 === compareRepo2) {
      addToast('Please select two different repositories.', 'warning');
      return;
    }

    setCompareContent('');
    setStreaming(true);
    abortRef.current = new AbortController();

    let accumulated = '';
    await streamCompare(
      compareRepo1,
      compareRepo2,
      {
        onToken: (token) => {
          accumulated += token;
          setCompareContent(accumulated);
        },
        onError: (err) => {
          addToast(err.message || 'Comparison failed.', 'error');
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
      <div style={{ maxWidth: '920px', margin: '0 auto', width: '100%', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h2 className="headline-gradient" style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Repository Comparison
          </h2>
          <p style={{ fontSize: '14px', color: '#86868B' }}>
            Select two indexed repositories for an AI-powered architectural and quality comparison.
          </p>
        </div>

        {/* Selector row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '20px',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          {/* Repo 1 */}
          <div className="apple-card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Repository A
            </p>
            <select
              value={compareRepo1 || ''}
              onChange={(e) => setCompareRepo1(e.target.value || null)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: compareRepo1 ? '#F5F5F7' : '#6E6E73',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="" style={{ background: '#000000', color: '#86868B' }}>Select repository...</option>
              {repos.filter((r) => r !== compareRepo2).map((r) => (
                <option key={r} value={r} style={{ background: '#000000', color: '#F5F5F7' }}>{formatSlug(r)}</option>
              ))}
            </select>
            {compareRepo1 && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2997FF' }} />
                <span style={{ fontSize: '12px', color: '#2997FF', fontFamily: 'var(--font-mono)' }}>
                  {formatSlug(compareRepo1)}
                </span>
              </div>
            )}
          </div>

          {/* VS badge */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: '#86868B',
              flexShrink: 0,
            }}
          >
            VS
          </div>

          {/* Repo 2 */}
          <div className="apple-card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Repository B
            </p>
            <select
              value={compareRepo2 || ''}
              onChange={(e) => setCompareRepo2(e.target.value || null)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: compareRepo2 ? '#F5F5F7' : '#6E6E73',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="" style={{ background: '#000000', color: '#86868B' }}>Select repository...</option>
              {repos.filter((r) => r !== compareRepo1).map((r) => (
                <option key={r} value={r} style={{ background: '#000000', color: '#F5F5F7' }}>{formatSlug(r)}</option>
              ))}
            </select>
            {compareRepo2 && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#A855F7' }} />
                <span style={{ fontSize: '12px', color: '#A855F7', fontFamily: 'var(--font-mono)' }}>
                  {formatSlug(compareRepo2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Compare button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <button
            onClick={handleCompare}
            disabled={!compareRepo1 || !compareRepo2 || compareRepo1 === compareRepo2}
            className={compareRepo1 && compareRepo2 ? 'btn-apple-primary' : 'btn-apple-secondary'}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              opacity: compareRepo1 && compareRepo2 && compareRepo1 !== compareRepo2 ? 1 : 0.5,
              cursor: compareRepo1 && compareRepo2 && compareRepo1 !== compareRepo2 ? 'pointer' : 'not-allowed',
            }}
          >
            {streaming ? (
              <>Stop Comparison</>
            ) : (
              <>
                <CompareIcon /> Compare Repositories
              </>
            )}
          </button>
        </div>

        {/* Comparison output */}
        {!compareContent && !streaming && (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: '#6E6E73' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#86868B', marginBottom: 16 }}>
              <CompareIcon />
            </div>
            <p style={{ fontSize: '15px', color: '#F5F5F7', marginBottom: '4px', fontWeight: 500 }}>Select two repositories to begin</p>
            <p style={{ fontSize: '13px', color: '#86868B' }}>
              Side-by-side analysis of architecture, dependencies, and code structure.
            </p>
          </div>
        )}

        {compareContent && (
          <div className="apple-card" style={{ padding: '28px' }}>
            <div className="markdown-content">
              <ReactMarkdown components={markdownComponents}>
                {compareContent}
              </ReactMarkdown>
              {streaming && <span className="streaming-cursor" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
