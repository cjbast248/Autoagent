import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface BackgroundColorContextType {
    backgroundColor: string;
    setBackgroundColor: (color: string) => void;
    isLoading: boolean;
}

const BackgroundColorContext = createContext<BackgroundColorContextType | undefined>(undefined);

export const useBackgroundColor = () => {
    const context = useContext(BackgroundColorContext);
    if (!context) {
        throw new Error('useBackgroundColor must be used within BackgroundColorProvider');
    }
    return context;
};

export const BackgroundColorProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [backgroundColor, setBackgroundColorState] = useState('#1a1a1a'); // Default color
    const [isLoading, setIsLoading] = useState(true);

    // Load user's background color preference from database
    useEffect(() => {
        const loadBackgroundColor = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('background_color')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!error && data?.background_color) {
                    setBackgroundColorState(data.background_color);
                    // Apply to document root
                    document.documentElement.style.setProperty('--app-background', data.background_color);
                }
            } catch (error) {
                console.error('Error loading background color:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadBackgroundColor();
    }, [user]);

    const setBackgroundColor = async (color: string) => {
        setBackgroundColorState(color);
        // Apply to document root immediately
        document.documentElement.style.setProperty('--app-background', color);

        // Save to database if user is logged in
        if (user) {
            try {
                await supabase
                    .from('profiles')
                    .update({ background_color: color })
                    .eq('id', user.id);
            } catch (error) {
                console.error('Error saving background color:', error);
            }
        }
    };

    return (
        <BackgroundColorContext.Provider value={{ backgroundColor, setBackgroundColor, isLoading }}>
            {children}
        </BackgroundColorContext.Provider>
    );
};
