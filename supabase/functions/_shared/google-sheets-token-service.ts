/**
 * Centralized Token Service for Google Sheets OAuth
 * Handles encrypted storage, retrieval, and automatic refresh
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  googleEmail?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  tokens?: GoogleTokens;
  error?: string;
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * Create Supabase admin client for token operations
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Get decrypted tokens for a user
 * Uses RPC function for secure decryption
 */
export async function getDecryptedTokens(
  supabase: SupabaseClient,
  userId: string
): Promise<GoogleTokens | null> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  console.log('TOKEN_ENCRYPTION_KEY set:', !!encryptionKey, 'length:', encryptionKey?.length);

  if (encryptionKey) {
    // Use encrypted storage
    const { data, error } = await supabase.rpc('get_google_sheets_connection_decrypted', {
      p_user_id: userId,
      p_encryption_key: encryptionKey,
    });

    console.log('RPC result - error:', error?.message, 'data rows:', data?.length);

    if (error || !data || data.length === 0) {
      console.log('No encrypted connection found for user, error:', error?.message);
      return null;
    }

    const conn = data[0];
    const tokenPrefix = conn.access_token?.substring(0, 15);
    console.log('Decrypted token starts with:', tokenPrefix, 'still encrypted:', tokenPrefix?.startsWith('encrypted:'));

    return {
      accessToken: conn.access_token,
      refreshToken: conn.refresh_token,
      expiresAt: new Date(conn.token_expires_at),
      googleEmail: conn.google_email,
    };
  } else {
    // Fallback to plain text storage (development)
    const { data, error } = await supabase
      .from('google_sheets_connections')
      .select('access_token, refresh_token, token_expires_at, google_email')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.token_expires_at),
      googleEmail: data.google_email,
    };
  }
}

/**
 * Store encrypted tokens for a user
 */
export async function storeEncryptedTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: GoogleTokens
): Promise<boolean> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');

  if (encryptionKey) {
    // Use encrypted storage
    const { error } = await supabase.rpc('upsert_google_sheets_connection_encrypted', {
      p_user_id: userId,
      p_access_token: tokens.accessToken,
      p_refresh_token: tokens.refreshToken,
      p_token_expires_at: tokens.expiresAt.toISOString(),
      p_google_email: tokens.googleEmail || '',
      p_encryption_key: encryptionKey,
    });

    if (error) {
      console.error('Failed to store encrypted tokens:', error.message);
      return false;
    }
    return true;
  } else {
    // Fallback to plain text storage (development)
    const { error } = await supabase
      .from('google_sheets_connections')
      .upsert({
        user_id: userId,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt.toISOString(),
        google_email: tokens.googleEmail,
        status: 'connected',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Failed to store tokens:', error.message);
      return false;
    }
    return true;
  }
}

/**
 * Update only the access token (after refresh)
 */
export async function updateAccessToken(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  expiresAt: Date
): Promise<boolean> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');

  if (encryptionKey) {
    const { error } = await supabase.rpc('update_google_sheets_access_token_encrypted', {
      p_user_id: userId,
      p_access_token: accessToken,
      p_token_expires_at: expiresAt.toISOString(),
      p_encryption_key: encryptionKey,
    });

    if (error) {
      console.error('Failed to update encrypted access token:', error.message);
      return false;
    }
    return true;
  } else {
    const { error } = await supabase
      .from('google_sheets_connections')
      .update({
        access_token: accessToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update access token:', error.message);
      return false;
    }
    return true;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenRefreshResult> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Missing Google OAuth credentials' };
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Token refresh failed:', errorData);
      return { success: false, error: errorData.error_description || 'Token refresh failed' };
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000));

    return {
      success: true,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Use new if provided
        expiresAt,
      },
    };
  } catch (err) {
    console.error('Token refresh error:', err);
    return { success: false, error: 'Network error during token refresh' };
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenRefreshResult> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Missing Google OAuth credentials' };
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Code exchange failed:', errorData);
      return { success: false, error: errorData.error_description || 'Code exchange failed' };
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000));

    // Fetch user info to get email
    let googleEmail: string | undefined;
    try {
      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        googleEmail = userInfo.email;
      }
    } catch (e) {
      console.warn('Failed to fetch Google user info:', e);
    }

    return {
      success: true,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        googleEmail,
      },
    };
  } catch (err) {
    console.error('Code exchange error:', err);
    return { success: false, error: 'Network error during code exchange' };
  }
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<{ accessToken: string; googleEmail?: string } | null> {
  const tokens = await getDecryptedTokens(supabase, userId);

  if (!tokens) {
    return null;
  }

  // Check if token is expired (with 5 min buffer)
  const bufferMs = 5 * 60 * 1000;
  const isExpired = tokens.expiresAt.getTime() - bufferMs < Date.now();

  if (!isExpired) {
    return { accessToken: tokens.accessToken, googleEmail: tokens.googleEmail };
  }

  // Token expired, refresh it
  console.log('Access token expired, refreshing...');
  const refreshResult = await refreshAccessToken(tokens.refreshToken);

  if (!refreshResult.success || !refreshResult.tokens) {
    console.error('Token refresh failed:', refreshResult.error);
    return null;
  }

  // Store new access token
  const updated = await updateAccessToken(
    supabase,
    userId,
    refreshResult.tokens.accessToken,
    refreshResult.tokens.expiresAt
  );

  if (!updated) {
    console.warn('Failed to store refreshed token, but returning it anyway');
  }

  return {
    accessToken: refreshResult.tokens.accessToken,
    googleEmail: tokens.googleEmail
  };
}

/**
 * Disconnect Google Sheets (delete tokens)
 */
export async function disconnectGoogleSheets(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('google_sheets_connections')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to disconnect Google Sheets:', error.message);
    return false;
  }

  return true;
}

/**
 * Log audit event for token operations
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('google_sheets_audit_log').insert({
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // Don't fail on audit log errors
    console.warn('Failed to log audit event:', e);
  }
}
