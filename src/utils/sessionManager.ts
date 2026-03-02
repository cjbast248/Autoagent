/**
 * Session Manager - Centralized token and session management
 *
 * This utility provides safe access to authentication tokens with:
 * - Token expiry validation
 * - Automatic token refresh
 * - Retry logic for failed requests
 * - Proper error handling
 */

import { supabase } from '@/integrations/supabase/client';
import { ENV } from '@/config/environment';

// Buffer time before expiry to refresh (5 minutes)
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

// Timeout for Supabase SDK auth calls (increased to 15 seconds for slow connections)
const AUTH_TIMEOUT_MS = 15000;

/**
 * Wrap a promise with a timeout - prevents SDK calls from hanging indefinitely
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Cache for current session to avoid repeated localStorage parsing
let cachedSession: {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
} | null = null;

// Dynamically detect Supabase storage key based on project URL
let SUPABASE_AUTH_KEY: string | null = null;

/**
 * Get the Supabase auth key from localStorage dynamically
 * The key format is: sb-[project-ref]-auth-token
 */
function getSupabaseAuthKey(): string | null {
  if (SUPABASE_AUTH_KEY) return SUPABASE_AUTH_KEY;

  // Look for keys matching Supabase pattern
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      SUPABASE_AUTH_KEY = key;
      console.log('[SessionManager] Detected Supabase auth key:', key);
      return key;
    }
  }

  console.warn('[SessionManager] Could not detect Supabase auth key');
  return null;
}

/**
 * Parse the Supabase session from localStorage - O(1) lookup
 * Returns null if no valid session found
 */
function parseStoredSession(): typeof cachedSession {
  try {
    const authKey = getSupabaseAuthKey();
    if (!authKey) {
      console.warn('[SessionManager] No Supabase auth key found in localStorage');
      return null;
    }

    // Direct O(1) lookup instead of O(n) iteration
    const value = localStorage.getItem(authKey);
    if (value) {
      const parsed = JSON.parse(value);
      if (parsed?.access_token && parsed?.expires_at) {
        return {
          accessToken: parsed.access_token,
          expiresAt: parsed.expires_at * 1000, // Convert to milliseconds
          refreshToken: parsed.refresh_token || '',
        };
      }
    }
  } catch (e) {
    console.error('[SessionManager] Error parsing stored session:', e);
  }
  return null;
}

/**
 * Check if a token is expired or about to expire
 */
function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= (expiresAt - EXPIRY_BUFFER_MS);
}

/**
 * Get a valid access token, refreshing if necessary
 * OPTIMIZED: Checks cache and localStorage FIRST before making network calls
 *
 * @returns Promise<string | null> - Valid access token or null if unable to get one
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    // 1. FASTEST: Check memory cache first (O(1))
    if (cachedSession && !isTokenExpired(cachedSession.expiresAt)) {
      return cachedSession.accessToken;
    }

    // 2. FAST: Check localStorage directly (O(1) with known key)
    const storedSession = parseStoredSession();
    if (storedSession && !isTokenExpired(storedSession.expiresAt)) {
      cachedSession = storedSession;
      return storedSession.accessToken;
    }

    // 3. SLOW: Only call Supabase if cache/localStorage failed or token expired
    // Wrap with timeout to prevent SDK from hanging indefinitely
    let session = null;
    let error = null;
    try {
      const result = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        'getSession'
      );
      session = result.data?.session;
      error = result.error;
    } catch (timeoutErr: any) {
      console.error('[SessionManager] getSession timed out:', timeoutErr.message);
      // Return cached token if available (even if expired) rather than nothing
      if (storedSession) {
        console.log('[SessionManager] Returning stored token after timeout');
        return storedSession.accessToken;
      }
      return null;
    }

    if (error) {
      console.error('[SessionManager] Error getting session from Supabase:', error);
    }

    if (session?.access_token) {
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;

      // Check if token is still valid
      if (!isTokenExpired(expiresAt)) {
        // Update cache
        cachedSession = {
          accessToken: session.access_token,
          expiresAt,
          refreshToken: session.refresh_token || '',
        };
        return session.access_token;
      }

      // Token is expired or about to expire, try to refresh
      console.log('[SessionManager] Token expired, attempting refresh...');
      let refreshData = null;
      let refreshError = null;
      try {
        const result = await withTimeout(
          supabase.auth.refreshSession(),
          AUTH_TIMEOUT_MS,
          'refreshSession'
        );
        refreshData = result.data;
        refreshError = result.error;
      } catch (timeoutErr: any) {
        console.error('[SessionManager] refreshSession timed out:', timeoutErr.message);
        return null;
      }

      if (refreshError) {
        console.error('[SessionManager] Error refreshing session:', refreshError);
      } else if (refreshData?.session?.access_token) {
        console.log('[SessionManager] Token refreshed successfully');
        cachedSession = {
          accessToken: refreshData.session.access_token,
          expiresAt: (refreshData.session.expires_at || 0) * 1000,
          refreshToken: refreshData.session.refresh_token || '',
        };
        return refreshData.session.access_token;
      }
    }

    // No valid token available
    console.warn('[SessionManager] No valid access token available');
    return null;

  } catch (e) {
    console.error('[SessionManager] Unexpected error getting access token:', e);
    return null;
  }
}

/**
 * Synchronous version - gets token from cache or localStorage
 * Use this only when async is not possible (rare cases)
 *
 * WARNING: This may return an expired token if cache is stale
 * Prefer getValidAccessToken() whenever possible
 */
export function getAccessTokenSync(): string | null {
  // Check cache first
  if (cachedSession && !isTokenExpired(cachedSession.expiresAt)) {
    return cachedSession.accessToken;
  }

  // Parse from localStorage
  const storedSession = parseStoredSession();
  if (storedSession) {
    if (!isTokenExpired(storedSession.expiresAt)) {
      cachedSession = storedSession;
      return storedSession.accessToken;
    } else {
      console.warn('[SessionManager] Token from localStorage is expired');
      // Return it anyway for sync contexts, but log warning
      // The API call will fail with 401 and should trigger a refresh
      return storedSession.accessToken;
    }
  }

  return null;
}

/**
 * Clear the session cache (call on logout)
 */
export function clearSessionCache(): void {
  cachedSession = null;
}

/**
 * Pre-warm the session cache from localStorage
 * Call this at app startup to avoid parsing localStorage on first API call
 * Returns true if a valid session was found
 */
export function prewarmSessionCache(): boolean {
  const storedSession = parseStoredSession();
  if (storedSession && !isTokenExpired(storedSession.expiresAt)) {
    cachedSession = storedSession;
    return true;
  }
  return false;
}

/**
 * Fetch with automatic token refresh on 401
 *
 * @param url - Request URL
 * @param options - Fetch options (without Authorization header)
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Promise<Response>
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const token = await getValidAccessToken();

  if (!token) {
    throw new Error('No valid authentication token available');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });

    clearTimeout(timeoutId);

    // If we get 401, try to refresh token and retry once
    if (response.status === 401) {
      // Clear cache to force refresh
      cachedSession = null;

      // Try to refresh with timeout
      let refreshData = null;
      let refreshError = null;
      try {
        const result = await withTimeout(
          supabase.auth.refreshSession(),
          AUTH_TIMEOUT_MS,
          'refreshSession (401 retry)'
        );
        refreshData = result.data;
        refreshError = result.error;
      } catch (timeoutErr: any) {
        console.error('[SessionManager] Token refresh timed out after 401:', timeoutErr.message);
        return response;
      }

      if (refreshError || !refreshData?.session?.access_token) {
        console.error('[SessionManager] Token refresh failed after 401:', refreshError);
        // Return original 401 response
        return response;
      }

      // Update cache
      cachedSession = {
        accessToken: refreshData.session.access_token,
        expiresAt: (refreshData.session.expires_at || 0) * 1000,
        refreshToken: refreshData.session.refresh_token || '',
      };

      // Retry the request with new token
      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => retryController.abort(), timeoutMs);

      try {
        const retryResponse = await fetch(url, {
          ...options,
          signal: retryController.signal,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${refreshData.session.access_token}`,
          },
        });

        clearTimeout(retryTimeoutId);
        return retryResponse;
      } catch (retryErr) {
        clearTimeout(retryTimeoutId);
        throw retryErr;
      }
    }

    return response;

  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }

    throw err;
  }
}

/**
 * Fetch with automatic retry and exponential backoff for transient errors
 * Use this for critical operations that should retry on network failures
 *
 * @param url - Request URL
 * @param options - Fetch options
 * @param timeoutMs - Request timeout per attempt
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithAuth(url, options, timeoutMs);

      // Retry on 5xx server errors (not 4xx client errors)
      if (response.status >= 500 && attempt < maxRetries) {
        console.log(`[SessionManager] Server error ${response.status}, retrying (${attempt + 1}/${maxRetries})...`);
        await sleep(getBackoffDelay(attempt));
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;

      // Don't retry on auth errors
      if (err.message?.includes('authentication token')) {
        throw err;
      }

      // Retry on timeout or network errors
      if (attempt < maxRetries) {
        console.log(`[SessionManager] Request failed, retrying (${attempt + 1}/${maxRetries}):`, err.message);
        await sleep(getBackoffDelay(attempt));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// Helper for exponential backoff delay
function getBackoffDelay(attempt: number): number {
  // 500ms, 1000ms, 2000ms...
  return Math.min(500 * Math.pow(2, attempt), 5000);
}

// Helper for async sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if user is currently authenticated with a valid session
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getValidAccessToken();
  return token !== null;
}

/**
 * Connection health status
 */
export interface ConnectionHealth {
  isHealthy: boolean;
  latencyMs: number;
  error?: string;
}

// Cache for health check to avoid spamming
let lastHealthCheck: { result: ConnectionHealth; timestamp: number } | null = null;
const HEALTH_CHECK_CACHE_MS = 30000; // Cache health for 30s

/**
 * Check Supabase connection health with a lightweight request
 * Useful for showing connection status to users
 *
 * @param forceCheck - Skip cache and perform fresh check
 * @returns ConnectionHealth object
 */
export async function checkConnectionHealth(forceCheck = false): Promise<ConnectionHealth> {
  // Return cached result if recent
  if (!forceCheck && lastHealthCheck &&
      Date.now() - lastHealthCheck.timestamp < HEALTH_CHECK_CACHE_MS) {
    return lastHealthCheck.result;
  }

  const startTime = Date.now();

  try {
    const token = getAccessTokenSync();
    if (!token) {
      const result: ConnectionHealth = {
        isHealthy: false,
        latencyMs: 0,
        error: 'No authentication token'
      };
      return result;
    }

    // Lightweight health check - just hit the REST API root
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${ENV.SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': ENV.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    const result: ConnectionHealth = {
      isHealthy: response.ok || response.status === 404, // 404 is OK for HEAD on root
      latencyMs,
      error: response.ok ? undefined : `HTTP ${response.status}`
    };

    lastHealthCheck = { result, timestamp: Date.now() };
    return result;

  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const result: ConnectionHealth = {
      isHealthy: false,
      latencyMs,
      error: err.name === 'AbortError' ? 'Connection timeout' : err.message
    };
    lastHealthCheck = { result, timestamp: Date.now() };
    return result;
  }
}

/**
 * Get current user ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const result = await withTimeout(
      supabase.auth.getSession(),
      AUTH_TIMEOUT_MS,
      'getSession (getCurrentUserId)'
    );
    return result.data?.session?.user?.id || null;
  } catch (err: any) {
    console.error('[SessionManager] getCurrentUserId failed:', err.message);
    return null;
  }
}
