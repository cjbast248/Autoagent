// ============================================================================
// BITRIX24 INBOUND WEBHOOK HANDLER
// Receives events from Bitrix24 outbound webhooks and triggers workflows
// ============================================================================
//
// Bitrix24 sends webhooks when CRM events occur (lead added, deal updated, etc.)
// This function:
// 1. Receives the event data from Bitrix24
// 2. Validates the request (optional signature verification)
// 3. Finds workflows with Bitrix24 triggers for this user
// 4. Queues those workflows for execution via BullMQ
//
// Usage: Configure an outbound webhook in Bitrix24 pointing to:
// https://[supabase-url]/functions/v1/bitrix24-webhook?user_id=<uuid>
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_VERSION = "1.0";

// Worker API configuration
const WORKER_API_URL = Deno.env.get('WORKER_API_URL') || 'http://localhost:3001';
const WORKER_API_SECRET = Deno.env.get('WORKER_API_SECRET') || 'agentauto-worker-secret-2026';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bitrix24-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Bitrix24 event types we support
const SUPPORTED_EVENTS = [
  // Leads
  'ONCRMLEADADD',
  'ONCRMLEADUPDATE',
  'ONCRMLEADDELETE',
  // Deals
  'ONCRMDEALADD',
  'ONCRMDEALUPDATE',
  'ONCRMDEALDELETE',
  // Contacts
  'ONCRMCONTACTADD',
  'ONCRMCONTACTUPDATE',
  'ONCRMCONTACTDELETE',
  // Companies
  'ONCRMCOMPANYADD',
  'ONCRMCOMPANYUPDATE',
  'ONCRMCOMPANYDELETE',
  // Activities
  'ONCRMACTIVITYADD',
  'ONCRMACTIVITYUPDATE',
  // Tasks
  'ONTASKADD',
  'ONTASKUPDATE',
  'ONTASKDELETE',
];

/**
 * Queue workflow execution to BullMQ worker
 */
async function queueWorkflowExecution(params: {
  workflowId: string;
  userId: string;
  triggerType: 'bitrix24_webhook';
  triggerData: Record<string, unknown>;
  triggerId?: string;
  logId?: string;
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    console.log(`[Bitrix24 Webhook] Queueing workflow: ${params.workflowId}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${WORKER_API_URL}/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_API_SECRET}`,
        'User-Agent': 'Supabase-Edge-Function/1.0',
      },
      body: JSON.stringify({
        workflowId: params.workflowId,
        userId: params.userId,
        triggerType: params.triggerType,
        triggerData: params.triggerData,
        triggerId: params.triggerId,
        logId: params.logId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Bitrix24 Webhook] Worker error: ${response.status} - ${errorText}`);
      return { success: false, error: `Worker error: ${response.status}` };
    }

    const result = await response.json();
    console.log(`[Bitrix24 Webhook] Job queued: ${result.jobId}`);
    return { success: true, jobId: result.jobId };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Bitrix24 Webhook] Queue error: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Map Bitrix24 event to a friendly resource/action format
 */
function parseEventType(event: string): { resource: string; action: string } {
  const eventUpper = event.toUpperCase();

  // Parse event like ONCRMLEADADD -> { resource: 'lead', action: 'add' }
  const patterns: Record<string, { resource: string; pattern: RegExp }> = {
    lead: { resource: 'lead', pattern: /ONCRMLEAD(ADD|UPDATE|DELETE)/ },
    deal: { resource: 'deal', pattern: /ONCRMDEAL(ADD|UPDATE|DELETE)/ },
    contact: { resource: 'contact', pattern: /ONCRMCONTACT(ADD|UPDATE|DELETE)/ },
    company: { resource: 'company', pattern: /ONCRMCOMPANY(ADD|UPDATE|DELETE)/ },
    activity: { resource: 'activity', pattern: /ONCRMACTIVITY(ADD|UPDATE)/ },
    task: { resource: 'task', pattern: /ONTASK(ADD|UPDATE|DELETE)/ },
  };

  for (const [, config] of Object.entries(patterns)) {
    const match = eventUpper.match(config.pattern);
    if (match) {
      return { resource: config.resource, action: match[1].toLowerCase() };
    }
  }

  return { resource: 'unknown', action: 'unknown' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);

  console.log(`[Bitrix24 Webhook v${FUNCTION_VERSION}] Received ${req.method} request`);

  try {
    // Get user_id from query params
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      console.log(`[Bitrix24 Webhook] Missing user_id parameter`);
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user exists and has Bitrix24 connection
    const { data: connection, error: connError } = await supabase
      .from('bitrix24_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .single();

    if (connError || !connection) {
      console.log(`[Bitrix24 Webhook] No active Bitrix24 connection for user: ${userId}`);
      return new Response(
        JSON.stringify({ error: 'No active Bitrix24 connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: Record<string, unknown> = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await req.formData();
        body = Object.fromEntries(formData);
      } catch {
        body = {};
      }
    }

    console.log(`[Bitrix24 Webhook] Event data:`, JSON.stringify(body).slice(0, 500));

    // Extract Bitrix24 event info
    // Bitrix24 sends: event, data[FIELDS][ID], auth[application_token], etc.
    const eventType = (body.event as string) || 'UNKNOWN';
    const eventData = body.data as Record<string, unknown> || {};
    const authData = body.auth as Record<string, unknown> || {};
    const ts = body.ts as string || new Date().toISOString();

    console.log(`[Bitrix24 Webhook] Event type: ${eventType}`);
    console.log(`[Bitrix24 Webhook] Portal: ${connection.portal_domain}`);

    // Optional: Verify application_token matches (if configured)
    // This provides basic security to ensure webhook is from legitimate source
    // const appToken = authData.application_token;
    // if (connection.webhook_token && appToken !== connection.webhook_token) {
    //   console.log(`[Bitrix24 Webhook] Invalid application token`);
    //   return new Response(
    //     JSON.stringify({ error: 'Invalid webhook token' }),
    //     { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    // Parse event type to resource/action
    const { resource, action } = parseEventType(eventType);
    console.log(`[Bitrix24 Webhook] Parsed: resource=${resource}, action=${action}`);

    // Build webhook data structure
    const webhookData = {
      source: 'bitrix24',
      event: eventType,
      resource,
      action,
      data: eventData,
      auth: {
        member_id: authData.member_id,
        domain: authData.domain,
      },
      portal_domain: connection.portal_domain,
      timestamp: ts,
      received_at: new Date().toISOString(),
    };

    // Find workflows with Bitrix24 trigger for this user
    // We look for workflows that have a trigger node with icon='bitrix24-trigger'
    // or a node configured to listen to Bitrix24 events
    const { data: workflows, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (workflowError) {
      console.error(`[Bitrix24 Webhook] Error fetching workflows:`, workflowError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch workflows' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter workflows that have Bitrix24 triggers
    const matchingWorkflows = (workflows || []).filter((wf: { nodes?: Array<{ icon?: string; label?: string; config?: { bitrix24Events?: string[]; bitrix24Resource?: string } }> }) => {
      const nodes = wf.nodes || [];
      return nodes.some((node: { icon?: string; label?: string; config?: { bitrix24Events?: string[]; bitrix24Resource?: string } }) => {
        const icon = (node.icon || '').toLowerCase();
        const label = (node.label || '').toLowerCase();
        const config = node.config || {};

        // Check if this is a Bitrix24 trigger node
        if (icon.includes('bitrix24-trigger') || icon.includes('bitrix24_trigger') ||
            label.includes('bitrix24 trigger')) {
          // Check if it's configured for this event type
          const configuredEvents = config.bitrix24Events || [];
          const configuredResource = config.bitrix24Resource;

          // If no specific events configured, trigger on all
          if (configuredEvents.length === 0 && !configuredResource) {
            return true;
          }

          // Check if current event matches
          if (configuredEvents.includes(eventType)) {
            return true;
          }

          // Check if resource matches
          if (configuredResource && configuredResource.toLowerCase() === resource) {
            return true;
          }

          return false;
        }
        return false;
      });
    });

    console.log(`[Bitrix24 Webhook] Found ${matchingWorkflows.length} matching workflows`);

    if (matchingWorkflows.length === 0) {
      // No workflows to trigger - still return success to Bitrix24
      return new Response(
        JSON.stringify({
          status: 'received',
          message: 'Event received but no matching workflows found',
          event: eventType,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Queue each matching workflow
    const results: Array<{ workflowId: string; workflowName: string; success: boolean; jobId?: string; error?: string }> = [];

    for (const workflow of matchingWorkflows) {
      // Create log entry
      const { data: logEntry } = await supabase
        .from('workflow_trigger_logs')
        .insert({
          workflow_id: workflow.id,
          user_id: userId,
          request_method: req.method,
          request_headers: Object.fromEntries(req.headers),
          request_body: body,
          request_query: Object.fromEntries(url.searchParams),
          response_status: null,
          response_body: {
            pending: true,
            source: 'bitrix24_webhook',
            event: eventType,
          },
          execution_time_ms: 0,
          is_test: false,
        })
        .select('id')
        .single();

      const logId = logEntry?.id;

      // Queue workflow execution
      const queueResult = await queueWorkflowExecution({
        workflowId: workflow.id,
        userId: userId,
        triggerType: 'bitrix24_webhook',
        triggerData: webhookData,
        logId: logId,
      });

      results.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        success: queueResult.success,
        jobId: queueResult.jobId,
        error: queueResult.error,
      });

      console.log(`[Bitrix24 Webhook] Queued workflow "${workflow.name}": ${queueResult.success ? 'success' : 'failed'}`);
    }

    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: 'accepted',
        message: `Triggered ${results.filter(r => r.success).length} workflow(s)`,
        event: eventType,
        resource,
        action,
        workflows_triggered: results,
        execution_time_ms: executionTime,
      }),
      {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Bitrix24 Webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
