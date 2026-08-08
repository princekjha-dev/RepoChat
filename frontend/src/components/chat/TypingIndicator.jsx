/**
 * Animated typing indicator (three bouncing dots).
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl
                      dark:bg-surface-800 dark:text-brand-400
                      bg-surface-100 text-brand-600">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="4" cy="12" r="2.5" />
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="20" cy="12" r="2.5" />
        </svg>
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3
                      dark:bg-surface-800/80 bg-surface-100">
        <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce-dot" />
        <span className="h-2 w-2 rounded-full bg-brand-400 animate-bounce-dot" style={{ animationDelay: '0.2s' }} />
        <span className="h-2 w-2 rounded-full bg-brand-300 animate-bounce-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

export default TypingIndicator;
