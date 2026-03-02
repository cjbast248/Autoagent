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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both GET (query param) and POST (JSON body)
    let conversationId: string | null = null;
    if (req.method === 'GET') {
      const url = new URL(req.url);
      conversationId = url.searchParams.get('conversationId');
    } else {
      try {
        const body = await req.json();
        conversationId = body?.conversationId || null;
      } catch (_) {
        conversationId = null;
      }
    }
    
    if (!conversationId) {
      console.error('No conversation ID provided');
      return new Response(JSON.stringify({ error: 'Conversation ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🎵 Getting audio for conversation:', conversationId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, check if we have the audio cached in our database (conversations table)
    const { data: conversation, error: dbError } = await supabase
      .from('conversations')
      .select('audio_url, conversation_id')
      .eq('conversation_id', conversationId)
      .single();

    if (dbError) {
      console.warn('🎵 Conversations table lookup issue (can be normal for new conv):', dbError);
    } else {
      console.log('🎵 Conversations table query result:', conversation);
    }

    // If we have a cached audio URL in conversations, return it
    if (conversation?.audio_url) {
      console.log('🎵 Found cached audio URL in conversations:', conversation.audio_url);
      return new Response(JSON.stringify({ 
        audioUrl: conversation.audio_url,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: check conversation_analytics_cache for an existing audio URL
    const { data: analyticsCache, error: cacheError } = await supabase
      .from('conversation_analytics_cache')
      .select('audio_url, conversation_id')
      .eq('conversation_id', conversationId)
      .single();

    if (cacheError) {
      console.warn('🎵 Analytics cache lookup issue:', cacheError);
    } else {
      console.log('🎵 Analytics cache query result:', analyticsCache);
    }

    if (analyticsCache?.audio_url) {
      console.log('🎵 Found cached audio URL in analytics cache:', analyticsCache.audio_url);
      return new Response(JSON.stringify({
        audioUrl: analyticsCache.audio_url,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no cached audio, try to get it from ElevenLabs and stream it
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      console.error('ElevenLabs API key not found');
      return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get audio from ElevenLabs
    const audioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
    console.log('🎵 Fetching audio from ElevenLabs:', audioUrl);
    
    const response = await fetch(audioUrl, {
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
    });

    console.log('🎵 ElevenLabs response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, response.statusText, errorText);

      // Gracefully handle 404 (missing audio) so the frontend gets a clear message without throwing
      if (response.status === 404) {
        return new Response(JSON.stringify({
          audioUrl: null,
          cached: false,
          notFound: true,
          error: 'missing_conversation_audio',
          message: 'Audio file not available for this conversation.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        error: 'Failed to fetch audio from ElevenLabs', 
        details: `Status: ${response.status}, Message: ${errorText}` 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save audio to public storage and return JSON URL for frontend usage
    console.log('🎵 Downloading audio buffer to cache and return URL');
    const arrayBuffer = await response.arrayBuffer();

    const bucket = supabase.storage.from('conversations-audio');
    const filePath = `${conversationId}.mp3`;
    const blob = new Blob([new Uint8Array(arrayBuffer)], { type: 'audio/mpeg' });

    const { error: uploadError } = await bucket.upload(filePath, blob, {
      contentType: 'audio/mpeg',
      upsert: true
    });

    if (uploadError) {
      console.error('Failed to upload audio to storage:', uploadError);
      return new Response(JSON.stringify({ 
        error: 'Failed to cache audio',
        details: uploadError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: publicUrlData } = bucket.getPublicUrl(filePath);
    const publicUrl = publicUrlData?.publicUrl;

    // Update DB cache if possible
    if (publicUrl) {
      await supabase
        .from('conversations')
        .update({ audio_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('conversation_id', conversationId);
      await supabase
        .from('conversation_analytics_cache')
        .update({ audio_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('conversation_id', conversationId);
    }

    console.log('🎵 Returning public URL:', publicUrl);
    return new Response(JSON.stringify({ 
      audioUrl: publicUrl,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-conversation-audio function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});