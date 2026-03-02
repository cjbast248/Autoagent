// @ts-nocheck

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
    const { audioUrl, conversationId } = await req.json();
    
    if (!audioUrl) {
      throw new Error('Audio URL is required');
    }

    console.log('🎤 Starting transcription for conversation:', conversationId);
    console.log('🎤 Audio URL:', audioUrl);

    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Download audio file
    console.log('📥 Downloading audio file...');
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();
    console.log('📥 Audio downloaded, size:', audioBlob.size, 'bytes');

    // Prepare form data for ElevenLabs STT
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model_id', 'scribe_v1_experimental');

    console.log('🚀 Sending to ElevenLabs STT...');

    // Call ElevenLabs Speech-to-Text API
    const sttResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
      body: formData,
    });

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      console.error('❌ ElevenLabs STT error:', sttResponse.status, errorText);
      throw new Error(`ElevenLabs STT failed: ${sttResponse.status} - ${errorText}`);
    }

    const result = await sttResponse.json();
    console.log('✅ Transcription successful for conversation:', conversationId);
    console.log('📝 Transcript length:', result.text?.length || 0, 'characters');

    return new Response(
      JSON.stringify({ 
        success: true,
        transcript: result.text,
        conversationId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in transcribe-conversation-audio:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});