import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem('theme', theme);
  } catch {
    // The theme still works for the current page when storage is unavailable.
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTheme(getDocumentTheme());
    setHydrated(true);
  }, []);

  const toggleTheme = () => {
    const currentTheme = getDocumentTheme();
    const next: Theme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.dataset.theme = next;
    persistTheme(next);
    setTheme(next);
  };

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label="Dark mode"
      aria-pressed={theme === 'dark'}
      onClick={toggleTheme}
      disabled={!hydrated}
      data-hydrated={hydrated ? 'true' : 'false'}
      title="Toggle dark mode"
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === 'light' ? '☾' : '☀'}
      </span>
      <span className="theme-toggle__label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
