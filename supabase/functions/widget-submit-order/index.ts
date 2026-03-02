import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      widget_config_id,
      widget_id,  // Accept both: widget_id (public) or widget_config_id (internal UUID)
      customer_name,
      customer_phone,
      customer_address,
      customer_notes,
      cart_items,
      total_amount,
      currency = 'MDL'
    } = await req.json();

    // Accept either widget_id or widget_config_id
    const widgetIdentifier = widget_id || widget_config_id;

    // Validate required fields
    if (!widgetIdentifier) {
      return new Response(
        JSON.stringify({ success: false, error: 'Widget ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cart_items || cart_items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cart is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get widget config - try by widget_id first (public ID), then by id (UUID)
    let widgetConfig = null;
    let configError = null;

    // First, try to find by public widget_id
    const { data: configByWidgetId, error: error1 } = await supabase
      .from('chat_widget_configs')
      .select('id, user_id')
      .eq('widget_id', widgetIdentifier)
      .single();

    if (configByWidgetId) {
      widgetConfig = configByWidgetId;
    } else {
      // If not found, try by internal UUID
      const { data: configById, error: error2 } = await supabase
        .from('chat_widget_configs')
        .select('id, user_id')
        .eq('id', widgetIdentifier)
        .single();

      widgetConfig = configById;
      configError = error2;
    }

    if (configError || !widgetConfig) {
      console.error('Widget config not found:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'Widget configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the lead/order
    const { data: lead, error: leadError } = await supabase
      .from('widget_leads')
      .insert({
        widget_config_id: widgetConfig.id,
        user_id: widgetConfig.user_id,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_address: customer_address || null,
        customer_notes: customer_notes || null,
        cart_items: cart_items,
        total_amount: total_amount || 0,
        currency: currency,
        status: 'new'
      })
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Widget Order] Order created successfully:', lead.id);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: lead.id,
        message: 'Order submitted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Widget Order] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
