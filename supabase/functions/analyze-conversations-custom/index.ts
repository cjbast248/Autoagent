// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const UNIVERSAL_PROMPT = `Tu ești un asistent AI expert în analiza conversațiilor telefonice. Misiunea ta este să analizezi transcripția fiecărui apel și să generezi o evaluare structurată, consistentă și obiectivă.

## SARCINA TA

Analizează transcripția apelului telefonic și generează:
1. **Concluzie** (maxim 600 caractere) - rezumatul esențial al apelului
2. **Tag-uri** (între 1-6 tag-uri) - categorii relevante din lista fixă
3. **Scor** (0-100) - evaluare obiectivă bazată pe criteriile definite

## LISTA FIXĂ DE TAG-URI (alege între 1-6)

1. vanzare_reusita - Vânzare finalizată sau foarte aproape de finalizare
2. interes_ridicat - Client foarte interesat, probabilitate mare de conversie
3. interes_moderat - Client interesat, necesită follow-up
4. interes_scazut - Client puțin interesat sau ezitant
5. obiectii_pret - Preocupări legate de preț sau buget
6. obiectii_produs - Îndoieli despre caracteristici sau calitate
7. cerere_informatii - Client solicită detalii suplimentare
8. programare_viitoare - S-a stabilit un next step sau întâlnire
9. client_nemultumit - Reclamații sau feedback negativ
10. client_multumit - Feedback pozitiv, satisfacție ridicată
11. apel_tehnic - Support tehnic sau asistență
12. apel_urgent - Situație urgentă care necesită atenție imediată
13. competitie - Mențiuni despre competitori
14. recomandare - Client a fost recomandat sau recomandă
15. apel_rece - Cold call, primul contact
16. follow_up - Apel de follow-up după contact anterior
17. anulare_refuz - Client refuză sau anulează
18. negociere_activa - Proces de negociere în desfășurare
19. client_fidel - Client existent, relație stabilită
20. apel_informativ - Apel pur informativ, fără intenție de vânzare

## CRITERIILE DE SCORING (0-100)

Calculează scorul bazat pe aceste criterii FIXE:

**CRITERII POZITIVE:**
- Vânzare finalizată: +40 puncte
- Programare/Next step stabilit: +25 puncte
- Interes ridicat manifestat: +20 puncte
- Ton pozitiv/conversație constructivă: +15 puncte
- Client răspunde activ, pune întrebări: +10 puncte
- Obiectii gestionate cu succes: +15 puncte
- Durată optimă (5-15 min): +10 puncte

**CRITERII NEGATIVE:**
- Refuz categoric/Anulare: -30 puncte
- Client nemulțumit/reclamații: -25 puncte
- Ton negativ/conflict: -20 puncte
- Client neinteresat complet: -15 puncte
- Apel sub 2 minute fără rezultat: -10 puncte
- Apel întrerupt brusc: -15 puncte

**SCOR FINAL:**
- 80-100: Excelent (vânzare/succes major)
- 60-79: Bun (interes ridicat, probabilitate mare de conversie)
- 40-59: Mediu (necesită follow-up, potențial moderat)
- 20-39: Slab (interes scăzut, șanse mici)
- 0-19: Foarte slab (refuz, nemulțumire, eșec)`;

const CUSTOM_QUESTION_PROMPT = `Tu ești un asistent AI expert în analiza conversațiilor telefonice. 
Ai primit un transcript al unei conversații telefonice și o întrebare specifică de la utilizator.

Răspunde DOAR la întrebarea pusă, folosind informațiile din transcript.
Fii concis, relevant și precis în răspunsul tău.
Dacă informația cerută nu există în transcript, spune clar acest lucru.
Răspunde în română.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationIds, userId, analysisPrompt, transcripts } = await req.json();

    const groqApiKey = Deno.env.get('GROQ-KEY');
    if (!groqApiKey) {
      throw new Error('GROQ-KEY not configured. Please configure it in Supabase Secrets.');
    }

    // MODE 1: Custom question with provided transcript
    if (analysisPrompt && transcripts && transcripts.length > 0) {
      console.log('Custom question mode - using Groq to answer:', analysisPrompt);
      
      const transcript = transcripts[0];
      
      const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: CUSTOM_QUESTION_PROMPT },
            { role: 'user', content: `TRANSCRIPT:\n${transcript}\n\nÎNTREBAREA UTILIZATORULUI:\n${analysisPrompt}` }
          ],
          temperature: 0.5,
          max_tokens: 1000
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('Groq API error:', aiResponse.status, errorText);
        throw new Error(`Groq API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const answer = aiData.choices[0]?.message?.content || 'Nu s-a putut genera răspunsul';

      return new Response(JSON.stringify({ 
        results: [{
          conversationId: conversationIds?.[0] || 'custom',
          success: true,
          analysis: answer
        }]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MODE 2: Standard analysis (existing code)
    if (!conversationIds || conversationIds.length === 0) {
      throw new Error('conversationIds is required');
    }

    if (!userId) {
      throw new Error('userId is required for standard analysis');
    }

    console.log('Starting analysis for', conversationIds.length, 'conversations using Groq');

    console.log('Starting analysis for', conversationIds.length, 'conversations');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = [];

    // Process each conversation
    for (const conversationId of conversationIds) {
      try {
        console.log(`Processing conversation ${conversationId}`);

        // Fetch conversation data from call_history
        const { data: conversation, error: fetchError } = await supabase
          .from('call_history')
          .select('id, conversation_id, dialog_json, phone_number, contact_name, agent_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .single();

        if (fetchError || !conversation) {
          console.error(`Error fetching conversation ${conversationId}:`, fetchError);
          results.push({
            conversationId,
            success: false,
            error: 'Conversation not found'
          });
          continue;
        }

        // Parse dialog_json to get transcript, otherwise fetch from ElevenLabs
        let transcript = '';
        let transcriptArray: any[] | null = null;
        if (conversation.dialog_json) {
          try {
            const dialogData = JSON.parse(conversation.dialog_json);
            if (Array.isArray(dialogData)) {
              transcriptArray = dialogData;
              transcript = dialogData
                .map((msg: any) => `${msg.role}: ${msg.message}`)
                .join('\n');
            } else if (typeof dialogData === 'string') {
              transcript = dialogData;
            }
          } catch (e) {
            console.error('Error parsing dialog_json:', e);
            transcript = conversation.dialog_json;
          }
        }

        // If no transcript locally, fetch full conversation from ElevenLabs
        if (!transcript) {
          const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
          if (!elevenLabsApiKey) {
            console.warn('ELEVENLABS_API_KEY not configured; cannot fetch transcript');
          } else {
            try {
              const elResp = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`, {
                method: 'GET',
                headers: {
                  'xi-api-key': elevenLabsApiKey,
                  'Content-Type': 'application/json',
                },
              });

              if (elResp.ok) {
                const elData = await elResp.json();
                // ElevenLabs returns an array under `transcript`
                if (Array.isArray(elData?.transcript)) {
                  transcriptArray = elData.transcript;
                  transcript = elData.transcript
                    .map((t: any) => `${t.role}: ${t.message}`)
                    .join('\n');

                  // Cache transcript for future runs if not already stored
                  if (!conversation.dialog_json) {
                    await supabase
                      .from('call_history')
                      .update({ dialog_json: JSON.stringify(transcriptArray) })
                      .eq('id', conversation.id);
                  }
                }
              } else {
                const errText = await elResp.text();
                console.error('Failed to fetch transcript from ElevenLabs:', elResp.status, errText);
              }
            } catch (fetchErr) {
              console.error('Exception while fetching ElevenLabs transcript:', fetchErr);
            }
          }
        }

        if (!transcript) {
          console.warn(`No transcript available for conversation ${conversationId}, skipping`);
          results.push({
            conversationId,
            success: false,
            error: 'No transcript available'
          });
          continue;
        }

        // Call Groq API
        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: UNIVERSAL_PROMPT },
              { role: 'user', content: transcript }
            ],
            temperature: 0.7,
            response_format: {
              type: 'json_object'
            }
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`Groq API error for conversation ${conversationId}:`, aiResponse.status, errorText);
          results.push({
            conversationId,
            success: false,
            error: `Groq API error: ${aiResponse.status}`
          });
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices[0]?.message?.content || '';

        // Parse JSON from the AI response
        let analysisResult;
        try {
          analysisResult = JSON.parse(content);
          
          // Ensure required fields exist
          if (!analysisResult.concluzie || !analysisResult.taguri || typeof analysisResult.scor !== 'number') {
            console.error('Invalid analysis structure:', analysisResult);
            results.push({
              conversationId,
              success: false,
              error: 'Invalid AI response structure'
            });
            continue;
          }
        } catch (parseError) {
          console.error('Error parsing AI response as JSON:', parseError);
          console.error('Raw content:', content);
          results.push({
            conversationId,
            success: false,
            error: 'AI response is not valid JSON'
          });
          continue;
        }

        // Save result to call_history
        const { error: updateError } = await supabase
          .from('call_history')
          .update({
            custom_analysis_data: JSON.stringify(analysisResult)
          })
          .eq('id', conversation.id);

        if (updateError) {
          console.error('Error updating conversation:', updateError);
          results.push({
            conversationId,
            success: false,
            error: 'Failed to save analysis'
          });
          continue;
        }

        console.log(`Successfully analyzed conversation ${conversationId}`);
        results.push({
          conversationId,
          success: true,
          analysis: analysisResult,
          contact: conversation.contact_name,
          phone: conversation.phone_number
        });

      } catch (error) {
        console.error(`Unexpected error processing conversation ${conversationId}:`, error);
        results.push({
          conversationId,
          success: false,
          error: error.message || 'Unknown error'
        });
        // Continue to next conversation
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-conversations-custom function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
