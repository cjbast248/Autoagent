import { createClient } from "npm:@supabase/supabase-js@2";
import {
  exchangeCodeForTokens,
  storeEncryptedTokens,
  logAuditEvent
} from "../_shared/google-sheets-token-service.ts";
import { validateStateToken } from "../_shared/google-sheets-validation.ts";

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Get app URL from environment with fallback
    const appUrl = Deno.env.get('APP_URL') ||
                   Deno.env.get('ALLOWED_ORIGINS')?.split(',')[0] ||
                   'https://app.agentauto.app';

    const redirectBase = `${appUrl}/account/integrations/google-sheets`;

    // Handle Google OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return Response.redirect(`${redirectBase}?error=${encodeURIComponent(error)}`);
    }

    // Validate required params
    if (!code || !state) {
      console.error('Missing code or state');
      return Response.redirect(`${redirectBase}?error=missing_params`);
    }

    // Validate state format
    const stateValidation = validateStateToken(state);
    if (!stateValidation.valid) {
      console.error('Invalid state format:', stateValidation.error);
      return Response.redirect(`${redirectBase}?error=invalid_state`);
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate state and get user_id
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from('google_sheets_oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .single();

    if (stateError || !stateData) {
      console.error('Invalid or expired state:', stateError);
      return Response.redirect(`${redirectBase}?error=invalid_state`);
    }

    // Check if state has expired
    if (new Date(stateData.expires_at) < new Date()) {
      console.error('State has expired');
      await supabaseAdmin.from('google_sheets_oauth_states').delete().eq('state', state);
      return Response.redirect(`${redirectBase}?error=expired_state`);
    }

    const userId = stateData.user_id;

    // Delete used state immediately (prevent replay attacks)
    await supabaseAdmin.from('google_sheets_oauth_states').delete().eq('state', state);

    // Get redirect URI
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') ||
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-sheets-oauth-callback`;

    // Exchange code for tokens using centralized service
    const tokenResult = await exchangeCodeForTokens(code, redirectUri);

    if (!tokenResult.success || !tokenResult.tokens) {
      console.error('Token exchange failed:', tokenResult.error);
      await logAuditEvent(supabaseAdmin, userId, 'oauth_token_exchange_failed', { error: tokenResult.error });
      return Response.redirect(`${redirectBase}?error=token_exchange_failed`);
    }

    console.log('Token exchange successful for user:', userId);

    // Store encrypted tokens
    const stored = await storeEncryptedTokens(supabaseAdmin, userId, tokenResult.tokens);

    if (!stored) {
      console.error('Failed to store connection for user:', userId);
      await logAuditEvent(supabaseAdmin, userId, 'oauth_storage_failed', {});
      return Response.redirect(`${redirectBase}?error=storage_failed`);
    }

    // Log successful connection
    await logAuditEvent(supabaseAdmin, userId, 'google_sheets_connected', {
      google_email: tokenResult.tokens.googleEmail,
    });

    console.log('Google Sheets connection stored successfully for user:', userId);

    return Response.redirect(`${redirectBase}?success=true`);

  } catch (error) {
    console.error('Error in google-sheets-oauth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const appUrl = Deno.env.get('APP_URL') ||
                   Deno.env.get('ALLOWED_ORIGINS')?.split(',')[0] ||
                   'https://app.agentauto.app';
    return Response.redirect(`${appUrl}/account/integrations/google-sheets?error=${encodeURIComponent(errorMessage)}`);
  }
});
