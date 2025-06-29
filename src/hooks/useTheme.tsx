import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../styles/theme';
import { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [theme, setCurrentTheme] = useState<Theme>(lightTheme);

  useEffect(() => {
    // Load saved theme preference or use system preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme !== null) {
          const isDarkSaved = savedTheme === 'dark';
          setIsDark(isDarkSaved);
          setCurrentTheme(isDarkSaved ? darkTheme : lightTheme);
        } else {
          // Use system preference as default
          const colorScheme = Appearance.getColorScheme();
          const systemIsDark = colorScheme === 'dark';
          setIsDark(systemIsDark);
          setCurrentTheme(systemIsDark ? darkTheme : lightTheme);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
        setCurrentTheme(lightTheme);
      }
    };

    loadTheme();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Only change if user hasn't set a preference
      AsyncStorage.getItem('theme').then((savedTheme) => {
        if (savedTheme === null) {
          const systemIsDark = colorScheme === 'dark';
          setIsDark(systemIsDark);
          setCurrentTheme(systemIsDark ? darkTheme : lightTheme);
        }
      });
    });

    return () => subscription?.remove();
  }, []);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    setCurrentTheme(newIsDark ? darkTheme : lightTheme);
    
    try {
      await AsyncStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const setTheme = async (newIsDark: boolean) => {
    setIsDark(newIsDark);
    setCurrentTheme(newIsDark ? darkTheme : lightTheme);
    
    try {
      await AsyncStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 