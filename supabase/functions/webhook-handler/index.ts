// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface WebhookConfig {
  id: string;
  user_id: string;
  webhook_url: string;
  webhook_secret?: string;
  webhook_name: string;
  description?: string;
  is_active: boolean;
  webhook_events: string[];
  webhook_headers: Record<string, string>;
  webhook_timeout: number;
  retry_attempts: number;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
}

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  webhook_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const webhookId = pathParts[pathParts.length - 1];

    if (!webhookId) {
      return new Response(
        JSON.stringify({ error: 'Webhook ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get webhook configuration
    const { data: webhookConfig, error: configError } = await supabaseClient
      .from('webhook_configs')
      .select('*')
      .eq('id', webhookId)
      .eq('is_active', true)
      .single();

    if (configError || !webhookConfig) {
      console.error('Webhook config error:', configError);
      return new Response(
        JSON.stringify({ error: 'Webhook not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request payload
    let requestPayload: any = {};
    let requestMethod = req.method;
    
    try {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          requestPayload = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await req.formData();
          requestPayload = Object.fromEntries(formData);
        } else {
          requestPayload = { body: await req.text() };
        }
      } else if (req.method === 'GET') {
        // For GET requests, capture query parameters
        requestPayload = Object.fromEntries(url.searchParams);
      }
    } catch (error) {
      console.error('Error parsing request payload:', error);
      requestPayload = { error: 'Failed to parse request payload' };
    }

    // Prepare webhook payload to forward
    const webhookPayload: WebhookPayload = {
      event: requestPayload.event || 'webhook_triggered',
      data: requestPayload,
      timestamp: new Date().toISOString(),
      webhook_id: webhookId
    };

    // Prepare headers for the outgoing request
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kalina-Webhook/1.0',
      ...webhookConfig.webhook_headers
    };

    // Add webhook secret as signature if configured
    if (webhookConfig.webhook_secret) {
      const signature = await createSignature(
        JSON.stringify(webhookPayload), 
        webhookConfig.webhook_secret
      );
      forwardHeaders['X-Kalina-Signature'] = signature;
    }

    const startTime = Date.now();
    let responseStatus = 0;
    let responseBody = '';
    let errorMessage: string | null = null;

    try {
      // Forward the webhook with retry logic
      let lastError: Error | null = null;
      let attempts = 0;
      const maxAttempts = webhookConfig.retry_attempts || 3;

      while (attempts < maxAttempts) {
        attempts++;
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), webhookConfig.webhook_timeout * 1000);

          const response = await fetch(webhookConfig.webhook_url, {
            method: 'POST',
            headers: forwardHeaders,
            body: JSON.stringify(webhookPayload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          
          responseStatus = response.status;
          responseBody = await response.text();

          // If successful (2xx status), break the retry loop
          if (response.status >= 200 && response.status < 300) {
            break;
          } else {
            lastError = new Error(`HTTP ${response.status}: ${responseBody}`);
          }
        } catch (error) {
          lastError = error as Error;
          console.error(`Webhook attempt ${attempts} failed:`, error);
          
          // If not the last attempt, wait before retrying
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          }
        }
      }

      if (lastError && attempts >= maxAttempts) {
        throw lastError;
      }

    } catch (error) {
      console.error('Webhook forwarding failed:', error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      responseStatus = 0;
      responseBody = '';
    }

    const responseTime = Date.now() - startTime;
    const isSuccess = responseStatus >= 200 && responseStatus < 300;

    // Log the webhook call
    const { error: logError } = await supabaseClient
      .from('webhook_logs')
      .insert({
        webhook_config_id: webhookId,
        user_id: webhookConfig.user_id,
        request_method: requestMethod,
        request_payload: requestPayload,
        request_headers: Object.fromEntries(req.headers),
        response_status: responseStatus,
        response_body: responseBody.substring(0, 1000), // Limit response body size
        response_time_ms: responseTime,
        error_message: errorMessage,
        triggered_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging webhook call:', logError);
    }

    // Update webhook statistics
    const updateData: any = {
      total_calls: webhookConfig.total_calls + 1,
      last_triggered_at: new Date().toISOString()
    };

    if (isSuccess) {
      updateData.successful_calls = webhookConfig.successful_calls + 1;
    } else {
      updateData.failed_calls = webhookConfig.failed_calls + 1;
    }

    const { error: updateError } = await supabaseClient
      .from('webhook_configs')
      .update(updateData)
      .eq('id', webhookId);

    if (updateError) {
      console.error('Error updating webhook stats:', updateError);
    }

    // Return response
    const result = {
      success: isSuccess,
      webhook_id: webhookId,
      webhook_name: webhookConfig.webhook_name,
      response_status: responseStatus,
      response_time_ms: responseTime,
      error: errorMessage,
      forwarded_to: webhookConfig.webhook_url
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: isSuccess ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `sha256=${hashHex}`;
}