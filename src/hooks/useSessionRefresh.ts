import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to automatically refresh session before it expires
 * Prevents unexpected logouts by proactively refreshing tokens
 */
export const useSessionRefresh = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    const refreshSession = async () => {
      // Prevent concurrent refresh attempts
      if (isRefreshingRef.current) {
        console.log('[SessionRefresh] Refresh already in progress, skipping');
        return;
      }

      try {
        isRefreshingRef.current = true;

        // Check current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[SessionRefresh] Error getting session:', error);
          return;
        }

        if (!session) {
          console.log('[SessionRefresh] No active session');
          return;
        }

        // Calculate time until expiry
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        // Refresh if less than 10 minutes until expiry
        const TEN_MINUTES_MS = 10 * 60 * 1000;

        if (timeUntilExpiry < TEN_MINUTES_MS) {
          console.log('[SessionRefresh] Token expiring soon, refreshing...');

          const { data, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.error('[SessionRefresh] Refresh failed:', refreshError);
          } else if (data.session) {
            console.log('[SessionRefresh] Session refreshed successfully');
          }
        } else {
          console.log(`[SessionRefresh] Session valid for ${Math.round(timeUntilExpiry / 60000)} more minutes`);
        }

      } catch (err) {
        console.error('[SessionRefresh] Unexpected error:', err);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // Initial refresh check
    refreshSession();

    // Check every 5 minutes
    intervalRef.current = setInterval(refreshSession, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};
