import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

interface DeleteAccountRequest {
  userId: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { email } = await req.json() as DeleteAccountRequest;

    // Generate a unique token for deletion verification
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token valid for 24 hours

    // Store the deletion request
    const { error: insertError } = await supabaseClient
      .from("account_deletion_requests")
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      });

    if (insertError) {
      console.error("Error storing deletion request:", insertError);
      throw insertError;
    }

    // Generate verification URL
    const verificationUrl = `${req.headers.get("origin")}/confirm-account-deletion?token=${token}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Kalina <onboarding@resend.dev>",
      to: [email],
      subject: "Confirmă ștergerea contului",
      html: `
        <h1>Confirmă ștergerea contului</h1>
        <p>Ai solicitat ștergerea contului tău Kalina.</p>
        <p><strong>Această acțiune este permanentă și nu poate fi anulată.</strong> Toate datele tale vor fi șterse definitiv, incluzând:</p>
        <ul>
          <li>Agenții AI</li>
          <li>Conversații și istoric</li>
          <li>Contacte și campanii</li>
          <li>Setări și preferințe</li>
        </ul>
        <p>Pentru a confirma ștergerea contului, dă click pe linkul de mai jos:</p>
        <p><a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirmă ștergerea contului</a></p>
        <p>Acest link este valabil 24 de ore.</p>
        <p>Dacă nu ai solicitat ștergerea contului, poți ignora acest email în siguranță.</p>
        <p>Cu respect,<br>Echipa Kalina</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de verificare trimis cu succes" 
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
    console.error("Error in send-account-deletion-email:", error);
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
