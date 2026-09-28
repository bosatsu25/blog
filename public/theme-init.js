(() => {
  try {
    const saved = globalThis.localStorage.getItem('theme');
    const dark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved === 'light' || saved === 'dark' ? saved : dark ? 'dark' : 'light';
    globalThis.document.documentElement.dataset.theme = theme;
  } catch {
    globalThis.document.documentElement.dataset.theme = 'light';
  }
})();
