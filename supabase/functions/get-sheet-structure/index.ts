import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface GetStructureRequest {
  spreadsheet_id: string;
  api_key: string;
  sheet_name?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try to read auth header (optional)
    const authHeader = req.headers.get('Authorization');
    let userId = 'anonymous';

    if (authHeader) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (user && !userError) userId = user.id;
        else console.warn('Auth present but user not resolved:', userError?.message);
      } catch (e) {
        console.warn('Auth resolution failed, proceeding public:', (e as Error)?.message);
      }
    } else {
      console.log('No auth header, proceeding as public request');
    }

    const { spreadsheet_id, api_key, sheet_name } = await req.json() as GetStructureRequest;

    if (!spreadsheet_id || !api_key) {
      throw new Error('spreadsheet_id and api_key are required');
    }

    // Validate spreadsheet ID format
    const spreadsheetIdRegex = /^[a-zA-Z0-9-_]{20,}$/;
    if (!spreadsheetIdRegex.test(spreadsheet_id)) {
      throw new Error('Invalid spreadsheet ID format. Please check the URL or ID.');
    }

    console.log(`Getting structure for spreadsheet: ${spreadsheet_id}`);

    // First, test the API key with a simple request
    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}?fields=spreadsheetId&key=${api_key}`;
    const testResponse = await fetch(testUrl);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('API Key test failed:', errorText);
      
      if (testResponse.status === 403) {
        throw new Error('API Key invalid or expired. Please check your Google Cloud Console API key.');
      } else if (testResponse.status === 404) {
        throw new Error('Spreadsheet not found. Please verify the spreadsheet ID and sharing settings.');
      } else if (testResponse.status === 400) {
        throw new Error('Bad request. The spreadsheet might not be a valid Google Sheets document.');
      }
      throw new Error(`API request failed: ${testResponse.statusText}`);
    }

    // First, get spreadsheet metadata to list all sheets
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}?key=${api_key}`;
    const metadataResponse = await fetch(metadataUrl);

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('Metadata error:', errorText);
      
      if (metadataResponse.status === 403) {
        throw new Error('Access denied. Make sure the spreadsheet is shared publicly or with your service account.');
      } else if (metadataResponse.status === 404) {
        throw new Error('Spreadsheet not found. Please check if the ID is correct and the file exists.');
      } else if (metadataResponse.status === 400) {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message?.includes('not supported')) {
          throw new Error('This is not a valid Google Sheets document. Please ensure you are using a Google Sheets file.');
        }
        throw new Error('Invalid request. Please check the spreadsheet ID.');
      }
      throw new Error(`Failed to fetch spreadsheet metadata: ${metadataResponse.statusText}`);
    }

    const metadata = await metadataResponse.json();
    const sheets = metadata.sheets?.map((s: any) => s.properties.title) || [];
    
    console.log(`Found sheets: ${sheets.join(', ')}`);

    // Use first sheet if no sheet_name provided
    const targetSheet = sheet_name || sheets[0];
    
    if (!targetSheet) {
      throw new Error('No sheets found in spreadsheet');
    }

    // Get data from the target sheet (first 10 rows)
    const range = `${targetSheet}!A1:Z10`;
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(range)}?key=${api_key}`;
    
    const dataResponse = await fetch(dataUrl);

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text();
      console.error('Data fetch error:', errorText);
      
      if (dataResponse.status === 400) {
        throw new Error(`Invalid sheet range or name: ${targetSheet}. Please verify the sheet name.`);
      }
      throw new Error(`Failed to fetch sheet data: ${dataResponse.statusText}`);
    }

    const dataResult = await dataResponse.json();
    const rows = dataResult.values || [];

    if (rows.length === 0) {
      throw new Error('Sheet is empty');
    }

    const headers = rows[0] || [];
    const preview = rows.slice(1, 6); // Next 5 rows for preview
    
    // Generate column letters (A, B, C, ...)
    const columns = headers.map((_: any, index: number) => {
      return String.fromCharCode(65 + index);
    });

    console.log(`Sheet structure: ${columns.length} columns, ${preview.length} preview rows`);

    return new Response(
      JSON.stringify({
        success: true,
        sheets,
        current_sheet: targetSheet,
        headers,
        columns,
        preview,
        total_columns: columns.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-sheet-structure:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
