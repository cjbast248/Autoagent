import {
  createSupabaseClient,
  getOdooCredentials,
  executeOdooKw,
  corsHeaders,
} from "../_shared/odoo.ts";

interface GetRequest {
  model: string;
  record_id: number | string;
  fields?: string[]; // Fields to retrieve
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

    const body: GetRequest = await req.json();

    if (!body.model || body.record_id === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: model, record_id" }),
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

    const recordId = typeof body.record_id === "string"
      ? parseInt(body.record_id, 10)
      : body.record_id;

    const kwargs: Record<string, any> = {};
    if (body.fields && body.fields.length > 0) {
      kwargs.fields = body.fields;
    }

    // Execute read on the record
    const records = await executeOdooKw(
      credentials,
      body.model,
      "read",
      [[recordId]],
      kwargs
    );

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Record ${recordId} not found in model ${body.model}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        model: body.model,
        record: records[0],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in odoo-get:", error);
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
