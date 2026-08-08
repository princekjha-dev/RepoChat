import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

const EXAMPLE_QUESTIONS = [
  'Explain the authentication architecture',
  'Where are database queries handled?',
  'Find potential security vulnerabilities',
  'How does the caching layer work?',
  'Explain the main data flow',
  'Which files should I modify to add a new API endpoint?',
  'What are the entry points of this application?',
];

/**
 * Chat — Main chat interface with messages, streaming input, and suggestions.
 */
export default function Chat({ messages, activeRepo, onSend, chatLoading, onCancelStream, onCitationClick }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const q = input.trim();
    if (!q || chatLoading) return;
    onSend(q);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSuggestion = (q) => {
    if (chatLoading) return;
    onSend(q);
  };

  const formatSlug = (slug) => {
    if (!slug) return '';
    const parts = slug.split('_');
    return parts.length >= 2 ? `${parts.slice(0, -1).join('_')}/${parts[parts.length - 1]}` : slug;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000000', position: 'relative' }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', minHeight: '100%', paddingBottom: '120px' }}>
          {messages.length === 0 ? (
            /* Empty state */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
                gap: '24px',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2997FF',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="headline-gradient" style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '8px' }}>
                  Ask anything about{' '}
                  <span style={{ color: '#2997FF', fontFamily: 'var(--font-mono)' }}>
                    {formatSlug(activeRepo)}
                  </span>
                </h2>
                <p style={{ fontSize: '13px', color: '#86868B', maxWidth: '420px', lineHeight: 1.6 }}>
                  Get precise answers about architecture, functions, security, and dependencies — with verified source citations.
                </p>
              </div>

              {/* Suggestion chips */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '8px',
                  maxWidth: '600px',
                }}
              >
                {EXAMPLE_QUESTIONS.slice(0, 6).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestion(q)}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 'var(--radius-pill)',
                      color: '#F5F5F7',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} activeRepo={activeRepo} onCitationClick={onCitationClick} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input area */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'linear-gradient(to top, #000000 80%, transparent)',
          padding: '16px 20px 24px',
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              transition: 'all var(--transition-fast)',
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)';
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
              placeholder="Ask a question about this codebase..."
              style={{
                width: '100%',
                resize: 'none',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#F5F5F7',
                fontSize: '14px',
                lineHeight: 1.6,
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                maxHeight: '160px',
                overflowY: 'auto',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#6E6E73', fontFamily: 'var(--font-mono)' }}>
                ↵ send · shift+↵ newline
              </span>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {chatLoading && (
                  <button
                    onClick={onCancelStream}
                    className="btn-apple-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: '#FF453A',
                    }}
                  >
                    Stop
                  </button>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || chatLoading}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: input.trim() && !chatLoading ? '#F5F5F7' : 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    cursor: input.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)',
                    opacity: input.trim() && !chatLoading ? 1 : 0.4,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke={input.trim() && !chatLoading ? '#000000' : '#86868B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
