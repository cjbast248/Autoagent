// @ts-nocheck

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Helper: sanitize and trim prompt for ElevenLabs agent config
function sanitizePrompt(input: string, maxLength = 6000) {
  if (!input) return ''
  let text = input
    // Remove excessive markdown noise
    .replace(/^\s*[#>*\-\d\.)]+\s+/gm, '')
    // Remove bracket placeholders like [Nume Agent]
    .replace(/\[[^\]]+\]/g, (m) => m.replace(/[\[\]]/g, ''))
    // Collapse multiple spaces/newlines
    .replace(/\r?\n\s*\r?\n/g, '\n')
    .replace(/[\t ]{2,}/g, ' ')
    .trim()

  // Guard length
  if (text.length > maxLength) {
    text = text.slice(0, maxLength - 200) + '\n[continut trunchiat pentru compatibilitate]'
  }
  return text
}

// Helper: build a safe minimal config as fallback
function buildMinimalConfig(name: string, prompt: string, language: string, voiceId?: string) {
  const safePrompt = sanitizePrompt(prompt, 4000)
  return {
    name,
    conversation_config: {
      agent: {
        prompt: { prompt: safePrompt },
        first_message: language === 'ro'
          ? `Bună ziua! Sunt ${name}. Cum vă pot ajuta astăzi?`
          : `Hello! I'm ${name}. How can I help you today?`,
        language: language || 'ro'
      },
      tts: {
        voice_id: voiceId || '9BWtsMINqrJLrRacOk9x', // Aria (stabil)
        model_id: 'eleven_turbo_v2_5' // model recomandat pt. convai low-latency
      },
      asr: { quality: 'high' }
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Received request body:', JSON.stringify(body, null, 2))
    
    // Get ElevenLabs API key from Supabase Secrets
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pwfczzxwjfxomqzhhwvj.supabase.co'
    
    if (!elevenLabsApiKey) {
      console.error('Missing ElevenLabs API key in Supabase Secrets')
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Webhook URL for conversation events
    const webhookUrl = `${supabaseUrl}/functions/v1/elevenlabs-conversation-webhook`
    console.log('📡 Configuring webhook URL:', webhookUrl)

    // Normalize incoming format (old/new) and sanitize prompt
    let elevenLabsRequest: any

    if (body.conversation_config) {
      // New format - sanitize the nested prompt
      const originalPrompt: string = body.conversation_config?.agent?.prompt?.prompt || ''
      const language: string = body.conversation_config?.agent?.language || body.language || 'ro'
      const safePrompt = sanitizePrompt(originalPrompt)

      elevenLabsRequest = {
        name: body.name || 'Kalina Agent',
        conversation_config: {
          agent: {
            prompt: { prompt: safePrompt },
            first_message: body.conversation_config?.agent?.first_message || (language === 'ro'
              ? `Bună ziua! Sunt ${body.name || 'Agentul Kalina'}. Cum vă pot ajuta astăzi?`
              : `Hello! I'm ${body.name || 'Kalina Agent'}. How can I help you today?`),
            language
          },
          tts: {
            voice_id: body.conversation_config?.tts?.voice_id || body.voice_id || '9BWtsMINqrJLrRacOk9x',
            model_id: body.conversation_config?.tts?.model_id || 'eleven_multilingual_v2'
          },
          asr: { quality: body.conversation_config?.asr?.quality || 'high' }
        },
        // CRITICAL: Configure webhook to receive conversation events
        platform_settings: {
          webhook: {
            url: webhookUrl,
            events: ['conversation.initiated', 'conversation.ended']
          }
        }
      }
    } else {
      // Old format - transform to new format with sanitization
      const language: string = body.language || 'ro'
      const safePrompt = sanitizePrompt(body.system_prompt || '')
      elevenLabsRequest = {
        name: body.name || 'Kalina Agent',
        conversation_config: {
          agent: {
            prompt: { prompt: safePrompt },
            first_message: body.first_message || (language === 'ro'
              ? `Bună ziua! Sunt ${body.name || 'Agentul Kalina'}. Cum vă pot ajuta astăzi?`
              : `Hello! I'm ${body.name || 'Kalina Agent'}. How can I help you today?`),
            language
          },
          tts: {
            voice_id: body.voice_id || '9BWtsMINqrJLrRacOk9x',
            model_id: 'eleven_multilingual_v2'
          },
          asr: { quality: 'high' }
        },
        // CRITICAL: Configure webhook to receive conversation events
        platform_settings: {
          webhook: {
            url: webhookUrl,
            events: ['conversation.initiated', 'conversation.ended']
          }
        }
      }
    }

    console.log('Transformed request for ElevenLabs (sanitized):', JSON.stringify(elevenLabsRequest, null, 2))

    async function tryCreate(payload: any, attempt = 1): Promise<Response> {
      const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
        method: 'POST',
        headers: {
          'Xi-Api-Key': elevenLabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`ElevenLabs API error (attempt ${attempt}):`, response.status, errorText)

        // If invalid config, retry once with a minimal/safe configuration
        if (response.status === 400 && attempt === 1) {
          const lang = payload?.conversation_config?.agent?.language || 'ro'
          const voice = payload?.conversation_config?.tts?.voice_id
          const name = payload?.name || 'Kalina Agent'
          const promptText = payload?.conversation_config?.agent?.prompt?.prompt || ''
          const minimal = buildMinimalConfig(name, promptText, lang, voice)
          console.log('Retrying with minimal safe config...')
          return await tryCreate(minimal, 2)
        }

        return new Response(
          JSON.stringify({ 
            error: `ElevenLabs API error: ${response.status}`,
            details: errorText
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      const data = await response.json()
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // First attempt
    const result = await tryCreate(elevenLabsRequest, 1)
    return result
  } catch (error: any) {
    console.error('Error in create-elevenlabs-agent function:', error)
    return new Response(
      JSON.stringify({ error: error.message ?? 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
