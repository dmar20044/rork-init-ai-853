import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentColors } from '@/constants/colors';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => Promise<void>;
  setTheme: (mode: ThemeMode) => Promise<void>;
  colors: ReturnType<typeof getCurrentColors>;
}

const THEME_STORAGE_KEY = 'theme_mode';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from storage on init
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && (stored === 'light' || stored === 'dark')) {
          setThemeMode(stored as ThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeMode(mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    await setTheme(newMode);
  }, [themeMode, setTheme]);

  const colors = useMemo(() => getCurrentColors(themeMode === 'dark'), [themeMode]);
  const isDarkMode = useMemo(() => themeMode === 'dark', [themeMode]);

  const value = useMemo(() => ({
    isDarkMode,
    themeMode,
    toggleTheme,
    setTheme,
    colors,
  }), [isDarkMode, themeMode, toggleTheme, setTheme, colors]);

  return value;
});