import { FiZap } from 'react-icons/fi';

const SUGGESTIONS = [
  'Explain the project architecture',
  'What are the main API endpoints?',
  'How does the data flow work?',
  'List the important components',
  'What technologies are used?',
  'Explain how error handling works',
];

/**
 * Clickable suggested question chips shown in empty chat state.
 */
function SuggestedQuestions({ onSelect }) {
  return (
    <div className="animate-fade-in px-4">
      <div className="mb-3 flex items-center gap-2 dark:text-surface-400 text-surface-500">
        <FiZap className="h-4 w-4 text-brand-500" />
        <span className="text-xs font-medium uppercase tracking-wider">Suggested Questions</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="group rounded-xl px-4 py-3 text-left text-sm transition-all duration-200
                       dark:bg-surface-800/50 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100
                       bg-surface-50 text-surface-600 hover:bg-surface-100 hover:text-surface-800
                       hover:scale-[1.02] active:scale-[0.98]
                       border dark:border-surface-700/50 border-surface-200"
          >
            <span className="mr-2 inline-block text-brand-500 transition-transform group-hover:translate-x-0.5">→</span>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SuggestedQuestions;
