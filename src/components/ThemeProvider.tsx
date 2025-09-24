import { useEffect, useState } from 'react';
import { ThemeContext, Theme } from '@/hooks/useTheme';

console.log('[THEME] ThemeProvider loading - NEW VERSION');

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  console.log('[THEME] ThemeProvider rendered with theme:', theme);

  // Load saved theme
  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('bw_theme')) as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  // Persist and apply theme class
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('bw_theme', theme);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
