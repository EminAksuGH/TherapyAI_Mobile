import { createContext, useEffect, useState } from 'react';

export const ThemeContext = createContext();

const getInitialTheme = () => {
    if (typeof window !== "undefined" && window.localStorage) {
        const savedTheme = window.localStorage.getItem('theme');
        if (savedTheme) return savedTheme;
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
};

const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeProvider;
