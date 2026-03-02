import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  console.log('Associate phone with agent called:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_id, agent_id, user_id } = await req.json();
    
    console.log('📞 Associating phone with agent:', { phone_id, agent_id, user_id });

    if (!phone_id || !user_id) {
      throw new Error('Missing required fields: phone_id, user_id');
    }

    // Verify user owns the phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('id', phone_id)
      .eq('user_id', user_id)
      .single();

    if (phoneError || !phoneData) {
      throw new Error('Phone number not found or access denied');
    }

    console.log('📱 Phone number found:', phoneData.phone_number);

    // If agent_id is provided, verify user owns the agent
    let agentData = null;
    if (agent_id) {
      const { data: agent, error: agentError } = await supabase
        .from('kalina_agents')
        .select('agent_id, elevenlabs_agent_id, name')
        .eq('id', agent_id)
        .eq('user_id', user_id)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found or access denied');
      }

      // Verify the agent has an ElevenLabs ID
      if (!agent.elevenlabs_agent_id) {
        throw new Error('Agent does not have an ElevenLabs ID configured. Please sync the agent first.');
      }

      agentData = agent;
      console.log('🤖 Agent found:', agent.name, 'ElevenLabs ID:', agent.elevenlabs_agent_id);
    }

    // Get ElevenLabs phone ID
    const elevenlabsPhoneId = phoneData.elevenlabs_phone_id;
    if (!elevenlabsPhoneId) {
      throw new Error('Phone number not synced with ElevenLabs');
    }

    // Update ElevenLabs phone number configuration to set the inbound agent
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    // Prepare the update payload for ElevenLabs
    const updatePayload: any = {};

    // Our Asterisk server address
    const ASTERISK_SERVER = '193.53.40.79';

    if (agentData?.elevenlabs_agent_id) {
      // Set agent for inbound calls
      updatePayload.agent_id = agentData.elevenlabs_agent_id;
      console.log('🔗 Setting inbound agent:', agentData.elevenlabs_agent_id);

      // Also ensure inbound SIP trunk is properly configured with auth credentials
      // This is needed for Asterisk to call ElevenLabs for inbound calls
      updatePayload.inbound_trunk_config = {
        media_encryption: 'allowed',
        allowed_addresses: [ASTERISK_SERVER],
        credentials: {
          username: 'zDRKLvbelFgA',
          password: 'gjEaPuWKhhJN',
        },
      };
      console.log('🔗 Setting inbound SIP trunk config with credentials');
    } else {
      // Remove agent association (disable inbound)
      updatePayload.agent_id = null;
      console.log('🔗 Removing inbound agent association');
    }

    // Update ElevenLabs phone number configuration
    const elevenlabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/phone-numbers/${elevenlabsPhoneId}`,
      {
        method: 'PATCH',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!elevenlabsResponse.ok) {
      const errorText = await elevenlabsResponse.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`Failed to update ElevenLabs phone: ${errorText}`);
    }

    const elevenlabsResult = await elevenlabsResponse.json();
    console.log('✅ ElevenLabs phone updated:', elevenlabsResult);

    // Update our database with the connected agent
    const { error: updateError } = await supabase
      .from('phone_numbers')
      .update({
        connected_agent_id: agent_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', phone_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('✅ Database updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: agent_id 
          ? `Phone number configured for inbound calls with agent: ${agentData?.name}`
          : 'Inbound agent removed from phone number',
        phone_id,
        agent_id: agent_id || null,
        agent_name: agentData?.name || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in associate-phone-with-agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
