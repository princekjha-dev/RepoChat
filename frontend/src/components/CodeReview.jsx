import React, { useState } from 'react';
import { reviewCode } from '../api/client';
import { useStore } from '../store/useStore';
import { addToast } from './Toast';
import CodeBlock from './CodeBlock';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

const SEVERITY_META = {
  critical: { label: 'Critical', color: '#FF453A', bg: 'rgba(255,69,58,0.1)', border: 'rgba(255,69,58,0.25)' },
  high: { label: 'High', color: '#FF9F0A', bg: 'rgba(255,159,10,0.1)', border: 'rgba(255,159,10,0.25)' },
  medium: { label: 'Medium', color: '#FFD60A', bg: 'rgba(255,214,10,0.1)', border: 'rgba(255,214,10,0.25)' },
  low: { label: 'Low', color: '#64D2FF', bg: 'rgba(100,210,255,0.1)', border: 'rgba(100,210,255,0.25)' },
  info: { label: 'Info', color: '#2997FF', bg: 'rgba(41,151,255,0.1)', border: 'rgba(41,151,255,0.25)' },
};

function ScoreRing({ score, label, size = 72 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 90) return '#30D158';
    if (s >= 75) return '#2997FF';
    if (s >= 60) return '#FF9F0A';
    return '#FF453A';
  };

  const color = getColor(score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: size > 60 ? '14px' : '11px',
            color,
          }}
        >
          {score}
        </div>
      </div>
      <span style={{ fontSize: '11px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>{label}</span>
    </div>
  );
}

function IssueCard({ issue }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SEVERITY_META[issue.severity] || SEVERITY_META.info;

  return (
    <div
      style={{
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: '12px',
        marginBottom: '10px',
        overflow: 'hidden',
        transition: 'all var(--transition-fast)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: meta.color,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {meta.label}
            </span>
            <span style={{ fontSize: '11px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>
              {issue.category}
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#F5F5F7', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
            {issue.title}
          </p>
          {issue.file && (
            <p style={{ fontSize: '12px', color: '#86868B', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
              {issue.file}
              {issue.line_start && ` · L${issue.line_start}${issue.line_end && issue.line_end !== issue.line_start ? `–${issue.line_end}` : ''}`}
            </p>
          )}
        </div>
        <span style={{ color: '#86868B', fontSize: '12px', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div
          style={{ padding: '0 16px 16px', borderTop: `1px solid ${meta.border}` }}
        >
          <p style={{ fontSize: '14px', color: '#D1D1D6', lineHeight: 1.6, marginTop: '12px', marginBottom: '12px' }}>
            {issue.description}
          </p>
          {issue.suggestion && (
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(48,209,88,0.08)',
                border: '1px solid rgba(48,209,88,0.2)',
                borderRadius: '8px',
              }}
            >
              <p style={{ fontSize: '12px', color: '#30D158', fontWeight: 600, marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                Suggested Fix
              </p>
              <p style={{ fontSize: '13px', color: '#D1D1D6', lineHeight: 1.5 }}>{issue.suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CodeReview({ activeRepo }) {
  const [diffInput, setDiffInput] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [inputTab, setInputTab] = useState('diff');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');

  const handleReview = async () => {
    const content = inputTab === 'diff' ? diffInput.trim() : '';
    const pr = inputTab === 'pr' ? prUrl.trim() : '';

    if (!content && !pr) {
      addToast('Please paste a diff or provide a PR URL.', 'warning');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const review = await reviewCode(content, {
        repoName: activeRepo || '',
        prUrl: pr,
      });
      setResult(review);
    } catch (err) {
      addToast(err.message || 'Review failed. Check your API key.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = result?.issues?.filter(
    (i) => filterSeverity === 'all' || i.severity === filterSeverity
  ) || [];

  const issueCounts = result?.issues?.reduce((acc, i) => {
    acc[i.severity] = (acc[i.severity] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000000', overflowY: 'auto' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto', width: '100%', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h2 className="headline-gradient" style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Automated Code Review
          </h2>
          <p style={{ fontSize: '14px', color: '#86868B' }}>
            Paste a git diff or GitHub PR URL to detect bugs, security flaws, and code style issues.
          </p>
        </div>

        {/* Input Card */}
        <div className="apple-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[
              { id: 'diff', label: 'Paste Diff' },
              { id: 'pr', label: 'Pull Request URL' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setInputTab(t.id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-pill)',
                  background: inputTab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: inputTab === t.id ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
                  color: inputTab === t.id ? '#F5F5F7' : '#86868B',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: inputTab === t.id ? 500 : 400,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {inputTab === 'diff' ? (
            <textarea
              value={diffInput}
              onChange={(e) => setDiffInput(e.target.value)}
              placeholder={`Paste your git diff here...\n\ndiff --git a/src/auth.ts b/src/auth.ts\n@@ -45,12 +45,15 @@\n...`}
              rows={10}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '14px',
                color: '#F5F5F7',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.6,
              }}
            />
          ) : (
            <input
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#F5F5F7',
                fontSize: '14px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={handleReview}
              disabled={loading}
              className="btn-apple-primary"
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              {loading ? 'Analyzing diff...' : 'Run Review'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div>
            <div className="apple-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: '#D1D1D6', lineHeight: 1.7, marginBottom: '24px' }}>
                {result.summary}
              </p>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <ScoreRing score={result.score?.overall || 0} label="Overall" size={80} />
                <ScoreRing score={result.score?.security || 0} label="Security" />
                <ScoreRing score={result.score?.performance || 0} label="Performance" />
                <ScoreRing score={result.score?.maintainability || 0} label="Maintainability" />
                <ScoreRing score={result.score?.architecture || 0} label="Architecture" />
              </div>
            </div>

            {filteredIssues.length > 0 && (
              <div className="apple-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F5F7' }}>
                    Issues Identified ({result.issues?.length || 0})
                  </h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setFilterSeverity('all')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-pill)',
                        background: filterSeverity === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: filterSeverity === 'all' ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.06)',
                        color: filterSeverity === 'all' ? '#F5F5F7' : '#86868B',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      All
                    </button>
                    {SEVERITY_ORDER.filter((s) => issueCounts[s]).map((s) => {
                      const meta = SEVERITY_META[s];
                      return (
                        <button
                          key={s}
                          onClick={() => setFilterSeverity(s)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-pill)',
                            background: filterSeverity === s ? meta.bg : 'transparent',
                            border: `1px solid ${filterSeverity === s ? meta.border : 'rgba(255,255,255,0.06)'}`,
                            color: filterSeverity === s ? meta.color : '#86868B',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {meta.label} {issueCounts[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredIssues.map((issue, i) => (
                  <IssueCard key={i} issue={issue} />
                ))}
              </div>
            )}

            {result.positives?.length > 0 && (
              <div
                style={{
                  background: 'rgba(48,209,88,0.06)',
                  border: '1px solid rgba(48,209,88,0.18)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '24px',
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#30D158', marginBottom: '12px' }}>
                  Positive Findings
                </h3>
                <ul style={{ paddingLeft: '20px' }}>
                  {result.positives.map((p, i) => (
                    <li key={i} style={{ fontSize: '14px', color: '#D1D1D6', marginBottom: '6px', lineHeight: 1.5 }}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div className="apple-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F7', marginBottom: '12px' }}>
                  Recommendations
                </h3>
                <ul style={{ paddingLeft: '20px' }}>
                  {result.recommendations.map((r, i) => (
                    <li key={i} style={{ fontSize: '14px', color: '#86868B', marginBottom: '6px', lineHeight: 1.5 }}>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: '#6E6E73' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#86868B', marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <p style={{ fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
              Paste a diff or PR URL above to start code review
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
