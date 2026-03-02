// ============================================================================
// BITRIX24 API PROXY
// Proxies API calls to Bitrix24 to avoid CORS issues
// Handles token refresh automatically
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

interface Bitrix24Connection {
  access_token: string;
  refresh_token: string;
  portal_domain: string;
  client_endpoint: string;
  expires_at: string | null;
  client_id?: string;
  client_secret?: string;
}

async function refreshToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const tokenUrl = 'https://oauth.bitrix.info/oauth/token/';
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token refresh failed: ${text.substring(0, 200)}`);
  }

  return await resp.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Verify user
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseAnonKey,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Get request body
    const body = await req.json();
    const { method, params } = body as { method: string; params?: Record<string, unknown> };

    if (!method) {
      return new Response(
        JSON.stringify({ error: "Missing 'method' in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bitrix24-api] User ${userId} calling ${method}`);

    // Get Bitrix24 connection
    const connResponse = await fetch(
      `${supabaseUrl}/rest/v1/bitrix24_connections?user_id=eq.${userId}&status=eq.connected&limit=1`,
      {
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
      }
    );

    const connections = await connResponse.json();
    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Bitrix24 connection found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conn = connections[0] as Bitrix24Connection;
    let accessToken = conn.access_token;

    // Check if token needs refresh (5 min buffer)
    const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
    const now = Date.now();

    if (expiresAt && expiresAt < now + 300000) {
      console.log("[bitrix24-api] Token expired, refreshing...");

      const globalClientId = Deno.env.get("BITRIX24_CLIENT_ID") || "";
      const globalClientSecret = Deno.env.get("BITRIX24_CLIENT_SECRET") || "";

      const clientId = conn.client_id || globalClientId;
      const clientSecret = conn.client_secret || globalClientSecret;

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: "Cannot refresh token - missing credentials" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const refreshed = await refreshToken(conn.refresh_token, clientId, clientSecret);
      accessToken = refreshed.access_token;

      // Update token in database
      await fetch(`${supabaseUrl}/rest/v1/bitrix24_connections?user_id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString(),
        }),
      });

      console.log("[bitrix24-api] Token refreshed successfully");
    }

    // Build API URL
    const clientEndpoint = conn.client_endpoint || `https://${conn.portal_domain}/rest/`;
    const apiUrl = `${clientEndpoint}${method}`;

    console.log(`[bitrix24-api] Calling: ${apiUrl}`);

    // Make Bitrix24 API call
    const bitrixResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(params || {}),
    });

    const bitrixData = await bitrixResponse.json();

    console.log(`[bitrix24-api] Response status: ${bitrixResponse.status}, has error: ${!!bitrixData.error}`);

    return new Response(
      JSON.stringify(bitrixData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bitrix24-api] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
