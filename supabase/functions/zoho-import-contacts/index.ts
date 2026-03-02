import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

async function refreshZohoToken(refreshToken: string, userId: string, supabase: any, client_id: string, client_secret: string, zoho_region: string = 'eu') {
  console.log('[Zoho Import Contacts] Refreshing token for user:', userId);

  const accountsDomain = zoho_region === 'com' ? 'accounts.zoho.com' :
                        zoho_region === 'in' ? 'accounts.zoho.in' :
                        zoho_region === 'au' ? 'accounts.zoho.com.au' :
                        zoho_region === 'jp' ? 'accounts.zoho.jp' :
                        'accounts.zoho.eu';

  const response = await fetch(`https://${accountsDomain}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: client_id,
      client_secret: client_secret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    console.error('[Zoho Import Contacts] Failed to refresh token');
    throw new Error('Failed to refresh Zoho token');
  }

  const tokens = await response.json();

  console.log('[Zoho Import Contacts] Successfully refreshed token');
  await supabase
    .from('zoho_crm_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId);

  return tokens.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, module = 'Leads' } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Zoho connection
    const { data: connection, error: connError } = await supabase
      .from('zoho_crm_connections')
      .select('access_token, refresh_token, client_id, client_secret, zoho_region, token_expires_at')
      .eq('user_id', user_id)
      .eq('status', 'connected')
      .single();

    if (connError || !connection) {
      throw new Error('Zoho CRM not connected');
    }

    const { client_id, client_secret, zoho_region = 'eu' } = connection;

    if (!client_id || !client_secret) {
      throw new Error('Zoho OAuth credentials not configured. Please reconnect your Zoho account.');
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expires_at);
    if (tokenExpiry <= new Date()) {
      accessToken = await refreshZohoToken(connection.refresh_token, user_id, supabase, client_id, client_secret, zoho_region);
    }

    const apiDomain = zoho_region === 'com' ? 'www.zohoapis.com' :
                     zoho_region === 'in' ? 'www.zohoapis.in' :
                     zoho_region === 'au' ? 'www.zohoapis.com.au' :
                     zoho_region === 'jp' ? 'www.zohoapis.jp' :
                     'www.zohoapis.eu';

    // Import all pages of contacts from Zoho CRM
    const importedContacts = [];
    const failedContacts = [];
    let currentPage = 1;
    const perPage = 200;
    let hasMorePages = true;
    
    while (hasMorePages) {
      console.log(`📞 Fetching page ${currentPage} from Zoho: https://${apiDomain}/crm/v2/${module}?page=${currentPage}&per_page=${perPage}`);

      const zohoResponse = await fetch(
        `https://${apiDomain}/crm/v2/${module}?page=${currentPage}&per_page=${perPage}`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      console.log(`📊 Zoho Response Status: ${zohoResponse.status} ${zohoResponse.statusText}`);

      // Handle 204 No Content - means no more records
      if (zohoResponse.status === 204) {
        console.log('📭 No more contacts on this page (204 No Content)');
        hasMorePages = false;
        continue;
      }

      if (!zohoResponse.ok) {
        const errorText = await zohoResponse.text();
        console.error('❌ Zoho API error response:', {
          status: zohoResponse.status,
          statusText: zohoResponse.statusText,
          body: errorText
        });
        throw new Error(`Failed to fetch contacts from Zoho CRM: ${zohoResponse.status} - ${errorText}`);
      }

      // Get response text first for debugging
      const responseText = await zohoResponse.text();

      // Try to parse as JSON
      let zohoData;
      try {
        zohoData = JSON.parse(responseText);
        console.log(`✅ Page ${currentPage}: ${zohoData.data?.length || 0} records`);
      } catch (parseError) {
        console.error('❌ Failed to parse Zoho response as JSON:', parseError);
        const parseErrMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
        throw new Error(`Invalid JSON response from Zoho CRM: ${parseErrMsg}`);
      }
      
      const contacts = zohoData.data || [];
      
      // If no contacts on this page, we're done
      if (contacts.length === 0) {
        hasMorePages = false;
        continue;
      }

      // Import contacts from this page
      for (const contact of contacts) {
      const contactData = {
        user_id,
        zoho_id: contact.id,
        zoho_module: module,
        
        // Contact information
        full_name: contact.Full_Name || '',
        first_name: contact.First_Name || '',
        last_name: contact.Last_Name || '',
        email: contact.Email || null,
        phone: contact.Phone || null,
        mobile: contact.Mobile || null,
        
        // Company/Account info
        company: contact.Company || null,
        account_name: contact.Account_Name?.name || null,
        title: contact.Title || null,
        
        // Lead specific
        lead_status: contact.Lead_Status || null,
        lead_source: contact.Lead_Source || null,
        
        // Address information
        street: contact.Street || null,
        city: contact.City || null,
        state: contact.State || null,
        zip_code: contact.Zip_Code || null,
        country: contact.Country || null,
        
        // Additional fields
        description: contact.Description || null,
        website: contact.Website || null,
        industry: contact.Industry || null,
        annual_revenue: contact.Annual_Revenue || null,
        number_of_employees: contact.No_of_Employees || null,
        
        // Store all raw Zoho data
        raw_data: contact,
        
        last_synced_at: new Date().toISOString(),
      };

      // Upsert contact
      const { data, error } = await supabase
        .from('zoho_contacts')
        .upsert(contactData, {
          onConflict: 'user_id,zoho_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

        if (!error && data) {
          importedContacts.push(data);
        } else if (error) {
          console.error(`❌ Failed to import contact ${contact.id}:`, error);
          failedContacts.push({
            zoho_id: contact.id,
            name: contact.full_name || contact.last_name || 'Unknown',
            error: error.message
          });
        }
      }
      
      // Check if there are more pages
      if (zohoData.info && !zohoData.info.more_records) {
        hasMorePages = false;
      } else {
        currentPage++;
      }
    }
    
    console.log(`✅ Successfully imported ${importedContacts.length} contacts from ${currentPage - 1} pages`);
    if (failedContacts.length > 0) {
      console.log(`⚠️ Failed to import ${failedContacts.length} contacts:`, failedContacts);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported_count: importedContacts.length,
        failed_count: failedContacts.length,
        pages_processed: currentPage - 1,
        contacts: importedContacts.slice(0, 10), // Return only first 10 for response size
        failed_contacts: failedContacts
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Zoho import contacts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
