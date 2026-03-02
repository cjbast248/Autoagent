import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/google-sheets-cors.ts";
import { createErrorResponse, createSuccessResponse, GOOGLE_SHEETS_ERRORS } from "../_shared/google-sheets-errors.ts";

Deno.serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(requestOrigin);
  }

  try {
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.UNAUTHORIZED, requestOrigin);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.UNAUTHORIZED, requestOrigin);
    }

    // Rate limiting - temporarily disabled due to DB function mismatch
    // TODO: Re-enable after fixing check_rate_limit function in database
    // const rateLimitClient = createRateLimitClient();
    // const rateLimit = await checkRateLimit(rateLimitClient, user.id, 'oauth-init');
    // if (!rateLimit.allowed) {
    //   return createErrorResponse(GOOGLE_SHEETS_ERRORS.RATE_LIMITED, requestOrigin);
    // }

    // Get Google OAuth credentials from environment
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || Deno.env.get('GOOGLE_SHEETS_CLIENT_ID');
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID not configured');
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.CONFIG_ERROR, requestOrigin, 'Google Client ID not configured');
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID() + '-' + crypto.randomUUID().substring(0, 8);

    // Store state in database using service_role (bypasses RLS timeout issues)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: stateError } = await serviceClient
      .from('google_sheets_oauth_states')
      .insert({
        user_id: user.id,
        state: state,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.INTERNAL_ERROR, requestOrigin, 'Failed to initialize OAuth flow');
    }

    // Get redirect URI from env or construct it
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') ||
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-sheets-oauth-callback`;

    // Google Sheets specific scopes - request minimal required access
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log('Generated Google Sheets OAuth URL for user:', user.id);

    return createSuccessResponse({
      success: true,
      authUrl: authUrl.toString()
    }, requestOrigin);

  } catch (error) {
    console.error('Error in google-sheets-oauth-init:', error);
    return createErrorResponse(GOOGLE_SHEETS_ERRORS.INTERNAL_ERROR, requestOrigin);
  }
});
