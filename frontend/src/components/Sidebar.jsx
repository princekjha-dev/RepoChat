import React, { useState } from 'react';
import { useStore } from '../store/useStore';

const NavIcons = {
  chat: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  review: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  explore: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  summary: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  compare: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  ),
  repo: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { id: 'chat', icon: NavIcons.chat, label: 'Chat', description: 'Ask questions about the code' },
  { id: 'review', icon: NavIcons.review, label: 'Review', description: 'AI code review & bug detection' },
  { id: 'explore', icon: NavIcons.explore, label: 'Explorer', description: 'Browse repository files' },
  { id: 'summary', icon: NavIcons.summary, label: 'Summary', description: 'AI repository analysis' },
  { id: 'compare', icon: NavIcons.compare, label: 'Compare', description: 'Compare two repositories' },
];

function formatSlug(slug) {
  if (!slug) return '';
  const parts = slug.split('_');
  if (parts.length >= 2) {
    return `${parts.slice(0, -1).join('_')}/${parts[parts.length - 1]}`;
  }
  return slug.replace(/_/g, '/');
}

function getLanguageColors(languages = {}) {
  const COLORS = {
    '.py': '#3572A5', '.js': '#F1E05A', '.ts': '#3178C6', '.jsx': '#61DAFB',
    '.tsx': '#61DAFB', '.go': '#00ADD8', '.rs': '#DEA584', '.java': '#B07219',
    '.md': '#083FA1', '.json': '#292929', '.css': '#563D7C', '.html': '#E34C26',
    '.rb': '#CC342D', '.php': '#4F5D95', '.cpp': '#F34B7D', '.sh': '#89E051',
  };
  return Object.entries(languages).slice(0, 5).map(([ext, count]) => ({
    ext,
    color: COLORS[ext] || '#86868B',
    count,
  }));
}

export default function Sidebar({ repos, activeRepo, onSelectRepo, onDeleteRepo, onNewChat }) {
  const { activeTab, setActiveTab } = useStore();
  const activeRepoDetails = useStore((s) => s.activeRepoDetails);
  const [hoveredRepo, setHoveredRepo] = useState(null);

  const langColors = getLanguageColors(activeRepoDetails?.languages || {});

  return (
    <aside
      style={{
        width: '220px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#09090C',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '16px 14px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onNewChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #FFFFFF, #86868B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: '#000000',
            }}
          >
            R
          </div>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#F5F5F7',
              letterSpacing: '-0.02em',
            }}
          >
            RepoChat
          </span>
        </button>
      </div>

      {/* New Analysis button */}
      <div style={{ padding: '10px 10px 6px' }}>
        <button
          onClick={onNewChat}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#F5F5F7',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <span>+</span>
          New Analysis
        </button>
      </div>

      {/* Navigation tabs */}
      {activeRepo && (
        <div style={{ padding: '6px 8px', flexShrink: 0 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.description}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  marginBottom: '2px',
                  background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: isActive ? '#2997FF' : '#86868B', display: 'flex' }}>{item.icon}</span>
                <span
                  style={{
                    fontSize: '13px',
                    color: isActive ? '#F5F5F7' : '#86868B',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0', flexShrink: 0 }} />

      {/* Repositories list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        <p
          style={{
            fontSize: '9px',
            color: '#6E6E73',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '4px 6px 8px',
          }}
        >
          Repositories
        </p>

        {repos.length === 0 ? (
          <p style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)', padding: '6px', fontStyle: 'italic' }}>
            No repos indexed yet
          </p>
        ) : (
          repos.map((slug) => {
            const isActive = activeRepo === slug;
            return (
              <div
                key={slug}
                onMouseEnter={() => setHoveredRepo(slug)}
                onMouseLeave={() => setHoveredRepo(null)}
                style={{ position: 'relative', marginBottom: '2px' }}
              >
                <button
                  onClick={() => onSelectRepo(slug)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 28px 7px 10px',
                    background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ color: isActive ? '#2997FF' : '#6E6E73', display: 'flex' }}>{NavIcons.repo}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: isActive ? '#F5F5F7' : '#86868B',
                      fontFamily: 'var(--font-mono)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    {formatSlug(slug)}
                  </span>
                </button>

                {hoveredRepo === slug && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteRepo(slug); }}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#FF453A',
                      cursor: 'pointer',
                      padding: '2px 5px',
                      fontSize: '10px',
                      lineHeight: 1,
                    }}
                    title="Remove from index"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Active repo mini stats */}
      {activeRepoDetails && (
        <div
          style={{
            padding: '8px 12px 10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: '9px', color: '#6E6E73', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            Index Stats
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F5F7', fontFamily: 'var(--font-mono)' }}>
                {activeRepoDetails.file_count || 0}
              </div>
              <div style={{ fontSize: '9px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>files</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F5F7', fontFamily: 'var(--font-mono)' }}>
                {activeRepoDetails.chunk_count || 0}
              </div>
              <div style={{ fontSize: '9px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>chunks</div>
            </div>
          </div>

          {langColors.length > 0 && (
            <div style={{ display: 'flex', gap: '2px', height: '3px', borderRadius: '2px', overflow: 'hidden' }}>
              {langColors.map(({ ext, color, count }) => {
                const total = langColors.reduce((s, l) => s + l.count, 0);
                return (
                  <div
                    key={ext}
                    title={ext.slice(1)}
                    style={{
                      flex: count / total,
                      background: color,
                      borderRadius: '1px',
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
