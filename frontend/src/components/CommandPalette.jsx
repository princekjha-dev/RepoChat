import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * CommandPalette (Cmd+K / Ctrl+K) — Keyboard-driven executive navigation overlay.
 */
export default function CommandPalette({ repos, activeRepo, onSelectRepo, onNewChat }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setActiveTab } = useStore();
  const inputRef = useRef(null);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const COMMANDS = [
    {
      id: 'nav-chat',
      title: 'Go to Chat',
      category: 'Navigation',
      action: () => { setActiveTab('chat'); setOpen(false); },
    },
    {
      id: 'nav-review',
      title: 'Go to Code Review',
      category: 'Navigation',
      action: () => { setActiveTab('review'); setOpen(false); },
    },
    {
      id: 'nav-explore',
      title: 'Go to File Explorer',
      category: 'Navigation',
      action: () => { setActiveTab('explore'); setOpen(false); },
    },
    {
      id: 'nav-summary',
      title: 'Go to Architecture Summary',
      category: 'Navigation',
      action: () => { setActiveTab('summary'); setOpen(false); },
    },
    {
      id: 'nav-compare',
      title: 'Go to Repo Comparison',
      category: 'Navigation',
      action: () => { setActiveTab('compare'); setOpen(false); },
    },
    {
      id: 'action-new',
      title: '+ Analyze New Repository',
      category: 'Actions',
      action: () => { onNewChat?.(); setOpen(false); },
    },
  ];

  // Add repositories as commands
  const repoCommands = (repos || []).map((r) => ({
    id: `repo-${r}`,
    title: `Switch to ${r.replace('_', '/')}`,
    category: 'Repositories',
    action: () => { onSelectRepo?.(r); setOpen(false); },
  }));

  const allCommands = [...COMMANDS, ...repoCommands];

  const filtered = allCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: '#1C1C1E',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search repository... (Esc to close)"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#F5F5F7',
              fontSize: '14px',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
          <kbd
            style={{
              padding: '3px 7px',
              fontSize: '11px',
              color: '#86868B',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#86868B', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
              No matching commands or repositories found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(41, 151, 255, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(41, 151, 255, 0.3)' : '1px solid transparent',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: isSelected ? '#F5F5F7' : '#D1D1D6',
                      fontWeight: isSelected ? 500 : 400,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {cmd.title}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#86868B',
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#6E6E73',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>RepoChat AI v3.0 Enterprise</span>
          <span>Use ↑↓ to navigate, Enter to select</span>
        </div>
      </div>
    </div>
  );
}
