import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

interface ConfirmDeletionRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { token } = await req.json() as ConfirmDeletionRequest;

    // Find the deletion request
    const { data: deletionRequest, error: fetchError } = await supabaseClient
      .from("account_deletion_requests")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (fetchError || !deletionRequest) {
      return new Response(
        JSON.stringify({ error: "Token invalid sau expirat" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(deletionRequest.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token expirat" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userId = deletionRequest.user_id;

    // Mark deletion request as completed
    await supabaseClient
      .from("account_deletion_requests")
      .update({ status: "completed" })
      .eq("token", token);

    // Delete user data from all tables
    const tablesToClean = [
      "kalina_agents",
      "conversations",
      "call_history",
      "user_statistics",
      "user_balance",
      "contacts_database",
      "campaigns",
      "phone_numbers",
      "knowledge_documents",
      "profiles",
    ];

    for (const table of tablesToClean) {
      await supabaseClient.from(table).delete().eq("user_id", userId);
    }

    // Delete user from auth
    const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Error deleting user from auth:", deleteUserError);
      throw deleteUserError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Contul a fost șters cu succes" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in confirm-account-deletion:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
