// Minimal version for debugging
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
    console.log("[oauth-init] Request received:", req.method, req.url);

    const url = new URL(req.url);
    const state = url.searchParams.get("state") || "";
    const perUserClientId = url.searchParams.get("client_id") || "";
    const perUserClientSecret = url.searchParams.get("client_secret") || "";

    console.log("[oauth-init] Params:", { state, hasClientId: !!perUserClientId, hasClientSecret: !!perUserClientSecret });

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

    console.log("[oauth-init] Verifying token with Supabase...");

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseAnonKey,
      },
    });

    console.log("[oauth-init] Auth response status:", userResponse.status);

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.log("[oauth-init] Auth error:", errorText);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await userResponse.json();
    const user_id = userData.id;
    console.log("[oauth-init] User verified:", user_id);

    if (!state) {
      return new Response(
        JSON.stringify({ error: "state parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get credentials
    const globalClientId = Deno.env.get("AMOCRM_CLIENT_ID") || "";
    const redirectUri = Deno.env.get("AMOCRM_REDIRECT_URI") ||
                        Deno.env.get("AMOCRM_REDIRECT_URL") || "";

    console.log("[oauth-init] Credentials check:", {
      hasGlobalClientId: !!globalClientId,
      hasRedirectUri: !!redirectUri,
      hasPerUserClientId: !!perUserClientId,
      hasPerUserClientSecret: !!perUserClientSecret,
    });

    const usePerUserCredentials = !!(perUserClientId && perUserClientSecret);
    const clientId = usePerUserCredentials ? perUserClientId : globalClientId;

    console.log("[oauth-init] Using per-user credentials:", usePerUserCredentials);

    if (!clientId) {
      return new Response(
        JSON.stringify({
          error: "AmoCRM not configured. Please provide client_id and client_secret.",
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

    // Save per-user credentials if provided
    if (usePerUserCredentials) {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      await fetch(`${supabaseUrl}/rest/v1/amocrm_connections?user_id=eq.${user_id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          state,
          client_id: perUserClientId,
          client_secret: perUserClientSecret,
        }),
      });
    }

    // Build OAuth URL
    const authUrl = `https://www.amocrm.ru/oauth?client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}&mode=popup`;

    return new Response(
      JSON.stringify({ auth_url: authUrl, state }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
