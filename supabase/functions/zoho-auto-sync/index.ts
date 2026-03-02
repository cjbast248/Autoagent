import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

async function refreshZohoToken(refreshToken: string, userId: string, supabase: any) {
  const clientId = Deno.env.get('ZOHO_CLIENT_ID');
  const clientSecret = Deno.env.get('ZOHO_CLIENT_SECRET');

  const response = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Zoho token');
  }

  const tokens = await response.json();

  await supabase
    .from('zoho_crm_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId);

  return tokens.access_token;
}

async function syncModule(
  accessToken: string,
  moduleName: string,
  userId: string,
  supabase: any,
  syncHistoryId: string
) {
  console.log(`Starting sync for module: ${moduleName}`);
  let page = 1;
  let hasMoreRecords = true;
  let totalSynced = 0;
  const perPage = 200;

  while (hasMoreRecords) {
    const zohoUrl = `https://www.zohoapis.eu/crm/v2/${moduleName}?page=${page}&per_page=${perPage}`;
    
    const response = await fetch(zohoUrl, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${moduleName}: ${response.statusText}`);
      break;
    }

    const data = await response.json();
    const records = data.data || [];

    if (records.length === 0) {
      hasMoreRecords = false;
      break;
    }

    // Process records in batch
    for (const record of records) {
      const contactData: any = {
        user_id: userId,
        zoho_id: record.id,
        zoho_module: moduleName,
        name: record.Full_Name || record.Account_Name || record.Subject || record.Deal_Name || 'Unknown',
        email: record.Email || null,
        phone: record.Phone || record.Mobile || `no_phone_${moduleName.toLowerCase()}_${record.id}`,
        company: record.Account_Name || record.Company || null,
        location: record.City || record.Mailing_City || null,
        status: record.Lead_Status || record.Account_Type || record.Status || 'active',
        lead_source: record.Lead_Source || null,
        owner_name: record.Owner?.name || null,
        owner_email: record.Owner?.email || null,
        description: record.Description || null,
        last_synced_at: new Date().toISOString(),
      };

      // Add module-specific fields
      if (moduleName === 'Accounts') {
        contactData.account_name = record.Account_Name;
        contactData.account_type = record.Account_Type;
        contactData.rating = record.Rating;
      } else if (moduleName === 'Deals') {
        contactData.deal_amount = record.Amount;
        contactData.deal_stage = record.Stage;
        contactData.deal_probability = record.Probability;
      } else if (moduleName === 'Tasks') {
        contactData.task_subject = record.Subject;
        contactData.task_due_date = record.Due_Date;
        contactData.task_priority = record.Priority;
        contactData.task_status = record.Status;
      }

      // Upsert contact
      const { error } = await supabase
        .from('zoho_contacts')
        .upsert(contactData, {
          onConflict: 'user_id,zoho_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`Error upserting ${moduleName} record:`, error);
      } else {
        totalSynced++;
      }
    }

    if (records.length < perPage) {
      hasMoreRecords = false;
    } else {
      page++;
    }
  }

  console.log(`Synced ${totalSynced} records from ${moduleName}`);
  return totalSynced;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request body (optional - for manual sync with specific user)
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body.user_id;
    } catch {
      // No body or invalid JSON - will sync all users
    }

    // Get all active Zoho connections
    let query = supabase
      .from('zoho_crm_connections')
      .select('*')
      .eq('status', 'connected');

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: connections, error: connError } = await query;

    if (connError) {
      throw new Error(`Failed to fetch connections: ${connError.message}`);
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active Zoho connections found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = [];

    // Sync for each connected user
    for (const connection of connections) {
      console.log(`Starting sync for user: ${connection.user_id}`);
      
      // Create sync history record
      const { data: syncHistory, error: historyError } = await supabase
        .from('zoho_sync_history')
        .insert({
          user_id: connection.user_id,
          sync_status: 'in_progress',
          modules_synced: [],
        })
        .select()
        .single();

      if (historyError) {
        console.error('Failed to create sync history:', historyError);
        continue;
      }

      try {
        // Check if token needs refresh
        let accessToken = connection.access_token;
        const tokenExpiry = new Date(connection.token_expires_at);
        if (tokenExpiry <= new Date()) {
          accessToken = await refreshZohoToken(connection.refresh_token, connection.user_id, supabase);
        }

        // Sync all modules
        const modules = ['Leads', 'Contacts', 'Accounts', 'Deals', 'Tasks'];
        const syncCounts: any = {
          leads_synced: 0,
          contacts_synced: 0,
          accounts_synced: 0,
          deals_synced: 0,
          tasks_synced: 0,
        };

        for (const module of modules) {
          try {
            const count = await syncModule(accessToken, module, connection.user_id, supabase, syncHistory.id);
            const key = `${module.toLowerCase()}_synced` as keyof typeof syncCounts;
            syncCounts[key] = count;
          } catch (error) {
            console.error(`Error syncing ${module}:`, error);
          }
        }

        const totalRecords = Object.values(syncCounts).reduce((a: any, b: any) => a + b, 0);

        // Update sync history
        await supabase
          .from('zoho_sync_history')
          .update({
            sync_completed_at: new Date().toISOString(),
            sync_status: 'completed',
            modules_synced: modules,
            total_records_synced: totalRecords,
            ...syncCounts,
          })
          .eq('id', syncHistory.id);

        // Update last sync time on connection
        await supabase
          .from('zoho_crm_connections')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', connection.user_id);

        results.push({
          user_id: connection.user_id,
          status: 'success',
          total_records: totalRecords,
          ...syncCounts,
        });

        console.log(`Sync completed for user ${connection.user_id}: ${totalRecords} records`);
      } catch (error) {
        console.error(`Sync failed for user ${connection.user_id}:`, error);
        
        // Update sync history with error
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from('zoho_sync_history')
          .update({
            sync_completed_at: new Date().toISOString(),
            sync_status: 'failed',
            errors_count: 1,
            error_details: { message: errMsg },
          })
          .eq('id', syncHistory.id);

        results.push({
          user_id: connection.user_id,
          status: 'failed',
          error: errMsg,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        synced_users: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Zoho auto sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
