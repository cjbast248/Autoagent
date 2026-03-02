// amoCRM OAuth Callback - handles authorization code exchange
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const queryReferer = url.searchParams.get("referer") || "";

    console.log("[oauth-callback] Received callback:", { hasCode: !!code, state, queryReferer });

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!state) {
      return new Response(
        JSON.stringify({ error: "Missing state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const redirectUri = Deno.env.get("AMOCRM_REDIRECT_URI") || Deno.env.get("AMOCRM_REDIRECT_URL") || "";
    const globalClientId = Deno.env.get("AMOCRM_CLIENT_ID") || "";
    const globalClientSecret = Deno.env.get("AMOCRM_CLIENT_SECRET") || "";

    // Find connection by state
    console.log("[oauth-callback] Looking up connection by state...");
    const connectionResponse = await fetch(
      `${supabaseUrl}/rest/v1/amocrm_connections?state=eq.${encodeURIComponent(state)}&order=updated_at.desc&limit=1`,
      {
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
      }
    );

    const connections = await connectionResponse.json();
    const connection = connections[0];

    if (!connection) {
      console.error("[oauth-callback] No connection found for state:", state);
      return new Response(
        JSON.stringify({ error: "Invalid state - connection not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[oauth-callback] Found connection for user:", connection.user_id);

    // Determine credentials to use
    const hasPerUserCredentials = !!(connection.client_id && connection.client_secret);
    const clientId = hasPerUserCredentials ? connection.client_id : globalClientId;
    const clientSecret = hasPerUserCredentials ? connection.client_secret : globalClientSecret;
    const baseDomain = queryReferer || connection.base_domain || "www.amocrm.ru";

    console.log("[oauth-callback] Using per-user credentials:", hasPerUserCredentials);
    console.log("[oauth-callback] Base domain:", baseDomain);

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Missing credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for tokens
    console.log("[oauth-callback] Exchanging code for tokens...");
    const tokenResponse = await fetch(`https://${baseDomain}/oauth2/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenText = await tokenResponse.text();
    console.log("[oauth-callback] Token response status:", tokenResponse.status);

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error("[oauth-callback] Invalid JSON response:", tokenText);
      throw new Error("amoCRM returned invalid response");
    }

    if (!tokenResponse.ok) {
      const errorMsg = tokenData?.message || tokenData?.title || tokenData?.error || `Token exchange failed (${tokenResponse.status})`;
      console.error("[oauth-callback] Token exchange error:", errorMsg);
      throw new Error(errorMsg);
    }

    console.log("[oauth-callback] Token exchange successful!");

    // Calculate expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in - 60) * 1000).toISOString();
    const finalBaseDomain = queryReferer || tokenData.base_domain || connection.base_domain;

    // Update connection
    const updatePayload = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      base_domain: finalBaseDomain,
      account_id: tokenData.account_id || connection.account_id,
      status: "connected",
      state: null,
      updated_at: new Date().toISOString(),
    };

    // Preserve per-user credentials
    if (hasPerUserCredentials) {
      (updatePayload as any).client_id = connection.client_id;
      (updatePayload as any).client_secret = connection.client_secret;
    }

    await fetch(`${supabaseUrl}/rest/v1/amocrm_connections?user_id=eq.${connection.user_id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(updatePayload),
    });

    console.log("[oauth-callback] Connection updated successfully!");

    // Check if browser request
    const acceptHeader = req.headers.get("accept") || "";
    const isBrowserRequest = acceptHeader.includes("text/html");

    if (isBrowserRequest) {
      const successHtml = `<!DOCTYPE html>
<html>
<head>
  <title>amoCRM Connected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
    }
    .success {
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    .check { font-size: 64px; margin-bottom: 20px; }
    h1 { margin: 0 0 10px 0; font-size: 24px; }
    p { margin: 0; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="success">
    <div class="check">✓</div>
    <h1>amoCRM Conectat!</h1>
    <p>Cont: ${finalBaseDomain}</p>
    <p style="margin-top: 20px; font-size: 14px;">Această fereastră se va închide automat...</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'amocrm_connected', success: true, base_domain: '${finalBaseDomain}' }, '*');
      setTimeout(() => window.close(), 2000);
    } else {
      setTimeout(() => { window.location.href = 'https://app.agentauto.app/workflows'; }, 2000);
    }
  </script>
</body>
</html>`;

      return new Response(successHtml, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(
      JSON.stringify({ message: "amoCRM connected", base_domain: finalBaseDomain }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[oauth-callback] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";

    const acceptHeader = req.headers.get("accept") || "";
    const isBrowserRequest = acceptHeader.includes("text/html");

    if (isBrowserRequest) {
      const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Eroare amoCRM</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #2d1a1a 0%, #3e1616 100%);
      color: white;
    }
    .error {
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      max-width: 500px;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { margin: 0 0 10px 0; font-size: 24px; color: #ff6b6b; }
    p { margin: 0; opacity: 0.8; word-break: break-word; }
  </style>
</head>
<body>
  <div class="error">
    <div class="icon">✕</div>
    <h1>Eroare la conectare</h1>
    <p>${errorMessage}</p>
    <p style="margin-top: 20px; font-size: 14px;">Închide fereastra și încearcă din nou.</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'amocrm_connected', success: false, error: '${errorMessage.replace(/'/g, "\\'")}' }, '*');
    }
  </script>
</body>
</html>`;

      return new Response(errorHtml, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
