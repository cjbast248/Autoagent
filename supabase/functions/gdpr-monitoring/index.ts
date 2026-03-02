import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client WITH the auth header attached
    // This ensures all queries run with the user's identity (for RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify admin status
    const { data: isAdmin, error: adminError } = await supabaseClient.rpc('is_admin_user', {
      _user_id: user.id
    });

    if (adminError) {
      console.error('Error checking admin status:', adminError);
      return new Response(
        JSON.stringify({ error: 'Error verifying admin access' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { action, alert_id } = await req.json();

    switch (action) {
      case 'get_metrics':
        return await getMetrics(supabaseClient);
      case 'get_alerts':
        return await getAlerts(supabaseClient);
      case 'get_logs':
        return await getLogs(supabaseClient);
      case 'acknowledge_alert':
        return await acknowledgeAlert(supabaseClient, alert_id);
      case 'resolve_alert':
        return await resolveAlert(supabaseClient, alert_id);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in gdpr-monitoring:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getMetrics(supabaseClient: any) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Count total records across main tables
  const { count: contactsCount } = await supabaseClient
    .from('contacts_database')
    .select('*', { count: 'exact', head: true });

  const { count: callHistoryCount } = await supabaseClient
    .from('call_history')
    .select('*', { count: 'exact', head: true });

  const totalDataStored = (contactsCount || 0) + (callHistoryCount || 0);

  // Count records older than 90 days
  const { count: oldContactsCount } = await supabaseClient
    .from('contacts_database')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', ninetyDaysAgo.toISOString());

  const { count: oldCallsCount } = await supabaseClient
    .from('call_history')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', ninetyDaysAgo.toISOString());

  const recordsOlderThan90Days = (oldContactsCount || 0) + (oldCallsCount || 0);

  // Count recent GDPR requests (simulated - you'd need a gdpr_requests table)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const { count: gdprRequestsCount } = await supabaseClient
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
    .ilike('action', '%GDPR%')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Count security breaches
  const { count: breachesCount } = await supabaseClient
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
    .or('action.ilike.%BREACH%,action.ilike.%UNAUTHORIZED%,action.ilike.%SECURITY_ALERT%');

  // Check backup status (simulated)
  const backupStatus = 'success'; // In production, check actual backup system
  const lastBackupDate = new Date().toISOString();

  const metrics = {
    totalDataStored,
    recordsOlderThan90Days,
    recentGDPRRequests: gdprRequestsCount || 0,
    detectedBreaches: breachesCount || 0,
    backupStatus,
    lastBackupDate
  };

  return new Response(
    JSON.stringify(metrics),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function getAlerts(supabaseClient: any) {
  const alerts = [];
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Check for old data
  const { count: oldDataCount } = await supabaseClient
    .from('contacts_database')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', ninetyDaysAgo.toISOString());

  if (oldDataCount && oldDataCount > 0) {
    alerts.push({
      id: `old_data_${Date.now()}`,
      type: 'old_data',
      severity: 'medium',
      title: 'Date mai vechi de 90 zile detectate',
      description: `Există ${oldDataCount} înregistrări mai vechi de 90 zile care ar trebui revizuite conform GDPR.`,
      timestamp: new Date().toISOString(),
      status: 'active',
      details: { count: oldDataCount }
    });
  }

  // Check for unprocessed requests (simulated)
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const { count: unprocessedCount } = await supabaseClient
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
    .ilike('action', '%REQUEST%')
    .lt('created_at', fortyEightHoursAgo.toISOString());

  if (unprocessedCount && unprocessedCount > 0) {
    alerts.push({
      id: `unprocessed_${Date.now()}`,
      type: 'unprocessed_request',
      severity: 'high',
      title: 'Cereri neprocesate peste 48 ore',
      description: `Există ${unprocessedCount} cereri care nu au fost procesate în ultimele 48 ore.`,
      timestamp: new Date().toISOString(),
      status: 'active',
      details: { count: unprocessedCount }
    });
  }

  // Check for unauthorized access attempts
  const { count: unauthorizedCount } = await supabaseClient
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
    .or('action.ilike.%UNAUTHORIZED%,action.ilike.%FAILED%,action.ilike.%DENIED%')
    .gte('created_at', fortyEightHoursAgo.toISOString());

  if (unauthorizedCount && unauthorizedCount > 0) {
    alerts.push({
      id: `unauthorized_${Date.now()}`,
      type: 'unauthorized_access',
      severity: 'critical',
      title: 'Tentative de acces neautorizat',
      description: `Au fost detectate ${unauthorizedCount} tentative de acces neautorizat în ultimele 48 ore.`,
      timestamp: new Date().toISOString(),
      status: 'active',
      details: { count: unauthorizedCount }
    });
  }

  return new Response(
    JSON.stringify(alerts),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function getLogs(supabaseClient: any) {
  try {
    // Get audit logs
    const { data: auditLogs, error } = await supabaseClient
      .from('admin_audit_log')
      .select(`
        id,
        created_at,
        admin_user_id,
        target_user_id,
        action,
        details,
        ip_address
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }

    if (!auditLogs || auditLogs.length === 0) {
      return new Response(
        JSON.stringify([]),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract unique user IDs for batch profile query
    const uniqueUserIds = [...new Set(auditLogs.map((log: any) => log.admin_user_id))];

    // Batch fetch all user profiles at once (eliminates N+1 query problem)
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', uniqueUserIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map for quick profile lookups
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((profile: any) => {
        profileMap.set(profile.id, profile);
      });
    }

    // Enrich logs with user data
    const logs = auditLogs.map((log: any) => {
      const profile = profileMap.get(log.admin_user_id);
      
      return {
        id: log.id,
        timestamp: log.created_at,
        user_id: log.admin_user_id,
        user_email: profile?.email || 'Unknown',
        client_name: log.details?.client_name || null,
        action_type: log.action,
        action_description: JSON.stringify(log.details || {}),
        ip_address: log.ip_address,
        details: log.details
      };
    });

    return new Response(
      JSON.stringify(logs),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in getLogs:', error);
    throw error;
  }
}

async function acknowledgeAlert(supabaseClient: any, alertId: string) {
  // In production, store alert states in a database table
  return new Response(
    JSON.stringify({ success: true }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function resolveAlert(supabaseClient: any, alertId: string) {
  // In production, update alert state in database
  return new Response(
    JSON.stringify({ success: true }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
