// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  status: string; // 'done', 'processing', 'in-progress', 'failed', etc.
  start_time_unix_secs?: number;
  end_time_unix_secs?: number;
  call_duration_secs?: number;
  metadata?: {
    phone_call?: {
      direction?: 'inbound' | 'outbound';
      external_number?: string;
      agent_number?: string;
      call_status?: string;
    };
  };
  analysis?: {
    call_successful?: boolean;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { agentId } = await req.json();
    console.log('Fetching active calls for agent:', agentId);

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY not found");
    }

    if (!agentId) {
      throw new Error("agentId is required");
    }

    // Get conversations from ElevenLabs API
    // Filter by agent_id and look for active/ongoing conversations
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}&page_size=50`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    const allConversations: ElevenLabsConversation[] = data.conversations || [];

    console.log('All conversations from ElevenLabs:', JSON.stringify(allConversations.slice(0, 5), null, 2));

    // Filter for TRULY active conversations
    // ElevenLabs status values: 'done', 'processing', 'in-progress', 'failed'
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutesAgo = now - 300; // Only check last 5 minutes for active calls

    const activeConversations = allConversations
      .filter(conv => {
        const startTime = conv.start_time_unix_secs || 0;
        const endTime = conv.end_time_unix_secs;
        const status = conv.status?.toLowerCase();

        // Log for debugging
        console.log(`Conv ${conv.conversation_id}: status=${status}, start=${startTime}, end=${endTime}, duration=${conv.call_duration_secs}`);

        // EXCLUDE if:
        // - Status is 'done' or 'failed' - call has ended
        // - Has an end_time - call has ended
        // - Has call_duration_secs set - call has ended (duration is only set after completion)
        // - Started more than 5 minutes ago without activity (probably stuck/failed)

        if (status === 'done' || status === 'failed') {
          console.log(`  -> Excluded: status is ${status}`);
          return false;
        }

        if (endTime && endTime > 0) {
          console.log(`  -> Excluded: has end_time ${endTime}`);
          return false;
        }

        if (conv.call_duration_secs && conv.call_duration_secs > 0) {
          console.log(`  -> Excluded: has call_duration_secs ${conv.call_duration_secs}`);
          return false;
        }

        // Must have started recently (within last 5 minutes)
        if (startTime < fiveMinutesAgo) {
          console.log(`  -> Excluded: started too long ago (${now - startTime}s)`);
          return false;
        }

        // Only include if status suggests it's active
        const activeStatuses = ['in-progress', 'processing', 'active', 'ringing', 'connected'];
        if (status && !activeStatuses.includes(status)) {
          console.log(`  -> Excluded: unknown status ${status}`);
          return false;
        }

        console.log(`  -> INCLUDED as active`);
        return true;
      })
      .map(conv => {
        const startTime = conv.start_time_unix_secs || now;
        const phoneCall = conv.metadata?.phone_call;

        return {
          conversation_id: conv.conversation_id,
          agent_id: conv.agent_id,
          status: 'active' as const,
          phone_number: phoneCall?.direction === 'inbound'
            ? phoneCall.agent_number
            : phoneCall?.external_number,
          caller_number: phoneCall?.direction === 'inbound'
            ? phoneCall.external_number
            : phoneCall?.agent_number,
          direction: phoneCall?.direction || 'outbound',
          started_at: new Date(startTime * 1000).toISOString(),
          duration_seconds: now - startTime,
        };
      });

    console.log(`Found ${activeConversations.length} active conversations for agent ${agentId}`);

    return new Response(
      JSON.stringify({
        conversations: activeConversations,
        total: activeConversations.length,
        checked_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-agent-active-calls:', error);
    return new Response(
      JSON.stringify({ error: error.message, conversations: [] }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
