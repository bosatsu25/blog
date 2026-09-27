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

  const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
  const nextLabel = nextTheme === 'dark' ? 'Dark' : 'Light';

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
      aria-label={`${nextLabel} mode に切り替える`}
      aria-pressed={theme === 'dark'}
      onClick={toggleTheme}
      disabled={!hydrated}
      data-hydrated={hydrated ? 'true' : 'false'}
      title={`${nextLabel} mode に切り替える`}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === 'light' ? '☾' : '☀'}
      </span>
      <span className="theme-toggle__label">{nextLabel}</span>
    </button>
  );
}
