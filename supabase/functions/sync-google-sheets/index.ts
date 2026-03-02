import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface SyncRequest {
  integration_id: string;
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

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { integration_id } = await req.json() as SyncRequest;

    if (!integration_id) {
      throw new Error('integration_id is required');
    }

    console.log(`Starting sync for integration: ${integration_id}`);

    // Get integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('google_sheets_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integration not found');
    }

    if (!integration.is_active) {
      throw new Error('Integration is not active');
    }

    console.log(`Integration found: ${integration.spreadsheet_name}`);

    // Get conversation data to export
    const { data: conversations, error: conversationsError } = await supabaseClient
      .from('call_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (conversationsError) {
      throw new Error(`Failed to fetch conversations: ${conversationsError.message}`);
    }

    console.log(`Found ${conversations?.length || 0} conversations to export`);

    // Prepare data for Google Sheets
    const rows = conversations?.map(conv => [
      new Date(conv.created_at).toLocaleString('ro-RO'),
      conv.contact_name || 'Necunoscut',
      conv.phone_number || '',
      conv.call_status || '',
      conv.duration_seconds ? Math.round(conv.duration_seconds / 60) : 0,
      conv.cost_usd || 0,
      conv.summary || '',
      conv.analysis_conclusion || ''
    ]) || [];

    // Add header row
    const data = [
      ['Data', 'Contact', 'Telefon', 'Status', 'Durata (min)', 'Cost (USD)', 'Rezumat', 'Concluzie'],
      ...rows
    ];

    console.log(`Prepared ${data.length - 1} rows for export`);

    // Export to Google Sheets using Google Sheets API
    const apiKey = integration.credentials.api_key;
    const spreadsheetId = integration.spreadsheet_id;
    const sheetName = integration.sheet_name || 'Kalina Data';

    // Clear existing data first
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:clear?key=${apiKey}`;
    
    const clearResponse = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!clearResponse.ok) {
      const errorText = await clearResponse.text();
      console.error('Clear error:', errorText);
      throw new Error(`Failed to clear sheet: ${clearResponse.statusText}`);
    }

    console.log('Sheet cleared successfully');

    // Update with new data
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?valueInputOption=RAW&key=${apiKey}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: sheetName,
        values: data,
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Update error:', errorText);
      throw new Error(`Failed to update sheet: ${updateResponse.statusText}`);
    }

    const updateResult = await updateResponse.json();
    console.log('Sheet updated successfully:', updateResult);

    // Update last_sync_at timestamp
    const { error: updateError } = await supabaseClient
      .from('google_sheets_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration_id);

    if (updateError) {
      console.error('Failed to update last_sync_at:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        rows_exported: rows.length,
        spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in sync-google-sheets:', error);
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
