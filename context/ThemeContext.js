import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const getInitialTheme = async () => {
  try {
    const savedTheme = await AsyncStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    
    // Use system preference if no saved theme
    const systemTheme = Appearance.getColorScheme();
    return systemTheme === 'dark' ? 'dark' : 'light';
  } catch (error) {
    console.error('Error getting initial theme:', error);
    return 'light';
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize theme on app start
    const initializeTheme = async () => {
      const initialTheme = await getInitialTheme();
      setTheme(initialTheme);
      setLoading(false);
    };

    initializeTheme();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Only auto-change if user hasn't manually set a preference
      AsyncStorage.getItem('theme').then((savedTheme) => {
        if (!savedTheme) {
          setTheme(colorScheme === 'dark' ? 'dark' : 'light');
        }
      });
    });

    return () => subscription?.remove();
  }, []);

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setSpecificTheme = async (newTheme) => {
    try {
      if (newTheme === 'light' || newTheme === 'dark') {
        setTheme(newTheme);
        await AsyncStorage.setItem('theme', newTheme);
      }
    } catch (error) {
      console.error('Error setting specific theme:', error);
    }
  };

  // Theme colors matching web design - Purple/Lavender aesthetic
  const themeColors = {
    light: {
      // Web: --primary-link: #bc81c4;
      primary: '#bc81c4',
      primaryHover: '#bc81c4',
      // Web: --bg-color: #f4f9f8;
      background: '#f4f9f8',
      // Web: --card-bg: #ffffff;
      surface: '#ffffff',
      card: '#ffffff',
      // Web: --text-color: #222;
      text: '#222222',
      // Web: --text-secondary: rgba(0, 0, 0, 0.6);
      textSecondary: 'rgba(0, 0, 0, 0.6)',
      // Web: --border-color: rgba(229, 206, 235, 0.3);
      border: 'rgba(229, 206, 235, 0.3)',
      // Web: --button-bg: #eae3f8;
      accent: '#eae3f8',
      success: '#28A745',
      warning: '#FFC107',
      error: '#E74C3C',
      info: '#17A2B8',
      // Web: --bg-color: #f4f9f8;
      chatBackground: '#f4f9f8',
      // Web: --user-message-bg: #e6e3f8;
      userMessage: '#e6e3f8',
      // Web: --ai-message-bg: #e7ebf6;
      aiMessage: '#e7ebf6',
      // Web: --input-bg: #f4f2f8;
      inputBackground: '#f4f2f8',
      placeholder: 'rgba(0, 0, 0, 0.5)',
      // Web: --sidebar-bg: #f7f0fe;
      sidebarBackground: '#f7f0fe',
      // Web: --hover-bg: #f0e6f8;
      hoverBackground: '#f0e6f8',
      // Web: --active-bg: #e5d6f5;
      activeBackground: '#e5d6f5'
    },
    dark: {
      // Web: --primary-link: #a8b2ff;
      primary: '#a8b2ff',
      primaryHover: '#bdc5ff',
      // Web: --bg-color: #1a1a1e;
      background: '#1a1a1e',
      // Web: --card-bg: #2a2a2f;
      surface: '#2a2a2f',
      card: '#2a2a2f',
      // Web: --text-color: #e0e0e0;
      text: '#e0e0e0',
      // Web: --text-secondary: rgba(200, 200, 220, 0.7);
      textSecondary: 'rgba(200, 200, 220, 0.7)',
      // Web: --border-color: rgba(90, 90, 120, 0.5);
      border: 'rgba(90, 90, 120, 0.5)',
      // Web: --button-bg: #4e4e5a;
      accent: '#4e4e5a',
      success: '#48BB78',
      warning: '#ED8936',
      error: '#ff6b6b',
      info: '#4299E1',
      // Web: --bg-color: #1a1a1e;
      chatBackground: '#1a1a1e',
      // Web: --user-message-bg: #4b4762;
      userMessage: '#4b4762',
      // Web: --ai-message-bg: #383c4e;
      aiMessage: '#383c4e',
      // Web: --input-bg: #2d2d33;
      inputBackground: '#2d2d33',
      placeholder: 'rgba(200, 200, 220, 0.5)',
      // Web: --sidebar-bg: #252530;
      sidebarBackground: '#252530',
      // Web: --hover-bg: #36364a;
      hoverBackground: '#36364a',
      // Web: --active-bg: #3f3f56;
      activeBackground: '#3f3f56'
    }
  };

  const colors = themeColors[theme];

  const value = {
    theme,
    colors,
    toggleTheme,
    setSpecificTheme,
    isDark: theme === 'dark',
    loading
  };

  if (loading) {
    return null; // Or a loading component
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 