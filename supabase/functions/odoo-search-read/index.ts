import {
  createSupabaseClient,
  getOdooCredentials,
  executeOdooKw,
  corsHeaders,
} from "../_shared/odoo.ts";

interface SearchReadRequest {
  model: string;
  domain?: any[]; // Odoo domain filter
  fields?: string[]; // Fields to retrieve
  limit?: number;
  offset?: number;
  order?: string;
  return_all?: boolean; // If true, fetch all records ignoring limit
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

    const body: SearchReadRequest = await req.json();

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

    const domain = body.domain || [];
    const kwargs: Record<string, any> = {};

    if (body.fields && body.fields.length > 0) {
      kwargs.fields = body.fields;
    }

    if (body.order) {
      kwargs.order = body.order;
    }

    let records: any[] = [];

    if (body.return_all) {
      // Fetch all records in batches
      const batchSize = 1000;
      let offset = 0;
      let batch: any[];

      do {
        batch = await executeOdooKw(
          credentials,
          body.model,
          "search_read",
          [domain],
          {
            ...kwargs,
            limit: batchSize,
            offset,
          }
        );
        records = records.concat(batch);
        offset += batchSize;
      } while (batch.length === batchSize);
    } else {
      // Single request with limit/offset
      if (body.limit !== undefined) {
        kwargs.limit = body.limit;
      }
      if (body.offset !== undefined) {
        kwargs.offset = body.offset;
      }

      records = await executeOdooKw(
        credentials,
        body.model,
        "search_read",
        [domain],
        kwargs
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        model: body.model,
        count: records.length,
        records,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in odoo-search-read:", error);
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
