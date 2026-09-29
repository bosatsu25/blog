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
      <svg
        className="theme-toggle__icon"
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {theme === 'light' ? (
          <path d="M20.2 15.5A8.5 8.5 0 0 1 8.5 3.8a8.5 8.5 0 1 0 11.7 11.7Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </>
        )}
      </svg>
    </button>
  );
}
