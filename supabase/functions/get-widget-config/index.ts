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
    const { widget_id } = await req.json();
    
    if (!widget_id) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Widget ID is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Widget Config] Fetching config for widget:', widget_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: config, error } = await supabase
      .from('chat_widget_configs')
      .select('*')
      .eq('widget_id', widget_id)
      .eq('is_active', true)
      .single();

    if (error || !config) {
      console.error('[Widget Config] Config not found:', error);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Widget configuration not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Widget Config] Config found for widget:', config.name);

    // Fetch products for this widget
    const { data: products, error: productsError } = await supabase
      .from('widget_products')
      .select('id, name, description, image_url, price, currency, attributes')
      .eq('widget_config_id', config.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (productsError) {
      console.error('[Widget Config] Error fetching products:', productsError);
    }

    return new Response(JSON.stringify({
      success: true,
      config: {
        widget_id: config.widget_id,
        name: config.name,
        system_prompt: config.system_prompt,
        welcome_message: config.welcome_message,
        assistant_name: config.assistant_name,
        primary_color: config.primary_color,
        secondary_color: config.secondary_color,
        text_color: config.text_color,
        bubble_style: config.bubble_style,
        position: config.position,
        animation_type: config.animation_type,
        border_radius: config.border_radius ?? 16,
        button_size: config.button_size ?? 56,
        window_width: config.window_width ?? 380,
        window_height: config.window_height ?? 520,
        offset_x: config.offset_x ?? 20,
        offset_y: config.offset_y ?? 20,
        animation_duration: config.animation_duration ?? 0.3,
        button_animation: config.button_animation ?? 'pulse',
        chat_bg_color: config.chat_bg_color ?? '#ffffff',
        placeholder: config.placeholder ?? 'Scrie mesajul tău...',
        show_powered_by: config.show_powered_by ?? true,
        sound_enabled: config.sound_enabled ?? false,
        scrape_enabled: config.scrape_enabled ?? false,
        scrape_website_url: config.scrape_website_url ?? '',
        // Voice/Audio settings
        voice_enabled: config.voice_enabled ?? false,
        voice_id: config.voice_id ?? null,
        voice_language: config.voice_language ?? 'ro',
        voice_first_message: config.voice_first_message ?? null,
        products: products || [],
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Widget Config] Error:', error.message || error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to fetch widget configuration' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
