import React, { useState, useEffect, useContext, createContext, ReactNode, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearSessionCache } from '@/utils/sessionManager';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, phoneNumber?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Utility function to clean up auth state - dynamically detect and remove Supabase keys
const cleanupAuthState = () => {
  // Find and remove Supabase auth keys dynamically
  const keysToRemove: string[] = [];

  // Scan localStorage for Supabase auth keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') && key.endsWith('-auth-token') || key.includes('supabase.auth'))) {
      keysToRemove.push(key);
    }
  }

  // Remove found keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  console.log('[AuthContext] Cleaned up auth state, removed keys:', keysToRemove);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  // Auto-refresh session to prevent unexpected logouts
  useSessionRefresh();

  // PATCH #02: Use ref instead of state to avoid re-running useEffect
  // This tracks whether the next SIGNED_IN event should show welcome animation
  const realLoginPendingRef = useRef(false);

  // Refs to prevent duplicate notifications
  const notificationSentRef = useRef<Set<string>>(new Set());
  const isProcessingAuthRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Show animation only for real login events
        // PATCH #02: Use ref to check, avoids useEffect re-run
        if (event === 'SIGNED_IN' && realLoginPendingRef.current) {
          setShowWelcome(true);
          realLoginPendingRef.current = false;
        }

        // Handle Google OAuth new user detection
        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          const isGoogleAuth = session.user.app_metadata?.provider === 'google';

          // Prevent duplicate processing
          if (isProcessingAuthRef.current) {
            return;
          }

          // Check if we already sent notification for this user in this session
          if (notificationSentRef.current.has(userId)) {
            return;
          }

          if (isGoogleAuth) {
            isProcessingAuthRef.current = true;

            try {
              // Check account creation time - if created more than 5 minutes ago, not new
              const createdAt = new Date(session.user.created_at);
              const now = new Date();
              const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

              // Send Telegram notification only for truly new accounts (< 5 minutes old)
              if (minutesSinceCreation < 5) {
                notificationSentRef.current.add(userId);

                await supabase.functions.invoke('telegram-notify-signup', {
                  body: {
                    user_id: userId,
                    email: session.user.email,
                    first_name: session.user.user_metadata?.full_name?.split(' ')[0] ||
                               session.user.user_metadata?.first_name || '',
                    last_name: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ||
                              session.user.user_metadata?.last_name || '',
                    is_basic: true,
                    provider: 'google'
                  }
                });
              }
            } catch {
              // Silent fail for notification
            } finally {
              isProcessingAuthRef.current = false;
            }
          }
        }
      }
    );

    // Check for existing session on app load with single timeout
    const getSessionWithTimeout = async () => {
      try {
        // Single 5s timeout - simpler, no double timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        );
        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        setSession(session);
        setUser(session?.user ?? null);
      } catch {
        // Fast O(1) recovery from localStorage using known key (uses constant from top of file)
        try {
          const value = localStorage.getItem(SUPABASE_AUTH_KEY);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed?.user) {
              setUser(parsed.user);
              setSession({ access_token: parsed.access_token, user: parsed.user } as Session);
            }
          }
        } catch {
          // Failed to parse stored session
        }
      } finally {
        setLoading(false);
      }
    };
    getSessionWithTimeout();

    return () => subscription.unsubscribe();
  // PATCH #02: Empty deps - subscription runs ONCE, uses refs for mutable state
  }, []);

  // Realtime subscription to detect user deletion and force redirect
  // Only setup after loading is complete to avoid conflicts with OAuth callback
  useEffect(() => {
    if (!user?.id || loading) return;

    // Store channel reference for cleanup
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Delay realtime subscription slightly to ensure session is fully established
    const timeoutId = setTimeout(() => {
      channel = supabase
        .channel(`user-deletion-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          async () => {
            // Cleanup auth state on user deletion
            cleanupAuthState();
            setUser(null);
            setSession(null);
            setShowWelcome(false);
            notificationSentRef.current.clear();

            // Force signout
            try {
              await supabase.auth.signOut({ scope: 'local' });
            } catch {
              // Ignore signout errors during cleanup
            }

            // Force redirect to auth page
            window.location.href = '/auth';
          }
        )
        .subscribe();
    }, 500); // 500ms delay - reduced from 2s

    // Cleanup function - properly cleans up both timeout and channel
    return () => {
      clearTimeout(timeoutId);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, loading]);

  // Listen for broadcast from admin when user is deleted - immediate logout
  useEffect(() => {
    if (!user?.id || loading) return;

    const channel = supabase
      .channel('user-deletion-broadcast')
      .on('broadcast', { event: 'user_deleted' }, async (payload) => {
        // Check if this deletion is for the current user
        if (payload.payload?.user_id === user.id) {
          // Cleanup auth state
          cleanupAuthState();
          setUser(null);
          setSession(null);
          setShowWelcome(false);
          notificationSentRef.current.clear();

          // Force signout
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // Ignore signout errors
          }

          // Clear storage and redirect
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/auth';
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loading]);

  // Periodic user verification - checks if user still exists every 30 seconds
  // This catches cases where realtime subscription might miss the deletion
  useEffect(() => {
    if (!user?.id || loading) return;

    const verifyUserExists = async () => {
      try {
        // Use getUser() which validates the session with Supabase Auth server
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          // Cleanup auth state
          cleanupAuthState();
          setUser(null);
          setSession(null);
          setShowWelcome(false);
          notificationSentRef.current.clear();

          // Force signout
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // Ignore signout errors
          }

          // Clear storage and redirect
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/auth';
        }
      } catch (err) {
        console.error('[Auth] User verification error:', err);
        // On error, don't logout - might be network issue
      }
    };

    // Run verification every 30 seconds
    const intervalId = setInterval(verifyUserExists, 30000);

    // Also run once after a short delay (5 seconds after login)
    const initialCheckId = setTimeout(verifyUserExists, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(initialCheckId);
    };
  }, [user?.id, loading]);

  const signIn = async (email: string, password: string) => {
    try {
      // PATCH #02: Use ref - no re-render of provider
      realLoginPendingRef.current = true;

      // Perform sign in with timeout
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      const signInTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Autentificarea a expirat. Vă rugăm să încercați din nou.')), 10000)
      );

      const { data, error } = await Promise.race([signInPromise, signInTimeout]);

      if (error) {
        realLoginPendingRef.current = false;
        return { error };
      }

      // IMPORTANT: Update state immediately after successful login to prevent race conditions
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return { error: null };
    } catch (err: any) {
      realLoginPendingRef.current = false;
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, phoneNumber?: string) => {
    try {
      cleanupAuthState();

      // Check for promo code in localStorage
      const promoCode = localStorage.getItem('promo_code');
      const promoCredits = localStorage.getItem('promo_credits');

      // Determine redirect based on signup method (phone or email)
      const isPhoneSignup = phoneNumber && phoneNumber.trim() !== '';
      const redirectUrl = isPhoneSignup
        ? `${window.location.origin}/phone-verification-pending`
        : `${window.location.origin}/`;

      // Wrap signUp with timeout to prevent blocking
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName || '',
            last_name: lastName || '',
            phone_number: phoneNumber || '',
            promo_code: promoCode || '',
            promo_credits: promoCredits || '',
          }
        }
      });
      const signUpTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Înregistrarea a expirat. Vă rugăm să încercați din nou.')), 15000)
      );

      const { data, error } = await Promise.race([signUpPromise, signUpTimeout]);

      if (error) {
        return { error };
      }

      // Send basic Telegram notification for email signup
      if (data.user) {
        // Mark as notified to prevent duplicate
        notificationSentRef.current.add(data.user.id);

        try {
          await supabase.functions.invoke('telegram-notify-signup', {
            body: {
              user_id: data.user.id,
              email: email,
              first_name: firstName || '',
              last_name: lastName || '',
              is_basic: true,
              provider: 'email'
            }
          });
        } catch {
          // Silent fail for notification
        }

        // Apply promo credits if promo code exists
        if (promoCode && promoCredits) {
          try {
            console.log(`🎁 Applying promo code "${promoCode}" with ${promoCredits} credits`);

            // Get the session token for authorization
            const { data: sessionData } = await supabase.auth.getSession();

            if (sessionData?.session?.access_token) {
              const { data: promoData, error: promoError } = await supabase.functions.invoke('apply-promo-credits', {
                body: {
                  promo_code: promoCode,
                  promo_credits: promoCredits,
                },
                headers: {
                  Authorization: `Bearer ${sessionData.session.access_token}`
                }
              });

              if (promoError) {
                console.error('Error applying promo credits:', promoError);
              } else {
                console.log('✅ Promo credits applied successfully:', promoData);
                // Clear promo code from localStorage after successful application
                localStorage.removeItem('promo_code');
                localStorage.removeItem('promo_credits');
              }
            }
          } catch (promoErr) {
            console.error('Failed to apply promo credits:', promoErr);
            // Non-blocking error - user still gets registered
          }
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      // Clear state first
      setShowWelcome(false);
      realLoginPendingRef.current = false;
      notificationSentRef.current.clear();

      // Clean up auth storage
      cleanupAuthState();
      clearSessionCache();
      // Call Supabase signOut with timeout
      try {
        const signOutPromise = supabase.auth.signOut({ scope: 'global' });
        const signOutTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('signOut timeout')), 5000)
        );
        await Promise.race([signOutPromise, signOutTimeout]);
      } catch (e) {
      }

      // Clear React state
      setUser(null);
      setSession(null);
      // Clear ALL cached data
      localStorage.clear();
      sessionStorage.clear();

      // Small delay to ensure cleanup completes before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.href = '/auth';
    } catch (err) {
      console.error('[Auth] signOut error:', err);
      // Ensure state is cleared even on error
      clearSessionCache();
      setUser(null);
      setSession(null);
      setShowWelcome(false);

      // Still redirect even on error
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth';
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    showWelcome,
    setShowWelcome,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
