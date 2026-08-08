import { FiMessageSquare } from 'react-icons/fi';
import ThemeToggle from '../common/ThemeToggle';

/**
 * Top navigation bar — Premium black and white SaaS design.
 */
function Navbar({ theme, onToggleTheme, onLogoClick, showBackButton = false }) {
  return (
    <nav className="flex h-14 items-center justify-between border-b px-4
                    dark:border-surface-800 dark:bg-surface-900/80
                    border-surface-200 bg-white/80
                    backdrop-blur-md sticky top-0 z-30">
      {/* Logo */}
      <button
        onClick={onLogoClick}
        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-950 dark:bg-white shadow-md">
          <FiMessageSquare className="h-4 w-4 dark:text-black text-white" />
        </div>
        <span className="text-lg font-bold dark:text-white text-surface-950">
          Repo<span className="font-black">Chat</span>
        </span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </nav>
  );
}

export default Navbar;
