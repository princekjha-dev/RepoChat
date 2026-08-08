import { FiMessageSquare, FiGitBranch, FiSearch } from 'react-icons/fi';

/**
 * Engaging empty state with icon and call-to-action.
 */
function EmptyState({ type = 'chat', onAction }) {
  const states = {
    chat: {
      icon: <FiMessageSquare className="h-12 w-12" />,
      title: 'Start a conversation',
      description: 'Ask anything about the repository — architecture, functions, patterns, or bugs.',
      actionLabel: null,
    },
    repos: {
      icon: <FiGitBranch className="h-12 w-12" />,
      title: 'No repositories yet',
      description: 'Paste a public GitHub URL above to index your first repository.',
      actionLabel: null,
    },
    search: {
      icon: <FiSearch className="h-12 w-12" />,
      title: 'No results found',
      description: 'Try a different search term or browse the file explorer.',
      actionLabel: null,
    },
    noRepo: {
      icon: <FiGitBranch className="h-12 w-12" />,
      title: 'Select a repository',
      description: 'Choose a repository from the sidebar or index a new one to start chatting.',
      actionLabel: null,
    },
  };

  const state = states[type] || states.chat;

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
      <div className="mb-4 rounded-2xl p-4
                      dark:bg-surface-800/50 dark:text-surface-400
                      bg-surface-100 text-surface-400">
        {state.icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold dark:text-surface-200 text-surface-700">
        {state.title}
      </h3>
      <p className="max-w-sm text-sm dark:text-surface-400 text-surface-500">
        {state.description}
      </p>
      {state.actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-lg bg-surface-950 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black
                     transition-all hover:bg-surface-800 dark:hover:bg-surface-100 hover:scale-105"
        >
          {state.actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
