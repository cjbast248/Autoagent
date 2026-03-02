
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
    const { packageId, isAnnual = false } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Get package details
    const { data: creditPackage, error: packageError } = await supabaseClient
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (packageError || !creditPackage) {
      throw new Error("Package not found");
    }

    // Skip Stripe for free plan
    if (creditPackage.name === 'GRATUIT') {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Plan gratuit activat cu succes",
        redirect_url: `${req.headers.get("origin")}/account?payment=success`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Contact support for enterprise plan
    if (creditPackage.name === 'ENTERPRISE') {
      return new Response(JSON.stringify({ 
        contact_required: true,
        message: "Pentru planul Enterprise, vă rugăm să ne contactați",
        contact_email: "support@kalina.ai"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Determine price based on billing cycle
    const price = isAnnual ? creditPackage.price_yearly * 12 : creditPackage.price_monthly;
    const priceDescription = isAnnual ? 
      `${creditPackage.credits.toLocaleString()} minute/lună - Plan Anual (Plată pe 12 luni, reducere)` : 
      `${creditPackage.credits.toLocaleString()} minute/lună - Plan Lunar`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: creditPackage.name,
              description: priceDescription
            },
            unit_amount: price * 100, // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/account?payment=success&plan=${creditPackage.name.toLowerCase()}`,
      cancel_url: `${req.headers.get("origin")}/pricing?payment=canceled`,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        package_name: creditPackage.name,
        credits: creditPackage.credits.toString(),
        billing_cycle: isAnnual ? 'annual' : 'monthly',
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
