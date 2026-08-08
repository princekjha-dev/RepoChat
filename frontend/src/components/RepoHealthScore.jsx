import React from 'react';

/**
 * RepoHealthScore — Circular score ring with label.
 */
function ScoreRing({ score, label, color, size = 72 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E1E2E" strokeWidth="5" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: size > 80 ? '18px' : '13px', color: '#F0F0FF' }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: '10px', color: '#5A5A7A', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  );
}

const SCORE_COLORS = {
  overall: '#8B5CF6',
  architecture: '#60A5FA',
  security: '#F59E0B',
  performance: '#10B981',
  maintainability: '#EC4899',
};

function getScoreColor(score) {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#F59E0B';
  if (score >= 60) return '#F97316';
  return '#EF4444';
}

/**
 * RepoHealthScore — Full review score dashboard panel.
 */
export default function RepoHealthScore({ score = {} }) {
  const {
    overall = 0,
    architecture = 0,
    security = 0,
    performance = 0,
    maintainability = 0,
  } = score;

  const bars = [
    { key: 'architecture', label: 'Architecture', value: architecture, color: SCORE_COLORS.architecture },
    { key: 'security', label: 'Security', value: security, color: SCORE_COLORS.security },
    { key: 'performance', label: 'Performance', value: performance, color: SCORE_COLORS.performance },
    { key: 'maintainability', label: 'Maintainability', value: maintainability, color: SCORE_COLORS.maintainability },
  ];

  return (
    <div
      style={{
        background: '#111118',
        border: '1px solid #1E1E2E',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: '#3A3A54', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Repository Health Score
        </span>
      </div>

      {/* Main score ring */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
        <ScoreRing score={overall} label="Overall" color={getScoreColor(overall)} size={88} />
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {bars.map((b) => (
            <ScoreRing key={b.key} score={b.value} label={b.label} color={b.color} size={60} />
          ))}
        </div>
      </div>

      {/* Progress bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {bars.map((b) => (
          <div key={b.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: '#7A7A9A', fontFamily: 'JetBrains Mono, monospace' }}>{b.label}</span>
              <span style={{ fontSize: '11px', color: b.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{b.value}/100</span>
            </div>
            <div style={{ height: '4px', background: '#1E1E2E', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${b.value}%`,
                  background: b.color,
                  borderRadius: '2px',
                  transition: 'width 0.8s ease',
                  boxShadow: `0 0 6px ${b.color}60`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
