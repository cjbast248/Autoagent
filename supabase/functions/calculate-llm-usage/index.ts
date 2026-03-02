// @ts-nocheck

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt_length, number_of_pages, rag_enabled } = await req.json()
    
    if (!prompt_length) {
      throw new Error('prompt_length is required')
    }

    // Get ElevenLabs API key from Supabase Secrets
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured in Supabase Secrets')
    }

    console.log('Calculating LLM usage with parameters:', { prompt_length, number_of_pages, rag_enabled })

    const response = await fetch('https://api.elevenlabs.io/v1/convai/llm-usage/calculate', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt_length,
        number_of_pages: number_of_pages || 0,
        rag_enabled: rag_enabled || false
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('ElevenLabs API error:', response.status, errorData)
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    console.log('LLM usage calculation result:', data)

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in calculate-llm-usage function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})