import { corsHeaders, createSupabaseAdminClient } from "../_shared/amocrm.ts";

/**
 * Webhook endpoint that receives client_id and client_secret from amoCRM
 * when a user clicks the authorization button.
 *
 * This is called by amoCRM BEFORE the user is redirected to our callback.
 * We store the credentials temporarily with a state parameter so we can
 * match them when the callback arrives.
 *
 * Flow:
 * 1. User clicks amoCRM button on our site (we generate state with user_id)
 * 2. amoCRM sends POST to this endpoint with: client_id, client_secret, state
 * 3. We look up the pending connection by state and store credentials
 * 4. User authorizes in amoCRM popup
 * 5. amoCRM redirects to our callback with: code, state, referer
 * 6. Our callback looks up credentials by state and exchanges code for tokens
 *
 * State format: "userid_randomuuid" (e.g., "abc123_def456-789")
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Handle GET/HEAD requests (amoCRM may verify the endpoint first)
  if (req.method === "GET" || req.method === "HEAD") {
    console.log(`[amoCRM Secrets Webhook] ${req.method} request received - verification check`);
    return new Response(req.method === "HEAD" ? null : "OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }

  try {
    // amoCRM sends the secrets as POST with JSON body
    const body = await req.json();
    const { client_id, client_secret, state } = body;

    console.log("[amoCRM Secrets Webhook] Received credentials for state:", state);

    // Respond immediately to amoCRM - they may have strict timeout
    // Process DB update asynchronously
    if (client_id && client_secret && state) {
      // Fire and forget - don't await
      const supabase = createSupabaseAdminClient();
      supabase
        .from("amocrm_connections")
        .update({
          client_id,
          client_secret,
          status: "pending_auth",
          updated_at: new Date().toISOString(),
        })
        .eq("state", state)
        .then(({ error }) => {
          if (error) {
            console.error("[amoCRM Secrets Webhook] DB update error:", error);
          } else {
            console.log("[amoCRM Secrets Webhook] Credentials saved for state:", state);
          }
        });
    }

    // Return immediately
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });

  } catch (error: unknown) {
    console.error("[amoCRM Secrets Webhook] Error:", error);
    // Still return OK - amoCRM needs success response
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }
});
