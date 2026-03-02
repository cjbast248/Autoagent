import {
  createSupabaseClient,
  getOdooCredentials,
  executeOdooKw,
  corsHeaders,
} from "../_shared/odoo.ts";

interface ExecuteKwRequest {
  model: string;
  method_name: string;
  method_args?: any[]; // Positional arguments for the method
  method_kwargs?: Record<string, any>; // Keyword arguments for the method
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

    const body: ExecuteKwRequest = await req.json();

    if (!body.model || !body.method_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: model, method_name" }),
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

    // Execute the generic method
    const result = await executeOdooKw(
      credentials,
      body.model,
      body.method_name,
      body.method_args || [],
      body.method_kwargs || {}
    );

    return new Response(
      JSON.stringify({
        success: true,
        model: body.model,
        method: body.method_name,
        result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in odoo-execute-kw:", error);
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
