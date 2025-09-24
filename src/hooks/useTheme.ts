import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';

type ThemeCtx = { theme: Theme; setTheme: (t: Theme) => void };

// Central ThemeContext - NEVER null to prevent hook errors
const ThemeContext = createContext<ThemeCtx>({ 
  theme: 'light', 
  setTheme: () => console.log('[THEME] setTheme called before provider mounted')
});

// Simple hook to consume theme - no null checks needed
export const useTheme = (): ThemeCtx => {
  return useContext(ThemeContext);
};

export { ThemeContext };