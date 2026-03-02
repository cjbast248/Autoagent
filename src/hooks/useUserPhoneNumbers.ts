import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/AuthContext';
import { ENV } from '@/config/environment';
import { getAccessTokenSync } from '@/utils/sessionManager';

// Cache global pentru a persista între re-mount-uri
let globalPhoneCache: { odomain: string; data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minute

export const useUserPhoneNumbers = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<any[] | null>(() => {
    // Inițializare din cache dacă e valid
    if (globalPhoneCache &&
        user?.id === globalPhoneCache.odomain &&
        Date.now() - globalPhoneCache.timestamp < CACHE_TTL) {
      return globalPhoneCache.data;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!data);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchPhoneNumbers = useCallback(async (forceRefetch = false) => {
    if (!user?.id) {
      setData([]);
      setIsLoading(false);
      return;
    }

    // Verifică cache valid
    if (!forceRefetch && globalPhoneCache?.odomain === user.id &&
        Date.now() - globalPhoneCache.timestamp < CACHE_TTL) {
      console.log('useUserPhoneNumbers: Using cached data');
      setData(globalPhoneCache.data);
      setIsLoading(false);
      return;
    }

    if (fetchingRef.current && !forceRefetch) {
      console.log('useUserPhoneNumbers: Already fetching, skipping');
      return;
    }

    fetchingRef.current = true;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      console.log('useUserPhoneNumbers: Fetching for user:', user.id);

      const accessToken = getAccessTokenSync();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Direct fetch to Supabase REST API - RLS handles access control
      const url = `${ENV.SUPABASE_URL}/rest/v1/phone_numbers?order=created_at.desc`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const phoneNumbers = await response.json();
      console.log('useUserPhoneNumbers: Got numbers:', phoneNumbers?.length);

      // Salvează în cache global
      globalPhoneCache = {
        odomain: user.id,
        data: phoneNumbers || [],
        timestamp: Date.now()
      };

      if (mountedRef.current) {
        setData(phoneNumbers || []);
        setIsError(false);
        console.log('useUserPhoneNumbers: Success!');
      }
    } catch (err: any) {
      console.error('useUserPhoneNumbers: Error:', err.message);
      if (mountedRef.current) {
        setIsError(true);
        setError(err);
        setData([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    mountedRef.current = true;

    if (authLoading) {
      return;
    }

    // Dacă avem date în cache pentru acest user, nu fetch-uim
    if (data && globalPhoneCache?.odomain === user?.id &&
        Date.now() - globalPhoneCache.timestamp < CACHE_TTL) {
      setIsLoading(false);
      return;
    }

    if (user) {
      fetchPhoneNumbers();
    } else {
      setData([]);
      setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user?.id, authLoading]);

  const effectiveLoading = authLoading || isLoading;

  return {
    data: data || [],
    isLoading: effectiveLoading,
    isPending: effectiveLoading,
    isFetching: isLoading,
    isError,
    error,
    refetch: () => fetchPhoneNumbers(true),
    status: isError ? 'error' : effectiveLoading ? 'pending' : 'success',
    fetchStatus: isLoading ? 'fetching' : 'idle'
  };
};
