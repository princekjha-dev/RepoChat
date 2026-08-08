import { FiAlertCircle, FiX } from 'react-icons/fi';

/**
 * User-friendly error message display.
 */
function ErrorMessage({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="animate-fade-in flex items-start gap-3 rounded-xl border
                    dark:border-red-500/20 dark:bg-red-500/10
                    border-red-200 bg-red-50
                    p-3.5 text-sm">
      <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
      <p className="flex-1 dark:text-red-200 text-red-700">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 rounded-lg p-1 transition-colors
                     dark:hover:bg-red-500/20 hover:bg-red-100"
        >
          <FiX className="h-3.5 w-3.5 dark:text-red-300 text-red-500" />
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
