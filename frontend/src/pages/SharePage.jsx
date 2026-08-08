import React, { useState, useEffect } from 'react';
import { getShareExchange } from '../api/client';
import ReactMarkdown from 'react-markdown';
import CodeBlock from '../components/CodeBlock';

const CITATION_REGEX = /\[([^\[\]:]+):(\d+)-(\d+)\]/g;

function CitationPill({ file, start, end }) {
  const [hovered, setHovered] = useState(false);
  const label = `${file.split('/').pop()}:${start}-${end}`;
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '1px 7px',
        margin: '0 2px',
        borderRadius: '10px',
        fontSize: '10px',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        background: hovered ? 'rgba(124,58,237,0.22)' : 'rgba(124,58,237,0.12)',
        border: `1px solid ${hovered ? 'rgba(139,92,246,0.5)' : 'rgba(124,58,237,0.28)'}`,
        color: hovered ? '#C4B5FD' : '#A78BFA',
        transition: 'all 120ms ease',
        verticalAlign: 'middle',
        cursor: 'default',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: '9px', opacity: 0.7 }}>↗</span>
      {label}
    </span>
  );
}

function renderChildrenWithCitations(children) {
  return React.Children.map(children, (child) => {
    if (typeof child !== 'string') return child;
    const segments = [];
    let lastIndex = 0;
    let match;
    CITATION_REGEX.lastIndex = 0;
    while ((match = CITATION_REGEX.exec(child)) !== null) {
      if (match.index > lastIndex) segments.push({ type: 'text', content: child.slice(lastIndex, match.index) });
      segments.push({ type: 'citation', file: match[1], start: parseInt(match[2], 10), end: parseInt(match[3], 10) });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < child.length) segments.push({ type: 'text', content: child.slice(lastIndex) });
    return segments.map((seg, i) =>
      seg.type === 'text'
        ? <React.Fragment key={i}>{seg.content}</React.Fragment>
        : <CitationPill key={i} file={seg.file} start={seg.start} end={seg.end} />
    );
  });
}

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeText = String(children).replace(/\n$/, '');
    if (!inline && (match || codeText.includes('\n'))) {
      return <CodeBlock code={codeText} language={match?.[1] || 'text'} />;
    }
    return (
      <code
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          padding: '0.15em 0.4em',
          borderRadius: '4px',
          background: 'rgba(124,58,237,0.15)',
          border: '1px solid rgba(124,58,237,0.25)',
          color: '#A78BFA',
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  p({ children }) { return <p>{renderChildrenWithCitations(children)}</p>; },
  li({ children }) { return <li>{renderChildrenWithCitations(children)}</li>; },
};

/**
 * SharePage — Public, embeddable view of a single Q&A exchange.
 * Displayed at /share/:slug/:messageId
 */
export default function SharePage({ slug, messageId }) {
  const [exchange, setExchange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getShareExchange(slug, messageId)
      .then((data) => { setExchange(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [slug, messageId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatTs = (iso) => {
    try { return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return iso || ''; }
  };

  const repoDisplay = exchange?.repo_display || slug?.replace('_', '/') || '';
  const repoUrl = exchange?.repo_url || '';

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', flexDirection: 'column' }}>
      {/* Grid bg */}
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='rgba(124,58,237,0.05)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '500px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Navbar */}
      <nav style={{ position: 'relative', zIndex: 10, height: '52px', background: 'rgba(10,10,15,0.85)', borderBottom: '1px solid #1E1E2E', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 26, height: 26, borderRadius: '6px', background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: '0 0 12px rgba(124,58,237,0.4)' }}>✦</div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0FF', letterSpacing: '-0.02em' }}>
            RepoChat<span style={{ color: '#7C3AED' }}>AI</span>
          </span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#3A3A54', fontFamily: 'JetBrains Mono, monospace' }}>Shared Q&amp;A</span>
          <button
            onClick={handleCopy}
            style={{
              padding: '5px 10px', background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)', border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(124,58,237,0.2)'}`, borderRadius: '6px', color: copied ? '#34D399' : '#8B5CF6', fontSize: '11px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', transition: 'all 150ms ease',
            }}
          >
            {copied ? '✓ Copied' : '🔗 Copy link'}
          </button>
          <a
            href="/"
            style={{ padding: '5px 10px', background: '#16161F', border: '1px solid #2A2A3E', borderRadius: '6px', color: '#7A7A9A', fontSize: '11px', textDecoration: 'none', transition: 'all 150ms ease', fontFamily: 'JetBrains Mono, monospace' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F0F0FF'; e.currentTarget.style.borderColor = '#3A3A54'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7A9A'; e.currentTarget.style.borderColor = '#2A2A3E'; }}
          >
            Try RepoChat →
          </a>
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '820px' }}>

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '40px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="shimmer" style={{ height: i === 0 ? '60px' : '20px', borderRadius: '8px', width: i === 1 ? '60%' : '100%' }} />
              ))}
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', marginTop: '80px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F0F0FF', marginBottom: '8px' }}>Exchange not found</h2>
              <p style={{ color: '#5A5A7A', fontSize: '14px', marginBottom: '24px' }}>This shared link may have expired or the exchange was deleted.</p>
              <a href="/" style={{ padding: '10px 20px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '8px', color: '#A78BFA', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Go to RepoChat →</a>
            </div>
          )}

          {exchange && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUp 400ms ease-out' }}>
              {/* Repo badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  href={repoUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#16161F', border: '1px solid #2A2A3E', borderRadius: '20px', textDecoration: 'none', transition: 'all 150ms ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3A3A54'; e.currentTarget.style.background = '#1C1C28'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2A2A3E'; e.currentTarget.style.background = '#16161F'; }}
                >
                  <span style={{ fontSize: '12px' }}>📦</span>
                  <span style={{ fontSize: '12px', color: '#C4B5FD', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{repoDisplay}</span>
                </a>
                {exchange.timestamp && (
                  <span style={{ fontSize: '11px', color: '#3A3A54', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatTs(exchange.timestamp)}
                  </span>
                )}
              </div>

              {/* Question bubble */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '5px', background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white' }}>U</div>
                  <span style={{ fontSize: '11px', color: '#3A3A54', fontFamily: 'JetBrains Mono, monospace' }}>Question</span>
                </div>
                <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.8), rgba(99,102,241,0.8))', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '12px 12px 4px 12px', padding: '14px 16px', boxShadow: '0 4px 16px rgba(124,58,237,0.15)' }}>
                  <p style={{ color: '#F0F0FF', fontSize: '15px', fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
                    {exchange.question}
                  </p>
                </div>
              </div>

              {/* Answer bubble */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '5px', background: 'linear-gradient(135deg, #10B981, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white' }}>✦</div>
                  <span style={{ fontSize: '11px', color: '#3A3A54', fontFamily: 'JetBrains Mono, monospace' }}>RepoChat AI</span>
                </div>
                <div style={{ background: '#111118', border: '1px solid #1E1E2E', borderRadius: '12px 12px 12px 4px', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  <div className="markdown-content">
                    <ReactMarkdown components={markdownComponents}>
                      {exchange.answer}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Citations row */}
              {exchange.citations && exchange.citations.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', padding: '10px 14px', background: '#0E0E17', border: '1px solid #1E1E2E', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#3A3A54', fontFamily: 'JetBrains Mono, monospace', marginRight: '4px' }}>📎 Citations:</span>
                  {exchange.citations.map((c, i) => (
                    <CitationPill key={i} file={c.file} start={c.start} end={c.end} />
                  ))}
                </div>
              )}

              {/* CTA */}
              <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>✦</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#F0F0FF', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  Explore this repository with AI
                </h3>
                <p style={{ fontSize: '13px', color: '#5A5A7A', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
                  Ask questions, detect bugs, review PRs, and understand any codebase instantly.
                </p>
                <a
                  href="/"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'linear-gradient(135deg, #7C3AED, #6366F1)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 0 20px rgba(124,58,237,0.3)', transition: 'all 150ms ease' }}
                >
                  Try RepoChat AI for free →
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid #1E1E2E', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15,0.7)' }}>
        <span style={{ fontSize: '11px', color: '#3A3A54' }}>© 2025 RepoChat AI</span>
        <span style={{ fontSize: '11px', color: '#3A3A54', fontFamily: 'JetBrains Mono, monospace' }}>Powered by OpenRouter · ChromaDB</span>
      </footer>
    </div>
  );
}
