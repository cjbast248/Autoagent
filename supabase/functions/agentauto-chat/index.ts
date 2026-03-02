
// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Input validation helpers
const validateInput = (data: any) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }
  
  const { agent_id, message, conversation_history = [] } = data;
  
  // Validate agent_id
  if (!agent_id || typeof agent_id !== 'string' || agent_id.length > 100) {
    throw new Error('Invalid or missing agent_id');
  }
  
  // Validate message
  if (!message || typeof message !== 'string' || message.length === 0 || message.length > 5000) {
    throw new Error('Invalid message: must be 1-5000 characters');
  }
  
  // Validate conversation history
  if (!Array.isArray(conversation_history) || conversation_history.length > 50) {
    throw new Error('Invalid conversation history: max 50 messages');
  }
  
  // Validate each message in history
  conversation_history.forEach((msg: any, index: number) => {
    if (!msg || typeof msg !== 'object' || !msg.role || !msg.content) {
      throw new Error(`Invalid message at index ${index}`);
    }
    if (typeof msg.content !== 'string' || msg.content.length > 2000) {
      throw new Error(`Message content too long at index ${index}`);
    }
  });
  
  return { agent_id, message, conversation_history };
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { agent_id, message, conversation_history } = validateInput(requestData);

    console.log(`Processing chat request for agent: ${agent_id}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get agent configuration from our database
    const { data: agent, error: agentError } = await supabase
      .from('kalina_agents')
      .select('*')
      .eq('agent_id', agent_id)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError);
      throw new Error('Agent not found');
    }

    console.log(`Agent found: ${agent.name}`);

    // If it's an ElevenLabs agent, use their API directly
    if (agent.provider === 'elevenlabs' && agent.elevenlabs_agent_id) {
      console.log('Using ElevenLabs Conversational AI');
      
      // Use ElevenLabs Conversational AI API
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent.elevenlabs_agent_id,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', errorText);
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } 
    // If it's a custom agent, use OpenAI + ElevenLabs TTS
    else {
      console.log('Using custom agent with OpenAI + TTS');
      
      // Check if user is asking about conversation history
      const isAskingAboutHistory = /ultimile?\s+\d*\s*conversati|istoric|apeluri|ce\s+s[a-ă]\s+vorbit|ce\s+a\s+discutat|conversati/i.test(message);
      let conversationContext = '';
      
      if (isAskingAboutHistory) {
        console.log('User is asking about conversation history, fetching data...');
        
        // Get user's conversation history from database
        const { data: callHistory, error: historyError } = await supabase
          .from('call_history')
          .select('*')
          .eq('user_id', agent.user_id)
          .order('call_date', { ascending: false })
          .limit(10);
        
        if (!historyError && callHistory && callHistory.length > 0) {
          conversationContext = '\n\n--- Date despre conversațiile recente ---\n';
          
          callHistory.forEach((call, index) => {
            conversationContext += `${index + 1}. Apel din ${call.call_date ? new Date(call.call_date).toLocaleDateString('ro-RO') : 'necunoscut'}:\n`;
            conversationContext += `   - Contact: ${call.contact_name || 'Necunoscut'}\n`;
            conversationContext += `   - Telefon: ${call.phone_number}\n`;
            conversationContext += `   - Durata: ${call.duration_seconds || 0} secunde\n`;
            conversationContext += `   - Status: ${call.call_status}\n`;
            
            if (call.summary) {
              conversationContext += `   - Rezumat: ${call.summary}\n`;
            }
            
            if (call.dialog_json) {
              try {
                const dialog = JSON.parse(call.dialog_json);
                if (Array.isArray(dialog) && dialog.length > 0) {
                  conversationContext += `   - Conversație:\n`;
                  dialog.slice(0, 5).forEach((msg) => {
                    if (msg.role && msg.message) {
                      const speaker = msg.role === 'user' ? 'Client' : 'Agent';
                      conversationContext += `     ${speaker}: ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}\n`;
                    }
                  });
                }
              } catch (e) {
                console.warn('Could not parse dialog_json for call:', call.id);
              }
            }
            conversationContext += '\n';
          });
        } else {
          conversationContext = '\n\n--- Nu am găsit conversații recente în baza de date ---\n';
        }
      }
      
      // Build conversation context
      const systemPrompt = (agent.system_prompt || `You are ${agent.name}, a conversational AI agent. Respond in a friendly and helpful way. Keep your responses short and clear.`) + conversationContext;
      
      // Build messages array with conversation history
      const messages = [
        { role: 'system', content: systemPrompt }
      ];
      
      // Add conversation history (limit to last 10 messages to avoid token limits)
      const recentHistory = conversation_history.slice(-10);
      messages.push(...recentHistory);
      
      // Add current user message
      messages.push({ role: 'user', content: message });

      console.log('Calling OpenAI with messages:', messages.length);

      // Step 1: Get response from OpenAI
      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      const gptData = await gptResponse.json();
      if (!gptResponse.ok) {
        console.error('OpenAI API error:', gptData);
        throw new Error(gptData.error?.message || 'OpenAI API error');
      }
      
      const textResponse = gptData.choices[0].message.content;
      console.log('Generated text response:', textResponse.substring(0, 100) + '...');

      // Step 2: Convert to speech with ElevenLabs TTS (if API key is available)
      let audioDataUrl = null;
      
      if (elevenLabsApiKey) {
        try {
          console.log('Generating audio with ElevenLabs TTS');
          
          const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${agent.voice_id || '21m00Tcm4TlvDq8ikWAM'}`, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': elevenLabsApiKey,
            },
            body: JSON.stringify({
              text: textResponse,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true
              },
            }),
          });

          if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.warn('ElevenLabs TTS API error:', errorText);
          } else {
            const audioBuffer = await ttsResponse.arrayBuffer();
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
            audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;
            console.log('Audio generated successfully');
          }
        } catch (ttsError) {
          console.warn('TTS generation failed:', ttsError);
          // Continue without audio
        }
      }

      const response = {
        text: textResponse,
        audio: audioDataUrl,
        agent_name: agent.name
      };

      console.log('Sending response back to widget');

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in kalina-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      text: 'Ne pare rău, a apărut o eroare tehnică. Te rog să încerci din nou.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
