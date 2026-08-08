import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Theme management hook.
 * Persists dark/light preference and applies the class to <html>.
 */
export function useTheme() {
  const [theme, setTheme] = useLocalStorage('repochat-theme', 'dark');

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('bg-surface-950', 'text-surface-100');
      document.body.classList.remove('bg-white', 'text-surface-900');
    } else {
      root.classList.remove('dark');
      document.body.classList.add('bg-white', 'text-surface-900');
      document.body.classList.remove('bg-surface-950', 'text-surface-100');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' };
}
