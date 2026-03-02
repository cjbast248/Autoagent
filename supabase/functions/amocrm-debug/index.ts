import { corsHeaders } from "../_shared/amocrm.ts";

// Simple debug endpoint to verify amoCRM configuration
// This helps identify mismatches between Supabase secrets and amoCRM integration settings
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("AMOCRM_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("AMOCRM_CLIENT_SECRET") || "";
    const redirectUri = Deno.env.get("AMOCRM_REDIRECT_URI") ||
                        Deno.env.get("AMOCRM_REDIRECT_URL") ||
                        Deno.env.get("AMOCRM_REDIRECT") || "";
    const baseDomain = Deno.env.get("AMOCRM_BASE_DOMAIN") || "";

    // Show partial values for security (enough to verify they match)
    const config = {
      AMOCRM_CLIENT_ID: clientId || "(not set)",
      AMOCRM_CLIENT_SECRET: clientSecret
        ? `${clientSecret.substring(0, 8)}...${clientSecret.substring(clientSecret.length - 4)} (${clientSecret.length} chars)`
        : "(not set)",
      AMOCRM_REDIRECT_URI: redirectUri || "(not set)",
      AMOCRM_BASE_DOMAIN: baseDomain || "(not set)",
      checks: {
        client_id_format: clientId.match(/^[a-f0-9-]{36}$/) ? "✓ Valid UUID format" : "✗ Invalid format (should be UUID like cec0cb37-a715-4c77-bbb2-a56c788e343e)",
        client_secret_length: clientSecret.length > 0 ? `✓ Set (${clientSecret.length} chars)` : "✗ Not set",
        redirect_uri_format: redirectUri.includes("supabase.co/functions") ? "✓ Points to Supabase function" : "⚠ Check if this matches amoCRM settings",
        base_domain_format: baseDomain.includes(".amocrm.") ? "✓ Valid amoCRM domain" : "⚠ Should be like 'subdomain.amocrm.ru'",
      },
      instructions: {
        step1: "Compare AMOCRM_CLIENT_ID above with your integration's client_id in amoCRM",
        step2: "Verify the secret was copied without extra whitespace",
        step3: "Check that AMOCRM_REDIRECT_URI exactly matches what's set in amoCRM integration (character by character)",
        step4: "Ensure your integration is not 'Private' with account restrictions",
      }
    };

    return new Response(
      JSON.stringify(config, null, 2),
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
