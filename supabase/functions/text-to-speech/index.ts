// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    const { text, voice_id, model, return_base64 = false } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable not set');
    }

    // Use provided voice_id or default ElevenLabs voice
    const targetVoiceId = voice_id || 'cjVigY5qzO86Huf0OWal';

    // Use provided model or default to flash v2.5 for multilingual support
    const targetModel = model || 'eleven_flash_v2_5';

    console.log('📢 TTS request - voice_id:', targetVoiceId, 'model:', targetModel, 'text length:', text.length);

    // Call ElevenLabs API for text-to-speech
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: targetModel,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          speed: 1.0
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Return the audio data
    const audioBuffer = await response.arrayBuffer();

    // If return_base64 is true or voice_id was provided (new behavior), return as JSON with base64
    if (return_base64 || voice_id) {
      const base64Audio = base64Encode(new Uint8Array(audioBuffer));
      return new Response(
        JSON.stringify({ audio_base64: base64Audio }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Legacy behavior - return raw audio
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg'
      }
    });

  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
