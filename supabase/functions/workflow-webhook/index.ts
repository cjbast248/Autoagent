import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// VERSION: 7.2 - 2026-01-20 - Fix: null checks for JSON.stringify().substring() calls
const FUNCTION_VERSION = "7.2";

// Worker API configuration
// Set WORKER_API_URL in Supabase Edge Function secrets for production
// Example: https://app.agentauto.app:3001 or https://worker.agentauto.app
const WORKER_API_URL = Deno.env.get('WORKER_API_URL') || 'http://localhost:3001';
const WORKER_API_SECRET = Deno.env.get('WORKER_API_SECRET') || 'agentauto-worker-secret-2026';

/**
 * Queue workflow execution to BullMQ worker
 * This allows workflows to run in background without browser dependency
 */
async function queueWorkflowExecution(params: {
  workflowId: string;
  userId: string;
  triggerType: 'webhook' | 'call_history' | 'manual' | 'schedule';
  triggerData: Record<string, unknown>;
  triggerId?: string;
  logId?: string;
  respondMode?: string;
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    console.log(`[Worker Queue] ========== QUEUE REQUEST ==========`);
    console.log(`[Worker Queue] WORKER_API_URL: ${WORKER_API_URL}`);
    console.log(`[Worker Queue] Workflow ID: ${params.workflowId}`);
    console.log(`[Worker Queue] User ID: ${params.userId}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(`${WORKER_API_URL}/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_API_SECRET}`,
        'ngrok-skip-browser-warning': 'true', // Required for ngrok free tier
        'User-Agent': 'Supabase-Edge-Function/1.0',
      },
      body: JSON.stringify({
        workflowId: params.workflowId,
        userId: params.userId,
        triggerType: params.triggerType,
        triggerData: params.triggerData,
        triggerId: params.triggerId,
        logId: params.logId,
        respondMode: params.respondMode,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[Worker Queue] Fetch completed. Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Worker Queue] Failed to queue job: ${response.status} - ${errorText}`);
      return { success: false, error: `Worker error: ${response.status}` };
    }

    const result = await response.json();
    console.log(`[Worker Queue] ✅ Job queued successfully: ${result.jobId}`);
    console.log(`[Worker Queue] ========== END QUEUE ==========`);
    return { success: true, jobId: result.jobId };
  } catch (error: unknown) {
    console.error(`[Worker Queue] ❌ FETCH ERROR:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Worker Queue] Error type: ${error?.constructor?.name}`);
    console.error(`[Worker Queue] Error message: ${errorMessage}`);
    // Don't fail the webhook - just log the error
    // The webhook data is still saved in workflow_trigger_logs
    return { success: false, error: errorMessage };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-auth, x-webhook-signature',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
};

/**
 * SYNC MODE - Limited long-polling for external clients like ElevenLabs
 *
 * ⚠️ IMPORTANT: Sync mode is a CONTROLLED EXCEPTION, not a general promise.
 * - Max 12s timeout (safety margin for Edge Functions)
 * - 1s poll interval = max 12 DB queries per request
 * - Use ONLY for clients that cannot poll separately (ElevenLabs, etc.)
 * - Default should always be 'async' mode
 */
async function handleSyncMode(
  supabase: any,
  trigger: any,
  logId: string,
  startTime: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Hard limit: 50s max for Edge Function (Supabase allows up to 60s)
  const timeoutMs = Math.min((trigger.sync_timeout_seconds || 30) * 1000, 50000);
  const pollInterval = 1000; // 1 second - NOT more aggressive!

  let pollCount = 0;
  const maxPolls = Math.ceil(timeoutMs / pollInterval);

  console.log(`[Sync Mode] 🔄 Starting. Timeout: ${timeoutMs}ms, Max polls: ${maxPolls}, log_id: ${logId}`);

  while (Date.now() - startTime < timeoutMs && pollCount < maxPolls) {
    pollCount++;

    // Check if response is ready
    const { data: log, error: logError } = await supabase
      .from('workflow_trigger_logs')
      .select('response_status, response_body')
      .eq('id', logId)
      .single();

    if (logError) {
      console.error(`[Sync Mode] ❌ Error fetching log:`, logError);
      // Continue polling, don't fail immediately
    }

    // IMPORTANT: Only consider response ready if:
    // 1. pending is explicitly false (not just "not true")
    // 2. webhookResponse exists (frontend has set it)
    // This prevents race conditions where something else might update the log
    const responseBody = log?.response_body;
    const isPending = responseBody?.pending === true;
    const hasWebhookResponse = responseBody?.webhookResponse !== undefined;

    console.log(`[Sync Mode] Poll ${pollCount}: pending=${isPending}, hasWebhookResponse=${hasWebhookResponse}, response_status=${log?.response_status}`);
    console.log(`[Sync Mode] Poll ${pollCount} response_body FULL: ${(JSON.stringify(responseBody) || '').substring(0, 1000)}`);

    if (!isPending && hasWebhookResponse) {
      // Response ready with proper webhookResponse from frontend!
      const executionTime = Date.now() - startTime;
      console.log(`[Sync Mode v${FUNCTION_VERSION}] ✅ Response ready after ${pollCount} polls, ${executionTime}ms`);

      const contentType = responseBody.webhookResponseType === 'xml'
        ? 'application/xml'
        : 'application/json';
      const statusCode = responseBody.webhookStatusCode || 200;

      console.log(`[Sync Mode] Returning webhookResponse with status ${statusCode}, type ${contentType}`);
      console.log(`[Sync Mode] Response preview: ${(JSON.stringify(responseBody?.webhookResponse) || '').substring(0, 300)}`);

      return new Response(
        typeof responseBody.webhookResponse === 'string'
          ? responseBody.webhookResponse
          : JSON.stringify(responseBody.webhookResponse),
        {
          status: statusCode,
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'X-Execution-Time': `${executionTime}ms`,
            'X-Poll-Count': `${pollCount}`,
            'X-Response-Mode': 'sync',
            'X-Function-Version': FUNCTION_VERSION,
          }
        }
      );
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout reached - EXPLICIT LOGGING for debugging
  const actualTimeoutSec = Math.min(trigger.sync_timeout_seconds || 30, 50);
  const timeoutDuration = Date.now() - startTime;
  console.error(`[Sync Mode] ⚠️ TIMEOUT after ${pollCount} polls, ${timeoutDuration}ms`);
  console.error(`[Sync Mode] ⚠️ log_id: ${logId}, trigger_id: ${trigger.id}`);
  console.error(`[Sync Mode] ⚠️ Falling back to async - client can poll for result`);

  // Return 408 with fallback poll URL
  return new Response(
    JSON.stringify({
      error: 'Response timeout',
      message: `Workflow did not respond within ${actualTimeoutSec}s`,
      log_id: logId,
      poll_url: `/functions/v1/workflow-webhook-response?log_id=${logId}`,
      hint: 'You can poll the above URL to get the response when ready',
      debug: {
        timeout_ms: timeoutDuration,
        poll_count: pollCount,
        mode: 'sync_timeout_fallback'
      }
    }),
    {
      status: 408,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Rate limiting check - simple per-minute counter
 */
async function checkRateLimit(
  supabase: any,
  trigger: any
): Promise<{ allowed: boolean; remaining: number; resetAt?: string }> {
  const limit = trigger.rate_limit_per_minute || 30;

  // If no rate limiting configured, allow
  if (!limit || limit <= 0) {
    return { allowed: true, remaining: 999 };
  }

  const now = new Date();
  const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                               now.getHours(), now.getMinutes(), 0, 0);

  // New minute window?
  if (!trigger.minute_window_start ||
      new Date(trigger.minute_window_start) < minuteStart) {
    // Reset counter for new minute
    await supabase
      .from('workflow_webhook_triggers')
      .update({
        requests_this_minute: 1,
        minute_window_start: minuteStart.toISOString(),
      })
      .eq('id', trigger.id);

    return { allowed: true, remaining: limit - 1 };
  }

  // Check limit
  if ((trigger.requests_this_minute || 0) >= limit) {
    const resetAt = new Date(minuteStart.getTime() + 60000);
    console.log(`[Rate Limit] ❌ Limit exceeded: ${trigger.requests_this_minute}/${limit}`);
    return { allowed: false, remaining: 0, resetAt: resetAt.toISOString() };
  }

  // Increment counter
  await supabase
    .from('workflow_webhook_triggers')
    .update({ requests_this_minute: (trigger.requests_this_minute || 0) + 1 })
    .eq('id', trigger.id);

  return { allowed: true, remaining: limit - (trigger.requests_this_minute || 0) - 1 };
}

// Extract pure JSON from text that may contain explanatory text + JSON
function extractJsonFromText(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  // If it's already valid JSON, return as-is
  try {
    JSON.parse(text);
    return text;
  } catch {}
  
  // Method 1: Look for ```json ... ``` markdown blocks
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    const candidate = jsonBlockMatch[1].trim();
    try {
      JSON.parse(candidate);
      console.log(`[extractJsonFromText] Found JSON in markdown block`);
      return candidate;
    } catch {}
  }
  
  // Method 2: Look for ``` ... ``` generic code blocks
  const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const candidate = codeBlockMatch[1].trim();
    try {
      JSON.parse(candidate);
      console.log(`[extractJsonFromText] Found JSON in code block`);
      return candidate;
    } catch {}
  }
  
  // Method 3: Find first { and last } for object
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(candidate);
      console.log(`[extractJsonFromText] Found JSON object in text`);
      return candidate;
    } catch {}
  }
  
  // Method 4: Find first [ and last ] for array
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = text.slice(firstBracket, lastBracket + 1);
    try {
      JSON.parse(candidate);
      console.log(`[extractJsonFromText] Found JSON array in text`);
      return candidate;
    } catch {}
  }
  
  console.log(`[extractJsonFromText] No JSON found, returning original text`);
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const webhookPath = pathParts[pathParts.length - 1];

  console.log(`[Workflow Webhook v${FUNCTION_VERSION}] Received ${req.method} request for path: ${webhookPath}`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the webhook trigger by path
    const { data: trigger, error: triggerError } = await supabase
      .from('workflow_webhook_triggers')
      .select('*')
      .eq('webhook_path', webhookPath)
      .eq('is_active', true)
      .single();

    if (triggerError || !trigger) {
      console.log(`[Workflow Webhook] Trigger not found for path: ${webhookPath}`);
      return new Response(
        JSON.stringify({ error: 'Webhook not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔍 DEBUG: Log all trigger fields to diagnose response_mode issue
    console.log(`[Workflow Webhook] ========== TRIGGER DATA (v3) ==========`);
    console.log(`[Workflow Webhook] trigger.id: ${trigger.id}`);
    console.log(`[Workflow Webhook] trigger.webhook_path: ${trigger.webhook_path}`);
    console.log(`[Workflow Webhook] trigger.respond_mode: '${trigger.respond_mode}'`);
    console.log(`[Workflow Webhook] trigger.response_mode: '${trigger.response_mode}'`);
    console.log(`[Workflow Webhook] trigger.workflow_id: ${trigger.workflow_id}`);
    console.log(`[Workflow Webhook] All trigger keys: ${Object.keys(trigger).join(', ')}`);
    console.log(`[Workflow Webhook] ======================================`);

    // Check HTTP method
    if (trigger.http_method !== 'ALL' && trigger.http_method !== req.method) {
      console.log(`[Workflow Webhook] Method mismatch. Expected: ${trigger.http_method}, Got: ${req.method}`);
      return new Response(
        JSON.stringify({ error: `Method ${req.method} not allowed. Expected: ${trigger.http_method}` }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate authentication
    const authValid = await validateAuthentication(req, trigger);
    if (!authValid.valid) {
      console.log(`[Workflow Webhook] Auth failed: ${authValid.reason}`);
      return new Response(
        JSON.stringify({ error: authValid.reason }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limits
    const rateLimit = await checkRateLimit(supabase, trigger);
    if (!rateLimit.allowed) {
      console.log(`[Workflow Webhook] Rate limit exceeded for trigger: ${trigger.id}`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Maximum ${trigger.rate_limit_per_minute || 30} requests per minute`,
          retry_after: rateLimit.resetAt,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt || '',
          }
        }
      );
    }

    // Parse request data
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    
    console.log(`[Workflow Webhook] Content-Type: ${contentType}`);
    
    if (contentType.includes('application/json')) {
      try {
        body = await req.json();
        console.log(`[Workflow Webhook] Parsed JSON body:`, JSON.stringify(body).slice(0, 200));
      } catch (e) {
        console.log(`[Workflow Webhook] Failed to parse JSON:`, e);
        body = {};
      }
    } else if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        const formDataObj: Record<string, any> = {};
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            formDataObj[key] = {
              filename: value.name,
              type: value.type,
              size: value.size,
              _isFile: true
            };
          } else {
            formDataObj[key] = value;
          }
        }
        body = formDataObj;
        console.log(`[Workflow Webhook] Parsed multipart/form-data:`, JSON.stringify(body).slice(0, 200));
      } catch (e) {
        console.log(`[Workflow Webhook] Failed to parse form-data:`, e);
        body = {};
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await req.formData();
        body = Object.fromEntries(formData);
        console.log(`[Workflow Webhook] Parsed urlencoded:`, JSON.stringify(body).slice(0, 200));
      } catch (e) {
        console.log(`[Workflow Webhook] Failed to parse urlencoded:`, e);
        body = {};
      }
    } else if (contentType.includes('text/plain')) {
      try {
        body = { text: await req.text() };
        console.log(`[Workflow Webhook] Parsed text/plain:`, JSON.stringify(body).slice(0, 200));
      } catch (e) {
        console.log(`[Workflow Webhook] Failed to parse text:`, e);
        body = {};
      }
    } else {
      // Try to read as text for unknown content types
      try {
        const rawText = await req.text();
        if (rawText) {
          body = { raw: rawText };
          console.log(`[Workflow Webhook] Parsed raw text for unknown type:`, rawText.slice(0, 200));
        }
      } catch (e) {
        console.log(`[Workflow Webhook] Failed to read raw body:`, e);
        body = {};
      }
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const webhookData = {
      body,
      headers,
      query,
      method: req.method,
      path: webhookPath,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Workflow Webhook] Parsed data:`, JSON.stringify(webhookData).slice(0, 500));

    // Get workflow data
    if (!trigger.workflow_id) {
      console.log(`[Workflow Webhook] No workflow_id associated with trigger`);
      return new Response(
        JSON.stringify({ error: 'No workflow associated with this webhook' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', trigger.workflow_id)
      .eq('status', 'active')
      .single();

    if (workflowError || !workflow) {
      console.log(`[Workflow Webhook] Workflow not found or inactive: ${trigger.workflow_id}`);
      return new Response(
        JSON.stringify({ error: 'Workflow not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 🎯 CHECK RESPONSE MODE (NEW: sync, async, callback + legacy modes)
    // ============================================
    // Support both old 'respond_mode' and new 'response_mode' columns
    console.log(`[Workflow Webhook] 🔍 DEBUG - trigger.response_mode: '${trigger.response_mode}'`);
    console.log(`[Workflow Webhook] 🔍 DEBUG - trigger.respond_mode: '${trigger.respond_mode}'`);
    const responseMode = trigger.response_mode || trigger.respond_mode || 'async';
    console.log(`[Workflow Webhook] ✅ Final response_mode: '${responseMode}'`);

    // ============================================
    // SYNC MODE - Long-polling for ElevenLabs etc.
    // Now with BullMQ worker - worker processes, we poll for result
    // ============================================
    if (responseMode === 'sync') {
      console.log(`[Workflow Webhook] 🔄 SYNC MODE - Queueing to worker and waiting (max ${trigger.sync_timeout_seconds || 12}s)`);

      // Create pending log entry FIRST
      const { data: logEntry, error: logError } = await supabase
        .from('workflow_trigger_logs')
        .insert({
          webhook_trigger_id: trigger.id,
          workflow_id: trigger.workflow_id,
          user_id: trigger.user_id,
          request_method: req.method,
          request_headers: headers,
          request_body: body,
          request_query: query,
          response_status: null, // Pending - worker will update
          response_body: {
            pending: true,
            mode: 'sync',
            message: 'Waiting for workflow execution...',
            webhookData // Include webhook data for worker
          },
          execution_time_ms: 0,
          is_test: false,
        })
        .select('id')
        .single();

      if (logError || !logEntry) {
        console.error(`[Workflow Webhook] Failed to create log entry:`, logError);
        return new Response(
          JSON.stringify({ error: 'Failed to process webhook' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const logId = logEntry.id;
      console.log(`[Workflow Webhook] Created pending log: ${logId}`);

      // Update trigger stats
      await supabase
        .from('workflow_webhook_triggers')
        .update({
          total_triggers: (trigger.total_triggers || 0) + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq('id', trigger.id);

      // Queue the workflow execution to BullMQ worker
      // Worker will process and update the log entry with results
      const queueResult = await queueWorkflowExecution({
        workflowId: trigger.workflow_id,
        userId: trigger.user_id,
        triggerType: 'webhook',
        triggerData: webhookData,
        triggerId: trigger.id,
        logId: logId,
        respondMode: responseMode,
      });

      if (!queueResult.success) {
        console.warn(`[Workflow Webhook] Worker unavailable, falling back to frontend execution`);
      }

      // Poll for worker to complete (worker updates response_body)
      return await handleSyncMode(supabase, trigger, logId, startTime, corsHeaders);
    }

    // ============================================
    // ASYNC MODE (Default - Recommended)
    // Now with BullMQ worker integration for background execution
    // ============================================
    if (responseMode === 'async') {
      console.log(`[Workflow Webhook] 📤 ASYNC MODE - Queueing to BullMQ worker`);

      // Create log entry
      const { data: logEntry } = await supabase
        .from('workflow_trigger_logs')
        .insert({
          webhook_trigger_id: trigger.id,
          workflow_id: trigger.workflow_id,
          user_id: trigger.user_id,
          request_method: req.method,
          request_headers: headers,
          request_body: body,
          request_query: query,
          response_status: null, // Pending - worker will update
          response_body: {
            pending: true,
            mode: 'async',
            message: 'Webhook received. Workflow queued for background execution.',
            webhookData
          },
          execution_time_ms: 0,
          is_test: false,
        })
        .select('id')
        .single();

      const logId = logEntry?.id;

      // Update trigger stats
      await supabase
        .from('workflow_webhook_triggers')
        .update({
          total_triggers: (trigger.total_triggers || 0) + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq('id', trigger.id);

      // Queue the workflow execution to BullMQ worker
      // This runs in background - even if it fails, webhook data is saved
      const queueResult = await queueWorkflowExecution({
        workflowId: trigger.workflow_id,
        userId: trigger.user_id,
        triggerType: 'webhook',
        triggerData: webhookData,
        triggerId: trigger.id,
        logId: logId,
        respondMode: responseMode,
      });

      return new Response(
        JSON.stringify({
          status: 'accepted',
          message: queueResult.success
            ? 'Webhook received. Workflow queued for background execution.'
            : 'Webhook received. Workflow data saved (worker unavailable).',
          log_id: logId,
          job_id: queueResult.jobId,
          worker_available: queueResult.success,
          poll_url: logId ? `/functions/v1/workflow-webhook-response?log_id=${logId}` : undefined,
        }),
        {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ============================================
    // CALLBACK MODE - Worker will POST to callback URL when done
    // ============================================
    if (responseMode === 'callback' && trigger.callback_url) {
      console.log(`[Workflow Webhook] 📞 CALLBACK MODE - Worker will notify: ${trigger.callback_url}`);

      // Create log entry
      const { data: logEntry } = await supabase
        .from('workflow_trigger_logs')
        .insert({
          webhook_trigger_id: trigger.id,
          workflow_id: trigger.workflow_id,
          user_id: trigger.user_id,
          request_method: req.method,
          request_headers: headers,
          request_body: body,
          request_query: query,
          response_status: null,
          response_body: {
            pending: true,
            mode: 'callback',
            callback_url: trigger.callback_url,
            webhookData
          },
          execution_time_ms: 0,
          is_test: false,
        })
        .select('id')
        .single();

      const logId = logEntry?.id;

      // Update trigger stats
      await supabase
        .from('workflow_webhook_triggers')
        .update({
          total_triggers: (trigger.total_triggers || 0) + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq('id', trigger.id);

      // Queue the workflow execution to BullMQ worker
      const queueResult = await queueWorkflowExecution({
        workflowId: trigger.workflow_id,
        userId: trigger.user_id,
        triggerType: 'webhook',
        triggerData: { ...webhookData, _callbackUrl: trigger.callback_url },
        triggerId: trigger.id,
        logId: logId,
        respondMode: responseMode,
      });

      return new Response(
        JSON.stringify({
          status: 'accepted',
          message: queueResult.success
            ? 'Webhook received. Worker will notify callback URL when complete.'
            : 'Webhook received. Workflow data saved (worker unavailable).',
          log_id: logId,
          job_id: queueResult.jobId,
          worker_available: queueResult.success,
          callback_url: trigger.callback_url,
        }),
        {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ============================================
    // WEBHOOK_NODE MODE - Wait for "Respond to Webhook" node
    // This is similar to SYNC mode - we poll for the frontend response
    // Also handles 'last_node' mode which waits for the last node to finish
    // ============================================
    if (responseMode === 'using-node' || responseMode === 'webhook_node' || responseMode === 'last_node') {
      console.log(`[Workflow Webhook] 🔄 ${responseMode.toUpperCase()} MODE - Will wait for frontend response (max ${trigger.sync_timeout_seconds || 30}s)`);

      // Create pending log entry FIRST (same as sync mode)
      const { data: logEntry, error: logError } = await supabase
        .from('workflow_trigger_logs')
        .insert({
          webhook_trigger_id: trigger.id,
          workflow_id: trigger.workflow_id,
          user_id: trigger.user_id,
          request_method: req.method,
          request_headers: headers,
          request_body: body,
          request_query: query,
          response_status: null, // Pending - frontend will update via "Respond to Webhook" node
          response_body: {
            pending: true,
            mode: 'webhook_node',
            message: 'Waiting for workflow execution and Respond to Webhook node...',
            webhookData
          },
          execution_time_ms: 0,
          is_test: false,
        })
        .select('id')
        .single();

      if (logError || !logEntry) {
        console.error(`[Workflow Webhook] Failed to create log entry:`, logError);
        return new Response(
          JSON.stringify({ error: 'Failed to process webhook' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const logId = logEntry.id;
      console.log(`[Workflow Webhook] Created pending log for webhook_node mode: ${logId}`);

      // Update trigger stats
      await supabase
        .from('workflow_webhook_triggers')
        .update({
          total_triggers: (trigger.total_triggers || 0) + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq('id', trigger.id);

      // Queue the workflow execution to BullMQ worker
      // Worker will process and update the log entry with webhookResponse
      const queueResult = await queueWorkflowExecution({
        workflowId: trigger.workflow_id,
        userId: trigger.user_id,
        triggerType: 'webhook',
        triggerData: webhookData,
        triggerId: trigger.id,
        logId: logId,
        respondMode: responseMode,
      });

      if (!queueResult.success) {
        console.warn(`[Workflow Webhook] Worker unavailable for ${responseMode} mode, workflow may not execute`);
      } else {
        console.log(`[Workflow Webhook] ✅ Workflow queued to worker, job: ${queueResult.jobId}`);
      }

      // Poll for worker to complete (worker updates response_body with webhookResponse)
      return await handleSyncMode(supabase, trigger, logId, startTime, corsHeaders);
    }

    // ============================================
    // IMMEDIATELY MODE - Execute workflow synchronously
    // ============================================
    console.log(`[Workflow Webhook] ✅ respond_mode=immediately (v2.0) - Executing workflow synchronously`);
    console.log(`[Workflow Webhook] Executing workflow: ${workflow.name}`);
    const executionResult = await executeWorkflow(supabase, workflow, webhookData);

    // Log the trigger
    const executionTimeMs = Date.now() - startTime;
    await supabase
      .from('workflow_trigger_logs')
      .insert({
        webhook_trigger_id: trigger.id,
        workflow_id: trigger.workflow_id,
        user_id: trigger.user_id,
        request_method: req.method,
        request_headers: headers,
        request_body: body,
        request_query: query,
        response_status: executionResult.success ? 200 : 500,
        response_body: executionResult,
        execution_time_ms: executionTimeMs,
        is_test: false,
      });

    // If listening for test events, also save as test event for polling
    if (trigger.is_listening) {
      console.log(`[Workflow Webhook] is_listening is true, saving as test event for polling`);
      await supabase
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
          response_body: { received: true, test: true, webhookData },
          execution_time_ms: executionTimeMs,
          is_test: true,
        });
    }

    // Update trigger stats
    await supabase
      .from('workflow_webhook_triggers')
      .update({
        total_triggers: (trigger.total_triggers || 0) + 1,
        last_triggered_at: new Date().toISOString(),
      })
      .eq('id', trigger.id);

    // ============================================
    // 🎯 N8N-STYLE RESPONSE - Check for "Respond to Webhook" node first
    // ============================================
    console.log(`[Workflow Webhook] ========== PREPARING RESPONSE ==========`);
    console.log(`[Workflow Webhook] Execution success: ${executionResult.success}`);
    console.log(`[Workflow Webhook] Final output type: ${typeof executionResult.finalOutput}`);
    console.log(`[Workflow Webhook] Final output keys:`, Object.keys(executionResult.finalOutput || {}));
    
    if (!executionResult.success) {
      console.log(`[Workflow Webhook] ❌ Workflow failed, returning error`);
      return new Response(
        JSON.stringify({
          error: 'Workflow execution failed',
          details: executionResult.results,
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if there's a "Respond to Webhook" node that configured the response
    let responseToReturn = executionResult.finalOutput;
    let wasExtracted = false;
    let customStatusCode = 200;
    let customHeaders: Record<string, string> = {};
    let responseContentType = 'application/json';
    
    // Check for webhookResponse (from "Respond to Webhook" node)
    if (executionResult.finalOutput && executionResult.finalOutput.webhookResponse !== undefined) {
      console.log(`[Workflow Webhook] ✅ Found "Respond to Webhook" configuration`);
      responseToReturn = executionResult.finalOutput.webhookResponse;
      customStatusCode = executionResult.finalOutput.webhookStatusCode || 200;
      
      // Get custom headers if any
      if (executionResult.finalOutput.webhookHeaders) {
        customHeaders = executionResult.finalOutput.webhookHeaders;
        console.log(`[Workflow Webhook] Custom headers:`, customHeaders);
      }
      
      // Determine content type from responseType
      const respType = executionResult.finalOutput.webhookResponseType || 'json';
      if (respType === 'xml') {
        responseContentType = 'application/xml';
      } else if (respType === 'text') {
        responseContentType = 'text/html'; // n8n sends text as HTML by default
      } else {
        responseContentType = 'application/json';
      }
      
      wasExtracted = true;
      console.log(`[Workflow Webhook] Using custom response from "Respond to Webhook" node`);
      console.log(`[Workflow Webhook] Custom status code: ${customStatusCode}`);
      console.log(`[Workflow Webhook] Custom content type: ${responseContentType}`);
    }
    // Fallback: Check for httpResponse (from HTTP Request node)
    else if (executionResult.finalOutput && executionResult.finalOutput.httpResponse !== undefined) {
      console.log(`[Workflow Webhook] ✅ Found httpResponse field - extracting it`);
      responseToReturn = executionResult.finalOutput.httpResponse;
      wasExtracted = true;
      
      // Detect if it's XML
      const isXml = typeof responseToReturn === 'string' && responseToReturn.trim().startsWith('<?xml');
      responseContentType = isXml ? 'application/xml' : 'application/json';
    } 
    // Fallback: Check for response field
    else if (executionResult.finalOutput && executionResult.finalOutput.response !== undefined) {
      console.log(`[Workflow Webhook] ✅ Found response field - extracting it`);
      responseToReturn = executionResult.finalOutput.response;
      wasExtracted = true;
      
      const isXml = typeof responseToReturn === 'string' && responseToReturn.trim().startsWith('<?xml');
      responseContentType = isXml ? 'application/xml' : 'application/json';
    } else {
      console.log(`[Workflow Webhook] ⚠️ No special response found, returning entire finalOutput`);
    }

    console.log(`[Workflow Webhook] Response extracted: ${wasExtracted}`);
    console.log(`[Workflow Webhook] Response type: ${typeof responseToReturn}`);
    console.log(`[Workflow Webhook] Response length: ${typeof responseToReturn === 'string' ? responseToReturn.length : JSON.stringify(responseToReturn).length} chars`);
    console.log(`[Workflow Webhook] Response preview (first 500 chars):`, 
      typeof responseToReturn === 'string' 
        ? responseToReturn.slice(0, 500) 
        : JSON.stringify(responseToReturn).slice(0, 500)
    );

    console.log(`[Workflow Webhook] Final Content-Type: ${responseContentType}`);
    console.log(`[Workflow Webhook] Final Status Code: ${customStatusCode}`);
    console.log(`[Workflow Webhook] ========== SENDING RESPONSE TO CALLER ==========`);
    
    // Prepare final response body
    const finalResponseBody = typeof responseToReturn === 'string' 
      ? responseToReturn 
      : JSON.stringify(responseToReturn);
    
    console.log(`[Workflow Webhook] Final response body (first 500 chars): ${finalResponseBody.slice(0, 500)}`);
    
    return new Response(
      finalResponseBody,
      {
        status: customStatusCode,
        headers: { ...corsHeaders, ...customHeaders, 'Content-Type': responseContentType, 'X-Function-Version': FUNCTION_VERSION }
      }
    );

  } catch (error) {
    console.error('[Workflow Webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage, version: FUNCTION_VERSION }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Function-Version': FUNCTION_VERSION } }
    );
  }
});

async function validateAuthentication(
  req: Request, 
  trigger: any
): Promise<{ valid: boolean; reason?: string }> {
  const authType = trigger.auth_type || 'none';
  const authConfig = trigger.auth_config || {};

  if (authType === 'none') {
    return { valid: true };
  }

  if (authType === 'basic') {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return { valid: false, reason: 'Basic authentication required' };
    }
    
    const base64Credentials = authHeader.slice(6);
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');
    
    if (username !== authConfig.username || password !== authConfig.password) {
      return { valid: false, reason: 'Invalid credentials' };
    }
    return { valid: true };
  }

  if (authType === 'header') {
    const headerName = authConfig.headerName || 'X-Webhook-Auth';
    const headerValue = req.headers.get(headerName.toLowerCase());
    
    if (headerValue !== authConfig.headerValue) {
      return { valid: false, reason: `Invalid or missing ${headerName} header` };
    }
    return { valid: true };
  }

  if (authType === 'jwt') {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, reason: 'JWT token required' };
    }
    return { valid: true };
  }

  return { valid: true };
}

// Helper to resolve dynamic expressions like {{$json.field}}, {{body.field}}, or {{JSON.stringify($json.body)}}
function resolveExpression(template: string, data: any): string {
  if (!template || typeof template !== 'string') return template;
  
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
    const expr = expression.trim();
    
    // Handle JSON.stringify($json.field) expressions
    const stringifyMatch = expr.match(/JSON\.stringify\s*\(\s*([^)]+)\s*\)/i);
    if (stringifyMatch) {
      const innerPath = stringifyMatch[1].trim();
      let path = innerPath;
      if (path.startsWith('$json.')) {
        path = path.slice(6);
      } else if (path === '$json') {
        // Entire data object
        console.log(`[resolveExpression] JSON.stringify($json) - returning entire data`);
        return JSON.stringify(data);
      }
      
      const parts = path.split('.');
      let value: any = data;
      
      for (const part of parts) {
        if (value === null || value === undefined) break;
        value = value[part];
      }
      
      console.log(`[resolveExpression] JSON.stringify(${innerPath}) resolved to: ${JSON.stringify(value)?.slice(0, 200)}`);
      return value !== null && value !== undefined ? JSON.stringify(value) : '';
    }
    
    // Handle $json.field or just field paths
    let path = expr;
    if (path.startsWith('$json.')) {
      path = path.slice(6);
    }
    
    // Navigate the path
    const parts = path.split('.');
    let value: any = data;
    
    for (const part of parts) {
      if (value === null || value === undefined) break;
      
      // Handle array notation like [0]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        value = value[arrayMatch[1]];
        if (Array.isArray(value)) {
          value = value[parseInt(arrayMatch[2])];
        }
      } else {
        value = value[part];
      }
    }
    
    if (value === null || value === undefined) {
      return '';
    }
    
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

async function executeWorkflow(
  supabase: any,
  workflow: any,
  webhookData: any
): Promise<{ success: boolean; results: any[]; finalOutput: any }> {
  const nodes = workflow.nodes || [];
  const connections = workflow.connections || [];
  const results: any[] = [];
  let finalOutput: any = webhookData; // Track the final output data

  console.log(`[Workflow Execute] Starting workflow with ${nodes.length} nodes and ${connections.length} connections`);

  // Find trigger node
  const triggerNode = nodes.find((n: any) => {
    if (n.type === 'trigger') return true;
    const icon = n.icon?.toLowerCase() || '';
    const label = n.label?.toLowerCase() || '';
    return icon === 'webhook' || icon === 'webhook-trigger' || 
           label.includes('webhook') || label.includes('receive http');
  });

  if (!triggerNode) {
    console.log('[Workflow Execute] No trigger node found');
    return { success: false, results: [{ error: 'No trigger node found' }], finalOutput: null };
  }

  // Get first connected nodes
  const firstNodeIds = connections
    .filter((c: any) => c.from === triggerNode.id)
    .map((c: any) => c.to);

  console.log(`[Workflow Execute] Starting execution from ${firstNodeIds.length} connected nodes`);

  // Execute each branch
  for (const nodeId of firstNodeIds) {
    try {
      const result = await executeNode(supabase, nodes, connections, nodeId, webhookData);
      results.push(result);
      // Capture the final output from the last executed node
      if (result.outputData) {
        finalOutput = result.outputData;
      }
    } catch (error: any) {
      console.error(`[Workflow Execute] Error executing node ${nodeId}:`, error);
      results.push({ nodeId, error: error.message });
    }
  }

  const allSuccess = results.every((r: any) => !r.error);
  console.log(`[Workflow Execute] Workflow complete. Success: ${allSuccess}. Final output keys: ${Object.keys(finalOutput || {})}`);
  return { success: allSuccess, results, finalOutput };
}

async function executeNode(
  supabase: any,
  nodes: any[],
  connections: any[],
  nodeId: string,
  inputData: any
): Promise<any> {
  const node = nodes.find((n: any) => n.id === nodeId);
  if (!node) {
    return { nodeId, error: 'Node not found' };
  }

  console.log(`[Workflow Execute] Executing node: ${node.label} (${node.icon})`);
  console.log(`[Workflow Execute] Node config:`, JSON.stringify(node.config || {}).slice(0, 500));
  console.log(`[Workflow Execute] Input data keys:`, Object.keys(inputData || {}));

  const icon = node.icon?.toLowerCase() || '';
  const label = node.label?.toLowerCase() || '';
  let outputData = inputData;
  let nodeResult: any = { nodeId, label: node.label, icon: node.icon };

  // ============================================
  // HTTP REQUEST NODE HANDLER
  // ============================================
  if (icon === 'http-request' || icon === 'http_request' || icon === 'globe' || 
      label.includes('http request') || label.includes('http-request')) {
    const config = node.config || {};
    console.log(`[HTTP Request] Processing with config:`, JSON.stringify(config));
    
    if (!config.url) {
      nodeResult.error = 'HTTP Request: URL is required';
      console.log(`[HTTP Request] Error: ${nodeResult.error}`);
    } else {
      try {
        // Resolve URL with dynamic expressions
        let processedUrl = resolveExpression(config.url, inputData);
        console.log(`[HTTP Request] Resolved URL: ${processedUrl}`);
        
        // Build URL with query parameters
        const urlObj = new URL(processedUrl);
        const queryParams = config.queryParams || [];
        for (const param of queryParams) {
          if (param.name && param.value) {
            const resolvedValue = resolveExpression(param.value, inputData);
            urlObj.searchParams.set(param.name, resolvedValue);
          }
        }
        
        // Build headers
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        const headerParams = config.headers || [];
        for (const header of headerParams) {
          if (header.name && header.value) {
            const resolvedValue = resolveExpression(header.value, inputData);
            requestHeaders[header.name] = resolvedValue;
          }
        }
        
        // Add authentication header
        if (config.authentication === 'bearer' && config.bearerToken) {
          requestHeaders['Authorization'] = `Bearer ${resolveExpression(config.bearerToken, inputData)}`;
        } else if (config.authentication === 'basic' && config.basicUsername && config.basicPassword) {
          const credentials = btoa(`${config.basicUsername}:${config.basicPassword}`);
          requestHeaders['Authorization'] = `Basic ${credentials}`;
        } else if (config.authentication === 'apiKey' && config.apiKeyName && config.apiKeyValue) {
          if (config.apiKeyLocation === 'header') {
            requestHeaders[config.apiKeyName] = resolveExpression(config.apiKeyValue, inputData);
          } else {
            urlObj.searchParams.set(config.apiKeyName, resolveExpression(config.apiKeyValue, inputData));
          }
        }
        
        // Build request body
        const method = (config.method || 'GET').toUpperCase();
        let requestBody: string | undefined = undefined;
        
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          // Check if bodySource is 'workflow' - send data from previous node (Groq Analysis)
          if (config.bodySource === 'workflow') {
            console.log(`[HTTP Request] bodySource=workflow - using input data from previous node`);
            console.log(`[HTTP Request] Input data keys:`, Object.keys(inputData));
            
            // Priority: analysis (from Groq) > rawAnalysis > entire inputData
            if (inputData.analysis) {
              console.log(`[HTTP Request] Found 'analysis' field, extracting JSON...`);
              // Extract pure JSON from analysis (may contain explanatory text + JSON)
              if (typeof inputData.analysis === 'string') {
                const extractedJson = extractJsonFromText(inputData.analysis);
                console.log(`[HTTP Request] Extracted JSON (first 300 chars): ${extractedJson.slice(0, 300)}`);
                requestBody = extractedJson;
              } else {
                requestBody = JSON.stringify(inputData.analysis);
              }
            } else if (inputData.rawAnalysis) {
              console.log(`[HTTP Request] Found 'rawAnalysis' field, using as body`);
              requestBody = typeof inputData.rawAnalysis === 'string' 
                ? inputData.rawAnalysis 
                : JSON.stringify(inputData.rawAnalysis);
            } else {
              console.log(`[HTTP Request] No analysis field found, using entire inputData`);
              requestBody = JSON.stringify(inputData);
            }
          } else if (
            (config.bodyType === 'json' || config.bodyContentType === 'json' || config.bodySource === 'fixed') && 
            (config.bodyJson || config.jsonBody)
          ) {
            // Support both field names: bodyJson (frontend) and jsonBody (legacy)
            // Also support bodyContentType (UI uses this) and bodySource === 'fixed'
            const bodyContent = config.bodyJson || config.jsonBody;
            console.log(`[HTTP Request] Body config detection: bodyType=${config.bodyType}, bodyContentType=${config.bodyContentType}, bodySource=${config.bodySource}, bodyJson exists=${!!config.bodyJson}`);
            console.log(`[HTTP Request] Using JSON body from config: ${bodyContent?.slice?.(0, 200) || bodyContent}`);
            let bodyStr = bodyContent;
            bodyStr = resolveExpression(bodyStr, inputData);
            console.log(`[HTTP Request] Resolved body (first 500 chars): ${bodyStr?.slice?.(0, 500) || bodyStr}`);
            
            // Extract pure JSON from text that may contain explanatory text from Groq
            const extractedBody = extractJsonFromText(bodyStr);
            console.log(`[HTTP Request] Extracted JSON (first 500 chars): ${extractedBody?.slice?.(0, 500) || extractedBody}`);
            requestBody = extractedBody;
            
            // Validate JSON before sending
            try {
              JSON.parse(requestBody);
              console.log(`[HTTP Request] ✅ Valid JSON body confirmed`);
            } catch (e) {
              console.log(`[HTTP Request] ⚠️ Body is not valid JSON, sending as-is`);
            }
          } else if (config.bodyType === 'form' && config.formParams) {
            const formData: Record<string, string> = {};
            for (const param of config.formParams) {
              if (param.name && param.value) {
                formData[param.name] = resolveExpression(param.value, inputData);
              }
            }
            requestBody = new URLSearchParams(formData).toString();
            requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
          } else if (config.body) {
            // Raw body or simple body
            requestBody = resolveExpression(config.body, inputData);
          } else {
            // Default: send input data as body
            console.log(`[HTTP Request] No body config, defaulting to inputData`);
            requestBody = JSON.stringify(inputData);
          }
        }
        
        console.log(`[HTTP Request] Making ${method} request to: ${urlObj.toString()}`);
        console.log(`[HTTP Request] Headers:`, JSON.stringify(requestHeaders));
        if (requestBody) {
          console.log(`[HTTP Request] Body:`, requestBody.slice(0, 500));
        }

        // ============================================
        // ROUTE THROUGH SERVER PROXY (IP whitelisted)
        // Instead of direct fetch from Supabase, we proxy through the server
        // which has a whitelisted IP for external APIs like BusSystem.eu
        // ============================================
        const SERVER_PROXY_URL = 'https://app.agentauto.app/scraper/proxy';

        console.log(`[HTTP Request] 🔀 Routing through server proxy: ${SERVER_PROXY_URL}`);

        const proxyResponse = await fetch(SERVER_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: urlObj.toString(),
            method: method,
            headers: requestHeaders,
            body: requestBody,
            timeout: 30,
          }),
        });

        const proxyResult = await proxyResponse.json();

        console.log(`[HTTP Request] Proxy response success: ${proxyResult.success}`);
        console.log(`[HTTP Request] Proxy response status: ${proxyResult.status}`);

        // Extract data from proxy response
        const responseStatus = proxyResult.status || 0;
        const responseStatusText = proxyResult.statusText || '';
        const responseHeaders: Record<string, string> = proxyResult.headers || {};
        let responseData: any = proxyResult.data;

        console.log(`[HTTP Request] Response status: ${responseStatus}`);
        console.log(`[HTTP Request] Response data:`, JSON.stringify(responseData).slice(0, 500));

        nodeResult.success = proxyResult.success;
        nodeResult.status = responseStatus;
        nodeResult.statusText = responseStatusText;
        nodeResult.responseData = responseData;
        
        // Pass data to next node
        outputData = {
          ...inputData,
          httpResponse: responseData,
          httpStatus: responseStatus,
          httpHeaders: responseHeaders,
          // Also spread response data at top level for easier access
          ...(typeof responseData === 'object' ? responseData : { response: responseData }),
        };
        
        if (!proxyResult.success) {
          nodeResult.error = proxyResult.message || `HTTP ${responseStatus}: ${responseStatusText}`;
        }

      } catch (error: any) {
        nodeResult.error = `HTTP Request failed: ${error.message}`;
        console.error(`[HTTP Request] Error:`, error);
      }
    }
  }

  // ============================================
  // TELEGRAM NODE HANDLER
  // ============================================
  if (icon === 'telegram' || label.includes('telegram')) {
    const config = node.config || {};
    
    if (!config.botToken || !config.chatId) {
      nodeResult.error = 'Telegram not configured (missing botToken or chatId)';
      console.log(`[Telegram] ${nodeResult.error}`);
    } else {
      // Build message from selected fields or input data
      let messageText = '';
      const selectedFields = config.selectedFields || [];
      const droppedFields = config.droppedFields || [];
      
      // Helper to clean markdown artifacts
      const cleanText = (text: string): string => {
        if (!text) return '';
        return text
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .replace(/\*\*/g, '')
          .replace(/^#+\s*/gm, '')
          .trim();
      };
      
      if (droppedFields.length > 0) {
        // Use dropped fields from previous nodes
        const lines: string[] = [];
        for (const field of droppedFields) {
          let value = field.value;
          
          // Resolve from input data if it's an expression
          if (typeof value === 'string' && value.includes('{{')) {
            value = resolveExpression(value, inputData);
          } else if (field.key && inputData[field.key]) {
            value = inputData[field.key];
          } else if (field.key && inputData.analysis && field.key.includes('analysis')) {
            value = inputData.analysis;
          }
          
          if (typeof value === 'object') {
            value = JSON.stringify(value, null, 2);
          }
          
          lines.push(cleanText(String(value || '')));
        }
        messageText = lines.filter(l => l).join('\n\n');
      } else if (selectedFields.length > 0) {
        // Use selected fields from webhook data
        const fieldLabels: Record<string, string> = {
          body: '📦 Body',
          headers: '📋 Headers',
          query: '❓ Query',
          method: '🔧 Method',
          timestamp: '🕐 Timestamp',
          analysis: '🤖 Analysis',
          httpResponse: '🌐 HTTP Response',
        };
        
        for (const field of selectedFields) {
          const label = fieldLabels[field] || field;
          let value = inputData[field];
          
          if (typeof value === 'object') {
            value = JSON.stringify(value, null, 2);
          }
          
          if (value) {
            messageText += `${label}:\n${cleanText(String(value))}\n\n`;
          }
        }
      } else if (inputData.analysis) {
        // If previous node produced analysis, send that
        messageText = cleanText(String(inputData.analysis));
      } else if (inputData.httpResponse) {
        // If previous node made HTTP request, send response
        messageText = typeof inputData.httpResponse === 'object' 
          ? JSON.stringify(inputData.httpResponse, null, 2)
          : String(inputData.httpResponse);
      } else {
        // Default: send entire input data
        messageText = `🔔 Workflow Data:\n${JSON.stringify(inputData, null, 2)}`;
      }
      
      // Add custom text prefix if configured
      if (config.text) {
        messageText = `${config.text}\n\n${messageText}`;
      }

      console.log(`[Telegram] Sending message (${messageText.length} chars)`);

      try {
        const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chatId,
            text: messageText.slice(0, 4096), // Telegram limit
            parse_mode: config.parseMode !== 'none' ? config.parseMode : undefined,
          }),
        });

        const result = await response.json();
        
        if (result.ok) {
          nodeResult.success = true;
          nodeResult.telegram_message_id = result.result?.message_id;
          console.log(`[Telegram] Message sent successfully`);
        } else {
          nodeResult.error = result.description || 'Unknown Telegram error';
          console.log(`[Telegram] Error: ${nodeResult.error}`);
        }
      } catch (error: any) {
        nodeResult.error = error.message;
        console.error(`[Telegram] Fetch error:`, error);
      }
    }
    
    outputData = { ...inputData, telegramSent: nodeResult.success || false };
  }

  // ============================================
  // GROQ ANALYSIS NODE HANDLER
  // ============================================
  if (icon === 'groq' || label.includes('groq') || label.includes('analysis')) {
    const config = node.config || {};
    // Get prompt and resolve dynamic expressions like {{ JSON.stringify($json.body) }}
    let prompt = config.prompt || config.customPrompt || 'Analyze this data';
    const originalPrompt = prompt;
    prompt = resolveExpression(prompt, inputData);
    
    console.log(`[Groq] Original prompt: ${originalPrompt.slice(0, 200)}...`);
    console.log(`[Groq] Resolved prompt: ${prompt.slice(0, 500)}...`);
    
    const groqKey = Deno.env.get('GROQ-KEY') || Deno.env.get('GROQ_API_KEY');
    
    if (!groqKey) {
      nodeResult.error = 'Groq API key not configured';
      console.log(`[Groq] ${nodeResult.error}`);
    } else {
      try {
        // Prepare data for analysis - only append if prompt doesn't already contain data
        let dataToAnalyze = inputData;
        if (inputData.httpResponse) {
          dataToAnalyze = inputData.httpResponse;
        } else if (inputData.body) {
          dataToAnalyze = inputData.body;
        }
        
        // Check if prompt already contains resolved data (from template)
        const promptHasData = prompt !== originalPrompt && prompt.length > originalPrompt.length + 50;
        console.log(`[Groq] Prompt has embedded data: ${promptHasData}`);
        
        // Build user message - don't duplicate data if already in prompt
        const userContent = promptHasData 
          ? prompt 
          : `${prompt}\n\nData to analyze:\n${JSON.stringify(dataToAnalyze, null, 2)}`;
        
        console.log(`[Groq] Sending to API (${userContent.length} chars)`);
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that analyzes data and provides structured responses.',
              },
              {
                role: 'user',
                content: userContent,
              },
            ],
            temperature: config.temperature || 0.7,
          }),
        });

        const result = await response.json();
        
        if (result.choices?.[0]?.message?.content) {
          nodeResult.success = true;
          nodeResult.analysis = result.choices[0].message.content;
          outputData = {
            ...inputData,
            analysis: result.choices[0].message.content,
            rawAnalysis: result.choices[0].message.content,
          };
          console.log(`[Groq] Analysis complete (${result.choices[0].message.content.length} chars)`);
        } else {
          nodeResult.error = result.error?.message || 'No response from Groq';
          console.log(`[Groq] Error: ${nodeResult.error}`);
        }
      } catch (error: any) {
        nodeResult.error = error.message;
        console.error(`[Groq] Error:`, error);
      }
    }
  }

  // ============================================
  // INFOBIP SMS NODE HANDLER
  // ============================================
  if (icon === 'infobip' || label.includes('infobip') || label.includes('sms')) {
    const config = node.config || {};
    const infobipApiKey = Deno.env.get('INFOBIP_API_KEY');
    const infobipBaseUrl = Deno.env.get('INFOBIP_BASE_URL') || 'https://api.infobip.com';
    
    if (!infobipApiKey) {
      nodeResult.error = 'Infobip API key not configured';
    } else if (!config.to || !config.text) {
      nodeResult.error = 'Infobip: Phone number (to) and message text required';
    } else {
      try {
        const toNumber = resolveExpression(config.to, inputData);
        const messageText = resolveExpression(config.text, inputData);
        
        console.log(`[Infobip] Sending SMS to: ${toNumber}`);
        
        const response = await fetch(`${infobipBaseUrl}/sms/2/text/advanced`, {
          method: 'POST',
          headers: {
            'Authorization': `App ${infobipApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{
              from: config.from || 'Agentauto',
              destinations: [{ to: toNumber }],
              text: messageText,
            }],
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          nodeResult.success = true;
          nodeResult.smsResult = result;
          console.log(`[Infobip] SMS sent successfully`);
        } else {
          nodeResult.error = result.requestError?.serviceException?.text || 'SMS sending failed';
        }
        
        outputData = { ...inputData, smsSent: nodeResult.success || false, smsResult: result };
      } catch (error: any) {
        nodeResult.error = error.message;
        console.error(`[Infobip] Error:`, error);
      }
    }
  }

  // ============================================
  // RESPOND TO WEBHOOK NODE HANDLER
  // ============================================
  if (icon === 'respond-to-webhook' || icon === 'respond_to_webhook' || 
      label.includes('respond to webhook') || label.includes('respond-to-webhook')) {
    const config = node.config || {};
    console.log(`[Respond to Webhook] ========== PROCESSING ==========`);
    console.log(`[Respond to Webhook] Config:`, JSON.stringify(config));
    console.log(`[Respond to Webhook] Available input data keys:`, Object.keys(inputData));
    console.log(`[Respond to Webhook] Input httpResponse exists:`, inputData.httpResponse !== undefined);
    console.log(`[Respond to Webhook] Input analysis exists:`, inputData.analysis !== undefined);
    
    // Check if httpResponse contains an API error
    let apiError: string | null = null;
    if (inputData.httpResponse && typeof inputData.httpResponse === 'string') {
      const errorMatch = inputData.httpResponse.match(/<error>([^<]+)<\/error>/i);
      if (errorMatch) {
        apiError = errorMatch[1];
        console.log(`[Respond to Webhook] ⚠️ API ERROR DETECTED: ${apiError}`);
      }
    }
    
    const respondWith = config.respondWith || 'firstIncomingItem';
    const statusCode = config.responseCode || 200;
    const headers = config.responseHeaders || [];
    
    let responseBody: any;
    let responseType = 'json'; // Track if response is xml or json
    
    if (respondWith === 'noData') {
      console.log(`[Respond to Webhook] Mode: noData - sending empty response`);
      responseBody = null;
    } else if (respondWith === 'allIncomingItems') {
      console.log(`[Respond to Webhook] Mode: allIncomingItems - returning array of items`);
      responseBody = [inputData];
    } else if (respondWith === 'firstIncomingItem') {
      console.log(`[Respond to Webhook] Mode: firstIncomingItem - returning first item`);
      responseBody = inputData;
  } else if (respondWith === 'json' || respondWith === 'text') {
      console.log(`[Respond to Webhook] Mode: ${respondWith} - resolving expression`);
      const expression = config.responseBody || '{{ $json }}';
      console.log(`[Respond to Webhook] Expression: ${expression}`);
      
      // Resolve the expression
      let resolved = resolveExpression(expression, inputData);
      console.log(`[Respond to Webhook] Resolved (first 300 chars): ${resolved.slice(0, 300)}`);
      
      // ============================================
      // FALLBACK LOGIC: If expression resolved to empty string, try fallbacks
      // ============================================
      if (!resolved || resolved === '' || resolved === '(data not found)') {
        console.log(`[Respond to Webhook] ⚠️ Expression resolved to empty/not found. Trying fallbacks...`);
        console.log(`[Respond to Webhook] Available input data keys:`, Object.keys(inputData));
        
        // Fallback 1: Try httpResponse (from HTTP Request node)
        if (inputData.httpResponse !== undefined) {
          console.log(`[Respond to Webhook] ✅ Fallback: Using httpResponse`);
          resolved = typeof inputData.httpResponse === 'object' 
            ? JSON.stringify(inputData.httpResponse) 
            : String(inputData.httpResponse);
        }
        // Fallback 2: Try analysis (from Groq node)
        else if (inputData.analysis !== undefined) {
          console.log(`[Respond to Webhook] ✅ Fallback: Using analysis`);
          resolved = typeof inputData.analysis === 'object' 
            ? JSON.stringify(inputData.analysis) 
            : String(inputData.analysis);
        }
        // Fallback 3: Return entire inputData as JSON
        else {
          console.log(`[Respond to Webhook] ✅ Fallback: Using entire inputData`);
          resolved = JSON.stringify(inputData);
        }
        
        console.log(`[Respond to Webhook] Fallback resolved (first 300 chars): ${resolved.slice(0, 300)}`);
      }
      
      // Check if the resolved value is XML
      if (typeof resolved === 'string' && resolved.trim().startsWith('<?xml')) {
        console.log(`[Respond to Webhook] Detected XML response`);
        responseBody = resolved;
        responseType = 'xml';
      } else {
        // Try to parse as JSON if it looks like JSON
        try {
          responseBody = JSON.parse(resolved);
          console.log(`[Respond to Webhook] Parsed expression as JSON`);
        } catch {
          // Keep as string if not valid JSON
          responseBody = resolved;
          console.log(`[Respond to Webhook] Using expression result as string`);
        }
      }
    }
    
    console.log(`[Respond to Webhook] Response type: ${responseType}`);
    console.log(`[Respond to Webhook] Response preview:`, 
      responseBody === null 
        ? '(null)' 
        : typeof responseBody === 'string' 
          ? responseBody.slice(0, 500) 
          : JSON.stringify(responseBody).slice(0, 500)
    );
    
    nodeResult.success = true;
    nodeResult.responseBody = responseBody;
    nodeResult.statusCode = statusCode;
    nodeResult.headers = headers;
    nodeResult.isWebhookResponse = true;
    
    // Build custom headers object
    const customHeaders: Record<string, string> = {};
    for (const header of headers) {
      if (header.name && header.value) {
        customHeaders[header.name] = header.value;
      }
    }
    
    outputData = {
      ...inputData,
      webhookResponse: responseBody,
      webhookResponseType: responseType,
      webhookStatusCode: statusCode,
      webhookHeaders: customHeaders,
    };
    
    nodeResult.outputData = outputData;
    
    console.log(`[Respond to Webhook] ✅ Response configured successfully`);
    console.log(`[Respond to Webhook] Status: ${statusCode}, Type: ${responseType}`);
    console.log(`[Respond to Webhook] ========== COMPLETE ==========`);
    
    // Don't continue to next nodes - this is the final response
    return nodeResult;
  }

  // ============================================
  // END/STOP NODE HANDLER
  // ============================================
  if (icon === 'end' || icon === 'stop' || label.includes('end') || label.includes('stop')) {
    console.log(`[End Node] Workflow execution complete. Output data keys: ${Object.keys(outputData || {})}`);
    nodeResult.success = true;
    nodeResult.message = 'Workflow completed';
    nodeResult.outputData = outputData; // Return the final data
    // Don't continue to child nodes
    return nodeResult;
  }

  // ============================================
  // EXECUTE NEXT NODES IN CHAIN
  // ============================================
  const nextNodeIds = connections
    .filter((c: any) => c.from === nodeId)
    .map((c: any) => c.to);

  console.log(`[Workflow Execute] Node ${node.label} has ${nextNodeIds.length} next nodes`);

  const childResults: any[] = [];
  for (const nextNodeId of nextNodeIds) {
    console.log(`[Workflow Execute] Executing next node: ${nextNodeId}`);
    const childResult = await executeNode(supabase, nodes, connections, nextNodeId, outputData);
    childResults.push(childResult);
    // Propagate outputData from child if present
    if (childResult.outputData) {
      nodeResult.outputData = childResult.outputData;
    }
  }

  if (childResults.length > 0) {
    nodeResult.children = childResults;
  }

  // If no children or this is the last node, set outputData
  if (nextNodeIds.length === 0) {
    nodeResult.outputData = outputData;
  }

  return nodeResult;
}
