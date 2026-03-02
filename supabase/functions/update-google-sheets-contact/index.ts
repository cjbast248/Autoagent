import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface UpdateRequest {
  integration_id: string;
  contact_id: string;
  call_result: {
    status: string;
    duration?: number;
    cost?: number;
    summary?: string;
    audio_url?: string;
  };
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

    const { integration_id, contact_id, call_result } = await req.json() as UpdateRequest;

    if (!integration_id || !contact_id || !call_result) {
      throw new Error('integration_id, contact_id, and call_result are required');
    }

    console.log(`Updating contact ${contact_id} in Google Sheets`);

    // Get contact details
    const { data: contact, error: contactError } = await supabaseClient
      .from('google_sheets_contacts')
      .select('*')
      .eq('id', contact_id)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) {
      throw new Error('Contact not found');
    }

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

    const { spreadsheet_id, sheet_name, column_mapping, credentials } = integration;
    const apiKey = credentials.api_key;
    const rowNumber = contact.row_number;

    console.log(`Updating row ${rowNumber} in sheet ${sheet_name}`);

    // Build update requests based on column mapping
    const updates: any[] = [];

    if (column_mapping.status_column) {
      updates.push({
        range: `${sheet_name}!${column_mapping.status_column}${rowNumber}`,
        values: [[call_result.status || 'completed']],
      });
    }

    if (column_mapping.duration_column && call_result.duration !== undefined) {
      updates.push({
        range: `${sheet_name}!${column_mapping.duration_column}${rowNumber}`,
        values: [[call_result.duration]],
      });
    }

    if (column_mapping.cost_column && call_result.cost !== undefined) {
      updates.push({
        range: `${sheet_name}!${column_mapping.cost_column}${rowNumber}`,
        values: [[call_result.cost]],
      });
    }

    if (column_mapping.summary_column && call_result.summary) {
      updates.push({
        range: `${sheet_name}!${column_mapping.summary_column}${rowNumber}`,
        values: [[call_result.summary]],
      });
    }

    if (column_mapping.audio_column && call_result.audio_url) {
      updates.push({
        range: `${sheet_name}!${column_mapping.audio_column}${rowNumber}`,
        values: [[call_result.audio_url]],
      });
    }

    if (updates.length === 0) {
      console.log('No columns configured for update');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No columns configured for update',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Batch update Google Sheets
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values:batchUpdate?key=${apiKey}`;
    
    const batchResponse = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: updates,
        valueInputOption: 'RAW',
      }),
    });

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      console.error('Batch update error:', errorText);
      throw new Error(`Failed to update sheet: ${batchResponse.statusText}`);
    }

    // Update contact in database
    const { error: updateError } = await supabaseClient
      .from('google_sheets_contacts')
      .update({
        call_status: call_result.status,
        call_result,
        last_call_at: new Date().toISOString(),
      })
      .eq('id', contact_id);

    if (updateError) {
      console.error('Failed to update contact in database:', updateError);
    }

    console.log(`Successfully updated row ${rowNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        row_updated: rowNumber,
        updates_count: updates.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in update-google-sheets-contact:', error);
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
