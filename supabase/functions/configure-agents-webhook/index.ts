// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'

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
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pwfczzxwjfxomqzhhwvj.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!elevenLabsApiKey || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const webhookUrl = `${supabaseUrl}/functions/v1/elevenlabs-conversation-webhook`

    console.log('📡 Webhook URL to configure:', webhookUrl)

    // Get all agents from database
    const { data: agents, error: fetchError } = await supabase
      .from('kalina_agents')
      .select('id, agent_id, elevenlabs_agent_id, name, user_id')
      .not('elevenlabs_agent_id', 'is', null)

    if (fetchError) {
      throw new Error(`Failed to fetch agents: ${fetchError.message}`)
    }

    console.log(`Found ${agents?.length || 0} agents to configure`)

    const results = {
      success: [] as string[],
      failed: [] as { agent_id: string, error: string }[]
    }

    for (const agent of agents || []) {
      try {
        // Use elevenlabs_agent_id to configure webhook on ElevenLabs
        const elevenLabsAgentId = agent.elevenlabs_agent_id || agent.agent_id;
        console.log(`Configuring webhook for agent: ${elevenLabsAgentId} (${agent.name})`)

        const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(elevenLabsAgentId)}`, {
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
          console.error(`Failed to configure ${elevenLabsAgentId}:`, errorText)
          results.failed.push({ agent_id: elevenLabsAgentId, error: errorText })
        } else {
          console.log(`✅ Successfully configured ${elevenLabsAgentId}`)
          results.success.push(elevenLabsAgentId)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        const elevenLabsAgentId = agent.elevenlabs_agent_id || agent.agent_id;
        console.error(`Error configuring ${elevenLabsAgentId}:`, error)
        results.failed.push({ agent_id: elevenLabsAgentId, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Webhook configuration completed',
        webhookUrl,
        totalAgents: agents?.length || 0,
        successCount: results.success.length,
        failedCount: results.failed.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in configure-agents-webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
