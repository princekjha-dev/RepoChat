import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * CodeBlock — syntax highlighted code with copy button.
 * Supports all major languages via Prism.
 */
export default function CodeBlock({ code, language = 'text', filename = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const customStyle = {
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      background: '#0D0D14',
      margin: 0,
      padding: '16px',
      fontSize: '12.5px',
      lineHeight: '1.6',
      borderRadius: 0,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      background: 'transparent',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    },
  };

  const lineCount = code.split('\n').length;
  const langLabel = language && language !== 'text' ? language : '';

  return (
    <div
      style={{
        background: '#0D0D14',
        border: '1px solid #1E1E2E',
        borderRadius: '10px',
        overflow: 'hidden',
        margin: '8px 0',
        position: 'relative',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #1E1E2E',
          background: '#111118',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Traffic lights */}
          <div style={{ display: 'flex', gap: '5px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28CA42' }} />
          </div>
          {(filename || langLabel) && (
            <span
              style={{
                fontSize: '11px',
                color: '#5A5A7A',
                fontFamily: "'JetBrains Mono', monospace",
                marginLeft: '4px',
              }}
            >
              {filename || langLabel}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {langLabel && !filename && (
            <span
              style={{
                fontSize: '10px',
                color: '#3A3A54',
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {langLabel}
            </span>
          )}
          {lineCount > 1 && (
            <span style={{ fontSize: '10px', color: '#3A3A54', fontFamily: "'JetBrains Mono', monospace" }}>
              {lineCount} lines
            </span>
          )}
          <button
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy code'}
            style={{
              padding: '3px 8px',
              background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.12)',
              border: copied ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(124,58,237,0.25)',
              borderRadius: '5px',
              color: copied ? '#34D399' : '#8B5CF6',
              fontSize: '10px',
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              transition: 'all 150ms ease',
              letterSpacing: '0.02em',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code content */}
      <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto' }}>
        <SyntaxHighlighter
          language={language}
          style={customStyle}
          showLineNumbers={lineCount > 3}
          lineNumberStyle={{ color: '#2A2A3E', fontSize: '11px', minWidth: '3em', userSelect: 'none' }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
