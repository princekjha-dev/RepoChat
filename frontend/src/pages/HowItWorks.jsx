import React from 'react';

const LinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const CpuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="15" x2="23" y2="15" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="15" x2="4" y2="15" />
  </svg>
);

const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const STEPS = [
  { n: '01', icon: <LinkIcon />, title: 'Paste a GitHub URL', desc: 'Drop any public GitHub repository URL into the input. Private repositories are supported with a personal token.' },
  { n: '02', icon: <CpuIcon />, title: 'AST Chunking & Vectors', desc: 'We clone, parse syntax structures with AST chunkers, generate embeddings, and index vector representations in seconds.' },
  { n: '03', icon: <ChatIcon />, title: 'Chat & Code Intelligence', desc: 'Ask natural-language questions. Retrieve source-cited answers, perform automated code reviews, and browse files.' },
];

export default function HowItWorks() {
  return (
    <section id="howitworks" style={{ position: 'relative', zIndex: 1, padding: '96px 32px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#86868B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
            Workflow
          </span>
          <h2 className="headline-gradient" style={{ fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 12 }}>
            From URL to deep analysis in seconds
          </h2>
          <p style={{ fontSize: 16, color: '#86868B', maxWidth: 480, margin: '0 auto', fontWeight: 400 }}>
            Zero local setup. Zero configuration. Instant intelligence.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {STEPS.map((s) => (
            <div key={s.n} className="apple-card" style={{ padding: '32px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5F5F7' }}>
                  {s.icon}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.2)', letterSpacing: '0.05em' }}>{s.n}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#F5F5F7', marginBottom: 10, letterSpacing: '-0.02em' }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: '#86868B', lineHeight: 1.65, fontWeight: 400 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
