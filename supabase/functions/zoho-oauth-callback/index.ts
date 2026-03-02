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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Log incoming request details
    console.log('📥 Zoho OAuth Callback received:', {
      method: req.method,
      fullUrl: req.url,
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      code: code ? `${code.substring(0, 15)}...` : 'NOT PRESENT',
      state: state || 'NOT PRESENT',
      error: error || 'none',
      errorDescription: errorDescription || 'none'
    });

    if (error) {
      console.error('❌ Zoho returned error:', { error, errorDescription });
      throw new Error(`Zoho OAuth error: ${error} - ${errorDescription}`);
    }

    if (!code || !state) {
      console.error('❌ Missing required parameters:', { hasCode: !!code, hasState: !!state });
      throw new Error('Missing code or state parameter');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify state
    console.log('🔍 Verifying state in database...', { searchingForState: state });

    // First, let's see ALL records in the table for debugging
    const { data: allRecords, error: allRecordsError } = await supabase
      .from('zoho_crm_connections')
      .select('user_id, oauth_state, status, zoho_region, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!allRecordsError && allRecords) {
      console.log('📋 Recent zoho_crm_connections records in database:', {
        count: allRecords.length,
        records: allRecords.map(r => ({
          user_id: r.user_id?.substring(0, 15) + '...',
          oauth_state: r.oauth_state || 'NULL',
          status: r.status,
          region: r.zoho_region,
          created_at: r.created_at
        }))
      });
    }

    const { data: connection, error: stateError } = await supabase
      .from('zoho_crm_connections')
      .select('*')
      .eq('oauth_state', state)
      .maybeSingle();

    if (stateError) {
      console.error('❌ Database error during state verification:', stateError.message);
      throw new Error('Database error during state verification');
    }

    if (!connection) {
      console.error('❌ State verification failed: No connection found with this state');
      console.error('❌ Searched for state:', state);
      console.error('❌ Available states in database:', allRecords?.map(r => r.oauth_state).filter(s => s !== null) || []);
      throw new Error('Invalid state parameter');
    }

    console.log('✅ State verified for user:', connection.user_id);

    // Get user's OAuth credentials from the connection record
    const clientId = connection.client_id;
    const clientSecret = connection.client_secret;
    const zohoRegion = connection.zoho_region || 'eu';
    const redirectUri = Deno.env.get('ZOHO_REDIRECT_URI');

    if (!clientId || !clientSecret) {
      console.error('❌ Missing client credentials in database');
      throw new Error('OAuth credentials not found. Please reconnect.');
    }

    console.log('🔄 Exchanging code for tokens...', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri,
      redirectUri: redirectUri,
      region: zohoRegion
    });

    // Build token URL based on region
    const accountsDomain = zohoRegion === 'com' ? 'accounts.zoho.com' :
                          zohoRegion === 'in' ? 'accounts.zoho.in' :
                          zohoRegion === 'au' ? 'accounts.zoho.com.au' :
                          zohoRegion === 'jp' ? 'accounts.zoho.jp' :
                          'accounts.zoho.eu';

    const tokenResponse = await fetch(`https://${accountsDomain}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri!,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Zoho token exchange error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText: errorText
      });
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    console.log('✅ Tokens received successfully:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      accessTokenLength: tokens.access_token?.length || 0,
      refreshTokenLength: tokens.refresh_token?.length || 0
    });

    // Log the actual tokens for debugging (truncated for security)
    console.log('🔑 Token values:', {
      access_token: tokens.access_token ? `${tokens.access_token.substring(0, 20)}...` : 'MISSING',
      refresh_token: tokens.refresh_token ? `${tokens.refresh_token.substring(0, 20)}...` : 'MISSING'
    });

    // Get Zoho user info
    let zohoUserInfo = null;
    try {
      console.log('👤 Fetching Zoho user info...');

      // Build API URL based on region
      const apiDomain = zohoRegion === 'com' ? 'www.zohoapis.com' :
                       zohoRegion === 'in' ? 'www.zohoapis.in' :
                       zohoRegion === 'au' ? 'www.zohoapis.com.au' :
                       zohoRegion === 'jp' ? 'www.zohoapis.jp' :
                       'www.zohoapis.eu';

      const userInfoResponse = await fetch(`https://${apiDomain}/crm/v2/users?type=CurrentUser`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${tokens.access_token}`,
        },
      });

      if (userInfoResponse.ok) {
        const userInfoData = await userInfoResponse.json();
        if (userInfoData.users && userInfoData.users.length > 0) {
          const user = userInfoData.users[0];
          zohoUserInfo = {
            email: user.email,
            org_name: user.profile?.name || user.full_name,
            org_id: user.id,
          };
          console.log('✅ Retrieved Zoho user info:', zohoUserInfo);
        }
      }
    } catch (userInfoError) {
      console.error('⚠️ Failed to fetch Zoho user info:', userInfoError);
      // Continue anyway, user info is optional
    }

    // Store tokens and user info
    console.log('💾 Storing tokens and user info in database...');

    // Calculate token expiry (default to 1 hour if not provided by Zoho)
    const expiresIn = tokens.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('zoho_crm_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        status: 'connected',
        oauth_state: null,
        zoho_email: zohoUserInfo?.email || null,
        zoho_org_name: zohoUserInfo?.org_name || null,
        zoho_org_id: zohoUserInfo?.org_id || null,
      })
      .eq('user_id', connection.user_id);

    if (updateError) {
      console.error('❌ Failed to store tokens:', updateError);
      throw new Error('Failed to store tokens in database');
    }

    console.log('✅ Zoho OAuth callback successful for user:', connection.user_id);

    // Redirect back to app
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${Deno.env.get('APP_URL')}/account/integrations?zoho=success`,
      },
    });
  } catch (error) {
    console.error('Zoho OAuth callback error:', error);
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${Deno.env.get('APP_URL')}/account/integrations?zoho=error`,
      },
    });
  }
});
