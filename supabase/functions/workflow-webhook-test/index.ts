import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const webhookPath = pathParts[pathParts.length - 1];
  const action = url.searchParams.get('action');

  console.log(`[Webhook Test] ${req.method} request for path: ${webhookPath}, action: ${action}`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the webhook trigger by path
    const { data: trigger, error: triggerError } = await supabase
      .from('workflow_webhook_triggers')
      .select('*')
      .eq('webhook_path', webhookPath)
      .maybeSingle();

    if (triggerError) {
      console.error('[Webhook Test] DB error:', triggerError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Poll for test events
    if (action === 'poll') {
      if (!trigger) {
        return new Response(
          JSON.stringify({ events: [], message: 'No trigger found' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get recent test events (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: events, error: eventsError } = await supabase
        .from('workflow_trigger_logs')
        .select('*')
        .eq('webhook_trigger_id', trigger.id)
        .eq('is_test', true)
        .gte('triggered_at', fiveMinutesAgo)
        .order('triggered_at', { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({ 
          events: events || [],
          is_listening: trigger.is_listening,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Start/Stop listening
    if (action === 'start-listening' || action === 'stop-listening') {
      if (!trigger) {
        return new Response(
          JSON.stringify({ error: 'Trigger not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isListening = action === 'start-listening';
      await supabase
        .from('workflow_webhook_triggers')
        .update({ is_listening: isListening })
        .eq('id', trigger.id);

      return new Response(
        JSON.stringify({ success: true, is_listening: isListening }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular test webhook request - log as test event
    let body = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      body = Object.fromEntries(formData);
    } else if (contentType.includes('text/plain')) {
      body = { text: await req.text() };
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      if (key !== 'action') {
        query[key] = value;
      }
    });

    // If no trigger exists yet, just return the parsed data
    if (!trigger) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Test event received (no trigger configured)',
          data: { body, headers, query, method: req.method },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log as test event
    const { error: logError } = await supabase
      .from('workflow_trigger_logs')
      .insert({
        webhook_trigger_id: trigger.id,
        workflow_id: trigger.workflow_id,
        user_id: trigger.user_id,
        request_method: req.method,
        request_headers: headers,
        request_body: body,
        request_query: query,
        response_status: 200,
        response_body: { received: true, test: true },
        execution_time_ms: 0,
        is_test: true,
      });

    if (logError) {
      console.error('[Webhook Test] Failed to log test event:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test event received and logged',
        webhook_path: webhookPath,
        data: {
          body,
          headers,
          query,
          method: req.method,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook Test] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
