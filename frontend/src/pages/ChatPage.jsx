import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import CodeReview from '../components/CodeReview';
import FileExplorer from '../components/FileExplorer';
import RepoSummary from '../components/RepoSummary';
import RepoCompare from '../components/RepoCompare';
import CommandPalette from '../components/CommandPalette';
import { getRepoFiles, exportConversation } from '../api/client';
import { addToast } from '../components/Toast';

function formatSlug(slug) {
  if (!slug) return '';
  const parts = slug.split('_');
  return parts.length >= 2 ? `${parts.slice(0, -1).join('_')}/${parts[parts.length - 1]}` : slug;
}

/**
 * ChatPage — Full application shell with sidebar, tab routing, and panel layouts.
 */
export default function ChatPage({
  repos,
  activeRepo,
  repoDetails,
  onSend,
  chatLoading,
  onCancelStream,
  onSelectRepo,
  onDeleteRepo,
  onNewChat,
}) {
  const { activeTab, setActiveTab, getMessages } = useStore();
  const messages = getMessages();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [fileTree, setFileTree] = useState({});
  const [fileCount, setFileCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedLineRange, setSelectedLineRange] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Reactive responsive detection
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load file tree when on explorer tab
  useEffect(() => {
    if (activeTab === 'explore' && activeRepo) {
      getRepoFiles(activeRepo)
        .then((data) => {
          setFileTree(data.tree || {});
          setFileCount(data.count || data.files?.length || 0);
        })
        .catch(() => {});
    }
  }, [activeTab, activeRepo]);

  const handleExport = async (format) => {
    setExportMenuOpen(false);
    try {
      const data = await exportConversation(messages, activeRepo, format);
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'repochat-export.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data)], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'repochat-export.md';
        a.click();
        URL.revokeObjectURL(url);
      }
      addToast(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (err) {
      addToast('Export failed: ' + err.message, 'error');
    }
  };

  const handleCitationClick = ({ file, start, end }) => {
    setActiveTab('explore');
    setSelectedFile(file);
    setSelectedLineRange(start && end ? { start, end } : null);
    if (!Object.keys(fileTree).length && activeRepo) {
      getRepoFiles(activeRepo)
        .then((data) => {
          setFileTree(data.tree || {});
          setFileCount(data.count || data.files?.length || 0);
        })
        .catch(() => {});
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#000000' }}>
      {/* Desktop Sidebar — shown only on md+ */}
      {!isMobile && (
        <div style={{ height: '100%', flexShrink: 0 }}>
          <Sidebar
            repos={repos}
            activeRepo={activeRepo}
            onSelectRepo={onSelectRepo}
            onDeleteRepo={onDeleteRepo}
            onNewChat={onNewChat}
          />
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
            }}
          />
          <div
            style={{ position: 'relative', zIndex: 60, height: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              repos={repos}
              activeRepo={activeRepo}
              onSelectRepo={(s) => { onSelectRepo(s); setMobileOpen(false); }}
              onDeleteRepo={onDeleteRepo}
              onNewChat={() => { onNewChat(); setMobileOpen(false); }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header bar */}
        <header
          style={{
            height: '52px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mobile menu button */}
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#86868B',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Open navigation"
              >
                ☰
              </button>
            )}

            {/* Repo breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>
                repo
              </span>
              <span style={{ color: '#6E6E73' }}>/</span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#F5F5F7',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {formatSlug(activeRepo)}
              </span>
            </div>

            {/* Active tab badge */}
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                color: '#86868B',
                fontFamily: 'var(--font-mono)',
                textTransform: 'lowercase',
              }}
            >
              {activeTab}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Messages count */}
            {activeTab === 'chat' && messages.length > 0 && (
              <span style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>
                {messages.length} messages
              </span>
            )}

            {/* Export dropdown */}
            {activeTab === 'chat' && messages.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="btn-apple-secondary"
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                  }}
                >
                  Export ↓
                </button>
                {exportMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      background: '#1C1C1E',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      zIndex: 50,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                      minWidth: '150px',
                    }}
                  >
                    {[
                      { label: 'Markdown (.md)', fmt: 'markdown' },
                      { label: 'JSON (.json)', fmt: 'json' },
                    ].map((opt) => (
                      <button
                        key={opt.fmt}
                        onClick={() => handleExport(opt.fmt)}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '8px 14px',
                          background: 'none',
                          border: 'none',
                          color: '#F5F5F7',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'var(--font-mono)',
                          transition: 'background var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cmd+K Quick Palette */}
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
                window.dispatchEvent(event);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#86868B',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
              title="Open Command Palette (Cmd+K)"
            >
              <span>Command</span>
              <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px', color: '#F5F5F7' }}>⌘K</kbd>
            </button>

            {/* Stats */}
            {repoDetails && (
              <div style={{ display: 'flex', gap: '12px', paddingLeft: '12px', borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#F5F5F7', fontWeight: 500 }}>{repoDetails.file_count || 0}</span> files
                </span>
                <span style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#F5F5F7', fontWeight: 500 }}>{repoDetails.chunk_count || 0}</span> chunks
                </span>
              </div>
            )}
          </div>
        </header>

        <CommandPalette
          repos={repos}
          activeRepo={activeRepo}
          onSelectRepo={onSelectRepo}
          onNewChat={onNewChat}
        />

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'chat' && (
            <Chat
              messages={messages}
              activeRepo={activeRepo}
              onSend={onSend}
              chatLoading={chatLoading}
              onCancelStream={onCancelStream}
              onCitationClick={handleCitationClick}
            />
          )}

          {activeTab === 'review' && (
            <CodeReview activeRepo={activeRepo} />
          )}

          {activeTab === 'explore' && (
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
              {/* File tree */}
              <div
                style={{
                  width: '260px',
                  height: '100%',
                  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  flexShrink: 0,
                }}
              >
                <FileExplorer
                  tree={fileTree}
                  fileCount={fileCount}
                  onSelect={(file) => {
                    setSelectedFile(file);
                    setSelectedLineRange(null);
                  }}
                  selectedFile={selectedFile}
                />
              </div>

              {/* Selected file preview */}
              <div style={{ flex: 1, height: '100%', overflow: 'auto', padding: '24px' }}>
                {selectedFile ? (
                  <FileContentPreview
                    activeRepo={activeRepo}
                    filePath={selectedFile}
                    lineRange={selectedLineRange}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#6E6E73',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#86868B',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <p style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                      Select a file from the explorer to view code
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <RepoSummary activeRepo={activeRepo} repoMeta={repoDetails} />
          )}

          {activeTab === 'compare' && (
            <RepoCompare repos={repos} activeRepo={activeRepo} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * FileContentPreview — preview selected file contents from backend with citation line highlights.
 */
function FileContentPreview({ activeRepo, filePath, lineRange }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activeRepo || !filePath) return;
    setLoading(true);
    setError(null);

    import('../api/client').then(({ getFileContent }) => {
      getFileContent(activeRepo, filePath)
        .then((data) => {
          setContent(data.content);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    });
  }, [activeRepo, filePath]);

  if (loading) {
    return (
      <div style={{ padding: '24px', color: '#86868B', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
        Loading {filePath}...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: '#FF453A', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
        Failed to load file: {error}
      </div>
    );
  }

  const ext = filePath.split('.').pop() || 'text';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* File header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F7', fontFamily: 'var(--font-mono)' }}>
          {filePath}
        </span>
        {lineRange && (
          <span
            style={{
              fontSize: '11px',
              color: '#2997FF',
              background: 'rgba(41, 151, 255, 0.1)',
              border: '1px solid rgba(41, 151, 255, 0.25)',
              borderRadius: '6px',
              padding: '2px 8px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Lines {lineRange.start}–{lineRange.end}
          </span>
        )}
      </div>

      <div className="apple-card" style={{ padding: '16px', overflowX: 'auto' }}>
        <pre
          style={{
            margin: 0,
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: '#F5F5F7',
            lineHeight: 1.6,
          }}
        >
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
}
