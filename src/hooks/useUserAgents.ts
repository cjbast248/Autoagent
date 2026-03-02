import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/AuthContext';
import { ENV } from '@/config/environment';
import { getValidAccessToken } from '@/utils/sessionManager';

// Cache global pentru a persista între re-mount-uri
let globalAgentsCache: { userId: string; data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minute

export const useUserAgents = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<any[] | null>(() => {
    // Inițializare din cache dacă e valid
    if (globalAgentsCache &&
      user?.id === globalAgentsCache.userId &&
      Date.now() - globalAgentsCache.timestamp < CACHE_TTL) {
      return globalAgentsCache.data;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!data);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs for async operation tracking - better race condition handling
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0); // Track which fetch is current

  const fetchAgents = useCallback(async (forceRefetch = false) => {
    if (!user?.id) {
      setData([]);
      setIsLoading(false);
      return;
    }

    // Verifică cache valid
    if (!forceRefetch && globalAgentsCache?.userId === user.id &&
      Date.now() - globalAgentsCache.timestamp < CACHE_TTL) {
      setData(globalAgentsCache.data);
      setIsLoading(false);
      return;
    }

    // Cancel any previous fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this fetch
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Track this fetch with an ID to handle race conditions
    const currentFetchId = ++fetchIdRef.current;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // Wait for access token to be available (with proper async handling)
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Direct fetch to Supabase REST API - evită blocarea SDK-ului
      const url = `${ENV.SUPABASE_URL}/rest/v1/kalina_agents?user_id=eq.${user.id}&order=created_at.desc`;

      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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

      // Check if this fetch is still the current one (prevents race conditions)
      if (currentFetchId !== fetchIdRef.current) {
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const agents = await response.json();
      const clonedAgents = (agents || []).map((agent: any) => ({
        ...agent,
        call_count: 0
      }));

      // Salvează în cache global
      globalAgentsCache = {
        userId: user.id,
        data: clonedAgents,
        timestamp: Date.now()
      };

      // Only update state if this is still the current fetch
      if (currentFetchId === fetchIdRef.current) {
        setData(clonedAgents);
        setIsError(false);
        setIsLoading(false);
        // Clear abort controller after successful fetch to prevent memory accumulation
        abortControllerRef.current = null;
      }
    } catch (err: any) {
      // Ignore abort errors (expected when we cancel)
      if (err.name === 'AbortError') {
        return;
      }

      console.error('useUserAgents: Error:', err.message);

      // Only update state if this is still the current fetch
      if (currentFetchId === fetchIdRef.current) {
        setIsError(true);
        setError(err);
        setData([]);
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    // Don't attempt to fetch until auth is fully loaded
    if (authLoading) {
      return;
    }

    // Dacă avem date în cache pentru acest user, nu fetch-uim
    if (data && globalAgentsCache?.userId === user?.id &&
      Date.now() - globalAgentsCache.timestamp < CACHE_TTL) {
      setIsLoading(false);
      return;
    }

    if (user) {
      fetchAgents();
    } else {
      setData([]);
      setIsLoading(false);
    }

    // Cleanup: abort any pending fetch on unmount or deps change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.id, authLoading, fetchAgents]);

  const effectiveLoading = authLoading || isLoading;

  return {
    data: data || [],
    isLoading: effectiveLoading,
    isPending: effectiveLoading,
    isFetching: isLoading,
    isError,
    error,
    refetch: () => fetchAgents(true),
    status: isError ? 'error' : effectiveLoading ? 'pending' : 'success',
    fetchStatus: isLoading ? 'fetching' : 'idle'
  };
};
