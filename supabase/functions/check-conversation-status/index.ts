// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting conversation status check...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get ElevenLabs API key
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not found');
    }

    // Find all conversations with 'in-progress' status
    const { data: inProgressConversations, error: fetchError } = await supabase
      .from('call_history')
      .select('*')
      .eq('call_status', 'in-progress')
      .not('conversation_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to avoid overwhelming the API

    if (fetchError) {
      console.error('Error fetching in-progress conversations:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Found ${inProgressConversations?.length || 0} conversations to check`);

    if (!inProgressConversations || inProgressConversations.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No in-progress conversations found',
        updated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updatedCount = 0;
    let errorCount = 0;

    // Process each conversation
    for (const conversation of inProgressConversations) {
      try {
        console.log(`🔄 Checking conversation: ${conversation.conversation_id}`);

        // Call ElevenLabs API to get conversation details
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conversation.conversation_id}`,
          {
            method: 'GET',
            headers: {
              'xi-api-key': elevenlabsApiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            console.log(`⚠️ Conversation ${conversation.conversation_id} not found, marking as failed`);
            // Update as failed if not found
            await supabase
              .from('call_history')
              .update({
                call_status: 'failed',
                summary: 'Conversația nu a fost găsită în ElevenLabs',
                updated_at: new Date().toISOString()
              })
              .eq('id', conversation.id);
            updatedCount++;
            continue;
          }
          console.error(`❌ ElevenLabs API error for ${conversation.conversation_id}:`, response.status);
          errorCount++;
          continue;
        }

        const conversationData = await response.json();
        console.log(`📊 Retrieved data for ${conversation.conversation_id}:`, {
          status: conversationData.status,
          end_time: conversationData.end_time
        });

        // Check if conversation is completed
        if (conversationData.status === 'completed' || conversationData.end_time) {
          console.log(`✅ Conversation ${conversation.conversation_id} is completed, updating...`);

          // Calculate duration and cost
          let durationSeconds = 0;
          let costUsd = 0;

          if (conversationData.start_time && conversationData.end_time) {
            const startTime = new Date(conversationData.start_time);
            const endTime = new Date(conversationData.end_time);
            durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
            
            // Calculate cost at $0.15 per minute
            const durationMinutes = durationSeconds / 60;
            costUsd = Math.round(durationMinutes * 0.15 * 100) / 100;
          }

          // Extract transcript from conversation data
          let transcript = '';
          if (conversationData.transcript && Array.isArray(conversationData.transcript)) {
            transcript = conversationData.transcript
              .map(item => `${item.role}: ${item.content}`)
              .join('\n');
          }

          // Update the conversation record
          const { error: updateError } = await supabase
            .from('call_history')
            .update({
              call_status: 'completed',
              duration_seconds: durationSeconds,
              cost_usd: costUsd,
              dialog_json: transcript || conversation.dialog_json,
              summary: conversationData.summary || conversation.summary || 'Conversație finalizată',
              elevenlabs_history_id: conversation.conversation_id,
              updated_at: new Date().toISOString(),
              last_status_check: new Date().toISOString()
            })
            .eq('id', conversation.id);

          if (updateError) {
            console.error(`❌ Error updating conversation ${conversation.id}:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Successfully updated conversation ${conversation.id}`);
            updatedCount++;

            // Update user statistics if cost was calculated
            if (costUsd > 0 && conversation.user_id) {
              try {
                const { error: statsError } = await supabase.rpc('update_user_statistics_with_spending', {
                  p_user_id: conversation.user_id,
                  p_duration_seconds: durationSeconds,
                  p_cost_usd: costUsd
                });

                if (statsError) {
                  console.error(`⚠️ Error updating user statistics for ${conversation.user_id}:`, statsError);
                }
              } catch (statsErr) {
                console.error(`⚠️ Failed to update user statistics:`, statsErr);
              }
            }
          }
        } else if (conversationData.status === 'failed' || conversationData.status === 'error') {
          console.log(`❌ Conversation ${conversation.conversation_id} failed, updating status...`);
          
          await supabase
            .from('call_history')
            .update({
              call_status: 'failed',
              summary: conversationData.error_message || 'Conversația a eșuat',
              updated_at: new Date().toISOString(),
              last_status_check: new Date().toISOString()
            })
            .eq('id', conversation.id);
          updatedCount++;
        } else {
          console.log(`⏳ Conversation ${conversation.conversation_id} still in progress (${conversationData.status})`);
          
          // Update last check time
          await supabase
            .from('call_history')
            .update({
              last_status_check: new Date().toISOString()
            })
            .eq('id', conversation.id);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error processing conversation ${conversation.conversation_id}:`, error);
        errorCount++;
      }
    }

    console.log(`🎯 Status check completed: ${updatedCount} updated, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${inProgressConversations.length} conversations`,
      updated: updatedCount,
      errors: errorCount,
      total_checked: inProgressConversations.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in check-conversation-status function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});