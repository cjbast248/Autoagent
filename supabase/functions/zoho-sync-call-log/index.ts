import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

async function refreshZohoToken(refreshToken: string, userId: string, supabase: any, client_id: string, client_secret: string, zoho_region: string = 'eu') {
  console.log('[Zoho Sync Call Log] Refreshing token for user:', userId);

  const accountsDomain = zoho_region === 'com' ? 'accounts.zoho.com' :
                        zoho_region === 'in' ? 'accounts.zoho.in' :
                        zoho_region === 'au' ? 'accounts.zoho.com.au' :
                        zoho_region === 'jp' ? 'accounts.zoho.jp' :
                        'accounts.zoho.eu';

  const response = await fetch(`https://${accountsDomain}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: client_id,
      client_secret: client_secret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    console.error('[Zoho Sync Call Log] Failed to refresh token');
    throw new Error('Failed to refresh Zoho token');
  }

  const tokens = await response.json();

  console.log('[Zoho Sync Call Log] Successfully refreshed token');
  await supabase
    .from('zoho_crm_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId);

  return tokens.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { call_log_id, user_id } = await req.json();

    if (!call_log_id || !user_id) {
      throw new Error('call_log_id and user_id are required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Zoho connection
    const { data: connection, error: connError } = await supabase
      .from('zoho_crm_connections')
      .select('access_token, refresh_token, client_id, client_secret, zoho_region, token_expires_at, field_mappings')
      .eq('user_id', user_id)
      .eq('status', 'connected')
      .single();

    if (connError || !connection) {
      throw new Error('Zoho CRM not connected');
    }

    const { client_id, client_secret, zoho_region = 'eu' } = connection;

    if (!client_id || !client_secret) {
      throw new Error('Zoho OAuth credentials not configured. Please reconnect your Zoho account.');
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expires_at);
    if (tokenExpiry <= new Date()) {
      accessToken = await refreshZohoToken(connection.refresh_token, user_id, supabase, client_id, client_secret, zoho_region);
    }

    const apiDomain = zoho_region === 'com' ? 'www.zohoapis.com' :
                     zoho_region === 'in' ? 'www.zohoapis.in' :
                     zoho_region === 'au' ? 'www.zohoapis.com.au' :
                     zoho_region === 'jp' ? 'www.zohoapis.jp' :
                     'www.zohoapis.eu';

    // Get call log data
    const { data: callLog, error: logError } = await supabase
      .from('call_history')
      .select('*')
      .eq('id', call_log_id)
      .single();

    if (logError || !callLog) {
      throw new Error('Call log not found');
    }

    // Map fields according to user's configuration
    const fieldMappings = connection.field_mappings || [];
    const activityData: any = {
      Call_Type: 'Outbound',
      Call_Result: callLog.status === 'completed' ? 'Interested' : 'Not Interested',
    };

    fieldMappings.forEach((mapping: any) => {
      if (callLog[mapping.agentauto_field]) {
        activityData[mapping.zoho_field] = callLog[mapping.agentauto_field];
      }
    });

    // Create activity in Zoho CRM
    const zohoResponse = await fetch(`https://${apiDomain}/crm/v2/Calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [activityData]
      }),
    });

    if (!zohoResponse.ok) {
      const errorText = await zohoResponse.text();
      console.error('Zoho API error:', errorText);
      throw new Error('Failed to create activity in Zoho CRM');
    }

    const result = await zohoResponse.json();

    // Update call log with Zoho ID
    if (result.data && result.data[0] && result.data[0].details && result.data[0].details.id) {
      await supabase
        .from('call_history')
        .update({ zoho_activity_id: result.data[0].details.id })
        .eq('id', call_log_id);
    }

    console.log('Call log synced to Zoho CRM:', call_log_id);

    return new Response(
      JSON.stringify({ success: true, zoho_activity_id: result.data[0].details.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Zoho sync call log error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
