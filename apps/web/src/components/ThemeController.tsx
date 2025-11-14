'use client';

import { useEffect, useState } from 'react';

const THEME_KEY = 'klassechatten-theme';
const AVAILABLE_THEMES = ['funkyfred', 'dark'] as const;
type Theme = (typeof AVAILABLE_THEMES)[number];

export function ThemeController() {
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('funkyfred');

  useEffect(() => {
    setMounted(true);
    
    // Get saved theme or use system preference
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'funkyfred';
    const theme = savedTheme || systemTheme;
    
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);

    // Listen for system theme changes (only if no saved preference)
    if (!savedTheme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'funkyfred';
        setCurrentTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'funkyfred' ? 'dark' : 'funkyfred';
    setCurrentTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (!mounted) {
    return null;
  }

  return (
    <label className="swap swap-rotate">
      <input
        type="checkbox"
        checked={currentTheme === 'dark'}
        onChange={toggleTheme}
        className="theme-controller"
        aria-label="Toggle theme"
      />
      
      {/* Sun icon - visible in light mode */}
      <svg
        className="swap-off w-6 h-6 stroke-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      
      {/* Moon icon - visible in dark mode */}
      <svg
        className="swap-on w-6 h-6 stroke-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </label>
  );
}
