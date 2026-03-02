import {
  createSupabaseClient,
  getOdooCredentials,
  executeOdooKw,
  corsHeaders,
} from "../_shared/odoo.ts";

interface CreateRequest {
  model: string;
  data: Record<string, any>; // Record data to create
  base_url?: string;
  db?: string;
  username?: string;
  api_key?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);

    // Get authenticated user
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

    const body: CreateRequest = await req.json();

    if (!body.model || !body.data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: model, data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Odoo credentials
    const credentials = await getOdooCredentials(supabase, user.id, {
      base_url: body.base_url,
      db: body.db,
      username: body.username,
      api_key: body.api_key,
    });

    // Execute create on the model
    const recordId = await executeOdooKw(
      credentials,
      body.model,
      "create",
      [body.data]
    );

    return new Response(
      JSON.stringify({
        success: true,
        model: body.model,
        record_id: recordId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in odoo-create:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
