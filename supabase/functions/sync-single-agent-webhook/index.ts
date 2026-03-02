
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
    const { agentId } = await req.json()
    
    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'agentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pwfczzxwjfxomqzhhwvj.supabase.co'
    
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured')
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/elevenlabs-conversation-webhook`
    
    console.log(`📡 Updating webhook for agent ${agentId} to: ${webhookUrl}`)

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      headers: {
        'Xi-Api-Key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform_settings: {
          webhook: {
            url: webhookUrl,
            events: ['conversation.initiated', 'conversation.ended']
          }
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to update agent: ${response.status} - ${errorText}`)
      return new Response(
        JSON.stringify({ success: false, error: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    console.log(`✅ Successfully updated webhook for agent ${agentId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        agentId, 
        webhookUrl,
        message: 'Webhook configured successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
