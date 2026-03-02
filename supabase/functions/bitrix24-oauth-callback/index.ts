// ============================================================================
// BITRIX24 OAUTH CALLBACK
// Handles OAuth 2.0 authorization callback and token exchange for Bitrix24
// ============================================================================

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
    const domain = url.searchParams.get("domain") || "";
    const memberId = url.searchParams.get("member_id") || "";
    const serverDomain = url.searchParams.get("server_domain") || "oauth.bitrix.info";

    console.log("[bitrix24-oauth-callback] Received callback:", {
      hasCode: !!code,
      state,
      domain,
      memberId,
      serverDomain,
    });

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!state) {
      return new Response(
        JSON.stringify({ error: "Missing state parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const redirectUri = Deno.env.get("BITRIX24_REDIRECT_URI") || "";
    const globalClientId = Deno.env.get("BITRIX24_CLIENT_ID") || "";
    const globalClientSecret = Deno.env.get("BITRIX24_CLIENT_SECRET") || "";

    // Find connection by state
    console.log("[bitrix24-oauth-callback] Looking up connection by state...");
    const connectionResponse = await fetch(
      `${supabaseUrl}/rest/v1/bitrix24_connections?state=eq.${encodeURIComponent(state)}&order=updated_at.desc&limit=1`,
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
      console.error("[bitrix24-oauth-callback] No connection found for state:", state);
      return renderErrorPage("Invalid state - connection not found. Please try connecting again.");
    }

    console.log("[bitrix24-oauth-callback] Found connection for user:", connection.user_id);

    // Determine credentials to use
    const hasPerUserCredentials = !!(connection.client_id && connection.client_secret);
    const clientId = hasPerUserCredentials ? connection.client_id : globalClientId;
    const clientSecret = hasPerUserCredentials ? connection.client_secret : globalClientSecret;

    console.log("[bitrix24-oauth-callback] Using per-user credentials:", hasPerUserCredentials);

    if (!clientId || !clientSecret) {
      return renderErrorPage("Missing Bitrix24 credentials. Please configure your app settings.");
    }

    // Exchange code for tokens at Bitrix24 OAuth server
    // IMPORTANT: Bitrix24 uses oauth.bitrix.info for token exchange, not the portal domain
    const tokenUrl = `https://${serverDomain}/oauth/token/`;

    console.log("[bitrix24-oauth-callback] Exchanging code for tokens at:", tokenUrl);

    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    const tokenText = await tokenResponse.text();
    console.log("[bitrix24-oauth-callback] Token response status:", tokenResponse.status);

    let tokenData: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      client_endpoint?: string;
      server_endpoint?: string;
      member_id?: string;
      domain?: string;
      error?: string;
      error_description?: string;
    };

    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error("[bitrix24-oauth-callback] Invalid JSON response:", tokenText.substring(0, 500));
      return renderErrorPage("Bitrix24 returned an invalid response. Please try again.");
    }

    if (!tokenResponse.ok || tokenData.error) {
      const errorMsg = tokenData.error_description || tokenData.error || `Token exchange failed (${tokenResponse.status})`;
      console.error("[bitrix24-oauth-callback] Token exchange error:", errorMsg);
      return renderErrorPage(`Failed to connect: ${errorMsg}`);
    }

    if (!tokenData.access_token) {
      console.error("[bitrix24-oauth-callback] No access token in response");
      return renderErrorPage("No access token received from Bitrix24");
    }

    console.log("[bitrix24-oauth-callback] Token exchange successful!");

    // Calculate expiry (default 1 hour = 3600 seconds)
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000).toISOString();

    // Determine final portal domain
    // Priority: domain from callback params > tokenData.domain > connection.portal_domain
    // Note: tokenData.domain might be empty or contain oauth.bitrix.info which is wrong
    const finalDomain = domain || (tokenData.domain && !tokenData.domain.includes('oauth.bitrix') ? tokenData.domain : null) || connection.portal_domain;
    const finalMemberId = tokenData.member_id || memberId || connection.member_id;
    const clientEndpoint = tokenData.client_endpoint || (finalDomain ? `https://${finalDomain}/rest/` : null);

    console.log("[bitrix24-oauth-callback] Final values:", { finalDomain, finalMemberId, clientEndpoint });

    // Update connection with tokens
    const updatePayload: Record<string, unknown> = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      portal_domain: finalDomain,
      member_id: finalMemberId,
      client_endpoint: clientEndpoint,
      status: "connected",
      state: null,
      updated_at: new Date().toISOString(),
    };

    // Preserve per-user credentials
    if (hasPerUserCredentials) {
      updatePayload.client_id = connection.client_id;
      updatePayload.client_secret = connection.client_secret;
    }

    await fetch(`${supabaseUrl}/rest/v1/bitrix24_connections?user_id=eq.${connection.user_id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(updatePayload),
    });

    console.log("[bitrix24-oauth-callback] Connection updated successfully!");

    // Check if browser request
    const acceptHeader = req.headers.get("accept") || "";
    const isBrowserRequest = acceptHeader.includes("text/html");

    if (isBrowserRequest) {
      return renderSuccessPage(finalDomain || "Bitrix24");
    }

    return new Response(
      JSON.stringify({
        message: "Bitrix24 connected",
        portal_domain: finalDomain,
        member_id: finalMemberId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bitrix24-oauth-callback] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";

    const acceptHeader = req.headers.get("accept") || "";
    const isBrowserRequest = acceptHeader.includes("text/html");

    if (isBrowserRequest) {
      return renderErrorPage(errorMessage);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// HTML RENDERING HELPERS
// ============================================================================

function renderSuccessPage(portalDomain: string): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Bitrix24 Connected</title>
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
    .bitrix-logo {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="success">
    <svg class="bitrix-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#2FC6F6"/>
      <path d="M12 12h16v4H12V12zm0 6h16v4H12v-4zm0 6h16v4H12v-4z" fill="white"/>
    </svg>
    <div class="check">&#10003;</div>
    <h1>Bitrix24 Connected!</h1>
    <p>Portal: ${portalDomain}</p>
    <p style="margin-top: 20px; font-size: 14px;">This window will close automatically...</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'bitrix24_connected',
        success: true,
        portal_domain: '${portalDomain}'
      }, '*');
      setTimeout(() => window.close(), 2000);
    } else {
      setTimeout(() => {
        window.location.href = 'https://app.agentauto.app/workflows';
      }, 2000);
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderErrorPage(errorMessage: string): Response {
  const safeError = errorMessage.replace(/'/g, "\\'").replace(/"/g, "&quot;");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Bitrix24 Connection Error</title>
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
    <div class="icon">&#10005;</div>
    <h1>Connection Failed</h1>
    <p>${safeError}</p>
    <p style="margin-top: 20px; font-size: 14px;">Close this window and try again.</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'bitrix24_connected',
        success: false,
        error: '${safeError}'
      }, '*');
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}
