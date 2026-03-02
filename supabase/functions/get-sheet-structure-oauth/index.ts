import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/google-sheets-cors.ts';
import { createErrorResponse, createSuccessResponse, GOOGLE_SHEETS_ERRORS, mapGoogleError } from '../_shared/google-sheets-errors.ts';
// Rate limiting temporarily disabled
// import { checkRateLimit, createRateLimitClient } from '../_shared/google-sheets-rate-limit.ts';
import { getValidAccessToken, createAdminClient } from '../_shared/google-sheets-token-service.ts';
import { validateSpreadsheetId, validateSheetName } from '../_shared/google-sheets-validation.ts';

Deno.serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(requestOrigin);
  }

  try {
    // Get user from Authorization header or query param
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

    // Parse query parameters
    const url = new URL(req.url);

    // Fallback to query param for backwards compatibility
    if (!userId) {
      userId = url.searchParams.get('user_id');
    }

    const spreadsheetId = url.searchParams.get('spreadsheet_id');
    const sheetName = url.searchParams.get('sheet_name');

    // Validate user
    if (!userId) {
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.UNAUTHORIZED, requestOrigin);
    }

    // Validate spreadsheet ID
    if (!spreadsheetId) {
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.MISSING_SPREADSHEET_ID, requestOrigin);
    }

    const spreadsheetValidation = validateSpreadsheetId(spreadsheetId);
    if (!spreadsheetValidation.valid) {
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.INVALID_SPREADSHEET_ID, requestOrigin, spreadsheetValidation.error);
    }

    // Validate sheet name if provided
    if (sheetName) {
      const sheetValidation = validateSheetName(sheetName);
      if (!sheetValidation.valid) {
        return createErrorResponse(GOOGLE_SHEETS_ERRORS.INVALID_INPUT, requestOrigin, sheetValidation.error);
      }
    }

    // Rate limiting - temporarily disabled
    // const rateLimitClient = createRateLimitClient();
    // const rateLimit = await checkRateLimit(rateLimitClient, userId, 'get-structure');
    // if (!rateLimit.allowed) {
    //   return createErrorResponse(GOOGLE_SHEETS_ERRORS.RATE_LIMITED, requestOrigin);
    // }

    // Get valid access token
    const supabaseAdmin = createAdminClient();
    const tokenData = await getValidAccessToken(supabaseAdmin, userId);

    if (!tokenData) {
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.NO_CONNECTION, requestOrigin);
    }

    console.log('Fetching spreadsheet structure for:', spreadsheetId);
    console.log('Token available, accessToken length:', tokenData.accessToken?.length);

    // First, verify access to the spreadsheet
    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId`;
    console.log('Testing spreadsheet access...');
    const testResponse = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
      },
    });

    console.log('Test response status:', testResponse.status);

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({ code: testResponse.status }));
      console.log('Spreadsheet access test FAILED:', testResponse.status, JSON.stringify(errorData));
      return createErrorResponse(mapGoogleError(errorData), requestOrigin);
    }

    console.log('Spreadsheet access OK');

    // Get spreadsheet metadata (sheet names)
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
      },
    });

    if (!metadataResponse.ok) {
      const errorData = await metadataResponse.json().catch(() => ({ code: metadataResponse.status }));
      console.error('Failed to fetch spreadsheet metadata:', errorData);
      return createErrorResponse(mapGoogleError(errorData), requestOrigin);
    }

    const metadata = await metadataResponse.json();
    const sheets = metadata.sheets?.map((s: { properties: { sheetId: number; title: string } }) => ({
      sheetId: String(s.properties.sheetId),
      title: s.properties.title
    })) || [];

    if (sheets.length === 0) {
      return createErrorResponse(GOOGLE_SHEETS_ERRORS.SHEET_NOT_FOUND, requestOrigin, 'No sheets found in this spreadsheet');
    }

    console.log('Available sheets:', JSON.stringify(sheets.map((s: { title: string }) => s.title)));
    console.log('Requested sheet name:', JSON.stringify(sheetName));

    // Determine which sheet to use - fall back to first sheet if requested one not found
    const targetSheet = sheetName
      ? (sheets.some((s: { title: string }) => s.title === sheetName) ? sheetName : sheets[0].title)
      : sheets[0].title;

    if (sheetName && targetSheet !== sheetName) {
      console.log(`Requested sheet "${sheetName}" not found, using: "${targetSheet}"`);
    }

    console.log('Using sheet:', targetSheet);

    // Get sheet data (headers and preview)
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheet)}!A1:Z10`;
    const dataResponse = await fetch(dataUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
      },
    });

    if (!dataResponse.ok) {
      const errorData = await dataResponse.json().catch(() => ({ code: dataResponse.status }));
      console.error('Failed to fetch sheet data:', errorData);
      return createErrorResponse(mapGoogleError(errorData), requestOrigin);
    }

    const sheetData = await dataResponse.json();
    const rows = sheetData.values || [];

    // Get headers (column names) from first row
    const headers = rows.length > 0 ? rows[0] : [];
    const previewData = rows.slice(1, 6);

    // Generate column letters for reference (A, B, C, ..., AA, AB, etc.)
    const columnLetters = headers.map((_: unknown, index: number) => {
      let column = '';
      let num = index;
      while (num >= 0) {
        column = String.fromCharCode(65 + (num % 26)) + column;
        num = Math.floor(num / 26) - 1;
      }
      return column;
    });

    return createSuccessResponse({
      success: true,
      sheets,
      currentSheet: targetSheet,
      columns: headers,
      columnLetters,
      headers,
      previewData,
      totalColumns: headers.length,
    }, requestOrigin);

  } catch (error) {
    console.error('Error in get-sheet-structure-oauth:', error);
    return createErrorResponse(GOOGLE_SHEETS_ERRORS.INTERNAL_ERROR, requestOrigin);
  }
});
