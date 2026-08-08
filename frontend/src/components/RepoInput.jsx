import React, { useState } from 'react';

/**
 * RepoInput — URL input form with GitHub token toggle.
 */
export default function RepoInput({ onIngest, ingesting }) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim() || ingesting) return;
    onIngest(url.trim(), token.trim() || null);
  };

  const isValid = /^https:\/\/github\.com\/[\w.\-]+\/[\w.\-]+(\/)?$/.test(url.trim()) ||
    /^git@github\.com:[\w.\-]+\/[\w.\-]+(\.git)?$/.test(url.trim());

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* URL Input */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${url && !isValid ? 'rgba(255,69,58,0.4)' : isValid ? 'rgba(41,151,255,0.5)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 'var(--radius-pill)',
          backdropFilter: 'blur(20px)',
          transition: 'all var(--transition-fast)',
          padding: '4px 6px 4px 16px',
        }}
      >
        {/* GitHub icon */}
        <div style={{ color: '#86868B', display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </div>

        <input
          id="repo-url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/facebook/react"
          disabled={ingesting}
          style={{
            flex: 1,
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            color: '#F5F5F7',
            fontSize: '14px',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        {/* Key Icon Toggle for Token */}
        <button
          type="button"
          onClick={() => setShowToken(!showToken)}
          title={showToken ? 'Hide token input' : 'Add GitHub token'}
          style={{
            padding: '8px',
            background: 'none',
            border: 'none',
            color: showToken ? '#2997FF' : '#86868B',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color var(--transition-fast)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-2-2l2 2m7 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="m21 2-9.6 9.6" />
            <path d="m15.5 7.5 3 3" />
          </svg>
        </button>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!isValid || ingesting}
          className={isValid && !ingesting ? 'btn-apple-primary' : 'btn-apple-secondary'}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 500,
            flexShrink: 0,
            marginLeft: '4px',
            opacity: isValid && !ingesting ? 1 : 0.4,
          }}
        >
          {ingesting ? 'Indexing...' : 'Analyze'}
        </button>
      </div>

      {/* GitHub Token input (optional) */}
      {showToken && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 14px',
          }}
        >
          <span style={{ fontSize: '12px', color: '#86868B', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            Token
          </span>
          <input
            type={tokenVisible ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (optional)"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#F5F5F7',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => setTokenVisible(!tokenVisible)}
            style={{ background: 'none', border: 'none', color: '#86868B', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      )}

      {/* Validation hint */}
      {url && !isValid && (
        <p style={{ fontSize: '12px', color: '#FF453A', fontFamily: 'var(--font-mono)', marginTop: '-4px' }}>
          Please enter a valid GitHub repository URL
        </p>
      )}
    </form>
  );
}
