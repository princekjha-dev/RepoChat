import { useState } from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';

/**
 * Copy-to-clipboard button with success feedback.
 */
function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium
                  transition-all duration-200
                  ${copied
                    ? 'bg-green-500/20 text-green-400'
                    : 'dark:bg-surface-700/50 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200 bg-surface-200 text-surface-500 hover:bg-surface-300 hover:text-surface-700'
                  }
                  ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <FiCheck className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <FiCopy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

export default CopyButton;
