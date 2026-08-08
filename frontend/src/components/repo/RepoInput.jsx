import { useState } from 'react';
import { FiLoader, FiGithub, FiCheck, FiAlertCircle } from 'react-icons/fi';
import ErrorMessage from '../common/ErrorMessage';

/**
 * Repository URL input with validation and loading state — Premium B&W design.
 */
function RepoInput({ onIngest, ingesting }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const validateUrl = (value) => {
    if (!value.trim()) return 'Please enter a GitHub URL.';
    if (!/github\.com\/[\w.\-]+\/[\w.\-]+/.test(value.trim())) {
      return 'Enter a valid GitHub URL (e.g., https://github.com/owner/repo)';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');

    try {
      await onIngest(url);
      setUrl('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <FiGithub className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2
                               dark:text-surface-500 text-surface-400" />
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError('');
            }}
            placeholder="https://github.com/owner/repo"
            disabled={ingesting}
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none
                       transition-colors
                       dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100
                       dark:placeholder:text-surface-500 dark:focus:border-surface-500
                       border-surface-300 bg-white text-surface-950
                       placeholder:text-surface-400 focus:border-surface-600
                       disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={ingesting}
          className="flex items-center gap-2 rounded-xl bg-surface-950 dark:bg-white px-4 py-2.5
                     text-sm font-semibold text-white dark:text-black transition-all
                     hover:bg-surface-800 dark:hover:bg-surface-100 hover:scale-105
                     disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100
                     shadow-md"
        >
          {ingesting ? (
            <>
              <FiLoader className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Indexing...</span>
            </>
          ) : (
            <>
              <span>Index</span>
            </>
          )}
        </button>
      </form>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
    </div>
  );
}

export default RepoInput;
