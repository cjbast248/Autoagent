import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
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

    console.log('[Voice Session] Creating session for widget:', widget_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!elevenLabsApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'ElevenLabs API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get widget config
    const { data: config, error } = await supabase
      .from('chat_widget_configs')
      .select('*')
      .eq('widget_id', widget_id)
      .eq('is_active', true)
      .single();

    if (error || !config) {
      console.error('[Voice Session] Widget config not found:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Widget configuration not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!config.voice_enabled) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Voice is not enabled for this widget'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the voice agent if configured
    let voiceAgent = null;
    let elevenLabsAgentId = null;

    if (config.voice_agent_id) {
      const { data: agent, error: agentError } = await supabase
        .from('kalina_agents')
        .select('id, name, elevenlabs_agent_id, voice_id, system_prompt')
        .eq('id', config.voice_agent_id)
        .single();

      if (agentError) {
        console.error('[Voice Session] Error fetching voice agent:', agentError);
      } else if (agent) {
        voiceAgent = agent;
        elevenLabsAgentId = agent.elevenlabs_agent_id;
        console.log('[Voice Session] Using agent:', agent.name, 'ElevenLabs ID:', elevenLabsAgentId);
      }
    }

    if (!elevenLabsAgentId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No ElevenLabs agent configured for this widget. Please select an agent with ElevenLabs integration.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get ALL products for this widget's user
    let products: any[] = [];
    if (config.user_id) {
      const { data: productData, error: prodErr } = await supabase
        .from('widget_products')
        .select('id, name, description, price, currency, image_url, attributes')
        .eq('user_id', config.user_id)
        .eq('is_active', true);

      if (prodErr) {
        console.error('[Voice Session] Error fetching products:', prodErr);
      } else {
        products = productData || [];
        console.log('[Voice Session] Found', products.length, 'products for user');
      }
    }

    // Format products for the agent prompt
    const productsForPrompt = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: p.price,
      currency: p.currency || 'MDL',
      variants: p.attributes?.variants || null
    }));

    console.log('[Voice Session] Widget config found:', config.name);
    console.log('[Voice Session] ElevenLabs Agent ID:', elevenLabsAgentId);
    console.log('[Voice Session] Products to send:', productsForPrompt.length);

    // Get a signed URL for the ElevenLabs Conversational AI agent
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${elevenLabsAgentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Voice Session] ElevenLabs API error:', response.status, errorText);

      return new Response(JSON.stringify({
        success: false,
        error: `ElevenLabs API error: ${response.status}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('[Voice Session] Got signed URL from ElevenLabs');

    // Build product catalog string
    const productsCatalog = productsForPrompt.map(p =>
      `- ${p.name}: ${p.price} ${p.currency}${p.variants ? ` (variante: ${JSON.stringify(p.variants)})` : ''}`
    ).join('\n');

    // Get base system prompt and enhance with products
    const basePrompt = voiceAgent?.system_prompt || config.system_prompt || 'Ești un asistent de vânzări prietenos.';
    const enhancedPrompt = `${basePrompt}

CATALOGUL DE PRODUSE DISPONIBILE:
${productsCatalog || 'Nu există produse disponibile.'}

INSTRUCȚIUNI IMPORTANTE:
- Când clientul cere un produs, folosește EXACT numele din catalog pentru add_to_cart
- Pentru "Sakura set" sau "setul Sakura", produsul se numește "Sakura"
- Verifică mereu că numele produsului există în catalog înainte de a-l adăuga
- Când adaugi în coș, folosește numele EXACT din catalog, nu ce a spus clientul`;

    // Return the signed URL + products for dynamic variables
    return new Response(JSON.stringify({
      success: true,
      connection_type: 'signed_url',
      signed_url: data.signed_url,
      config: {
        agent_id: elevenLabsAgentId,
        agent_name: voiceAgent?.name || config.assistant_name || 'Asistent',
        language: config.voice_language || 'ro',
        widget_id: config.id, // UUID for tools
        // Enhanced system prompt with products (for overrides if enabled)
        system_prompt: enhancedPrompt,
      },
      // Products catalog for dynamic variables
      products: productsForPrompt,
      // Pre-formatted product catalog string for {{product}} variable
      products_catalog: productsCatalog
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Voice Session] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create voice session';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
