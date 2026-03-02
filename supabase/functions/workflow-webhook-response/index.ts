import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const webhookId = url.searchParams.get('webhook_id');
  const logId = url.searchParams.get('log_id');

  if (!webhookId && !logId) {
    return new Response(
      JSON.stringify({ error: 'webhook_id or log_id parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabase
      .from('workflow_trigger_logs')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(1);

    if (logId) {
      query = query.eq('id', logId);
    } else if (webhookId) {
      query = query.eq('webhook_trigger_id', webhookId);
    }

    const { data: logs, error } = await query;

    if (error || !logs || logs.length === 0) {
      return new Response(
        JSON.stringify({ 
          status: 'pending',
          message: 'Webhook is still processing...',
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const log = logs[0];

    // Check if response is ready (not null and not pending)
    if (log.response_status === null || 
        (log.response_body?.pending === true)) {
      return new Response(
        JSON.stringify({ 
          status: 'pending',
          message: 'Webhook is still processing...',
          log_id: log.id,
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Response is ready!
    return new Response(
      JSON.stringify({
        status: 'completed',
        response_status: log.response_status,
        response_body: log.response_body,
        execution_time_ms: log.execution_time_ms,
        triggered_at: log.triggered_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook Response] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
