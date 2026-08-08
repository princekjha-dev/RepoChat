import { FiSun, FiMoon } from 'react-icons/fi';

/**
 * Dark/Light theme toggle button with smooth icon animation.
 */
function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="group relative flex h-9 w-9 items-center justify-center rounded-xl
                 transition-all duration-300 hover:scale-110
                 dark:bg-surface-800 dark:hover:bg-surface-700
                 bg-surface-100 hover:bg-surface-200"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <FiSun className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <FiMoon className="h-4 w-4 text-surface-700 dark:text-surface-300 transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  );
}

export default ThemeToggle;
