// @ts-nocheck
// Supabase Edge Function: sync-elevenlabs-conversations
// Syncs ALL conversations from ElevenLabs API to call_history
// Can be triggered manually (per user/agent) or via cron (all users)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const COST_PER_MINUTE = 0.15;
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1/convai/conversations';

interface SyncResult {
  agentId: string;
  agentName: string;
  totalFetched: number;
  newConversations: number;
  skipped: number;
  errors: number;
  status: 'completed' | 'failed';
  errorMessage?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    // Parse request body
    let targetUserId: string | null = null;
    let targetAgentId: string | null = null;
    let isCronJob = false;

    try {
      const body = await req.json();
      targetUserId = body.user_id;
      targetAgentId = body.agent_id;
      isCronJob = body.cron === true;
    } catch {
      // No body - will sync all users (cron mode)
      isCronJob = true;
    }

    console.log('🔄 Starting ElevenLabs conversations sync...', {
      targetUserId,
      targetAgentId,
      isCronJob
    });

    // Get all agents to sync
    let agentsQuery = supabase
      .from('kalina_agents')
      .select('id, user_id, name, elevenlabs_agent_id, agent_id')
      .not('elevenlabs_agent_id', 'is', null);

    if (targetUserId) {
      agentsQuery = agentsQuery.eq('user_id', targetUserId);
    }
    if (targetAgentId) {
      agentsQuery = agentsQuery.eq('elevenlabs_agent_id', targetAgentId);
    }

    const { data: agents, error: agentsError } = await agentsQuery;

    if (agentsError) {
      throw new Error(`Failed to fetch agents: ${agentsError.message}`);
    }

    if (!agents || agents.length === 0) {
      console.log('No agents found to sync');
      return new Response(JSON.stringify({
        success: true,
        message: 'No agents found to sync',
        synced: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 Found ${agents.length} agents to sync`);

    const results: SyncResult[] = [];

    // Process each agent
    for (const agent of agents) {
      if (!agent.elevenlabs_agent_id) continue;

      console.log(`\n🎯 Syncing agent: ${agent.name} (${agent.elevenlabs_agent_id})`);

      // Update sync status to in_progress
      await supabase
        .from('elevenlabs_sync_status')
        .upsert({
          user_id: agent.user_id,
          agent_id: agent.elevenlabs_agent_id,
          kalina_agent_id: agent.id,
          last_sync_status: 'in_progress',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,agent_id'
        });

      try {
        // Fetch ALL conversations from ElevenLabs
        const elevenLabsUrl = `${ELEVENLABS_API_BASE}?agent_id=${agent.elevenlabs_agent_id}`;
        console.log(`📡 Fetching from ElevenLabs: ${elevenLabsUrl}`);

        const response = await fetch(elevenLabsUrl, {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const conversations = data.conversations || [];
        console.log(`📥 Fetched ${conversations.length} conversations from ElevenLabs`);

        // Get existing conversation_ids for this user and agent
        const { data: existingRecords } = await supabase
          .from('call_history')
          .select('conversation_id')
          .eq('user_id', agent.user_id)
          .not('conversation_id', 'is', null);

        const existingIds = new Set(existingRecords?.map(r => r.conversation_id) || []);
        console.log(`📊 Existing records in DB: ${existingIds.size}`);

        let newCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Process each conversation
        for (const conv of conversations) {
          const conversationId = conv.conversation_id;

          // Skip if already exists
          if (existingIds.has(conversationId)) {
            skippedCount++;
            continue;
          }

          // Skip if not completed
          if (conv.status !== 'done' && conv.status !== 'completed') {
            console.log(`⏭️ Skipping non-completed conversation: ${conversationId} (status: ${conv.status})`);
            skippedCount++;
            continue;
          }

          try {
            // Fetch detailed conversation data
            const detailUrl = `${ELEVENLABS_API_BASE}/${conversationId}`;
            const detailResponse = await fetch(detailUrl, {
              headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
              }
            });

            if (!detailResponse.ok) {
              console.warn(`⚠️ Could not fetch details for ${conversationId}: ${detailResponse.status}`);
              errorCount++;
              continue;
            }

            const conversationDetails = await detailResponse.json();

            // Extract duration and calculate cost
            let durationSeconds = 0;
            if (conversationDetails?.metadata?.call_duration_secs) {
              durationSeconds = conversationDetails.metadata.call_duration_secs;
            } else if (conversationDetails?.call_duration_secs) {
              durationSeconds = conversationDetails.call_duration_secs;
            } else if (conversationDetails?.analysis?.call_duration_secs) {
              durationSeconds = conversationDetails.analysis.call_duration_secs;
            }

            const durationMinutes = durationSeconds / 60;
            const calculatedCost = Math.round(durationMinutes * COST_PER_MINUTE * 100) / 100;

            // Determine call direction
            let callDirection = 'outbound';
            let callerNumber = null;
            let phoneNumber = 'Unknown';

            if (conversationDetails?.metadata?.phone_call) {
              const phoneCall = conversationDetails.metadata.phone_call;
              if (phoneCall.direction === 'inbound') {
                callDirection = 'inbound';
                callerNumber = phoneCall.external_number || null;
                phoneNumber = phoneCall.agent_number || 'Unknown';
              } else {
                callerNumber = phoneCall.agent_number || null;
                phoneNumber = phoneCall.external_number || 'Unknown';
              }
            }

            // Create call record
            const callRecord = {
              user_id: agent.user_id,
              phone_number: phoneNumber,
              caller_number: callerNumber,
              contact_name: callDirection === 'inbound'
                ? (callerNumber || 'Apel Inbound')
                : (conversationDetails?.contact_name || 'Sync: ElevenLabs'),
              call_status: 'success',
              summary: `[SYNC] ${callDirection === 'inbound' ? '📥 Inbound' : '📤 Outbound'} - ${agent.name} - ${durationSeconds}s`,
              dialog_json: JSON.stringify({
                agent_id: agent.elevenlabs_agent_id,
                agent_name: agent.name,
                transcript: conversationDetails?.transcript || [],
                conversation_id: conversationId,
                conversation_details: conversationDetails,
                call_direction: callDirection,
                synced_at: new Date().toISOString(),
                sync_source: 'periodic_sync'
              }),
              call_date: conv.start_time || conversationDetails?.start_time || new Date().toISOString(),
              cost_usd: calculatedCost,
              agent_id: agent.elevenlabs_agent_id,
              language: 'ro',
              conversation_id: conversationId,
              elevenlabs_history_id: conversationId,
              duration_seconds: durationSeconds,
              call_direction: callDirection,
              cost_processed: false,
              trigger_processed: false
            };

            const { error: insertError } = await supabase
              .from('call_history')
              .insert([callRecord]);

            if (insertError) {
              if (insertError.code === '23505') { // Unique constraint violation
                console.log(`⏭️ Duplicate skipped: ${conversationId}`);
                skippedCount++;
              } else {
                console.error(`❌ Error inserting conversation ${conversationId}:`, insertError);
                errorCount++;
              }
            } else {
              newCount++;
              console.log(`✅ Synced conversation: ${conversationId} (${durationSeconds}s, $${calculatedCost})`);
            }

          } catch (convError) {
            console.error(`❌ Error processing conversation ${conversationId}:`, convError);
            errorCount++;
          }
        }

        // Update sync status to completed
        await supabase
          .from('elevenlabs_sync_status')
          .upsert({
            user_id: agent.user_id,
            agent_id: agent.elevenlabs_agent_id,
            kalina_agent_id: agent.id,
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'completed',
            conversations_synced: newCount,
            conversations_total: conversations.length,
            error_message: null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,agent_id'
          });

        results.push({
          agentId: agent.elevenlabs_agent_id,
          agentName: agent.name,
          totalFetched: conversations.length,
          newConversations: newCount,
          skipped: skippedCount,
          errors: errorCount,
          status: 'completed'
        });

        console.log(`✅ Agent ${agent.name}: ${newCount} new, ${skippedCount} skipped, ${errorCount} errors`);

      } catch (agentError) {
        console.error(`❌ Error syncing agent ${agent.name}:`, agentError);

        await supabase
          .from('elevenlabs_sync_status')
          .upsert({
            user_id: agent.user_id,
            agent_id: agent.elevenlabs_agent_id,
            kalina_agent_id: agent.id,
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'failed',
            error_message: agentError.message,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,agent_id'
          });

        results.push({
          agentId: agent.elevenlabs_agent_id,
          agentName: agent.name,
          totalFetched: 0,
          newConversations: 0,
          skipped: 0,
          errors: 1,
          status: 'failed',
          errorMessage: agentError.message
        });
      }
    }

    const totalNew = results.reduce((sum, r) => sum + r.newConversations, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    console.log(`\n🎯 SYNC COMPLETE: ${totalNew} new conversations synced, ${totalErrors} errors`);

    return new Response(JSON.stringify({
      success: true,
      message: `Synced ${results.length} agents`,
      totalNewConversations: totalNew,
      totalErrors,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Critical error in sync:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
