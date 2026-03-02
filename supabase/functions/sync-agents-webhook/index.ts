import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

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
    
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured')
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const webhookUrl = `${supabaseUrl}/functions/v1/elevenlabs-conversation-webhook`
    
    console.log('📡 Webhook URL:', webhookUrl)

    // Get all agents from database
    const { data: agents, error } = await supabase
      .from('kalina_agents')
      .select('id, agent_id, name')
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`)
    }

    console.log(`Found ${agents?.length || 0} agents to sync`)

    const results = []

    for (const agent of agents || []) {
      try {
        console.log(`Updating webhook for agent: ${agent.name} (${agent.agent_id})`)
        
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agent.agent_id)}`, {
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
          console.error(`Failed to update ${agent.name}: ${response.status} - ${errorText}`)
          results.push({ agent: agent.name, agent_id: agent.agent_id, success: false, error: errorText })
        } else {
          console.log(`✅ Successfully updated webhook for ${agent.name}`)
          results.push({ agent: agent.name, agent_id: agent.agent_id, success: true })
        }
      } catch (err) {
        console.error(`Error updating ${agent.name}:`, err)
        const errMessage = err instanceof Error ? err.message : 'Unknown error'
        results.push({ agent: agent.name, agent_id: agent.agent_id, success: false, error: errMessage })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        message: `Synced webhooks for ${successCount} agents, ${failCount} failed`,
        webhook_url: webhookUrl,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in sync-agents-webhook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
