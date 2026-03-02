import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [theme, setThemeState] = useState<Theme>('light'); // Default to light
    const [isLoading, setIsLoading] = useState(true);

    // Load user's theme preference from database
    useEffect(() => {
        const loadTheme = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('theme_mode')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!error && data?.theme_mode) {
                    const loadedTheme = data.theme_mode as Theme;
                    setThemeState(loadedTheme);
                    applyTheme(loadedTheme);
                } else {
                    // Default to light if no preference
                    applyTheme('light');
                }
            } catch (error) {
                console.error('Error loading theme:', error);
                applyTheme('light');
            } finally {
                setIsLoading(false);
            }
        };

        loadTheme();
    }, [user]);

    const applyTheme = (newTheme: Theme) => {
        // Apply theme class to document root
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(newTheme);

        // Also set data attribute for CSS
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        applyTheme(newTheme);

        // Save to database if user is logged in
        if (user) {
            try {
                await supabase
                    .from('profiles')
                    .update({ theme_mode: newTheme })
                    .eq('id', user.id);
            } catch (error) {
                console.error('Error saving theme:', error);
            }
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isLoading }}>
            {children}
        </ThemeContext.Provider>
    );
};
