// @ts-nocheck

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

    const { audioBase64, fileName, voiceName, language, previewText } = await req.json();

    if (!audioBase64 || !voiceName) {
      throw new Error('Missing required fields: audioBase64, voiceName');
    }

    console.log('Creating preview for voice:', voiceName, 'language:', language);

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

    // Step 1: Clone the voice temporarily using /v1/voices/add
    console.log('Step 1: Creating temporary voice clone...');
    const cloneFormData = new FormData();
    cloneFormData.append('name', `preview_${voiceName}_${Date.now()}`);
    cloneFormData.append('files', new Blob([bytes], { type: contentType }), fileName || 'audio.mp3');

    const cloneResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
      body: cloneFormData,
    });

    if (!cloneResponse.ok) {
      const errorText = await cloneResponse.text();
      console.error('ElevenLabs Clone API error:', cloneResponse.status, errorText);
      throw new Error(`Failed to create voice clone: ${cloneResponse.status} - ${errorText}`);
    }

    const cloneData = await cloneResponse.json();
    const tempVoiceId = cloneData.voice_id;
    console.log('Temporary voice created:', tempVoiceId);

    // Step 2: Generate TTS preview using the cloned voice
    console.log('Step 2: Generating TTS preview...');
    const ttsText = previewText || 'Hello! This is a preview of my cloned voice.';

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${tempVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: ttsText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!ttsResponse.ok) {
      // Clean up: delete the temporary voice
      await fetch(`https://api.elevenlabs.io/v1/voices/${tempVoiceId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': elevenLabsApiKey },
      });

      const errorText = await ttsResponse.text();
      console.error('ElevenLabs TTS API error:', ttsResponse.status, errorText);
      throw new Error(`Failed to generate TTS: ${ttsResponse.status} - ${errorText}`);
    }

    // Get audio as ArrayBuffer and convert to base64
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    let binaryStr = '';
    for (let i = 0; i < audioBytes.length; i++) {
      binaryStr += String.fromCharCode(audioBytes[i]);
    }
    const audioBase64Result = btoa(binaryStr);
    const audioUrl = `data:audio/mpeg;base64,${audioBase64Result}`;

    console.log('TTS preview generated successfully');

    // Step 3: Delete the temporary voice (clean up)
    console.log('Step 3: Cleaning up temporary voice...');
    await fetch(`https://api.elevenlabs.io/v1/voices/${tempVoiceId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': elevenLabsApiKey },
    });
    console.log('Temporary voice deleted');

    return new Response(JSON.stringify({
      success: true,
      audioUrl: audioUrl,
      message: 'Preview generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in preview-voice function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
