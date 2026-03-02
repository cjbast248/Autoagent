import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/google-sheets-cors.ts';
import { createErrorResponse, createSuccessResponse, GOOGLE_SHEETS_ERRORS, mapGoogleError } from '../_shared/google-sheets-errors.ts';
// Rate limiting temporarily disabled
// import { checkRateLimit, createRateLimitClient } from '../_shared/google-sheets-rate-limit.ts';
import { getValidAccessToken, createAdminClient, logAuditEvent } from '../_shared/google-sheets-token-service.ts';

Deno.serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(requestOrigin);
  }

  try {
    // Get user from Authorization header (preferred) or fallback to query param
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (!userError && user) {
        userId = user.id;
      }
    }

    // Fallback to query param for backwards compatibility
    if (!userId) {
      const url = new URL(req.url);
      userId = url.searchParams.get('user_id');
    }

    if (!userId) {
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.UNAUTHORIZED, requestOrigin);
    }

    // Rate limiting - temporarily disabled
    // const rateLimitClient = createRateLimitClient();
    // const rateLimit = await checkRateLimit(rateLimitClient, userId, 'list-sheets');
    // if (!rateLimit.allowed) {
    //   return createErrorResponse(GOOGLE_SHEETS_ERRORS.RATE_LIMITED, requestOrigin);
    // }

    // Get valid access token (handles refresh automatically)
    const supabaseAdmin = createAdminClient();
    const tokenData = await getValidAccessToken(supabaseAdmin, userId);

    if (!tokenData) {
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.NO_CONNECTION, requestOrigin);
    }

    console.log('Fetching Google Sheets files for user:', userId);

    // Build Drive API request - list only spreadsheets
    const params = new URLSearchParams({
      q: "(mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') and trashed=false",
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: '100',
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
    });

    const driveUrl = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;

    const response = await fetch(driveUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ code: response.status }));
      console.error('Google Drive API error:', response.status, errorData);

      const mappedError = mapGoogleError(errorData);
      await logAuditEvent(supabaseAdmin, userId, 'list_sheets_failed', {
        error: mappedError.code,
        status: response.status
      });

      return createErrorResponse(mappedError, requestOrigin);
    }

    const data = await response.json();
    console.log('Google Drive API success! Files count:', data.files?.length || 0);

    return createSuccessResponse({
      success: true,
      files: data.files || [],
      googleEmail: tokenData.googleEmail,
    }, requestOrigin);

  } catch (error) {
    console.error('Error in list-google-sheets-oauth:', error);
    return createErrorResponse(GOOGLE_SHEETS_ERRORS.INTERNAL_ERROR, requestOrigin);
  }
});
