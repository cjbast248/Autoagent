import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AmoTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
  base_domain?: string;
  account_id?: number;
}

export interface AmoConnection {
  id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  base_domain: string | null;
  account_id: number | null;
  account_name: string | null;
  status: string | null;
  state: string | null;
  // Per-user credentials (optional - allows users to use their own amoCRM integration)
  client_id: string | null;
  client_secret: string | null;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

function getEnv(key: string, required = true): string {
  try {
    const val = Deno.env.get(key) ?? "";
    if (required && !val) {
      console.warn(`[amoCRM] Missing env: ${key}`);
      return "";
    }
    return val;
  } catch (e) {
    console.warn(`[amoCRM] Error getting env ${key}:`, e);
    return "";
  }
}

export function createSupabaseAdminClient() {
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

function amoBaseDomain(): string {
  // Use env fallback; response tokens may override
  return getEnv("AMOCRM_BASE_DOMAIN");
}

function amoRedirectUri(): string {
  return getEnv("AMOCRM_REDIRECT_URI", false) || getEnv("AMOCRM_REDIRECT_URL", false) || getEnv("AMOCRM_REDIRECT", false) || "";
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri?: string,
  baseDomain?: string,
  perUserClientId?: string,
  perUserClientSecret?: string
): Promise<AmoTokenResponse> {
  // Support per-user credentials OR fall back to global credentials
  const clientId = perUserClientId || getEnv("AMOCRM_CLIENT_ID");
  const clientSecret = perUserClientSecret || getEnv("AMOCRM_CLIENT_SECRET");
  const redirect = redirectUri || amoRedirectUri();
  const domain = baseDomain || amoBaseDomain();

  const body = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
  };

  const tokenUrl = `https://${domain}/oauth2/access_token`;
  console.log("[amoCRM Token Exchange] Details:");
  console.log("  - URL:", tokenUrl);
  console.log("  - client_id:", clientId);
  console.log("  - client_secret (first 8 chars):", clientSecret?.substring(0, 8) + "...");
  console.log("  - redirect_uri:", redirect);
  console.log("  - code (first 20 chars):", code?.substring(0, 20) + "...");
  console.log("  - using per-user credentials:", !!perUserClientId);

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  console.log("AmoCRM response status:", resp.status, "body:", text);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`amoCRM returned invalid JSON: ${text.substring(0, 200)}`);
  }

  if (!resp.ok) {
    const msg = data?.message || data?.title || data?.error || data?.hint || `amoCRM auth error (${resp.status})`;
    throw new Error(msg);
  }

  return data as AmoTokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
  baseDomain?: string,
  perUserClientId?: string,
  perUserClientSecret?: string
): Promise<AmoTokenResponse> {
  // Support per-user credentials OR fall back to global credentials
  const clientId = perUserClientId || getEnv("AMOCRM_CLIENT_ID");
  const clientSecret = perUserClientSecret || getEnv("AMOCRM_CLIENT_SECRET");
  const domain = baseDomain || amoBaseDomain();

  const body = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  };

  const resp = await fetch(`https://${domain}/oauth2/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (!resp.ok) {
    const msg = data?.message || data?.title || data?.error || "amoCRM refresh error";
    throw new Error(msg);
  }

  return data as AmoTokenResponse;
}

export async function getActiveConnection(supabase: any, userId: string): Promise<AmoConnection | null> {
  const { data, error } = await supabase
    .from("amocrm_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching amoCRM connection:", error);
    throw error;
  }

  return data || null;
}

export async function upsertConnection(
  supabase: any,
  userId: string,
  payload: Partial<AmoConnection>
): Promise<AmoConnection> {
  const { data, error } = await supabase
    .from("amocrm_connections")
    .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Failed to upsert amoCRM connection:", error);
    throw error;
  }

  return data as AmoConnection;
}

export function computeExpiresAt(expiresIn: number): string {
  const bufferSeconds = 60;
  return new Date(Date.now() + (expiresIn - bufferSeconds) * 1000).toISOString();
}

export async function ensureAccessToken(
  supabase: any,
  userId: string
): Promise<{ access_token: string; base_domain: string }> {
  const connection = await getActiveConnection(supabase, userId);

  // Bootstrap with long-lived token if no connection yet
  if (!connection || !connection.access_token) {
    const longLived = Deno.env.get("AMOCRM_LONG_LIVED_TOKEN");
    if (!longLived) {
      throw new Error("No amoCRM connection. Please connect your amoCRM account.");
    }

    const tokenData = await exchangeAuthorizationCode(longLived);
    const expires_at = computeExpiresAt(tokenData.expires_in);

    const saved = await upsertConnection(supabase, userId, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at,
      base_domain: tokenData.base_domain || amoBaseDomain(),
      status: "connected",
    });

    return {
      access_token: saved.access_token || tokenData.access_token,
      base_domain: saved.base_domain || tokenData.base_domain || amoBaseDomain(),
    };
  }

  const now = Date.now();
  const exp = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const base_domain = connection.base_domain || amoBaseDomain();

  // Check if user has per-user credentials
  const hasPerUserCredentials = !!(connection.client_id && connection.client_secret);

  if (exp && exp > now + 90_000) {
    return { access_token: connection.access_token!, base_domain };
  }

  if (!connection.refresh_token) {
    throw new Error("amoCRM refresh token missing. Reconnect your account.");
  }

  // Use per-user credentials for refresh if available
  const refreshed = await refreshAccessToken(
    connection.refresh_token,
    base_domain,
    hasPerUserCredentials ? connection.client_id! : undefined,
    hasPerUserCredentials ? connection.client_secret! : undefined
  );
  const expires_at = computeExpiresAt(refreshed.expires_in);

  // Preserve per-user credentials in the connection
  const updatePayload: Partial<AmoConnection> = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at,
    base_domain: refreshed.base_domain || base_domain,
    status: "connected",
  };

  if (hasPerUserCredentials) {
    updatePayload.client_id = connection.client_id;
    updatePayload.client_secret = connection.client_secret;
  }

  const saved = await upsertConnection(supabase, userId, updatePayload);

  return {
    access_token: saved.access_token || refreshed.access_token,
    base_domain: saved.base_domain || refreshed.base_domain || base_domain,
  };
}
