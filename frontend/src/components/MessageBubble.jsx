import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import CodeBlock from './CodeBlock';
import { API_BASE } from '../api/client';
import { addToast } from './Toast';

// Regex matching the citation format [file_path:start_line-end_line]
const CITATION_REGEX = /\[([^\[\]:]+):(\d+)-(\d+)\]/g;

/**
 * Parse raw answer text into an array of {type: 'text'|'citation', ...} segments.
 * Citation segments carry { file, start, end } so we can render pill badges.
 */
function parseAnswerSegments(text) {
  if (!text) return [];
  const segments = [];
  let lastIndex = 0;
  let match;
  CITATION_REGEX.lastIndex = 0;

  while ((match = CITATION_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({
      type: 'citation',
      raw: match[0],
      file: match[1],
      start: parseInt(match[2], 10),
      end: parseInt(match[3], 10),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return segments;
}

/**
 * CitationPill — inline badge that opens file explorer on click.
 */
function CitationPill({ file, start, end, onClick }) {
  const [hovered, setHovered] = useState(false);
  const label = `${file.split('/').pop()}:${start}-${end}`;
  const title = `${file}:${start}-${end}`;
  return (
    <button
      title={title}
      onClick={() => onClick?.({ file, start, end })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        marginLeft: '4px',
        marginRight: '2px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        cursor: 'pointer',
        background: hovered ? 'rgba(41, 151, 255, 0.2)' : 'rgba(41, 151, 255, 0.1)',
        border: `1px solid ${hovered ? 'rgba(41, 151, 255, 0.4)' : 'rgba(41, 151, 255, 0.2)'}`,
        color: hovered ? '#2997FF' : '#64D2FF',
        transition: 'all var(--transition-fast)',
        verticalAlign: 'middle',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        maxWidth: '220px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <span style={{ fontSize: '10px', opacity: 0.8 }}>↗</span>
      {label}
    </button>
  );
}

/**
 * CitationAwareMarkdown — renders markdown with interactive CitationPill components.
 */
function CitationAwareMarkdown({ content, onCitationClick, markdownComponents }) {
  return (
    <ReactMarkdown
      components={{
        ...markdownComponents,
        p({ children }) {
          return <p style={{ marginBottom: '12px', lineHeight: 1.6 }}>{renderChildrenWithCitations(children, onCitationClick)}</p>;
        },
        li({ children }) {
          return <li style={{ marginBottom: '4px', lineHeight: 1.6 }}>{renderChildrenWithCitations(children, onCitationClick)}</li>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function renderChildrenWithCitations(children, onCitationClick) {
  return React.Children.map(children, (child) => {
    if (typeof child !== 'string') return child;
    const segments = parseAnswerSegments(child);
    return segments.map((seg, i) => {
      if (seg.type === 'text') return <React.Fragment key={i}>{seg.content}</React.Fragment>;
      return (
        <CitationPill
          key={i}
          file={seg.file}
          start={seg.start}
          end={seg.end}
          onClick={onCitationClick}
        />
      );
    });
  });
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  try {
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * MessageBubble — Apple dark space-gray message component for User & AI responses.
 */
export default function MessageBubble({ message, activeRepo, onCitationClick }) {
  const { role, content, sources, citations, messageId, error, timestamp, isStreaming } = message;
  const isUser = role === 'user';
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copyHovered, setCopyHovered] = useState(false);

  const handleCopyShareLink = () => {
    if (!messageId) return;
    const slug = activeRepo || 'repo';
    const shareUrl = `${window.location.origin}/share/${slug}/${messageId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast('Share link copied to clipboard', 'success');
    }).catch(() => {
      addToast('Failed to copy link', 'error');
    });
  };

  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeStr = String(children).replace(/\n$/, '');

      if (!inline && match) {
        return (
          <CodeBlock
            language={match[1]}
            value={codeStr}
            {...props}
          />
        );
      }
      if (!inline && codeStr.includes('\n')) {
        return (
          <CodeBlock
            language="text"
            value={codeStr}
            {...props}
          />
        );
      }
      return (
        <code
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: '#2997FF',
          }}
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        margin: '12px 0',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Role header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
          flexDirection: isUser ? 'row-reverse' : 'row',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '6px',
            background: isUser ? '#2997FF' : 'rgba(255, 255, 255, 0.12)',
            border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 600,
            color: isUser ? '#000000' : '#F5F5F7',
            flexShrink: 0,
          }}
        >
          {isUser ? 'U' : 'AI'}
        </div>
        <span style={{ fontSize: '11px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>
          {isUser ? 'You' : 'RepoChat AI'}
          {timestamp && ` · ${formatTime(timestamp)}`}
        </span>
      </div>

      {/* Message bubble */}
      <div
        style={{
          maxWidth: '88%',
          padding: isUser ? '12px 18px' : '16px 20px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? '#1C1C1E'
            : error
            ? 'rgba(255, 69, 58, 0.08)'
            : 'rgba(255, 255, 255, 0.03)',
          border: isUser
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : error
            ? '1px solid rgba(255, 69, 58, 0.25)'
            : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isUser
            ? '0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        {isUser ? (
          <p style={{ color: '#F5F5F7', fontSize: '14px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
            {content}
          </p>
        ) : (
          <div className="markdown-content">
            {content ? (
              <CitationAwareMarkdown
                content={content}
                onCitationClick={onCitationClick}
                markdownComponents={markdownComponents}
              />
            ) : (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 0' }}>
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#2997FF',
                      animation: `ping 1s ease ${delay}ms infinite`,
                    }}
                  />
                ))}
              </div>
            )}
            {isStreaming && content && (
              <span
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '14px',
                  background: '#2997FF',
                  marginLeft: '2px',
                  verticalAlign: 'text-bottom',
                  animation: 'blink 1s step-end infinite',
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom action row: sources accordion + share button */}
      {!isUser && (
        <div style={{ marginTop: '8px', marginLeft: '4px', maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Share link button */}
          {messageId && !isStreaming && (
            <button
              onClick={handleCopyShareLink}
              onMouseEnter={() => setCopyHovered(true)}
              onMouseLeave={() => setCopyHovered(false)}
              title="Copy shareable link to this answer"
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: copyHovered ? '#2997FF' : '#86868B',
                fontFamily: 'var(--font-mono)',
                background: copyHovered ? 'rgba(41, 151, 255, 0.08)' : 'transparent',
                border: `1px solid ${copyHovered ? 'rgba(41, 151, 255, 0.2)' : 'transparent'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '4px 8px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>Share Link</span>
            </button>
          )}

          {/* Validated citations badges row */}
          {citations && citations.length > 0 && !isStreaming && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)', marginRight: '4px' }}>
                Sources:
              </span>
              {citations.map((c, i) => (
                <CitationPill
                  key={i}
                  file={c.file}
                  start={c.start}
                  end={c.end}
                  onClick={onCitationClick}
                />
              ))}
            </div>
          )}

          {/* Sources accordion */}
          {sources && sources.length > 0 && (
            <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <button
                onClick={() => setSourcesOpen(!sourcesOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: '#86868B',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '10px' }}>{sourcesOpen ? '▼' : '▶'}</span>
                <span>{sources.length} retrieved context sources</span>
              </button>
              {sourcesOpen && (
                <div style={{ padding: '4px 10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {sources.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => onCitationClick?.({ file: s.file, start: s.start_line, end: s.end_line })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#2997FF', fontFamily: 'var(--font-mono)' }}>
                        {s.file}
                      </span>
                      {s.start_line && s.end_line && (
                        <span style={{ fontSize: '10px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>
                          lines {s.start_line}–{s.end_line}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
