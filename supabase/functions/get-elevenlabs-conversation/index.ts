// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { conversationId } = await req.json();
    console.log('Getting conversation details for:', conversationId);

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY not found in environment variables");
      throw new Error("ElevenLabs API key not configured");
    }

    if (!conversationId) {
      console.error("conversationId is required");
      throw new Error("conversationId is required");
    }

    // Initialize Supabase client to check for cached audio
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we have cached audio URL in the database
    let cachedAudioUrl: string | null = null;

    const { data: conversationCache } = await supabase
      .from('conversations')
      .select('audio_url')
      .eq('conversation_id', conversationId)
      .single();

    if (conversationCache?.audio_url) {
      cachedAudioUrl = conversationCache.audio_url;
      console.log('🎵 Found cached audio URL:', cachedAudioUrl);
    } else {
      // Fallback: check analytics cache
      const { data: analyticsCache } = await supabase
        .from('conversation_analytics_cache')
        .select('audio_url')
        .eq('conversation_id', conversationId)
        .single();

      if (analyticsCache?.audio_url) {
        cachedAudioUrl = analyticsCache.audio_url;
        console.log('🎵 Found cached audio URL in analytics cache:', cachedAudioUrl);
      }
    }

    // Call ElevenLabs API to get specific conversation
    const url = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`;
    console.log('Calling ElevenLabs API:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);

      // Return a structured error response instead of throwing
      return new Response(
        JSON.stringify({
          error: `ElevenLabs API error: ${response.status}`,
          details: errorText,
          conversationId: conversationId,
          status: response.status >= 404 ? 'not_found' : 'api_error',
          cached_audio_url: cachedAudioUrl // Still return cached audio if available
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 so client can handle the error gracefully
        }
      );
    }

    const data = await response.json();
    console.log('Successfully retrieved conversation:', data);

    // Add cached audio URL to response if available
    if (cachedAudioUrl) {
      data.cached_audio_url = cachedAudioUrl;
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in get-elevenlabs-conversation function:', error);

    // Return structured error response
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        status: 'function_error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 so client can handle gracefully
      }
    );
  }
});
