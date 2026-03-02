import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ImportRequest {
  integration_id: string;
  start_row?: number;
  end_row?: number;
}

function getColumnValue(row: any[], columnLetter: string): string | null {
  if (!columnLetter) return null;
  const index = columnLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
  return row[index] || null;
}

function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // Basic validation: contains digits and common phone chars
  return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 9;
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

    const { integration_id, start_row = 2, end_row } = await req.json() as ImportRequest;

    if (!integration_id) {
      throw new Error('integration_id is required');
    }

    console.log(`Starting import for integration: ${integration_id}`);

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

    if (!spreadsheet_id || !apiKey) {
      throw new Error('Invalid integration configuration');
    }

    console.log(`Fetching data from sheet: ${sheet_name}`);

    // Read data from Google Sheets
    const range = `${sheet_name}!A${start_row}:Z${end_row || 1000}`;
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    
    const response = await fetch(dataUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch sheet data:', errorText);
      throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
    }

    const dataResult = await response.json();
    const rows = dataResult.values || [];

    console.log(`Found ${rows.length} rows to process`);

    // Delete existing contacts for this integration
    const { error: deleteError } = await supabaseClient
      .from('google_sheets_contacts')
      .delete()
      .eq('integration_id', integration_id);

    if (deleteError) {
      console.error('Failed to delete existing contacts:', deleteError);
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = start_row + i;

      try {
        const name = getColumnValue(row, column_mapping.name_column);
        const phone = getColumnValue(row, column_mapping.phone_column);

        if (!name || !phone) {
          skipped++;
          continue;
        }

        if (!validatePhoneNumber(phone)) {
          skipped++;
          errors.push(`Row ${rowNumber}: Invalid phone number: ${phone}`);
          continue;
        }

        // Extract optional fields
        const email = getColumnValue(row, column_mapping.email_column);
        const location = getColumnValue(row, column_mapping.location_column);
        const language = getColumnValue(row, column_mapping.language_column) || 'ro';

        // Store all other columns in metadata
        const metadata: any = {};
        for (let j = 0; j < row.length; j++) {
          const colLetter = String.fromCharCode(65 + j);
          if (row[j]) {
            metadata[`col_${colLetter}`] = row[j];
          }
        }

        // Insert contact
        const { error: insertError } = await supabaseClient
          .from('google_sheets_contacts')
          .insert({
            integration_id,
            user_id: user.id,
            row_number: rowNumber,
            name,
            phone,
            email,
            location,
            language,
            metadata,
            call_status: 'pending',
          });

        if (insertError) {
          console.error(`Failed to insert row ${rowNumber}:`, insertError);
          errors.push(`Row ${rowNumber}: ${insertError.message}`);
          skipped++;
        } else {
          imported++;
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${rowNumber}: ${errorMessage}`);
        skipped++;
      }
    }

    // Update integration with import stats
    await supabaseClient
      .from('google_sheets_integrations')
      .update({
        last_import_at: new Date().toISOString(),
        total_contacts: imported,
      })
      .eq('id', integration_id);

    console.log(`Import complete: ${imported} imported, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped,
        errors: errors.slice(0, 10), // Return first 10 errors only
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in import-google-sheets-contacts:', error);
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
