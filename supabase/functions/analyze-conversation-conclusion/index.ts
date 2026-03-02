// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const { conversationId, processTriggers = false } = await req.json();
    
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    console.log('🎯 Starting conclusion analysis for conversation:', conversationId);
    console.log('🔔 Process triggers after completion:', processTriggers);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation details from call_history
    const { data: callHistory, error: dbError } = await supabase
      .from('call_history')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (dbError || !callHistory) {
      console.error('❌ Call history not found:', dbError);
      throw new Error('Call history not found');
    }

    console.log('📊 Found call history:', callHistory.id);

    // Check if already has conclusion AND triggers already processed
    if (callHistory.analysis_conclusion && callHistory.trigger_processed) {
      console.log('✅ Conclusion exists and triggers already processed');
      return new Response(JSON.stringify({ 
        conclusion: callHistory.analysis_conclusion,
        alreadyProcessed: true,
        triggersProcessed: true,
        success: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsedData = { concluzie: '', taguri: [], scor: 0 };
    let conclusion = callHistory.analysis_conclusion;
    let transcript = '';

    // If we don't have conclusion yet, generate it
    if (!conclusion) {
      // Get transcript from dialog_json or fetch from ElevenLabs
      if (callHistory.dialog_json) {
        try {
          const dialogData = JSON.parse(callHistory.dialog_json);
          
          // Extract text from dialog
          if (Array.isArray(dialogData)) {
            transcript = dialogData.map((msg: any) => {
              const role = msg.role === 'agent' ? 'Agent' : 'Client';
              return `${role}: ${msg.message || ''}`;
            }).join('\n');
          } else if (dialogData.transcript) {
            if (Array.isArray(dialogData.transcript)) {
              transcript = dialogData.transcript.map((msg: any) => {
                const role = msg.role === 'agent' ? 'Agent' : 'Client';
                return `${role}: ${msg.message || msg.text || ''}`;
              }).join('\n');
            } else {
              transcript = dialogData.transcript;
            }
          }
          
          if (transcript) {
            console.log('📝 Extracted transcript from dialog_json, length:', transcript.length);
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse dialog_json:', e);
        }
      }

      // If no transcript, try to get from ElevenLabs conversation API
      if (!transcript || transcript.trim().length === 0) {
        console.log('🔍 No transcript in database, trying ElevenLabs conversation API...');
        
        const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
        if (!elevenLabsApiKey) {
          throw new Error('ElevenLabs API key not configured');
        }

        // Try to get conversation details with transcript
        const conversationUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`;
        const conversationResponse = await fetch(conversationUrl, {
          headers: { 'xi-api-key': elevenLabsApiKey },
        });

        if (conversationResponse.ok) {
          const conversationData = await conversationResponse.json();
          console.log('✅ Fetched conversation data from ElevenLabs');
          
          // Try to extract transcript from conversation data
          if (conversationData.transcript && Array.isArray(conversationData.transcript)) {
            transcript = conversationData.transcript.map((msg: any) => {
              const role = msg.role === 'agent' ? 'Agent' : 'Client';
              return `${role}: ${msg.message || msg.text || ''}`;
            }).join('\n');
            
            if (transcript.trim().length > 0) {
              console.log('📝 Extracted transcript from ElevenLabs API, length:', transcript.length);
            }
          }
        }
      }

      // If still no transcript, try to get audio and transcribe
      if (!transcript || transcript.trim().length === 0) {
        console.log('🎵 No transcript available, fetching audio...');
        
        const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
        if (!elevenLabsApiKey) {
          throw new Error('ElevenLabs API key not configured');
        }

        // Get audio from ElevenLabs
        const audioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
        const audioResponse = await fetch(audioUrl, {
          headers: { 'xi-api-key': elevenLabsApiKey },
        });

        if (!audioResponse.ok) {
          console.error('❌ Failed to fetch audio:', audioResponse.status);
          throw new Error('Failed to fetch audio from ElevenLabs');
        }

        const audioBuffer = await audioResponse.arrayBuffer();
        console.log('✅ Audio fetched, size:', audioBuffer.byteLength);
        
        // Check if audio is too small (likely empty or error)
        if (audioBuffer.byteLength < 1000) {
          console.warn('⚠️ Audio too small, skipping transcription');
          return new Response(JSON.stringify({ 
            success: false,
            error_code: 'audio_too_small',
            error: 'Audio file too small to transcribe. The conversation may be too short or audio is not available.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Transcribe with OpenAI Whisper
        const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAiApiKey) {
          throw new Error('OpenAI API key not configured');
        }

        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        formData.append('file', audioBlob, 'audio.mp3');
        formData.append('model', 'whisper-1');
        formData.append('language', callHistory.language || 'ro');

        const transcribeResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
          },
          body: formData,
        });

        if (!transcribeResponse.ok) {
          console.error('❌ Transcription failed:', transcribeResponse.status);
          throw new Error('Failed to transcribe audio');
        }

        const transcribeData = await transcribeResponse.json();
        transcript = transcribeData.text;
        console.log('✅ Audio transcribed');
      }

      if (!transcript) {
        throw new Error('No transcript available');
      }

      console.log('📄 Transcript length:', transcript.length);

      // Analyze with Groq
      const groqApiKey = Deno.env.get('GROQ-KEY');
      if (!groqApiKey) {
        throw new Error('Groq API key not configured');
      }

      const groqPrompt = `Analizează următorul transcript al conversației dintre agent și client și generează un răspuns structurat care să includă:

1. **Concluzie**: Un rezumat clar și concis al conversației (2-3 propoziții care să conțină esența discuției, rezultatul apelului și acțiunile întreprinse)
2. **Tag-uri**: 2-3 etichete care categorisează conversația (exemple: "Interesat", "Programare", "Refuz", "Informații", "Callback", "Vânzare", "Suport", "Reclamație")
3. **Scor**: Un scor de la 0 la 100 care evaluează calitatea conversației din perspectiva agentului (unde 100 = conversație excelentă, obiectiv atins, client mulțumit; 0 = conversație foarte slabă, obiectiv neatins, client nemulțumit)

Transcript:
${transcript}

Răspunde STRICT în următorul format (fără alte explicații):

Concluzie: [textul concluziei]
Tag-uri: [tag1], [tag2], [tag3]
Scor: [număr]`;

      console.log('🤖 Sending to Groq for analysis...');

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: groqPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        console.error('❌ Groq API error:', groqResponse.status, errorText);
        throw new Error('Failed to analyze with Groq');
      }

      const groqData = await groqResponse.json();
      conclusion = groqData.choices?.[0]?.message?.content?.trim();

      if (!conclusion) {
        throw new Error('No conclusion generated');
      }

      console.log('✅ Conclusion generated:', conclusion);

      // Parse structured response
      try {
        // Extract conclusion (everything after "Concluzie:" until "Tag-uri:")
        const conclusionMatch = conclusion.match(/Concluzie:\s*(.+?)(?=Tag-uri:|Scor:|$)/is);
        if (conclusionMatch) {
          parsedData.concluzie = conclusionMatch[1].trim();
        }
        
        // Extract tags (everything after "Tag-uri:" until "Scor:")
        const tagsMatch = conclusion.match(/Tag-uri:\s*(.+?)(?=Scor:|$)/is);
        if (tagsMatch) {
          parsedData.taguri = tagsMatch[1]
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .slice(0, 3); // Max 3 tags
        }
        
        // Extract score (number after "Scor:")
        const scoreMatch = conclusion.match(/Scor:\s*(\d+)/i);
        if (scoreMatch) {
          parsedData.scor = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
        }
        
        console.log('✅ Parsed data:', JSON.stringify(parsedData));
      } catch (parseError) {
        console.warn('⚠️ Failed to parse structured response, using raw conclusion:', parseError);
        parsedData.concluzie = conclusion;
      }

      // Save conclusion to database (both raw and structured)
      const { error: updateError } = await supabase
        .from('call_history')
        .update({ 
          analysis_conclusion: conclusion,
          custom_analysis_data: parsedData,
          analysis_processed_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId);

      if (updateError) {
        console.error('❌ Failed to save conclusion:', updateError);
        throw new Error('Failed to save conclusion');
      }

      console.log('💾 Conclusion saved to database');
    } else {
      // Conclusion exists, parse it
      console.log('📊 Using existing conclusion, parsing data...');
      if (callHistory.custom_analysis_data) {
        parsedData = callHistory.custom_analysis_data;
      }
    }

    // ============================================
    // 🔔 PROCESS TRIGGERS WITH COMPLETE DATA
    // ============================================
    if (processTriggers && !callHistory.trigger_processed) {
      console.log('🔔 Processing triggers with COMPLETE data (including AI conclusion)...');
      
      try {
        const { data: activeTriggers, error: triggersError } = await supabase
          .from('call_history_triggers')
          .select('*, workflows(*)')
          .eq('user_id', callHistory.user_id)
          .eq('is_active', true);

        if (triggersError) {
          console.warn('⚠️ Error fetching triggers:', triggersError);
        } else if (activeTriggers && activeTriggers.length > 0) {
          console.log(`📋 Found ${activeTriggers.length} active trigger(s)`);
          
          for (const trigger of activeTriggers) {
            console.log(`🔍 Checking trigger: ${trigger.name} (${trigger.id})`);
            
            const filters = trigger.filter_config || {};
            const outputConfig = trigger.output_config || {};
            
            // Check if conversation matches filters (with AI score support!)
            let matches = true;
            
            // Agent filter
            if (filters.agentFilter && filters.agentFilter !== 'any') {
              if (callHistory.agent_id !== filters.agentFilter) {
                console.log(`❌ Agent mismatch: ${callHistory.agent_id} !== ${filters.agentFilter}`);
                matches = false;
              }
            }
            
            // Status filter
            if (filters.statusFilter && filters.statusFilter !== 'any') {
              if (callHistory.call_status !== filters.statusFilter) {
                console.log(`❌ Status mismatch: ${callHistory.call_status} !== ${filters.statusFilter}`);
                matches = false;
              }
            }
            
            // ✅ AI SCORE FILTER (NOW AVAILABLE!)
            if (filters.scoreEnabled && parsedData.scor !== undefined) {
              const scoreValue = filters.scoreValue || 0;
              const actualScore = parsedData.scor;
              
              if (filters.scoreOperator === 'greater' && actualScore <= scoreValue) {
                console.log(`❌ Score filter: ${actualScore} <= ${scoreValue}`);
                matches = false;
              }
              if (filters.scoreOperator === 'less' && actualScore >= scoreValue) {
                console.log(`❌ Score filter: ${actualScore} >= ${scoreValue}`);
                matches = false;
              }
              if (filters.scoreOperator === 'equal' && actualScore !== scoreValue) {
                console.log(`❌ Score filter: ${actualScore} !== ${scoreValue}`);
                matches = false;
              }
            }
            
            // Duration filter
            if (filters.durationEnabled) {
              const duration = callHistory.duration_seconds || 0;
              const durationValue = filters.durationValue || 0;
              
              if (filters.durationOperator === 'greater' && duration <= durationValue) {
                console.log(`❌ Duration filter: ${duration} <= ${durationValue}`);
                matches = false;
              }
              if (filters.durationOperator === 'less' && duration >= durationValue) {
                console.log(`❌ Duration filter: ${duration} >= ${durationValue}`);
                matches = false;
              }
            }
            
            // Replies filter
            if (filters.repliesEnabled) {
              let replyCount = 0;
              try {
                const dialogData = JSON.parse(callHistory.dialog_json || '{}');
                if (dialogData.transcript && Array.isArray(dialogData.transcript)) {
                  replyCount = dialogData.transcript.filter((msg: any) => msg.role === 'user').length;
                }
              } catch (e) {
                console.warn('Could not parse dialog for reply count');
              }
              
              const repliesValue = filters.repliesValue || 0;
              if (filters.repliesOperator === 'greater' && replyCount <= repliesValue) {
                console.log(`❌ Replies filter: ${replyCount} <= ${repliesValue}`);
                matches = false;
              }
              if (filters.repliesOperator === 'less' && replyCount >= repliesValue) {
                console.log(`❌ Replies filter: ${replyCount} >= ${repliesValue}`);
                matches = false;
              }
            }
            
            if (matches) {
              console.log(`✅ Trigger ${trigger.name} MATCHES - executing workflow with COMPLETE data`);
              
              // Get agent name
              let agentName = 'Agent';
              const { data: agentData } = await supabase
                .from('kalina_agents')
                .select('name')
                .eq('elevenlabs_agent_id', callHistory.agent_id)
                .single();
              if (agentData) agentName = agentData.name;
              
              // Prepare COMPLETE output data based on output_config
              const outputData: any = {};
              
              if (outputConfig.includeCallDetails !== false) {
                outputData.contact_name = callHistory.contact_name;
                outputData.call_status = callHistory.call_status;
                outputData.call_date = callHistory.call_date;
              }
              
              if (outputConfig.includePhoneNumber !== false) {
                outputData.phone_number = callHistory.phone_number;
                outputData.caller_number = callHistory.caller_number;
              }
              
              if (outputConfig.includeAgentInfo !== false) {
                outputData.agent_name = agentName;
                outputData.agent_id = callHistory.agent_id;
              }
              
              if (outputConfig.includeDuration !== false) {
                outputData.duration_seconds = callHistory.duration_seconds;
                // Format duration as human readable
                const mins = Math.floor((callHistory.duration_seconds || 0) / 60);
                const secs = (callHistory.duration_seconds || 0) % 60;
                outputData.duration_formatted = `${mins} minute ${secs} secunde`;
              }
              
              if (outputConfig.includeCost !== false) {
                outputData.cost_usd = callHistory.cost_usd;
              }
              
              if (outputConfig.includeSummary !== false) {
                outputData.summary = callHistory.summary;
              }
              
              // ✅ COMPLETE AI DATA (NOW AVAILABLE!)
              if (outputConfig.includeConclusion !== false) {
                outputData.conclusion = parsedData.concluzie || conclusion;
              }
              
              if (outputConfig.includeScore !== false) {
                outputData.ai_score = parsedData.scor;
              }
              
              // Always include tags if available
              outputData.ai_tags = parsedData.taguri || [];
              
              if (outputConfig.includeTranscription !== false) {
                outputData.transcript = transcript || callHistory.dialog_json;
              }
              
              if (outputConfig.includeAudio !== false) {
                outputData.audio_url = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
              }
              
              outputData.conversation_id = conversationId;
              
              console.log('📤 Output data prepared:', JSON.stringify(outputData).substring(0, 500));
              
              // Execute workflow
              const { data: workflowResult, error: workflowError } = await supabase.functions.invoke('execute-workflow-from-trigger', {
                body: {
                  workflow_id: trigger.workflow_id,
                  trigger_id: trigger.id,
                  trigger_type: 'call_history',
                  data: outputData,
                  user_id: callHistory.user_id
                }
              });
              
              if (workflowError) {
                console.error(`❌ Workflow execution error:`, workflowError);
              } else {
                console.log(`🎉 Workflow execution result:`, workflowResult);
              }
              
              // Update trigger stats
              await supabase.from('call_history_triggers').update({
                total_triggers: (trigger.total_triggers || 0) + 1,
                last_triggered_at: new Date().toISOString()
              }).eq('id', trigger.id);
              
              console.log(`📊 Trigger stats updated`);
            } else {
              console.log(`❌ Trigger ${trigger.name} does not match filters`);
            }
          }
        } else {
          console.log('📭 No active triggers found for this user');
        }
        
        // Mark conversation as trigger processed
        await supabase.from('call_history').update({
          trigger_processed: true,
          trigger_processed_at: new Date().toISOString()
        }).eq('id', callHistory.id);
        
        console.log('✅ Conversation marked as trigger_processed');
        
      } catch (triggerError) {
        console.error('❌ Error processing triggers:', triggerError);
        // Don't fail the whole function, just log the error
      }
    }
    // ============================================

    return new Response(JSON.stringify({ 
      conclusion,
      parsedData,
      conversationId,
      triggersProcessed: processTriggers && !callHistory.trigger_processed,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in analyze-conversation-conclusion:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});