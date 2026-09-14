import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeModeType = 'auto' | 'manual';

interface ThemeContextType {
  themeMode: ThemeModeType;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeModeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeModeType>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as ThemeModeType) || 'manual';
  });

  // Manual dark mode selection
  const [manualDark, setManualDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return false;
  });

  // Track system preference
  const [systemDark, setSystemDark] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen to system changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  const isDarkMode = themeMode === 'auto' ? systemDark : manualDark;

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const setThemeMode = (mode: ThemeModeType) => {
    setThemeModeState(mode);
    localStorage.setItem('themeMode', mode);
  };

  const toggleTheme = () => {
    setThemeMode('manual');
    setManualDark(prev => {
      const newVal = !prev;
      localStorage.setItem('theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  return (
    <ThemeContext.Provider value={{ themeMode, isDarkMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
