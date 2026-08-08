import React, { useState, useEffect } from 'react';
import RepoInput from '../components/RepoInput';
import HowItWorks from './HowItWorks';

// ── Minimalist SVG Vector Icons (No Emojis) ────────────────────
const ArrowRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

const MenuIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const GithubIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const FeatureIcons = {
  chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  review: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  intelligence: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  compare: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  ),
  explorer: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  security: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

const ExternalLinkIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ── Feature Data ───────────────────────────────────────────────
const FEATURES = [
  { key: 'chat', title: 'RAG-Powered Chat', description: 'Ask natural-language questions about any codebase. Get precise answers with verified source line citations.' },
  { key: 'review', title: 'AI Code Review', description: 'Detect bugs, security vulnerabilities, and code quality issues across diffs and pull requests automatically.' },
  { key: 'intelligence', title: 'Repo Intelligence', description: 'Generate architectural analysis, tech stack identification, and onboarding documentation with one click.' },
  { key: 'compare', title: 'Repo Comparison', description: 'Compare architecture, design patterns, and code quality metrics side-by-side across multiple repositories.' },
  { key: 'explorer', title: 'File Explorer', description: 'IDE-style file navigation tree with instant search, syntax highlighting, and citation deep-linking.' },
  { key: 'security', title: 'Security Analysis', description: 'Identify OWASP Top 10 flaws, SQL injection, XSS vulnerabilities, and exposed secrets before merging.' },
];

const EXAMPLES = [
  { label: 'vercel/next.js', url: 'https://github.com/vercel/next.js' },
  { label: 'facebook/react', url: 'https://github.com/facebook/react' },
  { label: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi' },
  { label: 'microsoft/vscode', url: 'https://github.com/microsoft/vscode' },
];

const STATS = [
  { value: '50+', label: 'Languages' },
  { value: 'AST', label: 'Chunking' },
  { value: 'RAG', label: 'Search' },
  { value: 'SSE', label: 'Streaming' },
];

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#howitworks' },
  { label: 'GitHub', href: 'https://github.com/princekjha-dev/RepoChat', external: true },
];

// ── Sticky Frosted Glass Navigation ───────────────────────────
const Navigation = React.memo(({ indexedRepos, onSelectRepo }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="apple-nav">
      <nav style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'linear-gradient(135deg, #FFFFFF, #86868B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#000000',
          }}>
            R
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F7', letterSpacing: '-0.02em' }}>
            RepoChat
          </span>
          <span style={{
            fontSize: 10, padding: '1px 6px',
            background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12, color: '#86868B', fontFamily: 'var(--font-mono)',
          }}>v3.0</span>
        </div>

        {/* Links */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 32 }}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noopener noreferrer' : undefined}
              style={{ fontSize: 13, color: '#86868B', textDecoration: 'none', transition: 'color var(--transition-fast)', fontWeight: 400 }}
              onMouseEnter={e => e.currentTarget.style.color = '#F5F5F7'}
              onMouseLeave={e => e.currentTarget.style.color = '#86868B'}
            >{l.label}</a>
          ))}
        </div>

        {/* Action */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 12 }}>
          {indexedRepos.slice(0, 1).map(slug => (
            <button key={slug} onClick={() => onSelectRepo(slug)}
              style={{
                padding: '5px 12px', background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-pill)',
                color: '#F5F5F7', fontSize: 12, fontFamily: 'var(--font-mono)',
                cursor: 'pointer', transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            >{slug.replace('_', '/')}</button>
          ))}
          <a href="https://github.com/princekjha-dev/RepoChat" target="_blank" rel="noopener noreferrer" className="btn-apple-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>
            <GithubIcon /> GitHub
          </a>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden" style={{ color: '#86868B', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu"
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12
        }}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noopener noreferrer' : undefined}
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: 14, color: '#86868B', textDecoration: 'none', padding: '6px 0' }}
            >{l.label}</a>
          ))}
        </div>
      )}
    </header>
  );
});
Navigation.displayName = 'Navigation';

// ── Landing Page Main Component ────────────────────────────────
export default function LandingPage({ onIngest, ingesting, indexedRepos, onSelectRepo }) {
  const [activeFeature, setActiveFeature] = useState(0);

  const handleExample = (url) => {
    const slug = url.split('/').slice(-2).join('_');
    if (indexedRepos.includes(slug)) onSelectRepo(slug);
    else onIngest(url, null);
  };

  return (
    <div className="cinematic-bg" style={{ minHeight: '100vh', background: '#000000', color: '#F5F5F7', overflowX: 'hidden' }}>
      <Navigation indexedRepos={indexedRepos} onSelectRepo={onSelectRepo} />

      {/* ── Hero Section ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 64px', textAlign: 'center',
      }}>
        {/* Subtle pill badge */}
        <div className="animate-hero" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 14px', borderRadius: 'var(--radius-pill)', marginBottom: 32,
          background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2997FF' }} />
          <span style={{ fontSize: 12, color: '#86868B', fontWeight: 500, letterSpacing: '0.01em' }}>
            RepoChat v3.0 Enterprise Architecture
          </span>
          <span style={{ width: 1, height: 12, background: 'rgba(255, 255, 255, 0.15)' }} />
          <a href="#features" style={{ fontSize: 12, color: '#F5F5F7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Explore features <ArrowRight size={10} />
          </a>
        </div>

        {/* Massive Apple Headline */}
        <h1 className="headline-gradient animate-hero" style={{
          fontSize: 'clamp(40px, 7vw, 76px)', fontWeight: 600,
          lineHeight: 1.05, letterSpacing: '-0.035em',
          maxWidth: 860, marginBottom: 20,
        }}>
          Understand any codebase.<br />In seconds.
        </h1>

        {/* Subtitle */}
        <p className="animate-hero" style={{
          fontSize: 'clamp(16px, 2vw, 20px)', color: '#86868B', maxWidth: 620, lineHeight: 1.5,
          marginBottom: 40, fontWeight: 400, letterSpacing: '-0.01em',
        }}>
          AI-powered semantic search, instant RAG chat, and automated code review for public and private GitHub repositories.
        </p>

        {/* Search / Ingest Input */}
        <div className="animate-hero" style={{ width: '100%', maxWidth: 620, marginBottom: 16 }}>
          <RepoInput onIngest={onIngest} ingesting={ingesting} />
        </div>

        {/* Try Repository Examples */}
        <div className="animate-hero" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 56, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6E6E73', fontWeight: 400 }}>Try:</span>
          {EXAMPLES.map(ex => (
            <button key={ex.label} onClick={() => handleExample(ex.url)} disabled={ingesting}
              style={{
                padding: '4px 12px', background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-pill)',
                color: '#86868B', fontSize: 12, fontFamily: 'var(--font-mono)',
                cursor: ingesting ? 'not-allowed' : 'pointer', transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; e.currentTarget.style.color = '#F5F5F7'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#86868B'; }}
            >{ex.label}</button>
          ))}
        </div>

        {/* Minimalist Stats Strip */}
        <div style={{
          display: 'flex', gap: 48, padding: '16px 36px',
          background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 'var(--radius-pill)', backdropFilter: 'blur(20px)',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F7', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6E6E73', fontWeight: 400, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── High-End Product Render Focal Point ── */}
        <div style={{ width: '100%', maxWidth: 1040, marginTop: 72, position: 'relative' }}>
          {/* Subtle Backlight */}
          <div style={{ position: 'absolute', inset: -20, borderRadius: 24, background: 'radial-gradient(ellipse at 50% 40%, rgba(41, 151, 255, 0.1) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

          {/* Precision Window Frame */}
          <div style={{
            position: 'relative', zIndex: 1, borderRadius: 16, overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 40px 100px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            background: '#09090C'
          }}>

            {/* Window Title Bar */}
            <div style={{ height: 40, background: '#050507', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)' }} />
              <span style={{ marginLeft: 16, fontSize: 12, color: '#6E6E73', fontFamily: 'var(--font-mono)', fontWeight: 400 }}>repochat / facebook / react</span>
            </div>

            {/* Window Content */}
            <div style={{ display: 'flex', height: 420 }}>
              {/* Sidebar */}
              <div style={{ width: 220, background: '#050507', borderRight: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ padding: '0 8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#86868B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Workspace</span>
                </div>
                {[
                  { key: 'chat', label: 'Chat', active: true },
                  { key: 'review', label: 'Review', active: false },
                  { key: 'explorer', label: 'Explorer', active: false },
                  { key: 'intelligence', label: 'Summary', active: false },
                  { key: 'compare', label: 'Compare', active: false },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                    background: item.active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    color: item.active ? '#F5F5F7' : '#6E6E73', fontSize: 13, fontWeight: item.active ? 500 : 400
                  }}>
                    <span style={{ color: item.active ? '#2997FF' : 'inherit' }}>{FeatureIcons[item.key]}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Chat View */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#09090C' }}>
                <div style={{ height: 44, borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#86868B', fontFamily: 'var(--font-mono)' }}>facebook/react</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(41, 151, 255, 0.1)', border: '1px solid rgba(41, 151, 255, 0.2)', borderRadius: 10, color: '#2997FF', fontFamily: 'var(--font-mono)' }}>RAG Active</span>
                </div>

                <div style={{ flex: 1, padding: '24px 24px 12px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'hidden' }}>
                  {/* User Bubble */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '70%', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px 14px 4px 14px', fontSize: 13, color: '#F5F5F7', lineHeight: 1.5 }}>
                      How does React's reconciliation algorithm work?
                    </div>
                  </div>

                  {/* AI Response Bubble */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(41, 151, 255, 0.15)', border: '1px solid rgba(41, 151, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2997FF', flexShrink: 0 }}>
                      {FeatureIcons.chat}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ padding: '14px 16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '4px 14px 14px 14px', fontSize: 13, color: '#D1D1D6', lineHeight: 1.65 }}>
                        React uses a <span style={{ color: '#2997FF', background: 'rgba(41, 151, 255, 0.1)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 12 }}>fiber</span> architecture to diff the virtual DOM tree. It compares elements by type and key, scheduling work across concurrent lanes<span className="streaming-cursor" />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {['packages/react-reconciler/src/ReactFiber.js:42-89', 'packages/react/src/ReactElement.js:12-45'].map(src => (
                          <div key={src} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-pill)' }}>
                            <span style={{ fontSize: 10, color: '#86868B', fontFamily: 'var(--font-mono)' }}>{src}</span>
                            <ExternalLinkIcon />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: '10px 16px' }}>
                    <span style={{ fontSize: 13, color: '#6E6E73', flex: 1, fontFamily: 'var(--font-mono)' }}>Ask a question about this repository...</span>
                    <button className="btn-apple-primary" style={{ padding: '4px 14px', fontSize: 12 }}>Send</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features Grid Section ── */}
      <section id="features" style={{
        position: 'relative', zIndex: 1,
        padding: '128px 32px', borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#050507',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#86868B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
              Capabilities
            </span>
            <h2 className="headline-gradient" style={{ fontSize: '38px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 12 }}>
              Everything you need to master any codebase
            </h2>
            <p style={{ fontSize: 16, color: '#86868B', maxWidth: 500, margin: '0 auto', fontWeight: 400 }}>
              Engineered for speed, precision, and architectural clarity.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="apple-card"
                style={{ padding: '32px 28px', cursor: 'default' }}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#F5F5F7', marginBottom: 20,
                }}>{FeatureIcons[f.key]}</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#F5F5F7', marginBottom: 10, letterSpacing: '-0.02em' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#86868B', lineHeight: 1.6, fontWeight: 400 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow Section ── */}
      <HowItWorks />

      {/* ── Minimalist Apple Footer ── */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '32px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#000000', flexWrap: 'wrap', gap: 16,
      }}>
        <span style={{ fontSize: 13, color: '#6E6E73' }}>© 2026 RepoChat AI · MIT License</span>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#86868B' }}>
          <a href="https://github.com/princekjha-dev/RepoChat" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>GitHub Repository</a>
          <span>·</span>
          <span>OpenRouter Integration</span>
          <span>·</span>
          <span>ChromaDB Vector Engine</span>
        </div>
      </footer>
    </div>
  );
}
