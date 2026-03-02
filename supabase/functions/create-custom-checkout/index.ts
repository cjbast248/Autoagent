// @ts-nocheck
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount_usd, description = "Plata abonament", user_id, origin } = await req.json();
    
    if (!amount_usd || amount_usd <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    
    if (!user_id) {
      throw new Error("User ID is required");
    }
    
    // Use service role to get user email from profiles
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user email from profiles table
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single();

    if (profileError || !profile?.email) {
      throw new Error("User not found or email not available");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Convert USD to cents for Stripe
    const amountInCents = Math.round(amount_usd * 100);

    // Get origin for redirect URLs
    const baseUrl = origin || Deno.env.get("FRONTEND_URL") || "https://preview--eleven-labs-echo-bot.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : profile.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: "Plata personalizată",
              description: description
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/account?payment=success&amount=${amount_usd}`,
      cancel_url: `${baseUrl}/chat?payment=canceled`,
      metadata: {
        user_id: user_id,
        amount_usd: amount_usd.toString(),
        description: description,
        payment_type: 'custom'
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error creating custom checkout:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});