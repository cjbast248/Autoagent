// ============================================================================
// BITRIX24 OAUTH INIT
// Initiates OAuth 2.0 authorization flow for Bitrix24 CRM
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[bitrix24-oauth-init] Request received:", req.method, req.url);

    const url = new URL(req.url);
    const state = url.searchParams.get("state") || "";
    const portalDomain = url.searchParams.get("portal_domain") || "";
    const perUserClientId = url.searchParams.get("client_id") || "";
    const perUserClientSecret = url.searchParams.get("client_secret") || "";

    console.log("[bitrix24-oauth-init] Params:", {
      state,
      portalDomain,
      hasClientId: !!perUserClientId,
      hasClientSecret: !!perUserClientSecret,
    });

    // Get auth header
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify token with Supabase
    const token = authHeader.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    console.log("[bitrix24-oauth-init] Verifying token with Supabase...");

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseAnonKey,
      },
    });

    console.log("[bitrix24-oauth-init] Auth response status:", userResponse.status);

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.log("[bitrix24-oauth-init] Auth error:", errorText);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await userResponse.json();
    const user_id = userData.id;
    console.log("[bitrix24-oauth-init] User verified:", user_id);

    if (!state) {
      return new Response(
        JSON.stringify({ error: "state parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get credentials
    const globalClientId = Deno.env.get("BITRIX24_CLIENT_ID") || "";
    const redirectUri = Deno.env.get("BITRIX24_REDIRECT_URI") || "";

    console.log("[bitrix24-oauth-init] Credentials check:", {
      hasGlobalClientId: !!globalClientId,
      hasRedirectUri: !!redirectUri,
      hasPerUserClientId: !!perUserClientId,
      hasPerUserClientSecret: !!perUserClientSecret,
    });

    const usePerUserCredentials = !!(perUserClientId && perUserClientSecret);
    const clientId = usePerUserCredentials ? perUserClientId : globalClientId;

    console.log("[bitrix24-oauth-init] Using per-user credentials:", usePerUserCredentials);

    if (!clientId) {
      return new Response(
        JSON.stringify({
          error: "Bitrix24 not configured. Please provide client_id and client_secret.",
          requires_credentials: true
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing redirect URI configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update pending connection
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // First, check if connection exists
    const existingResponse = await fetch(
      `${supabaseUrl}/rest/v1/bitrix24_connections?user_id=eq.${user_id}`,
      {
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
      }
    );

    const existingConnections = await existingResponse.json();
    const connectionData: Record<string, unknown> = {
      state,
      status: "pending",
      updated_at: new Date().toISOString(),
    };

    // Save per-user credentials if provided
    if (usePerUserCredentials) {
      connectionData.client_id = perUserClientId;
      connectionData.client_secret = perUserClientSecret;
    }

    // Save portal domain if provided
    if (portalDomain) {
      connectionData.portal_domain = portalDomain;
    }

    if (existingConnections.length > 0) {
      // Update existing connection
      await fetch(`${supabaseUrl}/rest/v1/bitrix24_connections?user_id=eq.${user_id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(connectionData),
      });
    } else {
      // Create new connection
      await fetch(`${supabaseUrl}/rest/v1/bitrix24_connections`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          user_id,
          ...connectionData,
        }),
      });
    }

    // Build OAuth URL for Bitrix24
    // Bitrix24 uses portal-specific authorization URL
    // If portal domain is provided, use it; otherwise use generic URL
    let authBaseUrl = "https://oauth.bitrix.info/oauth/authorize/";
    if (portalDomain) {
      authBaseUrl = `https://${portalDomain}/oauth/authorize/`;
    }

    const authUrl = new URL(authBaseUrl);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("redirect_uri", redirectUri);

    console.log("[bitrix24-oauth-init] Generated auth URL:", authUrl.toString());

    return new Response(
      JSON.stringify({ auth_url: authUrl.toString(), state }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bitrix24-oauth-init] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
