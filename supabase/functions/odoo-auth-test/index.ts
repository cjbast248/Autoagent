import {
  authenticateOdoo,
  corsHeaders,
  createSupabaseClient,
} from "../_shared/odoo.ts";

interface OdooAuthRequest {
  base_url: string;
  db: string;
  username: string;
  api_key: string; // API key sau parola
  save?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: OdooAuthRequest = await req.json();
    const { base_url, db, username, api_key, save } = body;

    if (!base_url || !db || !username || !api_key) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing base_url, db, username sau api_key" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Test autentificarea
    const authResult = await authenticateOdoo({
      base_url,
      db,
      username,
      api_key,
    });

    // Salveaza conexiunea daca este cerut
    if (save) {
      const { error: saveError } = await supabase
        .from("odoo_connections")
        .upsert({
          user_id: user.id,
          base_url,
          db,
          username,
          api_key,
          uid: authResult.uid,
          status: "connected",
          last_checked: new Date().toISOString(),
          error: null,
        }, { onConflict: "user_id" });

      if (saveError) {
        console.error("Failed to save odoo connection:", saveError);
        throw new Error("Could not save Odoo connection");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        uid: authResult.uid,
        session_id: authResult.session_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in odoo-auth-test:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
