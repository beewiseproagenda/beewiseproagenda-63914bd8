import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useLocalStorage } from './useLocalStorage';

export const useTheme = () => {
  const { user } = useAuth();
  const [localTheme, setLocalTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [theme, setTheme] = useState<'light' | 'dark'>(localTheme);
  const [loading, setLoading] = useState(true);

  // Load theme from database for authenticated users
  useEffect(() => {
    if (user) {
      loadUserTheme();
    } else {
      // For unauthenticated users, use localStorage only
      setTheme(localTheme);
      setLoading(false);
    }
  }, [user, localTheme]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const loadUserTheme = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('dark_mode_enabled')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const userTheme = data.dark_mode_enabled ? 'dark' : 'light';
      setTheme(userTheme);
      setLocalTheme(userTheme); // Sync with localStorage
    } catch (error) {
      console.error('Error loading user theme:', error);
      // Fallback to localStorage theme
      setTheme(localTheme);
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    setLocalTheme(newTheme);

    // Update database for authenticated users
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ dark_mode_enabled: newTheme === 'dark' })
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating user theme:', error);
      }
    }
  };

  const toggleTheme = () => {
    updateTheme(theme === 'light' ? 'dark' : 'light');
  };

  return {
    theme,
    setTheme: updateTheme,
    toggleTheme,
    loading,
    isDark: theme === 'dark'
  };
};