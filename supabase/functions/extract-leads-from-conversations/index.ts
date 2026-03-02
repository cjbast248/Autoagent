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
    const { agentId, extractionPrompt, userId, conversationIds } = await req.json();
    
    if (!agentId || !extractionPrompt || !userId) {
      throw new Error('Agent ID, extraction prompt, and user ID are required');
    }

    console.log('🚀 Starting lead extraction for agent:', agentId);
    console.log('👤 User ID:', userId);
    console.log('🎯 Extraction criteria:', extractionPrompt);
    if (conversationIds) {
      console.log('📋 Processing specific conversations:', conversationIds.length);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversations for this agent
    let query = supabase
      .from('conversation_analytics_cache')
      .select('*')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // If specific conversation IDs are provided, filter by them
    if (conversationIds && conversationIds.length > 0) {
      query = query.in('conversation_id', conversationIds);
      console.log('🎯 Processing selected conversations:', conversationIds.length);
    } else {
      // Process up to 500 most recent if no specific IDs provided
      query = query.limit(500);
      console.log('📊 Processing up to 500 most recent conversations');
    }

    const { data: conversations, error: convError } = await query;

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      throw new Error(`Failed to fetch conversations: ${convError.message}`);
    }

    console.log(`📊 Found ${conversations?.length || 0} conversations to process`);

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No conversations found for this agent',
          results: {
            total: 0,
            processed: 0,
            leadsFound: 0,
            leads: []
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      total: conversations.length,
      processed: 0,
      leadsFound: 0,
      leads: [],
      errors: []
    };

    // Process conversations in batches of 3
    const batchSize = 3;
    for (let i = 0; i < conversations.length; i += batchSize) {
      const batch = conversations.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (conversation) => {
        try {
          console.log(`\n📞 Processing conversation ${conversation.conversation_id}`);
          
          // Check if we already have a transcript in cache
          let transcript = '';
          if (conversation.transcript && typeof conversation.transcript === 'object') {
            // Extract transcript from JSONB format
            if (Array.isArray(conversation.transcript)) {
              transcript = conversation.transcript
                .map(t => {
                  // Map 'agent' role to 'Agent' and 'user' to 'Client' for GPT understanding
                  const speaker = t.role === 'agent' ? 'Agent' : 'Client';
                  const message = t.message || t.text || '';
                  return `${speaker}: ${message}`;
                })
                .filter(line => line.length > 8) // Exclude empty lines
                .join('\n');
            } else if (typeof conversation.transcript === 'string') {
              transcript = conversation.transcript;
            }
          }

          // Debug logging for transcript
          if (transcript) {
            console.log(`📝 Transcript preview (first 200 chars):`, transcript.substring(0, 200));
            console.log(`📊 Transcript length:`, transcript.length, 'chars');
            console.log(`🎭 Speaker detection:`, {
              hasAgent: transcript.includes('Agent:'),
              hasClient: transcript.includes('Client:'),
              lines: transcript.split('\n').length
            });
          }

          // If no transcript in cache, try to get and transcribe audio
          if (!transcript || transcript.length < 50) {
            console.log('📝 No cached transcript, fetching audio...');
            
            let audioUrl = conversation.audio_url;
            
            // If no audio URL in cache, get it from ElevenLabs
            if (!audioUrl) {
              const audioResponse = await supabase.functions.invoke('get-conversation-audio', {
                body: { conversationId: conversation.conversation_id }
              });

              if (audioResponse.data?.audioUrl) {
                audioUrl = audioResponse.data.audioUrl;
              } else {
                console.log('⚠️ No audio available for conversation:', conversation.conversation_id);
                results.processed++;
                return;
              }
            }

            // Transcribe audio
            console.log('🎤 Transcribing audio...');
            const transcribeResponse = await supabase.functions.invoke('transcribe-conversation-audio', {
              body: { 
                audioUrl,
                conversationId: conversation.conversation_id 
              }
            });

            if (transcribeResponse.data?.transcript) {
              transcript = transcribeResponse.data.transcript;
              
              // Update cache with transcript
              await supabase
                .from('conversation_analytics_cache')
                .update({ 
                  transcript: transcript,
                  updated_at: new Date().toISOString()
                })
                .eq('conversation_id', conversation.conversation_id);
            } else {
              console.log('⚠️ Transcription failed for conversation:', conversation.conversation_id);
              results.processed++;
              return;
            }
          } else {
            console.log('✅ Using cached transcript');
          }

          // Analyze conversation with AI
          console.log('🤖 Analyzing conversation with AI...');
          const analysisResponse = await supabase.functions.invoke('analyze-conversation-for-lead', {
            body: {
              transcript,
              userPrompt: extractionPrompt,
              conversationId: conversation.conversation_id,
              phoneNumber: conversation.phone_number || 'Unknown',
              agentName: conversation.agent_name || 'Unknown Agent'
            }
          });

          results.processed++;

          if (analysisResponse.data?.analysis?.is_qualified_lead) {
            const analysis = analysisResponse.data.analysis;
            console.log('🎉 Qualified lead found!', analysis.lead_info.name || analysis.lead_info.phone);
            
            // Save lead to contacts_database
            const leadData = {
              user_id: userId,
              nume: analysis.lead_info.name || 'Lead din conversație',
              telefon: analysis.lead_info.phone,
              email: analysis.lead_info.email || null,
              info: analysis.lead_info.summary,
              notes: `Agent: ${conversation.agent_name || 'Unknown'}\nSource: AI Extraction - ${new Date().toLocaleDateString()}\nConfidence: ${analysis.confidence_score}%\n\n${analysis.lead_info.notes}\n\nRezumat: ${analysis.reasoning}`,
              status: 'active',
              tags: [analysis.lead_info.interest_level, 'ai-extracted'],
              last_contact_date: conversation.call_date || new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Check if contact already exists
            const { data: existingContact } = await supabase
              .from('contacts_database')
              .select('id')
              .eq('telefon', leadData.telefon)
              .eq('user_id', userId)
              .single();

            if (existingContact) {
              console.log('ℹ️ Contact already exists, updating...');
              await supabase
                .from('contacts_database')
                .update({
                  notes: leadData.notes,
                  info: leadData.info,
                  last_contact_date: leadData.last_contact_date,
                  updated_at: leadData.updated_at
                })
                .eq('id', existingContact.id);
            } else {
              console.log('💾 Saving new lead to database...');
              const { error: insertError } = await supabase
                .from('contacts_database')
                .insert(leadData);

              if (insertError) {
                console.error('❌ Error saving lead:', insertError);
                results.errors.push({
                  conversationId: conversation.conversation_id,
                  error: insertError.message
                });
              } else {
                results.leadsFound++;
                results.leads.push({
                  name: analysis.lead_info.name,
                  phone: analysis.lead_info.phone,
                  confidence: analysis.confidence_score,
                  interestLevel: analysis.lead_info.interest_level
                });
              }
            }
          } else {
            console.log('⏭️ Not a qualified lead');
          }

        } catch (error) {
          console.error('❌ Error processing conversation:', conversation.conversation_id, error);
          results.processed++;
          results.errors.push({
            conversationId: conversation.conversation_id,
            error: error.message
          });
        }
      }));

      // Add small delay between batches to respect rate limits
      if (i + batchSize < conversations.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ Lead extraction complete!');
    console.log('📊 Results:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in extract-leads-from-conversations:', error);
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