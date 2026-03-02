import { corsHeaders, createSupabaseAdminClient, computeExpiresAt } from "../_shared/amocrm.ts";

/**
 * Simple function to save a Long-Lived Token for amoCRM
 *
 * This allows users to connect their amoCRM account by simply:
 * 1. Generating a Long-Lived Token in their amoCRM account settings
 * 2. Pasting it here along with their subdomain
 * 3. Clicking save
 *
 * No OAuth flow needed - just direct token storage.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, base_domain, access_token, refresh_token } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!base_domain) {
      return new Response(
        JSON.stringify({ error: "base_domain is required (ex: contul-tau.amocrm.ru)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "access_token (Long-Lived Token) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Clean the base_domain to get the proper format
    let subdomain = base_domain;
    subdomain = subdomain.replace(/^https?:\/\//, '');
    subdomain = subdomain.replace(/\.amocrm\.(ru|com)\/?$/, '');
    subdomain = subdomain.replace(/\/+$/, '');

    const baseDomain = `${subdomain}.amocrm.ru`;

    console.log(`[amoCRM Save Token] Saving token for user ${user_id}, subdomain: ${subdomain}`);

    // Verify the token works by making a test API call
    const testResponse = await fetch(`https://${baseDomain}/api/v4/account`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error(`[amoCRM Save Token] Token verification failed:`, testResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Token invalid sau expirat. Verifică că ai copiat corect token-ul din amoCRM.",
          details: `HTTP ${testResponse.status}`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accountData = await testResponse.json();
    console.log(`[amoCRM Save Token] Token verified successfully for account:`, accountData.name || accountData.id);

    const supabase = createSupabaseAdminClient();

    // Long-Lived tokens typically expire in 1 year (365 days), but we'll set a safe default
    // If refresh_token is provided, we can refresh it. Otherwise, user needs to regenerate.
    const expiresIn = 365 * 24 * 60 * 60; // 1 year in seconds
    const expires_at = computeExpiresAt(expiresIn);

    const connectionData: Record<string, unknown> = {
      user_id,
      base_domain: baseDomain,
      access_token,
      refresh_token: refresh_token || null, // Optional - Long-Lived tokens may not have refresh
      expires_at,
      status: "connected",
      account_id: accountData.id || null,
      account_name: accountData.name || null,
      state: null, // Clear any pending OAuth state
    };

    const { data, error } = await supabase
      .from("amocrm_connections")
      .upsert(connectionData, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[amoCRM Save Token] Database error:", error);
      return new Response(
        JSON.stringify({ error: "Nu am putut salva token-ul în baza de date" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[amoCRM Save Token] Token saved successfully for user ${user_id}`);

    return new Response(
      JSON.stringify({
        message: "amoCRM conectat cu succes!",
        base_domain: baseDomain,
        account_name: accountData.name,
        account_id: accountData.id,
        expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[amoCRM Save Token] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
