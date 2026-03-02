/**
 * Database-backed rate limiting for Google Sheets Edge Functions
 * Prevents abuse and protects Google API quotas
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

// Rate limits per endpoint type (temporarily increased for testing)
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'oauth-init': { maxRequests: 1000, windowSeconds: 60 },      // Temporarily high
  'oauth-callback': { maxRequests: 1000, windowSeconds: 60 },  // Temporarily high
  'list-sheets': { maxRequests: 1000, windowSeconds: 60 },     // Temporarily high
  'get-structure': { maxRequests: 1000, windowSeconds: 60 },   // Temporarily high
  'execute': { maxRequests: 1000, windowSeconds: 60 },         // Temporarily high
  'import': { maxRequests: 1000, windowSeconds: 60 },          // Temporarily high
  'default': { maxRequests: 1000, windowSeconds: 60 },         // Temporarily high
};

// In-memory fallback for when DB is unavailable
const memoryStore: Map<string, { count: number; resetAt: number }> = new Map();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit using database storage
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
  const key = `${userId}:${endpoint}`;

  try {
    // Try database-backed rate limiting
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.warn('Rate limit DB check failed, using memory fallback:', error.message);
      return checkRateLimitMemory(key, config);
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      resetAt: new Date(data.reset_at),
    };
  } catch (err) {
    console.warn('Rate limit check error, using memory fallback:', err);
    return checkRateLimitMemory(key, config);
  }
}

/**
 * In-memory fallback rate limiter
 */
function checkRateLimitMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = memoryStore.get(key);

  // Reset if window expired
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  entry.count++;
  memoryStore.set(key, entry);

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}

/**
 * Create Supabase client for rate limiting
 */
export function createRateLimitClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Clean up old entries from memory store (call periodically)
 */
export function cleanupMemoryStore(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now >= entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}
