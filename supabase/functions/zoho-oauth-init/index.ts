import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { user_id, client_id, client_secret, zoho_region } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    if (!client_id || !client_secret) {
      throw new Error('client_id and client_secret are required');
    }

    // Zoho OAuth configuration
    const clientId = client_id;
    const redirectUri = Deno.env.get('ZOHO_REDIRECT_URI');
    const scope = 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL';
    const region = zoho_region || 'eu'; // Default to EU

    // Log received region for debugging
    console.log('🌍 Received zoho_region from request:', zoho_region);
    console.log('🌍 Using region:', region);

    // Log environment variables (masked for security)
    console.log('🔧 Zoho OAuth Init - Environment Check:', {
      clientId: clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET',
      redirectUri: redirectUri || 'NOT SET',
      hasClientId: !!clientId,
      hasRedirectUri: !!redirectUri,
      redirectUriLength: redirectUri?.length || 0
    });

    if (!clientId || !redirectUri) {
      console.error('❌ Missing Zoho OAuth credentials:', {
        hasClientId: !!clientId,
        hasRedirectUri: !!redirectUri
      });
      throw new Error('Zoho OAuth credentials not configured');
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in database for verification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('💾 Attempting database upsert with:', {
      user_id,
      client_id: clientId.substring(0, 10) + '...',
      zoho_region: region,
      oauth_state: state,
      status: 'pending'
    });

    const { data: upsertData, error: upsertError } = await supabase
      .from('zoho_crm_connections')
      .upsert({
        user_id,
        client_id: clientId,
        client_secret: client_secret,
        zoho_region: region,
        oauth_state: state,
        status: 'pending'
      }, {
        onConflict: 'user_id'
      })
      .select();

    // Log database upsert result with full details
    if (upsertError) {
      console.error('❌ Database upsert failed:', upsertError);
      throw new Error(`Failed to save OAuth state: ${upsertError.message}`);
    }

    if (!upsertData || upsertData.length === 0) {
      console.error('❌ Database upsert returned no data');
      throw new Error('Failed to save OAuth state: No data returned');
    }

    console.log('✅ Database upsert successful:', {
      recordCount: upsertData.length,
      savedState: upsertData[0]?.oauth_state,
      savedUserId: upsertData[0]?.user_id,
      savedRegion: upsertData[0]?.zoho_region,
      savedStatus: upsertData[0]?.status,
      stateMatches: upsertData[0]?.oauth_state === state
    });

    // Verify the record was actually saved by reading it back
    const { data: verifyData, error: verifyError } = await supabase
      .from('zoho_crm_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('oauth_state', state)
      .maybeSingle();

    if (verifyError) {
      console.error('❌ Verification query failed:', verifyError);
    } else if (!verifyData) {
      console.error('❌ CRITICAL: Record was not found immediately after upsert!');
      console.error('This indicates a database transaction or RLS policy issue');
    } else {
      console.log('✅ Verification successful: Record exists in database', {
        user_id: verifyData.user_id,
        oauth_state: verifyData.oauth_state,
        status: verifyData.status
      });
    }

    // Build authorization URL based on region
    const accountsDomain = region === 'com' ? 'accounts.zoho.com' :
                          region === 'in' ? 'accounts.zoho.in' :
                          region === 'au' ? 'accounts.zoho.com.au' :
                          region === 'jp' ? 'accounts.zoho.jp' :
                          'accounts.zoho.eu'; // Default to EU

    const authUrl = new URL(`https://${accountsDomain}/oauth/v2/auth`);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    // Log the complete generated URL
    const generatedUrl = authUrl.toString();
    console.log('✅ Generated Zoho OAuth URL for user:', user_id);
    console.log('🔗 Full Authorization URL:', generatedUrl);
    console.log('📋 URL Parameters:', {
      scope: authUrl.searchParams.get('scope'),
      client_id: authUrl.searchParams.get('client_id')?.substring(0, 10) + '...',
      response_type: authUrl.searchParams.get('response_type'),
      access_type: authUrl.searchParams.get('access_type'),
      redirect_uri: authUrl.searchParams.get('redirect_uri'),
      state: authUrl.searchParams.get('state')
    });

    return new Response(
      JSON.stringify({ 
        authorization_url: generatedUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Zoho OAuth init error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
