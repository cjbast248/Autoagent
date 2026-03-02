import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

async function refreshToken(supabase: any, user_id: string, refresh_token: string, client_id: string, client_secret: string, zoho_region: string = 'eu') {
  console.log('[Zoho] Refreshing token for user:', user_id);
  console.log('[Zoho] Has refresh_token:', !!refresh_token);
  console.log('[Zoho] Has clientId:', !!client_id);
  console.log('[Zoho] Has clientSecret:', !!client_secret);
  console.log('[Zoho] Region:', zoho_region);

  // Build accounts domain based on region
  const accountsDomain = zoho_region === 'com' ? 'accounts.zoho.com' :
                        zoho_region === 'in' ? 'accounts.zoho.in' :
                        zoho_region === 'au' ? 'accounts.zoho.com.au' :
                        zoho_region === 'jp' ? 'accounts.zoho.jp' :
                        'accounts.zoho.eu';

  const tokenResponse = await fetch(
    `https://${accountsDomain}/oauth/v2/token?refresh_token=${refresh_token}&client_id=${client_id}&client_secret=${client_secret}&grant_type=refresh_token`,
    { method: 'POST' }
  );

  console.log('[Zoho] Token refresh response status:', tokenResponse.status);

  const responseText = await tokenResponse.text();
  console.log('[Zoho] Token refresh response:', responseText.substring(0, 200));

  let tokenData;
  try {
    tokenData = JSON.parse(responseText);
  } catch (e) {
    console.error('[Zoho] Failed to parse token response:', e);
    throw new Error(`Failed to parse token response: ${responseText.substring(0, 100)}`);
  }

  if (tokenData.access_token) {
    console.log('[Zoho] Successfully refreshed token');
    await supabase
      .from('zoho_crm_connections')
      .update({ access_token: tokenData.access_token })
      .eq('user_id', user_id);

    return tokenData.access_token;
  }

  console.error('[Zoho] No access_token in response:', tokenData);
  throw new Error(`Failed to refresh token: ${JSON.stringify(tokenData)}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, module = 'Leads', filters = [], limit = 50, page = 1 } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Getting records from ${module} for user ${user_id}, limit: ${limit}`);

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

    // Build API URL based on region
    const apiDomain = zoho_region === 'com' ? 'www.zohoapis.com' :
                     zoho_region === 'in' ? 'www.zohoapis.in' :
                     zoho_region === 'au' ? 'www.zohoapis.com.au' :
                     zoho_region === 'jp' ? 'www.zohoapis.jp' :
                     'www.zohoapis.eu';

    // Build URL with pagination - use records endpoint by default
    let apiUrl = `https://${apiDomain}/crm/v2/${module}?per_page=${Math.min(limit, 200)}&page=${page}`;

    console.log('Filters received:', JSON.stringify(filters));

    // Only use search endpoint if we have valid filters with all required fields
    const validFilters = Array.isArray(filters) ? filters.filter((f: any) => 
      f && f.field && f.operator && f.value !== undefined && f.value !== ''
    ) : [];

    if (validFilters.length > 0) {
      // Build COQL criteria
      const criteriaArr = validFilters.map((f: any) => {
        const value = String(f.value).replace(/"/g, '\\"');
        switch (f.operator) {
          case 'equals':
            return `(${f.field}:equals:${value})`;
          case 'not_equals':
            return `(${f.field}:not_equals:${value})`;
          case 'contains':
            return `(${f.field}:contains:${value})`;
          case 'starts_with':
            return `(${f.field}:starts_with:${value})`;
          case 'ends_with':
            return `(${f.field}:ends_with:${value})`;
          case 'greater_than':
            return `(${f.field}:greater_than:${value})`;
          case 'less_than':
            return `(${f.field}:less_than:${value})`;
          default:
            return `(${f.field}:equals:${value})`;
        }
      });
      
      const criteria = criteriaArr.join('and');
      console.log('Using search endpoint with criteria:', criteria);
      apiUrl = `https://${apiDomain}/crm/v2/${module}/search?criteria=${encodeURIComponent(criteria)}&per_page=${Math.min(limit, 200)}`;
    } else {
      console.log('Using records endpoint (no valid filters)');
    }

    let response = await fetch(apiUrl, {
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
    });

    if (response.status === 401) {
      accessToken = await refreshToken(supabase, user_id, connection.refresh_token, client_id, client_secret, zoho_region);
      response = await fetch(apiUrl, {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      });
    }

    const data = await response.json();

    if (!response.ok && response.status !== 204) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to get records' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const records = data.data || [];
    const info = data.info || {};

    console.log(`Found ${records.length} records from ${module}`);

    return new Response(
      JSON.stringify({
        data: records,
        module,
        count: records.length,
        more_records: info.more_records || false,
        page: info.page || page,
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
