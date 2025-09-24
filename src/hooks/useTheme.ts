import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

type ThemeCtx = { theme: Theme; setTheme: (t: Theme) => void };

// Central ThemeContext with safe default of null
const ThemeContext = createContext<ThemeCtx | null>(null);

// Hook to consume theme with safe fallback to avoid crashes
export const useTheme = (): ThemeCtx => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback to prevent runtime crashes when provider isn't mounted yet
    return { theme: 'light', setTheme: () => {} };
  }
  return ctx;
};

export { ThemeContext };