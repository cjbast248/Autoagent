import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ListFilesRequest {
  api_key: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { api_key } = await req.json() as ListFilesRequest;

    if (!api_key) {
      throw new Error('api_key is required');
    }

    console.log('Fetching Google Sheets files list...');

    // List all spreadsheets using Google Drive API
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,createdTime,modifiedTime,webViewLink)&key=${api_key}`;
    
    const response = await fetch(listUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Drive API error:', errorText);
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.files?.length || 0} spreadsheet files`);

    return new Response(
      JSON.stringify({
        success: true,
        files: data.files || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in list-google-sheets-files:', error);
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
