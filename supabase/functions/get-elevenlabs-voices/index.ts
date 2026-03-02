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

    const { search, category, language, page_size = 200, page = 0 } = await req.json().catch(() => ({}));

    console.log('Fetching voices from ElevenLabs with params:', { search, category, language, page_size, page });

    // Build query params for shared voices library
    const params = new URLSearchParams();
    params.append('page_size', String(page_size));
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (language) params.append('language', language);
    
    // Fetch from ElevenLabs shared voices library
    const response = await fetch(`https://api.elevenlabs.io/v1/shared-voices?${params.toString()}`, {
      method: 'GET',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.voices?.length || 0} voices from ElevenLabs`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-elevenlabs-voices function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
