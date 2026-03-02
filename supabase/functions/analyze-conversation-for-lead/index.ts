// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const { transcript, userPrompt, conversationId, phoneNumber, agentName } = await req.json();
    
    if (!transcript || !userPrompt) {
      throw new Error('Transcript and user prompt are required');
    }

    console.log('🤖 Analyzing conversation:', conversationId);
    console.log('📝 Transcript length:', transcript.length);
    console.log('🎯 User criteria:', userPrompt);

    // Validate transcript length
    if (transcript.length < 20) {
      console.warn('⚠️ Transcript prea scurt:', transcript.length, 'chars');
      return new Response(
        JSON.stringify({
          success: true,
          analysis: {
            is_qualified_lead: false,
            confidence_score: 0,
            lead_info: {
              phone: phoneNumber,
              interest_level: 'low',
              summary: 'Conversație prea scurtă pentru analiză',
              notes: 'Transcriptul este incomplet sau lipsește'
            },
            reasoning: 'Transcript insuficient pentru analiză (sub 20 caractere)'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `Ești un asistent AI expert în calificarea lead-urilor din conversații telefonice.
Analizezi transcripturile conversațiilor și identifici potențiali clienți bazându-te pe criteriile specificate de utilizator.

IMPORTANT - STRUCTURA TRANSCRIPTULUI:
- "Agent:" = Reprezentantul companiei (AI agent sau operator uman)
- "Client:" = Persoana apelată (potențial lead, clientul)

CRITERII UTILIZATOR PENTRU CALIFICARE:
${userPrompt}

INSTRUCȚIUNI CLARE:
1. Citește cu atenție întregul transcript al conversației
2. Identifică DOAR ce spune CLIENTUL (nu Agentul) - mesajele marcate cu "Client:"
3. Verifică dacă răspunsurile CLIENTULUI îndeplinesc criteriile specificate de utilizator
4. Extrage toate informațiile relevante despre CLIENT din răspunsurile sale:
   - Nume (dacă se prezintă)
   - Email (dacă îl menționează)
   - Nivel de interes (high/medium/low) bazat pe entuziasmul și angajamentul din răspunsuri
5. Evaluează nivelul de încredere al calificării (0-100):
   - 80-100: Client foarte clar interesat, îndeplinește toate criteriile
   - 50-79: Client moderat interesat, îndeplinește majoritatea criteriilor
   - 0-49: Client slab interesat sau nu îndeplinește criteriile
6. Oferă un rezumat concis al conversației și note relevante despre comportamentul clientului

REGULI STRICTE:
- NU analiza ce spune Agentul, doar răspunsurile Clientului
- NU marca ca lead calificat dacă clientul nu răspunde sau dă răspunsuri foarte scurte
- NU marca ca lead dacă nu îndeplinește CLAR criteriile utilizatorului
- FII obiectiv și bazează-te strict pe conținutul conversației
- Dacă clientul răspunde în altă limbă decât agentul, asta este OK - analizează conținutul oricum`;

    // Call OpenAI with tool calling for structured output
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analizează următorul transcript:\n\n${transcript}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'qualify_lead',
              description: 'Calificare lead din conversație',
              parameters: {
                type: 'object',
                properties: {
                  is_qualified_lead: {
                    type: 'boolean',
                    description: 'Dacă persoana este un lead calificat'
                  },
                  confidence_score: {
                    type: 'number',
                    description: 'Scor de încredere 0-100'
                  },
                  lead_info: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Numele persoanei sau null dacă nu este menționat'
                      },
                      phone: {
                        type: 'string',
                        description: 'Numărul de telefon'
                      },
                      email: {
                        type: 'string',
                        description: 'Email-ul sau null'
                      },
                      interest_level: {
                        type: 'string',
                        enum: ['high', 'medium', 'low'],
                        description: 'Nivelul de interes'
                      },
                      summary: {
                        type: 'string',
                        description: 'Scurt rezumat al conversației'
                      },
                      notes: {
                        type: 'string',
                        description: 'Note relevante despre lead'
                      }
                    },
                    required: ['phone', 'interest_level', 'summary', 'notes']
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Explicație pentru decizia de calificare'
                  }
                },
                required: ['is_qualified_lead', 'confidence_score', 'lead_info', 'reasoning'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'qualify_lead' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ OpenAI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    console.log('🤖 AI Response:', JSON.stringify(aiResult, null, 2));

    // Extract the tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('AI did not return expected tool call');
    }

    const leadAnalysis = JSON.parse(toolCall.function.arguments);
    
    // Add phone number and agent info if not extracted
    if (!leadAnalysis.lead_info.phone) {
      leadAnalysis.lead_info.phone = phoneNumber;
    }

    console.log('✅ Analysis complete for conversation:', conversationId);
    console.log('🎯 Is qualified lead:', leadAnalysis.is_qualified_lead);
    console.log('📊 Confidence:', leadAnalysis.confidence_score);

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: leadAnalysis,
        conversationId,
        agentName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in analyze-conversation-for-lead:', error);
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