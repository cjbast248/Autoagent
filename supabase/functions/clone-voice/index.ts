// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { audioBase64, fileName, voiceName, description, userId, language } = await req.json();

    if (!audioBase64 || !voiceName || !userId) {
      throw new Error('Missing required fields: audioBase64, voiceName, userId');
    }

    console.log('Cloning voice for user:', userId, 'voice name:', voiceName, 'language:', language);

    // Convert base64 to blob
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine content type from filename
    const ext = fileName?.split('.').pop()?.toLowerCase() || 'mp3';
    const contentTypeMap: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
    };
    const contentType = contentTypeMap[ext] || 'audio/mpeg';

    // Create FormData for ElevenLabs API
    const formData = new FormData();
    formData.append('name', voiceName);
    if (description) {
      formData.append('description', description);
    }
    formData.append('files', new Blob([bytes], { type: contentType }), fileName || 'audio.mp3');

    // Clone voice using ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Voice cloned successfully:', data);

    // Save cloned voice to database
    const { error: dbError } = await supabase
      .from('user_voices')
      .insert({
        user_id: userId,
        voice_id: data.voice_id,
        voice_name: voiceName,
        description: description || null,
        preview_url: null,
      });

    if (dbError) {
      console.error('Error saving voice to database:', dbError);
      // Don't throw - voice was created successfully in ElevenLabs
    } else {
      console.log('Voice saved to database successfully');
    }

    return new Response(JSON.stringify({
      success: true,
      voice_id: data.voice_id,
      message: 'Voice cloned successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in clone-voice function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
