import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface FilterCondition {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty';
  value: string;
}

interface ExecuteRequest {
  user_id: string;
  resource: 'spreadsheet' | 'sheet';
  operation: string;
  spreadsheet_id?: string;
  sheet_name?: string;
  title?: string;
  filters?: FilterCondition[];
  combine_filters?: 'AND' | 'OR';
  row_data?: Record<string, any>;
  input_data?: any;
}

function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function getValidAccessToken(
  supabase: any,
  userId: string
): Promise<{ accessToken: string; googleEmail?: string } | null> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');

  let accessToken: string;
  let refreshToken: string;
  let expiresAt: Date;
  let googleEmail: string | undefined;

  if (encryptionKey) {
    const { data, error } = await supabase.rpc('get_google_sheets_connection_decrypted', {
      p_user_id: userId,
      p_encryption_key: encryptionKey,
    });

    if (error || !data || data.length === 0) {
      console.log('No encrypted connection found for user');
      return null;
    }

    const conn = data[0];
    accessToken = conn.access_token;
    refreshToken = conn.refresh_token;
    expiresAt = new Date(conn.token_expires_at);
    googleEmail = conn.google_email;
  } else {
    const { data, error } = await supabase
      .from('google_sheets_connections')
      .select('access_token, refresh_token, token_expires_at, google_email')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    expiresAt = new Date(data.token_expires_at);
    googleEmail = data.google_email;
  }

  // Check if token is expired (with 5 min buffer)
  const isExpired = expiresAt.getTime() - 5 * 60 * 1000 < Date.now();

  if (!isExpired) {
    return { accessToken, googleEmail };
  }

  // Token expired, refresh it
  console.log('Access token expired, refreshing...');
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret || !refreshToken) return null;

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshResponse.ok) {
    console.error('Token refresh failed');
    return null;
  }

  const refreshData = await refreshResponse.json();
  const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

  // Store refreshed token
  if (encryptionKey) {
    await supabase.rpc('update_google_sheets_access_token_encrypted', {
      p_user_id: userId,
      p_access_token: refreshData.access_token,
      p_token_expires_at: newExpiresAt.toISOString(),
      p_encryption_key: encryptionKey,
    });
  } else {
    await supabase
      .from('google_sheets_connections')
      .update({
        access_token: refreshData.access_token,
        token_expires_at: newExpiresAt.toISOString(),
      })
      .eq('user_id', userId);
  }

  return { accessToken: refreshData.access_token, googleEmail };
}

function applyFilter(row: Record<string, any>, filter: FilterCondition): boolean {
  const value = String(row[filter.column] || '').toLowerCase();
  const filterValue = String(filter.value || '').toLowerCase();

  switch (filter.operator) {
    case 'equals':
      return value === filterValue;
    case 'not_equals':
      return value !== filterValue;
    case 'contains':
      return value.includes(filterValue);
    case 'starts_with':
      return value.startsWith(filterValue);
    case 'ends_with':
      return value.endsWith(filterValue);
    case 'is_empty':
      return value === '';
    case 'is_not_empty':
      return value !== '';
    default:
      return true;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ExecuteRequest = await req.json();
    const { user_id, resource, operation, spreadsheet_id, sheet_name, title, filters, combine_filters, row_data, input_data } = body;

    console.log('Execute Google Sheets request:', { user_id, resource, operation, spreadsheet_id });

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createAdminClient();
    const tokenData = await getValidAccessToken(supabaseAdmin, user_id);

    if (!tokenData) {
      return new Response(
        JSON.stringify({ 
          error: 'No Google Sheets connection found. Please connect your Google account.',
          code: 'NO_CONNECTION'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const accessToken = tokenData.accessToken;

    // Handle different operations
    let result: any = null;

    if (resource === 'spreadsheet') {
      // Spreadsheet operations
      if (operation === 'create') {
        // Create new spreadsheet
        const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              title: title || 'New Spreadsheet'
            }
          })
        });

        if (!createResponse.ok) {
          const error = await createResponse.text();
          throw new Error(`Failed to create spreadsheet: ${error}`);
        }

        result = await createResponse.json();
        
      } else if (operation === 'delete') {
        // Delete spreadsheet (move to trash)
        const deleteResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${spreadsheet_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!deleteResponse.ok) {
          const error = await deleteResponse.text();
          throw new Error(`Failed to delete spreadsheet: ${error}`);
        }

        result = { success: true, message: 'Spreadsheet deleted' };
      }
      
    } else if (resource === 'sheet') {
      // Sheet operations
      let targetSheet = sheet_name;

      // If sheet_name is not specified, get the actual first sheet name from metadata
      if (!targetSheet) {
        console.log('No sheet_name provided, fetching metadata to get first sheet...');
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}?fields=sheets.properties`;
        const metaResponse = await fetch(metaUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        if (metaResponse.ok) {
          const metadata = await metaResponse.json();
          if (metadata.sheets && metadata.sheets.length > 0) {
            targetSheet = metadata.sheets[0].properties.title;
            console.log('Using first sheet from metadata:', targetSheet);
          }
        }
        
        if (!targetSheet) {
          targetSheet = 'Sheet1'; // Ultimate fallback
        }
      }

      if (operation === 'get-rows') {
        // Get rows from sheet
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(targetSheet)}!A:ZZ`;
        const dataResponse = await fetch(dataUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!dataResponse.ok) {
          const error = await dataResponse.text();
          throw new Error(`Failed to get rows: ${error}`);
        }

        const sheetData = await dataResponse.json();
        const rows = sheetData.values || [];
        
        if (rows.length === 0) {
          result = { rows: [], count: 0 };
        } else {
          // First row is headers
          const headers = rows[0];
          const dataRows = rows.slice(1).map((row: string[], index: number) => {
            const obj: Record<string, any> = { _rowIndex: index + 2 }; // +2 because 1-indexed and skip header
            headers.forEach((header: string, i: number) => {
              obj[header] = row[i] || '';
            });
            return obj;
          });

          // Apply filters if any
          let filteredRows = dataRows;
          if (filters && filters.length > 0) {
            filteredRows = dataRows.filter((row: Record<string, any>) => {
              if (combine_filters === 'OR') {
                return filters.some(f => applyFilter(row, f));
              } else {
                return filters.every(f => applyFilter(row, f));
              }
            });
          }

          result = { 
            rows: filteredRows, 
            count: filteredRows.length,
            headers,
            totalRows: dataRows.length
          };
        }

      } else if (operation === 'append-row' || operation === 'append-or-update') {
        // Append row to sheet
        const dataToAppend = row_data || input_data || {};
        
        // Get headers first
        const headersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(targetSheet)}!1:1`;
        const headersResponse = await fetch(headersUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        let headers: string[] = [];
        if (headersResponse.ok) {
          const headersData = await headersResponse.json();
          headers = headersData.values?.[0] || [];
        }

        // Create row values based on headers
        const rowValues = headers.map(h => dataToAppend[h] || '');

        // Append the row
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(targetSheet)}!A:${String.fromCharCode(65 + headers.length - 1)}:append?valueInputOption=USER_ENTERED`;
        const appendResponse = await fetch(appendUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [rowValues]
          })
        });

        if (!appendResponse.ok) {
          const error = await appendResponse.text();
          throw new Error(`Failed to append row: ${error}`);
        }

        result = await appendResponse.json();
        result.appendedData = dataToAppend;

      } else if (operation === 'update-row') {
        // Update specific row
        const rowIndex = row_data?._rowIndex || input_data?._rowIndex;
        if (!rowIndex) {
          throw new Error('Row index is required for update operation');
        }

        const dataToUpdate = row_data || input_data || {};
        
        // Get headers first
        const headersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(targetSheet)}!1:1`;
        const headersResponse = await fetch(headersUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        let headers: string[] = [];
        if (headersResponse.ok) {
          const headersData = await headersResponse.json();
          headers = headersData.values?.[0] || [];
        }

        // Create row values based on headers
        const rowValues = headers.map(h => dataToUpdate[h] !== undefined ? dataToUpdate[h] : '');

        // Update the row
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(targetSheet)}!A${rowIndex}:${String.fromCharCode(65 + headers.length - 1)}${rowIndex}?valueInputOption=USER_ENTERED`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [rowValues]
          })
        });

        if (!updateResponse.ok) {
          const error = await updateResponse.text();
          throw new Error(`Failed to update row: ${error}`);
        }

        result = await updateResponse.json();
        result.updatedData = dataToUpdate;

      } else if (operation === 'delete-row') {
        // Delete row (clear it)
        const rowIndex = row_data?._rowIndex || input_data?._rowIndex;
        if (!rowIndex) {
          throw new Error('Row index is required for delete operation');
        }

        // Get spreadsheet metadata to find sheet ID
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}?fields=sheets.properties`;
        const metaResponse = await fetch(metaUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        if (!metaResponse.ok) {
          throw new Error('Failed to get spreadsheet metadata');
        }

        const metadata = await metaResponse.json();
        const sheet = metadata.sheets?.find((s: any) => s.properties.title === targetSheet);
        
        if (!sheet) {
          throw new Error(`Sheet "${targetSheet}" not found`);
        }

        const sheetId = sheet.properties.sheetId;

        // Delete the row using batchUpdate
        const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}:batchUpdate`;
        const deleteResponse = await fetch(deleteUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // 0-indexed
                  endIndex: rowIndex
                }
              }
            }]
          })
        });

        if (!deleteResponse.ok) {
          const error = await deleteResponse.text();
          throw new Error(`Failed to delete row: ${error}`);
        }

        result = { success: true, deletedRow: rowIndex };

      } else if (operation === 'clear') {
        // Clear sheet
        const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(targetSheet)}:clear`;
        const clearResponse = await fetch(clearUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });

        if (!clearResponse.ok) {
          const error = await clearResponse.text();
          throw new Error(`Failed to clear sheet: ${error}`);
        }

        result = { success: true, message: 'Sheet cleared' };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        operation,
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in execute-google-sheets:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
