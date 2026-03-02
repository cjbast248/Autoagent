import {
  createSupabaseClient,
  getOdooCredentials,
  executeOdooKw,
  corsHeaders,
} from "../_shared/odoo.ts";

interface FieldsGetRequest {
  model: string;
  base_url?: string;
  db?: string;
  username?: string;
  api_key?: string;
  attributes?: string[]; // Optional: specific field attributes to retrieve
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

    const body: FieldsGetRequest = await req.json();

    if (!body.model) {
      return new Response(JSON.stringify({ error: "Missing required field: model" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Odoo credentials
    const credentials = await getOdooCredentials(supabase, user.id, {
      base_url: body.base_url,
      db: body.db,
      username: body.username,
      api_key: body.api_key,
    });

    // Execute fields_get on the model
    const kwargs: Record<string, any> = {};
    if (body.attributes && body.attributes.length > 0) {
      kwargs.attributes = body.attributes;
    }

    const fields = await executeOdooKw(
      credentials,
      body.model,
      "fields_get",
      [],
      kwargs
    );

    return new Response(
      JSON.stringify({
        success: true,
        model: body.model,
        fields,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in odoo-fields-get:", error);
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
