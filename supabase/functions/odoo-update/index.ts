import {
  createSupabaseClient,
  getOdooCredentials,
  executeOdooKw,
  corsHeaders,
} from "../_shared/odoo.ts";

interface UpdateRequest {
  model: string;
  record_id: number | string | number[]; // Single ID or array of IDs
  data: Record<string, any>; // Fields to update
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

    const body: UpdateRequest = await req.json();

    if (!body.model || body.record_id === undefined || !body.data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: model, record_id, data" }),
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

    // Normalize record_id to array
    let recordIds: number[];
    if (Array.isArray(body.record_id)) {
      recordIds = body.record_id.map((id) =>
        typeof id === "string" ? parseInt(id, 10) : id
      );
    } else {
      const id = typeof body.record_id === "string"
        ? parseInt(body.record_id, 10)
        : body.record_id;
      recordIds = [id];
    }

    // Execute write (update) on the record(s)
    const result = await executeOdooKw(
      credentials,
      body.model,
      "write",
      [recordIds, body.data]
    );

    return new Response(
      JSON.stringify({
        success: result === true,
        model: body.model,
        record_ids: recordIds,
        updated: result === true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in odoo-update:", error);
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
