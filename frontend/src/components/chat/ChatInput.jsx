import { useState, useRef, useEffect } from 'react';
import { FiSend, FiCode, FiFile } from 'react-icons/fi';
import { useStore } from '../../store/useStore';

/**
 * Chat input with auto-resize textarea, send button, and code explanation toggle.
 * Premium black & white design.
 */
function ChatInput({ onSend, loading, disabled }) {
  const [input, setInput] = useState('');
  const [explainMode, setExplainMode] = useState(false);
  const textareaRef = useRef(null);
  
  const activeFile = useStore((state) => state.activeFile);
  const setActiveFile = useStore((state) => state.setActiveFile);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!input.trim() || loading || disabled) return;
    
    let finalInput = input.trim();
    if (activeFile) {
      finalInput = `[Context: ${activeFile}]\n\n${finalInput}`;
    }
    
    onSend(finalInput, explainMode ? 'explain' : 'qa');
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t dark:border-surface-850 border-surface-200 p-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl flex flex-col">
        {/* Pinned File context chip */}
        {activeFile && (
          <div className="flex items-center gap-1.5 self-start rounded-full bg-surface-200/50 dark:bg-surface-800/50 px-3 py-1 text-xs text-surface-700 dark:text-surface-300 border border-surface-300 dark:border-surface-700 mb-2 shadow-sm">
            <FiFile className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{activeFile.split('/').pop()}</span>
            <button
              type="button"
              onClick={() => setActiveFile(null)}
              className="ml-1 hover:text-surface-900 dark:hover:text-surface-100 font-bold"
              title="Remove file context"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border transition-colors
                        dark:border-surface-700 dark:bg-surface-900 dark:focus-within:border-surface-600
                        border-surface-300 bg-white focus-within:border-surface-600
                        px-4 py-2.5 shadow-md">
          {/* Explain mode toggle */}
          <button
            type="button"
            onClick={() => setExplainMode(!explainMode)}
            className={`mb-0.5 flex-shrink-0 rounded-lg p-2 transition-all
              ${explainMode
                ? 'bg-surface-950 text-white shadow-md dark:bg-white dark:text-black'
                : 'dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 hover:bg-surface-100'
              }`}
            title={explainMode ? 'Code Explanation Mode (ON)' : 'Toggle Code Explanation Mode'}
          >
            <FiCode className="h-4 w-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? 'Select a repository first...'
                : explainMode
                  ? 'Paste code or ask for an explanation...'
                  : 'Ask about the codebase...'
            }
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent text-sm leading-6 outline-none
                       dark:text-surface-100 dark:placeholder:text-surface-500
                       text-surface-950 placeholder:text-surface-400
                       disabled:cursor-not-allowed disabled:opacity-50"
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={loading || disabled || !input.trim()}
            className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl
                       bg-surface-950 dark:bg-white text-white dark:text-black transition-all
                       hover:bg-surface-800 dark:hover:bg-surface-100 hover:scale-105
                       disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100
                       shadow-md"
          >
            <FiSend className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Hint */}
        <div className="mt-1.5 flex items-center justify-between px-1">
          <p className="text-[11px] dark:text-surface-500 text-surface-400">
            <kbd className="rounded border dark:border-surface-700 border-surface-300 px-1 py-0.5 text-[10px]">Enter</kbd> to send
            · <kbd className="rounded border dark:border-surface-700 border-surface-300 px-1 py-0.5 text-[10px]">Shift+Enter</kbd> for new line
          </p>
          {explainMode && (
            <span className="text-[11px] font-medium text-surface-700 dark:text-surface-300">
              Code Explanation Mode
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export default ChatInput;
