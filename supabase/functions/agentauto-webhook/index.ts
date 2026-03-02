import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract webhook token from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const webhookToken = pathParts[pathParts.length - 1];

    if (!webhookToken) {
      return new Response(
        JSON.stringify({ error: 'Webhook token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify webhook token exists and is active
    const { data: webhook, error: webhookError } = await supabaseClient
      .from('user_webhook_urls')
      .select('*')
      .eq('webhook_token', webhookToken)
      .eq('is_active', true)
      .single();

    if (webhookError || !webhook) {
      console.error('Webhook not found or inactive:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive webhook' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse incoming data
    let receivedData;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      receivedData = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      receivedData = Object.fromEntries(formData);
    } else {
      receivedData = { raw: await req.text() };
    }

    // Get source IP
    const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Store received webhook data
    const { error: insertError } = await supabaseClient
      .from('webhook_received_data')
      .insert({
        webhook_url_id: webhook.id,
        user_id: webhook.user_id,
        received_data: receivedData,
        source_ip: sourceIp
      });

    if (insertError) {
      console.error('Error storing webhook data:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store webhook data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received successfully',
        webhook_name: webhook.webhook_name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
