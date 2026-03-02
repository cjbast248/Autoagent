
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
    const requestBody = await req.json()
    console.log('📥 Received request body:', JSON.stringify(requestBody, null, 2))

    const { agentId, ...updateData } = requestBody

    if (!agentId) {
      console.error('❌ No agentId provided')
      throw new Error('Agent ID is required')
    }
    console.log('📋 Agent ID:', agentId)

    // Get ElevenLabs API key from Supabase Secrets
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pwfczzxwjfxomqzhhwvj.supabase.co'

    if (!elevenLabsApiKey) {
      console.error('❌ No ElevenLabs API key found')
      throw new Error('ElevenLabs API key not configured in Supabase Secrets')
    }
    console.log('✅ ElevenLabs API key found')

    // Webhook URL for conversation events
    const webhookUrl = `${supabaseUrl}/functions/v1/elevenlabs-conversation-webhook`
    console.log('📡 Configuring webhook URL:', webhookUrl)

    // Always ensure webhook is configured on agent updates
    const finalUpdateData = {
      ...updateData,
      platform_settings: {
        ...(updateData.platform_settings || {}),
        webhook: {
          url: webhookUrl,
          events: ['conversation.initiated', 'conversation.ended']
        }
      }
    }

    console.log('📤 Sending to ElevenLabs:', JSON.stringify(finalUpdateData, null, 2))

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      headers: {
        'Xi-Api-Key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalUpdateData),
    })

    console.log('📨 ElevenLabs response status:', response.status)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ ElevenLabs API error:', response.status, errorData)
      return new Response(
        JSON.stringify({
          error: `ElevenLabs API error: ${response.status}`,
          details: errorData
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const data = await response.json()
    console.log('✅ Agent updated successfully')

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ Error in update-elevenlabs-agent function:', error.message, error.stack)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
