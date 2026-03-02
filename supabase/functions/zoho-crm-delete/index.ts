import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

async function refreshToken(supabase: any, user_id: string, refresh_token: string, client_id: string, client_secret: string, zoho_region: string = 'eu') {
  console.log('[Zoho Delete] Refreshing token for user:', user_id);

  const accountsDomain = zoho_region === 'com' ? 'accounts.zoho.com' :
                        zoho_region === 'in' ? 'accounts.zoho.in' :
                        zoho_region === 'au' ? 'accounts.zoho.com.au' :
                        zoho_region === 'jp' ? 'accounts.zoho.jp' :
                        'accounts.zoho.eu';

  const tokenResponse = await fetch(
    `https://${accountsDomain}/oauth/v2/token?refresh_token=${refresh_token}&client_id=${client_id}&client_secret=${client_secret}&grant_type=refresh_token`,
    { method: 'POST' }
  );

  const tokenData = await tokenResponse.json();

  if (tokenData.access_token) {
    console.log('[Zoho Delete] Successfully refreshed token');
    await supabase
      .from('zoho_crm_connections')
      .update({ access_token: tokenData.access_token })
      .eq('user_id', user_id);

    return tokenData.access_token;
  }

  console.error('[Zoho Delete] Failed to refresh token:', tokenData);
  throw new Error(`Failed to refresh token: ${JSON.stringify(tokenData)}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, module = 'Leads', record_id } = body;

    if (!user_id || !record_id) {
      return new Response(
        JSON.stringify({ error: 'user_id and record_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting record ${record_id} from ${module} for user ${user_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: connection, error: connError } = await supabase
      .from('zoho_crm_connections')
      .select('access_token, refresh_token, client_id, client_secret, zoho_region')
      .eq('user_id', user_id)
      .eq('status', 'connected')
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Zoho CRM not connected' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { client_id, client_secret, zoho_region = 'eu' } = connection;

    if (!client_id || !client_secret) {
      return new Response(
        JSON.stringify({ error: 'Zoho OAuth credentials not configured. Please reconnect your Zoho account.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = connection.access_token;

    const apiDomain = zoho_region === 'com' ? 'www.zohoapis.com' :
                     zoho_region === 'in' ? 'www.zohoapis.in' :
                     zoho_region === 'au' ? 'www.zohoapis.com.au' :
                     zoho_region === 'jp' ? 'www.zohoapis.jp' :
                     'www.zohoapis.eu';

    let response = await fetch(
      `https://${apiDomain}/crm/v2/${module}?ids=${record_id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    if (response.status === 401) {
      accessToken = await refreshToken(supabase, user_id, connection.refresh_token, client_id, client_secret, zoho_region);
      response = await fetch(
        `https://${apiDomain}/crm/v2/${module}?ids=${record_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('Zoho API error:', result);
      return new Response(
        JSON.stringify({ error: result.message || 'Failed to delete record', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleted record ${record_id} from ${module}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data?.[0],
        module,
        record_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
