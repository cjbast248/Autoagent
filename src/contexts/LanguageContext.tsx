import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Language = 'ro' | 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t: i18nT, i18n } = useTranslation();

  // Load user's saved language preference - check localStorage first, then DB
  useEffect(() => {
    let isCancelled = false;

    const loadUserLanguage = async () => {
      // 1. FAST: Check localStorage first (already set by i18next)
      try {
        const cachedLang = localStorage.getItem('i18nextLng');
        if (cachedLang && ['ro', 'en', 'ru'].includes(cachedLang)) {
          // Already have a valid language, use it
          if (i18n.language !== cachedLang) {
            await i18n.changeLanguage(cachedLang);
          }
          return; // Skip DB query if we have cached preference
        }
      } catch (err) {
        console.warn('LanguageContext: Failed to read cached language from localStorage:', err);
        // Fall through to DB query
      }

      // 2. SLOW: Only query DB if no cached preference AND user is logged in
      if (user?.id) {
        try {
          // Add 3s timeout to prevent hanging
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 3000)
          );
          const queryPromise = supabase
            .from('profiles')
            .select('default_language')
            .eq('id', user.id)
            .maybeSingle(); // Use maybeSingle to avoid errors on missing profile

          const result = await Promise.race([queryPromise, timeoutPromise]);

          if (isCancelled) return;

          if (result === null) {
            console.warn('LanguageContext: DB language query timed out, using default language');
            return;
          }

          const profile = 'data' in result ? result.data : null;
          const dbError = 'error' in result ? result.error : null;

          if (dbError) {
            console.warn('LanguageContext: Failed to load language preference from DB:', dbError.message);
            return;
          }

          if (profile?.default_language && ['ro', 'en', 'ru'].includes(profile.default_language)) {
            await i18n.changeLanguage(profile.default_language);
            try {
              localStorage.setItem('i18nextLng', profile.default_language); // Cache it
            } catch (storageErr) {
              console.warn('LanguageContext: Failed to cache language in localStorage:', storageErr);
            }
          }
        } catch (err) {
          console.warn('LanguageContext: Unexpected error loading language preference:', err);
          // Silently fall back to default language
        }
      }
    };

    loadUserLanguage();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, i18n]);

  const setLanguage = async (lang: Language) => {
    try {
      await i18n.changeLanguage(lang);
    } catch (err) {
      console.error('LanguageContext: Failed to change i18n language:', err);
      // Do not update localStorage or DB if the language switch itself failed
      return;
    }

    try {
      localStorage.setItem('i18nextLng', lang);
    } catch (err) {
      console.warn('LanguageContext: Failed to persist language to localStorage:', err);
      // Continue to save to DB even if localStorage fails
    }

    // Save to database if user is logged in
    if (user?.id) {
      try {
        const { error: dbError } = await supabase
          .from('profiles')
          .update({ default_language: lang })
          .eq('id', user.id);
        if (dbError) {
          console.error('LanguageContext: Failed to save language preference to DB:', dbError.message);
        }
      } catch (error) {
        console.error('LanguageContext: Unexpected error saving language preference:', error);
      }
    }
  };

  // PATCH #01: Stabilize t function with useCallback to prevent unnecessary re-renders
  // Translation function that falls back to key if translation not found
  const t = useCallback((key: string): string => {
    const translation = i18nT(key);
    return translation !== key ? translation : key.split('.').pop() || key;
  }, [i18nT]);

  const value: LanguageContextType = {
    language: (i18n.language || 'ro') as Language,
    setLanguage,
    t,
    isRTL: false,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
