import { useRef, useEffect } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import SuggestedQuestions from './SuggestedQuestions';
import EmptyState from '../common/EmptyState';

/**
 * Main chat window — ChatGPT-style conversation interface.
 * Premium black & white SaaS design.
 */
function ChatWindow({ messages, onSend, loading, activeRepo, isDark, onCancelStream }) {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!activeRepo ? (
          <EmptyState type="noRepo" />
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-4 py-12">
            {/* Welcome */}
            <div className="text-center animate-fade-in">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl
                              dark:bg-surface-700/40 bg-surface-200/50">
                <FiMessageSquare className="h-7 w-7 dark:text-surface-400 text-surface-500" />
              </div>
              <h2 className="mb-2 text-xl font-semibold dark:text-surface-100 text-surface-900">
                Chat with this repository
              </h2>
              <p className="text-sm dark:text-surface-400 text-surface-500 max-w-md">
                Ask questions about the code, architecture, functions, or anything else.
                AI will find relevant code and answer using context.
              </p>
            </div>

            {/* Suggestions */}
            <SuggestedQuestions onSelect={(q) => onSend(q)} />
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
            {messages.map((msg, index) => (
              <MessageBubble
                key={`${msg.role}-${index}`}
                message={msg}
                isDark={isDark}
              />
            ))}
            {loading && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Input container with Stop button */}
      <div className="relative">
        {loading && onCancelStream && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10">
            <button
              type="button"
              onClick={onCancelStream}
              className="flex items-center gap-1.5 rounded-full border dark:border-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700 bg-white hover:bg-surface-50 dark:text-surface-300 text-surface-700 px-3.5 py-1.5 text-xs shadow-md transition-all hover:scale-105 border-surface-200"
            >
              <span className="h-2 w-2 rounded-sm bg-red-500 animate-pulse" />
              Stop generating
            </button>
          </div>
        )}
        <ChatInput
          onSend={onSend}
          loading={loading}
          disabled={!activeRepo}
        />
      </div>
    </div>
  );
}

export default ChatWindow;
