import { corsHeaders } from "../_shared/amocrm.ts";

// Test endpoint to verify amoCRM credentials by making a direct API call
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("AMOCRM_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("AMOCRM_CLIENT_SECRET") || "";
    const redirectUri = Deno.env.get("AMOCRM_REDIRECT_URI") || "";
    const baseDomain = Deno.env.get("AMOCRM_BASE_DOMAIN") || "";

    // Get test code from query params (optional)
    const url = new URL(req.url);
    const testCode = url.searchParams.get("code") || "test_invalid_code";
    const testDomain = url.searchParams.get("domain") || baseDomain;

    // Make test request to amoCRM
    const tokenUrl = `https://${testDomain}/oauth2/access_token`;

    const body = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code: testCode,
      redirect_uri: redirectUri,
    };

    console.log("Testing amoCRM credentials...");
    console.log("URL:", tokenUrl);
    console.log("client_id:", clientId);
    console.log("client_secret length:", clientSecret.length);
    console.log("client_secret first 10:", clientSecret.substring(0, 10));
    console.log("client_secret last 10:", clientSecret.substring(clientSecret.length - 10));
    console.log("redirect_uri:", redirectUri);

    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const responseText = await resp.text();

    let responseJson: any = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      // Not JSON
    }

    return new Response(
      JSON.stringify({
        test_config: {
          token_url: tokenUrl,
          client_id: clientId,
          client_secret_length: clientSecret.length,
          client_secret_preview: `${clientSecret.substring(0, 8)}...${clientSecret.substring(clientSecret.length - 8)}`,
          redirect_uri: redirectUri,
          test_code: testCode.substring(0, 20) + "...",
        },
        response: {
          status: resp.status,
          statusText: resp.statusText,
          body: responseJson || responseText.substring(0, 500),
        },
        note: "If you see 'Некорректный клиент', the client_id or client_secret is wrong. If you see 'invalid_grant', the code is invalid (expected for test)."
      }, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
