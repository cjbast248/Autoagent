import { SupabaseClient } from '@supabase/supabase-js';
import { Agent, fetch as undiciFetch } from 'undici';
import dns from 'dns';
import { executeTelegramNode } from './telegram.node.js';
import { executeGroqNode } from './groq.node.js';
import { executeAmoCRMNode } from './amocrm.node.js';
import { executeBitrix24Node } from './bitrix24.node.js';
import { executeZohoCRMNode } from './zoho.node.js';
import { executeSplitOutNode } from './split-out.node.js';
import {
  executeIfNode,
  executeSwitchNode,
  executeFilterNode,
  executeSortNode,
  executeLimitNode,
  executeMergeNode,
  executeLoopNode,
} from './flow-control.node.js';
import { executeCodeNode } from './code.node.js';
import { executeEmailNode } from './email.node.js';
import { executeCityLookupNode } from './city-lookup.node.js';
import { executeGalltransRoutesNode } from './galltrans-routes.node.js';

export interface NodeExecutionContext {
  userId: string;
  supabase: SupabaseClient;
  workflowId: string;
  nodePosition?: number; // Position in execution order (0 = first/trigger node)
}

export interface NodeDefinition {
  id: string;
  type?: string;
  icon?: string;
  label?: string;
  config?: Record<string, unknown>;
}

export async function executeNode(
  node: NodeDefinition,
  inputData: unknown,
  context: NodeExecutionContext
): Promise<unknown> {
  const icon = node.icon?.toLowerCase() || '';
  const label = node.label?.toLowerCase() || '';
  const config = (node.config || {}) as Record<string, unknown>;
  const data = (inputData || {}) as Record<string, unknown>;

  console.log(`[Node] Executing: ${node.label} (${node.icon || node.type})`);

  // ============================================
  // TRIGGERS (just pass through the trigger data)
  // Note: 'webhook' alone could be trigger OR respond-to-webhook
  // We check for 'trigger' suffix or explicit trigger patterns
  // IMPORTANT: Only treat as trigger if it's the FIRST node (position 0)
  // ============================================

  // Check if this webhook node has response config (meaning it's a Respond to Webhook, not trigger)
  const hasResponseConfig =
    config.respondWith !== undefined ||
    config.responseCode !== undefined ||
    config.statusCode !== undefined ||
    config.responseBody !== undefined ||
    config.responseHeaders !== undefined;

  // A node is a trigger ONLY if it's the first node in execution order (position 0)
  const isFirstNode = context.nodePosition === 0 || context.nodePosition === undefined;

  const isTriggerNode =
    isFirstNode && (
      icon.includes('trigger') ||
      icon === 'manual-trigger' ||
      icon === 'chat-trigger' ||
      icon === 'schedule-trigger' ||
      icon === 'call-completed' ||
      // webhook is trigger ONLY if it doesn't have 'respond' in label AND doesn't have response config
      (icon === 'webhook' && !label.includes('respond') && !hasResponseConfig)
    );

  if (isTriggerNode) {
    console.log(`[Node] Trigger node: ${icon}, passing through trigger data`);
    return inputData;
  }

  // ============================================
  // RESPOND TO WEBHOOK NODE
  // Captures the response to send back to webhook caller
  // ============================================
  if (icon === 'respond-to-webhook' || icon === 'respond_to_webhook' ||
      icon === 'respondtowebhook' || label.includes('respond to webhook') ||
      label.includes('respond-to-webhook') ||
      // Also handle generic 'webhook' at end that's likely respond-to-webhook
      (icon === 'webhook' && label.includes('respond')) ||
      // A webhook node NOT at position 0 with response config is likely respond-to-webhook
      (icon === 'webhook' && !isFirstNode && hasResponseConfig)) {
    console.log(`[Node] Respond to Webhook: capturing response`);

    // Get response configuration
    const respondWith = (config.respondWith as string) || 'allIncomingItems';
    const statusCode = (config.statusCode as number) || 200;
    const responseType = (config.responseType as string) || 'json';
    const customHeaders = (config.customHeaders as Record<string, string>) || {};

    let responseBody: unknown = data;

    // Determine what to respond with
    if (respondWith === 'firstIncomingItem' && Array.isArray(data)) {
      responseBody = data[0];
    } else if (respondWith === 'noData') {
      responseBody = { success: true };
    } else if (respondWith === 'customBody' && config.responseBody) {
      responseBody = config.responseBody;
    }
    // else: 'allIncomingItems' - use data as-is

    console.log(`[Node] Webhook response configured: status=${statusCode}, type=${responseType}`);

    return {
      ...data,
      _webhookResponse: responseBody,
      _webhookStatusCode: statusCode,
      _webhookResponseType: responseType,
      _webhookHeaders: customHeaders,
    };
  }

  // ============================================
  // FLOW CONTROL NODES
  // ============================================

  // IF Node
  if (icon === 'if' || icon === 'gitbranch' || label.includes('if ') || label === 'if') {
    const result = executeIfNode(config, data);
    return { ...result.data, _branch: result.branch };
  }

  // Switch Node
  if (icon === 'switch' || label.includes('switch')) {
    const result = executeSwitchNode(config, data);
    return { ...result.data, _route: result.route };
  }

  // Filter Node
  if (icon === 'filter' || label.includes('filter')) {
    return executeFilterNode(config, data);
  }

  // Sort Node
  if (icon === 'sort' || label.includes('sort')) {
    return executeSortNode(config, data);
  }

  // Limit Node
  if (icon === 'limit' || label.includes('limit')) {
    return executeLimitNode(config, data);
  }

  // Merge Node
  if (icon === 'merge' || label.includes('merge')) {
    return executeMergeNode(config, data);
  }

  // Loop Node
  if (icon === 'loop' || label.includes('loop')) {
    return executeLoopNode(config, data);
  }

  // Split Out Node
  if (icon === 'split-out' || icon === 'split_out' || icon === 'splitout' ||
      label.includes('split out') || label.includes('split-out')) {
    return executeSplitOutNode(config as Parameters<typeof executeSplitOutNode>[0], data);
  }

  // ============================================
  // CODE NODE
  // ============================================
  if (icon === 'code' || label.includes('code') || label.includes('javascript')) {
    return await executeCodeNode(config, data);
  }

  // ============================================
  // CITY LOOKUP NODE
  // ============================================
  if (icon === 'city-lookup' || icon === 'citylookup' || icon === 'location-lookup' ||
      icon === 'map-pin' || icon === 'MapPin' || icon === 'location' ||
      label.toLowerCase().includes('city lookup') || label.toLowerCase().includes('city-lookup') ||
      label.toLowerCase().includes('location lookup')) {
    console.log(`[Node Router] Matched City Lookup node: icon="${icon}", label="${label}"`);
    return await executeCityLookupNode(config, data);
  }

  // ============================================
  // GALLTRANS ROUTES NODE
  // ============================================
  if (icon === 'galltrans-routes' || icon === 'galltrans' || icon === 'route-search' ||
      icon === 'bus' || icon === 'Bus' || icon === 'route' ||
      label.toLowerCase().includes('galltrans') || label.toLowerCase().includes('route')) {
    console.log(`[Node Router] Matched Galltrans Routes node: icon="${icon}", label="${label}"`);
    return await executeGalltransRoutesNode(config, data);
  }

  // ============================================
  // COMMUNICATION NODES
  // ============================================

  // Telegram Node
  if (icon === 'telegram' || label.includes('telegram')) {
    return await executeTelegramNode(config as unknown as Parameters<typeof executeTelegramNode>[0], data);
  }

  // Email Node
  if (icon === 'email' || icon === 'mail' || label.includes('email') || label.includes('send email')) {
    return await executeEmailNode(config, data);
  }

  // Infobip Send Email
  if (icon === 'infobip-send-email' || label.includes('infobip') && label.includes('email')) {
    return await executeEmailNode({ ...config, provider: 'sendgrid' }, data);
  }

  // ============================================
  // AI NODES
  // ============================================

  // Groq Analysis Node
  if (icon === 'groqanalysis' || icon === 'groq-analysis' || icon === 'groq' ||
      label.includes('groq')) {
    return await executeGroqNode(config as Parameters<typeof executeGroqNode>[0], data);
  }

  // Basic LLM Chain Node (uses Groq under the hood)
  if (icon === 'basic-llm-chain' || icon === 'basicllmchain' ||
      label.toLowerCase().includes('basic llm chain') || label.toLowerCase().includes('llm chain')) {
    return await executeBasicLLMChainNode(config, data);
  }

  // OpenAI Node
  if (icon === 'openai' || icon === 'sparkles' || label.includes('openai') || label.includes('gpt')) {
    return await executeOpenAINode(config, data);
  }

  // AI Agent Node
  if (icon === 'ai-agent' || icon === 'bot' || label.includes('ai agent')) {
    return await executeOpenAINode({ ...config, mode: 'agent' }, data);
  }

  // RAG Search Node
  if (icon === 'rag' || icon === 'rag-search' || icon === 'rag_search' ||
      label.includes('rag') || label.includes('search')) {
    return await executeRAGSearchNode(config, data, context);
  }

  // ============================================
  // CRM NODES
  // ============================================

  // amoCRM Node
  if (icon.includes('amocrm') || label.includes('amocrm')) {
    return await executeAmoCRMNode(
      config as unknown as Parameters<typeof executeAmoCRMNode>[0],
      data,
      context.userId,
      context.supabase
    );
  }

  // Bitrix24 CRM Node
  if (icon.includes('bitrix') || icon.includes('bitrix24') ||
      label.includes('bitrix') || label.includes('bitrix24')) {
    return await executeBitrix24Node(
      config as unknown as Parameters<typeof executeBitrix24Node>[0],
      data,
      context.userId,
      context.supabase
    );
  }

  // Zoho CRM Nodes
  if (icon.includes('zoho') || label.includes('zoho')) {
    return await executeZohoCRMNode(
      config as unknown as Parameters<typeof executeZohoCRMNode>[0],
      data,
      context.userId,
      context.supabase
    );
  }

  // ============================================
  // HTTP & WEBHOOK NODES
  // ============================================

  // HTTP Request Node
  if (icon === 'httprequest' || icon === 'http-request' || icon === 'http' ||
      label.includes('http request')) {
    return await executeHttpRequestNode(config, data);
  }

  // Respond to Webhook Node
  if (icon === 'respond-to-webhook' || icon === 'respond_to_webhook' || icon === 'respondtowebhook' ||
      label.includes('respond to webhook') || label.includes('respond-to-webhook')) {
    return executeRespondToWebhookNode(config, data);
  }

  // ============================================
  // GOOGLE SHEETS NODES
  // ============================================
  if (icon.includes('gsheet') || icon.includes('google-sheets') || icon === 'googlesheets' ||
      label.includes('google sheets') || label.includes('gsheets')) {
    return await executeGoogleSheetsNode(config, data, context);
  }

  // ============================================
  // ODOO NODES
  // ============================================
  if (icon.includes('odoo') || label.includes('odoo')) {
    return await executeOdooNode(config, data, context);
  }

  // ============================================
  // ALTEGIO NODES
  // ============================================
  if (icon.includes('altegio') || label.includes('altegio')) {
    return await executeAltegioNode(config, data, context);
  }

  // ============================================
  // SCRAPER NODES
  // ============================================
  if (icon === '999-scraper' || icon === '999scraper' || label.includes('999.md') || label.includes('999 scraper')) {
    return await execute999ScraperNode(config, data);
  }

  // ============================================
  // KALLINA-SPECIFIC NODES
  // ============================================

  // Call History Node
  if (icon === 'call-history' || label.includes('call history')) {
    return await executeCallHistoryNode(config, data, context);
  }

  // Kalina Call Node
  if (icon === 'kalina-call' || icon === 'kalinacall' || label.includes('kalina call')) {
    return await executeKalinaCallNode(config, data, context);
  }

  // Get Transcription Node
  if (icon === 'get-transcription' || icon === 'filetext' || label.includes('transcription')) {
    return await executeGetTranscriptionNode(config, data, context);
  }

  // ============================================
  // END / PASS-THROUGH NODES
  // ============================================
  if (node.type === 'end' || icon === 'end') {
    return inputData;
  }

  // ============================================
  // DEFAULT - Unknown node type, pass through
  // ============================================
  console.log(`[Node] Unknown node type: ${icon || node.type}, label="${label}", position=${context.nodePosition}, passing through`);

  // Extra warning for webhook nodes that weren't matched
  if (icon === 'webhook') {
    console.warn(`[Node] Warning: Webhook node at position ${context.nodePosition} was not matched as trigger or respond-to-webhook. hasResponseConfig=${hasResponseConfig}, label="${label}"`);
  }

  return inputData;
}

// ============================================
// HTTP REQUEST NODE
// ============================================
async function executeHttpRequestNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  let url = config.url as string;
  const method = (config.method as string) || 'GET';
  const contentType = (config.contentType as string) || 'json';
  const bodyContentType = (config.bodyContentType as string) || contentType;

  // Parse headers - can be object or array of {name, value} pairs
  let configHeaders: Record<string, string> = {};
  const rawHeaders = config.headers;
  if (rawHeaders) {
    if (Array.isArray(rawHeaders)) {
      // Array format: [{name: "Content-Type", value: "application/json"}]
      for (const h of rawHeaders as Array<{name?: string; value?: string}>) {
        if (h.name && h.value) {
          configHeaders[h.name] = resolveTemplateValue(h.value, inputData);
        }
      }
    } else if (typeof rawHeaders === 'object') {
      // Check if it's an object with numeric keys (converted array)
      const keys = Object.keys(rawHeaders);
      if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
        // Numeric keys - it's an array-like object
        for (const key of keys) {
          const h = (rawHeaders as Record<string, {name?: string; value?: string}>)[key];
          if (h && h.name && h.value) {
            configHeaders[h.name] = resolveTemplateValue(h.value, inputData);
          }
        }
      } else {
        // Normal object format: {"Content-Type": "application/json"}
        configHeaders = rawHeaders as Record<string, string>;
      }
    }
  }

  // Add authentication headers
  const authentication = (config.authentication as string) || 'none';
  if (authentication === 'basicAuth') {
    const username = (config.basicAuthUsername as string) || '';
    const password = (config.basicAuthPassword as string) || '';
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    configHeaders['Authorization'] = `Basic ${credentials}`;
  } else if (authentication === 'bearerToken') {
    const token = (config.bearerToken as string) || '';
    configHeaders['Authorization'] = `Bearer ${token}`;
  } else if (authentication === 'headerAuth') {
    const headerName = (config.headerAuthName as string) || 'X-Auth-Token';
    const headerValue = (config.headerAuthValue as string) || '';
    configHeaders[headerName] = headerValue;
  }

  // Parse body - check multiple possible field names based on UI config
  const bodySource = config.bodySource as string;
  let body: unknown;

  // Check bodySource to determine which field to use
  if (bodySource === 'json' && config.bodyJson) {
    body = config.bodyJson;
  } else if (bodySource === 'raw' && config.bodyRaw) {
    body = config.bodyRaw;
  } else {
    // Fallback: check all possible body fields
    body = config.body || config.bodyJson || config.bodyRaw || config.bodyContent || config.requestBody;
  }

  if (!url) {
    throw new Error('HTTP Request: URL is required');
  }

  // Resolve template expressions in URL
  url = resolveTemplateValue(url, inputData);

  // Log original body template before resolution
  const originalBody = typeof body === 'string' ? body : JSON.stringify(body);
  console.log(`[HTTP] Original body template: ${originalBody?.substring(0, 300)}`);

  // Resolve template expressions in body (supports {{ $json.field }} and JS expressions)
  if (body && typeof body === 'string') {
    body = resolveExpressionValue(body, inputData);
  } else if (body && typeof body === 'object') {
    // Resolve templates in object body
    body = JSON.parse(resolveExpressionValue(JSON.stringify(body), inputData));
  }

  console.log(`[HTTP] ${method} ${url}`);
  console.log(`[HTTP] Input data keys: ${Object.keys(inputData).join(', ') || '(none)'}`);
  console.log(`[HTTP] bodySource: ${bodySource}, contentType: ${bodyContentType}`);
  console.log(`[HTTP] Resolved body: ${JSON.stringify(body)?.substring(0, 300)}`);

  // Warning if body resolved to "null" (indicating missing data)
  if (body === 'null' || body === null) {
    console.warn(`[HTTP] ⚠️ Body resolved to null - the referenced data may not exist yet.`);
    console.warn(`[HTTP] ⚠️ Available input data: ${JSON.stringify(inputData).substring(0, 500)}`);
    console.warn(`[HTTP] ⚠️ Check workflow order: data-producing nodes must run BEFORE this HTTP node.`);
  }

  // Determine Content-Type header based on config (bodyContentType takes precedence)
  const effectiveContentType = bodyContentType || contentType;
  let contentTypeHeader = 'application/json';
  let processedBody: string | undefined;

  if (body && method !== 'GET') {
    if (effectiveContentType === 'form' || effectiveContentType === 'form-urlencoded' || effectiveContentType === 'application/x-www-form-urlencoded') {
      contentTypeHeader = 'application/x-www-form-urlencoded';
      // Convert body to URL encoded format
      if (typeof body === 'object') {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
          params.append(key, String(value));
        }
        processedBody = params.toString();
      } else {
        processedBody = String(body);
      }
    } else if (effectiveContentType === 'text' || effectiveContentType === 'text/plain') {
      contentTypeHeader = 'text/plain';
      processedBody = typeof body === 'string' ? body : JSON.stringify(body);
    } else if (effectiveContentType === 'xml' || effectiveContentType === 'application/xml' || effectiveContentType === 'text/xml') {
      contentTypeHeader = 'application/xml';
      processedBody = typeof body === 'string' ? body : JSON.stringify(body);
    } else if (effectiveContentType === 'raw') {
      // Raw body - use as-is, don't set specific content type (use from headers if provided)
      contentTypeHeader = configHeaders['Content-Type'] || 'text/plain';
      processedBody = typeof body === 'string' ? body : JSON.stringify(body);
    } else {
      // Default: JSON
      contentTypeHeader = 'application/json';
      processedBody = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': contentTypeHeader,
    ...configHeaders,
  };

  console.log(`[HTTP] Final headers: ${JSON.stringify(headers)}`);
  if (processedBody) {
    console.log(`[HTTP] Processed body: ${processedBody.substring(0, 300)}`);
  }

  // Create an agent that forces IPv4 connections (required for whitelisted APIs)
  // Use custom lookup to force IPv4 DNS resolution
  const ipv4Agent = new Agent({
    connect: {
      lookup: (hostname, _options, callback) => {
        // dns.lookup returns (err, address, family) but undici expects (err, addresses[])
        dns.lookup(hostname, { family: 4 }, (err, address, family) => {
          if (err) {
            callback(err, []);
          } else {
            callback(null, [{ address, family }]);
          }
        });
      },
    },
  });

  console.log(`[HTTP] Using IPv4-only agent for request`);

  const fetchOptions = {
    method,
    headers,
    dispatcher: ipv4Agent,
    body: processedBody,
  };

  const response = await undiciFetch(url, fetchOptions);
  const responseText = await response.text();

  console.log(`[HTTP] Response status: ${response.status}`);
  console.log(`[HTTP] Response preview: ${responseText.substring(0, 300)}`);

  let responseData: unknown;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = responseText;
  }

  if (!response.ok) {
    throw new Error(`HTTP Request failed (${response.status}): ${responseText.substring(0, 200)}`);
  }

  return {
    ...inputData,
    http_response: responseData,
    http_status: response.status,
  };
}

// ============================================
// RESPOND TO WEBHOOK NODE
// ============================================
function executeRespondToWebhookNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>
): Record<string, unknown> {
  console.log(`[Respond to Webhook] Processing...`);

  const respondWith = (config.respondWith as string) || 'firstIncomingItem';
  const statusCode = (config.responseCode as number) || 200;
  const headers = (config.responseHeaders as Array<{ name: string; value: string }>) || [];

  let responseBody: unknown;
  let responseType = 'json';

  if (respondWith === 'noData') {
    responseBody = null;
  } else if (respondWith === 'allIncomingItems') {
    responseBody = [inputData];
  } else if (respondWith === 'firstIncomingItem') {
    responseBody = inputData;
  } else if (respondWith === 'json' || respondWith === 'text') {
    const expression = (config.responseBody as string) || '';
    if (expression.includes('{{')) {
      responseBody = resolveTemplateValue(expression, inputData);
      try {
        responseBody = JSON.parse(responseBody as string);
      } catch {
        // Keep as string
      }
    } else if (expression) {
      try {
        responseBody = JSON.parse(expression);
      } catch {
        responseBody = expression;
      }
    } else {
      responseBody = inputData;
    }

    if (typeof responseBody === 'string' && responseBody.trim().startsWith('<?xml')) {
      responseType = 'xml';
    }
  } else {
    responseBody = inputData;
  }

  const customHeaders: Record<string, string> = {};
  for (const h of headers) {
    if (h.name && h.value) {
      customHeaders[h.name] = resolveTemplateValue(h.value, inputData);
    }
  }

  console.log(`[Respond to Webhook] Response type: ${responseType}, status: ${statusCode}`);

  return {
    ...inputData,
    _webhookResponse: responseBody,
    _webhookResponseType: responseType,
    _webhookStatusCode: statusCode,
    _webhookHeaders: customHeaders,
  };
}

// ============================================
// OPENAI NODE
// ============================================
async function executeOpenAINode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  console.log('[OpenAI] Executing...');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI: OPENAI_API_KEY not configured');
  }

  const model = (config.model as string) || 'gpt-4o-mini';
  const prompt = resolveTemplateValue((config.prompt as string) || '', inputData);
  const systemPrompt = (config.systemPrompt as string) || 'You are a helpful assistant.';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt || JSON.stringify(inputData) },
      ],
      temperature: (config.temperature as number) || 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };
  const content = result.choices?.[0]?.message?.content || '';

  console.log('[OpenAI] Response received');

  return {
    ...inputData,
    openai_response: content,
    openai_model: model,
    openai_usage: result.usage,
  };
}


// ============================================
// GOOGLE SHEETS NODE (placeholder)
// ============================================
async function executeGoogleSheetsNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
  context: NodeExecutionContext
): Promise<Record<string, unknown>> {
  console.log('[Google Sheets] Executing...');

  // TODO: Implement Google Sheets operations
  console.warn('[Google Sheets] Node not fully implemented yet');

  return {
    ...inputData,
    _googleSheets: 'not_implemented',
  };
}

// ============================================
// ODOO NODE (placeholder)
// ============================================
async function executeOdooNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
  context: NodeExecutionContext
): Promise<Record<string, unknown>> {
  console.log('[Odoo] Executing...');

  // TODO: Implement Odoo operations
  console.warn('[Odoo] Node not fully implemented yet');

  return {
    ...inputData,
    _odoo: 'not_implemented',
  };
}

// ============================================
// ALTEGIO NODE (placeholder)
// ============================================
async function executeAltegioNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
  context: NodeExecutionContext
): Promise<Record<string, unknown>> {
  console.log('[Altegio] Executing...');

  // TODO: Implement Altegio operations
  console.warn('[Altegio] Node not fully implemented yet');

  return {
    ...inputData,
    _altegio: 'not_implemented',
  };
}

// ============================================
// 999.MD SCRAPER NODE
// ============================================
async function execute999ScraperNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  console.log('[999 Scraper] Executing with config:', JSON.stringify(config, null, 2));

  // Get config values (UI uses these field names)
  const targetUrl = (config.targetUrl as string) || (config.url as string) || 'https://999.md/ru/list/real-estate/apartments-and-rooms';
  const maxListings = (config.maxListings as number) || (config.maxItems as number) || 10;
  const extractPhones = config.extractPhones !== false;
  const extractAllDetails = config.extractAllDetails === true;
  const requestDelay = (config.requestDelay as number) || 2500;
  const parallelBrowsers = (config.parallelBrowsers as number) || 5;

  // API endpoint - default to production scraper service
  const apiEndpoint = (config.apiEndpoint as string) ||
    process.env.SCRAPER_999_API ||
    'https://app.kallina.info/scraper';

  console.log(`[999 Scraper] Target URL: ${targetUrl}`);
  console.log(`[999 Scraper] API endpoint: ${apiEndpoint}`);
  console.log(`[999 Scraper] Max listings: ${maxListings}, Extract phones: ${extractPhones}`);

  try {
    // Call the scraper microservice API
    const scrapeUrl = `${apiEndpoint}/scrape`;
    console.log(`[999 Scraper] Calling scraper API: ${scrapeUrl}`);

    const response = await fetch(scrapeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUrl,
        maxListings,
        extractPhones,
        extractAllDetails,
        requestDelay,
        parallelBrowsers,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scraper API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as {
      success: boolean;
      data?: Array<{
        title: string;
        price: string;
        phone: string;
        description: string;
        region: string;
        link: string;
      }>;
      error?: string;
      count?: number;
      duration_seconds?: number;
    };

    if (!result.success) {
      throw new Error(result.error || 'Scraper returned unsuccessful response');
    }

    const listings = result.data || [];
    console.log(`[999 Scraper] Found ${listings.length} listings (took ${result.duration_seconds || '?'}s)`);

    return {
      ...inputData,
      listings,
      scraper_url: targetUrl,
      scraper_count: listings.length,
      scraper_duration: result.duration_seconds,
    };
  } catch (error) {
    console.error('[999 Scraper] Error:', (error as Error).message);
    return {
      ...inputData,
      scraper_error: (error as Error).message,
      listings: [],
    };
  }
}

// ============================================
// KALLINA CALL HISTORY NODE
// ============================================
async function executeCallHistoryNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
  context: NodeExecutionContext
): Promise<Record<string, unknown>> {
  console.log('[Call History] Fetching...');

  const limit = (config.limit as number) || 10;
  const status = config.status as string;

  const query = context.supabase
    .from('call_logs')
    .select('*')
    .eq('user_id', context.userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query.eq('status', status);
  }

  const { data: calls, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch call history: ${error.message}`);
  }

  console.log(`[Call History] Found ${calls?.length || 0} calls`);

  return {
    ...inputData,
    calls: calls || [],
    call_count: calls?.length || 0,
  };
}

// ============================================
// KALLINA CALL NODE
// Initiates outbound calls via the Kalina AI voice agent
// ============================================
async function executeKalinaCallNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
  context: NodeExecutionContext
): Promise<Record<string, unknown>> {
  console.log('[Kalina Call] Executing...');
  console.log('[Kalina Call] Config:', JSON.stringify(config, null, 2));

  const agentId = config.agentId as string;
  const phoneNumberId = config.phoneNumberId as string;
  const phoneFieldPath = (config.phoneField as string) || 'Phone';
  const nameFieldPath = (config.nameField as string) || 'Full_Name';
  const droppedFields = (config.droppedFields as Array<{ key: string; path: string }>) || [];
  const infoFields = (config.infoFields as string[]) || [];
  const callInterval = ((config.callInterval as number) || 30) * 1000;

  if (!agentId) {
    throw new Error('Kalina Call: Agent ID is required');
  }

  if (!phoneNumberId) {
    throw new Error('Kalina Call: Phone Number ID is required');
  }

  // Helper to extract value by path (e.g., "Owner.name")
  const getValueByPath = (obj: Record<string, unknown>, path: string): unknown => {
    if (!path || !obj) return undefined;
    const parts = path.split('.');
    let value: unknown = obj;
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      if (typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return value;
  };

  // Helper to check if value is an n8n expression
  const isExpression = (value: string) => value && (value.startsWith('={{') || value.startsWith('{{ '));

  // Helper to extract field path from expression like ={{ $json.Phone }}
  const extractExpressionPath = (expr: string) => {
    const match = expr.match(/\{\{\s*\$json\.(\w+)\s*\}\}/);
    return match ? match[1] : null;
  };

  // Helper to check if value looks like a phone number (starts with + or digits)
  const isPhoneNumber = (value: string) => /^[\+\d][\d\s\-\(\)]+$/.test(value);

  // Get contacts from input data
  const contacts = Array.isArray(inputData) ? inputData : [inputData];
  console.log(`[Kalina Call] Processing ${contacts.length} contact(s)`);

  const callResults: Array<{
    contact: unknown;
    contactPhone?: string;
    contactName?: string;
    status: string;
    conversationId?: string;
    callHistoryId?: string;
    error?: string;
  }> = [];
  let successCount = 0;
  let failCount = 0;

  // Get Supabase URL and service role key from environment
  const supabaseUrl = process.env.SUPABASE_URL || 'https://pwfczzxwjfxomqzhhwvj.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Kalina Call: SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i] as Record<string, unknown>;

    // Determine phone number: check if it's expression, fixed value, or field path
    let extractedPhone: unknown;
    if (isExpression(phoneFieldPath)) {
      // It's an n8n expression like ={{ $json.Phone }}
      const fieldPath = extractExpressionPath(phoneFieldPath);
      extractedPhone = fieldPath ? getValueByPath(contact, fieldPath) : undefined;
      console.log(`[Kalina Call] Phone is expression, extracted path: ${fieldPath}, value: ${extractedPhone}`);
    } else if (isPhoneNumber(phoneFieldPath)) {
      // It's a direct phone number value
      extractedPhone = phoneFieldPath;
      console.log(`[Kalina Call] Phone is fixed value: ${extractedPhone}`);
    } else {
      // It's a field path
      extractedPhone = getValueByPath(contact, phoneFieldPath);
      console.log(`[Kalina Call] Phone is field path: ${phoneFieldPath}, value: ${extractedPhone}`);
    }

    // Determine name: check if it's expression, fixed value, or field path
    let extractedName: unknown;
    if (isExpression(nameFieldPath)) {
      // It's an n8n expression like ={{ $json.Name }}
      const fieldPath = extractExpressionPath(nameFieldPath);
      extractedName = fieldPath ? getValueByPath(contact, fieldPath) : undefined;
      console.log(`[Kalina Call] Name is expression, extracted path: ${fieldPath}, value: ${extractedName}`);
    } else if (!nameFieldPath.includes('.') && !contact[nameFieldPath]) {
      // It's likely a fixed value (not a field path and field doesn't exist in contact)
      extractedName = nameFieldPath;
      console.log(`[Kalina Call] Name is fixed value: ${extractedName}`);
    } else {
      // It's a field path
      extractedName = getValueByPath(contact, nameFieldPath);
      console.log(`[Kalina Call] Name is field path: ${nameFieldPath}, value: ${extractedName}`);
    }

    const phoneNumber = extractedPhone || contact.Phone || contact.phone || contact.Mobile || contact.telefon;
    const contactName = extractedName || contact.Full_Name || contact.name || contact.First_Name || 'Contact';

    console.log(`[Kalina Call] Contact ${i + 1}: phone=${phoneNumber}, name=${contactName}`);

    if (!phoneNumber) {
      console.warn(`[Kalina Call] Contact ${i + 1}: No phone number found (field: ${phoneFieldPath})`);
      failCount++;
      callResults.push({ contact, status: 'skipped', error: 'No phone number' });
      continue;
    }

    // Build info variable from dropped fields or legacy infoFields
    const infoLines: string[] = [];

    if (droppedFields.length > 0) {
      for (const field of droppedFields) {
        const parts = field.path.split('.');
        let value: unknown = contact;
        for (const part of parts) {
          if (value === null || value === undefined) break;
          if (typeof value !== 'object') break;
          value = (value as Record<string, unknown>)[part];
        }
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value = value.join(', ');
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          infoLines.push(`${field.key}: ${value}`);
        }
      }
    } else {
      for (const field of infoFields) {
        const value = contact[field];
        if (value !== undefined && value !== null && value !== '') {
          infoLines.push(`${field}: ${value}`);
        }
      }
    }
    const infoVariable = infoLines.join('\n');

    console.log(`[Kalina Call] Calling ${contactName} (${phoneNumber})...`);
    if (infoVariable) {
      console.log(`[Kalina Call] Info for agent:\n${infoVariable}`);
    }

    try {
      const requestBody: Record<string, unknown> = {
        agent_id: agentId,
        phone_number: String(phoneNumber),
        contact_name: String(contactName),
        phone_id: phoneNumberId,
        user_id: context.userId,
      };

      if (infoVariable) {
        requestBody.dynamic_variables = {
          info: infoVariable
        };
      }

      console.log(`[Kalina Call] Request body:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch(
        `${supabaseUrl}/functions/v1/initiate-scheduled-call`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'x-user-id': context.userId,
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log(`[Kalina Call] Response status: ${response.status}`);

      const result = await response.json() as {
        success?: boolean;
        conversationId?: string;
        conversation_id?: string;
        call_history_id?: string;
        error?: string;
        message?: string;
      };

      console.log(`[Kalina Call] Response:`, JSON.stringify(result, null, 2));

      if (response.ok && result.success) {
        const convId = result.conversationId || result.conversation_id;
        console.log(`[Kalina Call] ✅ Call initiated to ${contactName} (${phoneNumber}) - ID: ${convId}`);
        successCount++;
        callResults.push({
          contact,
          contactPhone: String(phoneNumber),
          contactName: String(contactName),
          status: 'initiated',
          conversationId: convId,
          callHistoryId: result.call_history_id,
        });
      } else {
        const errorMsg = result.error || result.message || 'Unknown error';
        console.error(`[Kalina Call] ❌ Failed: ${errorMsg}`);
        failCount++;
        callResults.push({ contact, status: 'failed', error: errorMsg });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(`[Kalina Call] ❌ Error: ${errorMsg}`);
      failCount++;
      callResults.push({ contact, status: 'failed', error: errorMsg });
    }

    // Wait between calls (except for last one)
    if (i < contacts.length - 1) {
      console.log(`[Kalina Call] Waiting ${callInterval / 1000}s before next call...`);
      await new Promise(resolve => setTimeout(resolve, callInterval));
    }
  }

  console.log(`[Kalina Call] Completed: ${successCount} successful, ${failCount} failed`);

  return {
    ...inputData,
    call_results: callResults,
    call_success_count: successCount,
    call_fail_count: failCount,
    call_total: contacts.length,
  };
}

// ============================================
// GET TRANSCRIPTION NODE
// ============================================
async function executeGetTranscriptionNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
  context: NodeExecutionContext
): Promise<Record<string, unknown>> {
  console.log('[Get Transcription] Fetching...');

  const callId = (config.callId as string) || (inputData.call_id as string);

  if (!callId) {
    throw new Error('Get Transcription: callId is required');
  }

  const { data: call, error } = await context.supabase
    .from('call_logs')
    .select('transcription, summary')
    .eq('id', callId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch transcription: ${error.message}`);
  }

  console.log('[Get Transcription] Transcription retrieved');

  return {
    ...inputData,
    transcription: call?.transcription || '',
    summary: call?.summary || '',
    call_id: callId,
  };
}

// ============================================
// RAG SEARCH NODE
// Searches in knowledge base and optionally uses AI for response
// Uses sophisticated scoring algorithm matching the UI implementation
// ============================================

// Helper: Normalize text for RAG search (remove diacritics, lowercase)
function normalizeTextForRAG(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s,]/g, ' ') // Keep commas for CSV parsing
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Escape regex special characters
function escapeRegexChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper: Levenshtein distance for fuzzy matching (typos only)
function levenshteinDist(str1: string, str2: string): number {
  if (Math.abs(str1.length - str2.length) > 2) return Infinity; // Skip if length diff > 2
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

async function executeRAGSearchNode(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
  context: NodeExecutionContext
): Promise<Record<string, unknown>> {
  console.log('[RAG Search] Executing...');

  // Get search query from config or input
  let searchQuery = (config.searchQuery as string) || (config.query as string) || '';

  // Resolve template expressions like {{ $json.body.message }}
  searchQuery = resolveTemplateValue(searchQuery, inputData);

  // Also check common input fields
  if (!searchQuery && inputData.query) {
    searchQuery = String(inputData.query);
  }
  if (!searchQuery && inputData.message) {
    searchQuery = String(inputData.message);
  }
  if (!searchQuery && inputData.body && typeof inputData.body === 'object') {
    const body = inputData.body as Record<string, unknown>;
    searchQuery = String(body.message || body.query || body.text || '');
  }

  console.log(`[RAG Search] Query: "${searchQuery.substring(0, 100)}..."`);

  if (!searchQuery) {
    console.log('[RAG Search] No query provided, passing through');
    return {
      ...inputData,
      rag_results: [],
      rag_answer: 'No search query provided',
    };
  }

  const useGroq = config.useGroq !== false;
  const model = (config.model as string) || 'llama-3.3-70b-versatile';
  const systemPrompt = (config.systemPrompt as string) ||
    'Tu ești un asistent care răspunde pe baza informațiilor furnizate. Dacă nu găsești informații relevante, spune-o clar.';
  const entries = (config.entries as Array<{ id?: string; query: string; content: string; metadata?: Record<string, unknown> }>) || [];

  console.log(`[RAG Search] Searching through ${entries.length} entries`);

  // SOPHISTICATED SCORING ALGORITHM (matching UI implementation)
  const MIN_SCORE_THRESHOLD = 10;
  const results: Array<{ entry: typeof entries[0]; score: number }> = [];

  const normalizedQuery = normalizeTextForRAG(searchQuery);
  const queryWords = normalizedQuery.split(' ').filter(w => w.length >= 2);

  console.log(`[RAG Search] Normalized query: "${normalizedQuery}"`);
  console.log(`[RAG Search] Query words: ${queryWords.join(', ')}`);

  for (const entry of entries) {
    const queryText = normalizeTextForRAG(entry.query || '');
    const contentText = normalizeTextForRAG(entry.content || '');
    const fullText = `${queryText} ${contentText}`;

    // Split content into individual words/items (for CSV-like data)
    const allWords = fullText.split(/[\s,]+/).filter(w => w.length > 0);

    let score = 0;

    for (const searchWord of queryWords) {
      if (searchWord.length < 2) continue;

      // 1. EXACT WORD MATCH (highest priority) - 50 points
      const isExactWordMatch = allWords.some(w => w === searchWord);

      if (isExactWordMatch) {
        score += 50;
      }
      // 2. WORD BOUNDARY MATCH (word at start/end) - 20 points
      else {
        const exactWordRegex = new RegExp(`(^|[\\s,])${escapeRegexChars(searchWord)}([\\s,]|$)`, 'i');
        if (exactWordRegex.test(fullText)) {
          score += 20;
        }
        // 3. SUBSTRING MATCH (word is contained in another word) - 3 points MAX
        else if (fullText.includes(searchWord)) {
          score += 3; // Low score for substring matches
        }
        // 4. FUZZY MATCH (for typos, max 1-2 char difference) - 15 points
        else {
          for (const targetWord of allWords) {
            if (targetWord.length < 3) continue;
            if (Math.abs(searchWord.length - targetWord.length) <= 1) {
              const distance = levenshteinDist(searchWord, targetWord);
              if (distance === 1) {
                score += 15; // 1 char difference (typo)
                break;
              }
            }
          }
        }
      }
    }

    // Only include results above minimum threshold
    if (score >= MIN_SCORE_THRESHOLD) {
      results.push({ entry, score });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Get matching entries (top results)
  const matchingEntries = results.slice(0, 10).map(r => r.entry);

  console.log(`[RAG Search] Found ${results.length} matching entries above threshold ${MIN_SCORE_THRESHOLD}`);
  if (results.length > 0) {
    console.log(`[RAG Search] Top scores: ${results.slice(0, 3).map(r => r.score).join(', ')}`);
  }

  let ragAnswer = '';

  // If Groq is enabled and we have matches, generate response
  if (useGroq && matchingEntries.length > 0) {
    const groqApiKey = process.env.GROQ_API_KEY;

    if (groqApiKey) {
      try {
        const contextText = matchingEntries
          .map(e => `Q: ${e.query}\nA: ${e.content}`)
          .join('\n\n');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: `Context:\n${contextText}\n\nÎntrebare: ${searchQuery}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (response.ok) {
          const result = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          ragAnswer = result.choices?.[0]?.message?.content || '';
          console.log('[RAG Search] Groq response generated');
        }
      } catch (error) {
        console.error('[RAG Search] Groq error:', (error as Error).message);
        ragAnswer = 'Error generating AI response';
      }
    } else {
      // No API key - just return matching content
      ragAnswer = matchingEntries.map(e => e.content).join('\n\n');
    }
  } else if (matchingEntries.length > 0) {
    ragAnswer = matchingEntries.map(e => e.content).join('\n\n');
  } else {
    ragAnswer = 'Nu am găsit informații relevante pentru întrebarea ta.';
  }

  return {
    ...inputData,
    rag_query: searchQuery,
    rag_results: matchingEntries,
    rag_answer: ragAnswer,
    rag_matches_count: matchingEntries.length,
  };
}

// ============================================
// UTILITY: Template Value Resolution (simple paths like $json.field)
// ============================================
function resolveTemplateValue(value: string, data: Record<string, unknown>): string {
  if (!value) return '';

  return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const parts = trimmedPath.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined) return match;
      if (typeof current !== 'object') return match;

      // Handle special prefixes
      if (part === '$json' || part === '$input') continue;

      current = (current as Record<string, unknown>)[part];
    }

    if (current !== undefined && current !== null) {
      return typeof current === 'object' ? JSON.stringify(current) : String(current);
    }
    return match;
  });
}

// ============================================
// UTILITY: Extract JSON from text (handles markdown code blocks)
// ============================================
function extractJsonFromText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // If it's already valid JSON, return as-is
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Not valid JSON, try to extract
  }

  // Method 1: Look for ```json ... ``` markdown blocks
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    const candidate = jsonBlockMatch[1].trim();
    try {
      JSON.parse(candidate);
      console.log(`[extractJsonFromText] Found JSON in markdown block`);
      return candidate;
    } catch {
      // Not valid JSON in block
    }
  }

  // Method 2: Look for ``` ... ``` generic code blocks
  const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const candidate = codeBlockMatch[1].trim();
    try {
      JSON.parse(candidate);
      console.log(`[extractJsonFromText] Found JSON in code block`);
      return candidate;
    } catch {
      // Not valid JSON
    }
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
    } catch {
      // Not valid JSON
    }
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
    } catch {
      // Not valid JSON
    }
  }

  console.log(`[extractJsonFromText] No JSON found, returning original text`);
  return text;
}

// ============================================
// UTILITY: Expression Value Resolution (JavaScript expressions)
// Supports complex expressions like {{ JSON.stringify($json.analysis) }}
// ============================================
function resolveExpressionValue(value: string, data: Record<string, unknown>): string {
  if (!value) return '';

  const trimmedValue = value.trim();

  // Special case: if the ENTIRE value is just a single expression like {{ JSON.stringify($json.analysis) }}
  const singleExprMatch = trimmedValue.match(/^\{\{\s*(.+?)\s*\}\}$/s);

  // Check for JSON.stringify patterns - we need to extract JSON from markdown BEFORE stringify
  if (singleExprMatch) {
    const expression = singleExprMatch[1].trim();

    // Handle JSON.stringify($json.field) specially to clean markdown first
    const stringifyMatch = expression.match(/^JSON\.stringify\s*\(\s*(\$json\.\w+)\s*\)$/);
    if (stringifyMatch) {
      const fieldPath = stringifyMatch[1]; // e.g., "$json.analysis"
      const parts = fieldPath.split('.').slice(1); // Remove $json prefix
      let fieldValue: unknown = data;

      for (const part of parts) {
        if (fieldValue === null || fieldValue === undefined) break;
        if (typeof fieldValue !== 'object') break;
        fieldValue = (fieldValue as Record<string, unknown>)[part];
      }

      if (typeof fieldValue === 'string') {
        // Extract JSON from markdown if present
        const cleanedJson = extractJsonFromText(fieldValue);
        console.log(`[Expression] JSON.stringify special case: extracted JSON from ${fieldPath}`);
        console.log(`[Expression] Cleaned JSON preview: ${cleanedJson.substring(0, 200)}`);
        return cleanedJson; // Return the clean JSON directly, no need to stringify again
      } else if (fieldValue !== undefined && fieldValue !== null) {
        return JSON.stringify(fieldValue);
      } else {
        console.warn(`[Expression] Field ${fieldPath} is undefined`);
        return 'null';
      }
    }
  }
  if (singleExprMatch) {
    const expression = singleExprMatch[1];
    try {
      // Create evaluation context with $json available
      const $json = data;
      const $input = data;
      const result = eval(expression);

      // Handle the result - including undefined/null cases
      if (result === undefined) {
        // For JSON.stringify expressions, undefined means the source data was missing
        // Return "null" which is valid JSON, rather than the template string
        console.warn(`[Expression] Result is undefined for: ${expression}`);
        console.warn(`[Expression] Available data keys: ${Object.keys(data).join(', ')}`);
        return 'null';
      }
      if (result === null) {
        return 'null';
      }
      if (typeof result === 'string') {
        // Check if it looks like it might contain markdown-wrapped JSON
        // This happens when Groq returns JSON in markdown code blocks
        if (result.includes('```') || (result.includes('{') && result.includes('}'))) {
          const extracted = extractJsonFromText(result);
          if (extracted !== result) {
            console.log(`[Expression] Extracted JSON from markdown in result`);
            return extracted;
          }
        }
        return result;
      }
      if (typeof result === 'object') {
        return JSON.stringify(result);
      }
      return String(result);
    } catch (e) {
      console.error('[Expression] Evaluation error:', e);
      console.error('[Expression] Expression was:', expression);
      console.error('[Expression] Available data keys:', Object.keys(data).join(', '));
      // Fall back to simple template resolution
      return resolveTemplateValue(value, data);
    }
  }

  // General case: Replace {{ expression }} patterns within text
  let processed = value.replace(/\{\{\s*(.+?)\s*\}\}/gs, (match, expression) => {
    try {
      // Try simple path resolution first (e.g., $json.field.subfield)
      if (/^\$json(\.\w+)+$/.test(expression.trim())) {
        const parts = expression.trim().split('.').slice(1); // Remove $json prefix
        let current: unknown = data;
        for (const part of parts) {
          if (current === null || current === undefined) return match;
          if (typeof current !== 'object') return match;
          current = (current as Record<string, unknown>)[part];
        }
        if (current !== undefined && current !== null) {
          return typeof current === 'object' ? JSON.stringify(current) : String(current);
        }
        return match;
      }

      // For complex expressions, use eval
      const $json = data;
      const $input = data;
      const result = eval(expression);

      if (result !== undefined) {
        if (typeof result === 'object') {
          // Mark as object for later cleanup
          return `__OBJ__${JSON.stringify(result)}__OBJ__`;
        }
        return typeof result === 'string' ? result : String(result);
      }
    } catch (e) {
      console.error('[Expression] Evaluation error for:', expression, e);
    }
    return match;
  });

  // Clean up: Replace "__OBJ__....__OBJ__" markers with actual JSON
  processed = processed.replace(/"__OBJ__(.+?)__OBJ__"/g, '$1');
  processed = processed.replace(/__OBJ__(.+?)__OBJ__/g, '$1');

  return processed;
}

// ============================================
// BASIC LLM CHAIN NODE
// ============================================

interface BasicLLMChainConfig {
  userPrompt?: string;
  chatMessages?: Array<{ type: 'system' | 'user' | 'ai'; message: string }>;
  model?: string;
  temperature?: number;
  requireOutputFormat?: boolean;
}

/**
 * Resolve expressions with support for array access like lookupResults[1].pointId
 */
function resolveExpressionWithArrays(expr: string, data: Record<string, unknown>): string {
  if (!expr) return '';

  let result = expr;

  // Helper to get value from path with array support
  const getValueFromPath = (obj: unknown, path: string): unknown => {
    if (!obj || !path) return undefined;

    // Normalize path: remove dots before brackets
    const normalizedPath = path.replace(/\.\[/g, '[');

    // Split by dots, keeping array brackets
    const parts: string[] = [];
    let current = '';
    for (let i = 0; i < normalizedPath.length; i++) {
      const char = normalizedPath[i];
      if (char === '.' && current) {
        parts.push(current);
        current = '';
      } else if (char !== '.') {
        current += char;
      }
    }
    if (current) parts.push(current);

    let value: unknown = obj;
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;

      // Check for array access like "lookupResults[0]"
      const arrayMatch = part.match(/^([^\[]*)\[(\d+)\](.*)$/);
      if (arrayMatch) {
        const [, arrayName, indexStr, rest] = arrayMatch;
        const index = parseInt(indexStr, 10);

        if (arrayName && typeof value === 'object') {
          value = (value as Record<string, unknown>)[arrayName];
          if (value === undefined || value === null) return undefined;
        }

        if (Array.isArray(value)) {
          value = value[index];
        } else {
          return undefined;
        }

        if (rest && rest.startsWith('.')) {
          const remainingPath = rest.slice(1);
          if (remainingPath) {
            value = getValueFromPath(value, remainingPath);
          }
        }
      } else if (typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  };

  // Replace {{ $json.path }} patterns
  result = result.replace(/\{\{\s*\$json\.([^}]+)\s*\}\}/g, (match, path) => {
    const value = getValueFromPath(data, path.trim());
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return match;
  });

  // Replace {{ $('nodeName').item.json['path'] }} patterns - these reference current input data
  // In sequential workflow execution, the inputData IS the output from previous node
  // Supports paths like: lookupResults[0].pointId, body.message, etc.
  result = result.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\['([^']+)'\]\s*\}\}/g, (match, _nodeName, path) => {
    // The data parameter contains output from previous node, so just access it directly
    const value = getValueFromPath(data, path);
    console.log(`[Expression] Resolving $('${_nodeName}').item.json['${path}'] -> ${value !== undefined ? JSON.stringify(value).substring(0, 100) : 'undefined'}`);
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return match;
  });

  // Replace {{ $('nodeName').item.json.path }} patterns (dot notation with array access)
  // Supports: lookupResults[0].pointId, cities[1].name, etc.
  result = result.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\.([^}\s]+)\s*\}\}/g, (match, _nodeName, path) => {
    const value = getValueFromPath(data, path.trim());
    console.log(`[Expression] Resolving $('${_nodeName}').item.json.${path} -> ${value !== undefined ? JSON.stringify(value).substring(0, 100) : 'undefined'}`);
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return match;
  });

  return result;
}

async function executeBasicLLMChainNode(
  nodeConfig: BasicLLMChainConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  console.log('[Basic LLM Chain] Executing...');
  console.log('[Basic LLM Chain] Input data keys:', Object.keys(inputData).join(', '));

  // Build messages array
  const messages: Array<{ role: string; content: string }> = [];

  // Process chat messages (system, user, ai)
  if (nodeConfig.chatMessages && Array.isArray(nodeConfig.chatMessages)) {
    for (const msg of nodeConfig.chatMessages) {
      if (!msg.message || !msg.message.trim()) continue;

      // Resolve expressions in the message
      const resolvedMessage = resolveExpressionWithArrays(msg.message, inputData);
      console.log('[Basic LLM Chain] Message resolved:', msg.message.substring(0, 100), '->', resolvedMessage.substring(0, 100));

      const role = msg.type === 'ai' ? 'assistant' : msg.type;
      messages.push({ role, content: resolvedMessage });
    }
  }

  // Add user prompt if specified
  if (nodeConfig.userPrompt) {
    const resolvedPrompt = resolveExpressionWithArrays(nodeConfig.userPrompt, inputData);
    console.log('[Basic LLM Chain] User prompt resolved:', nodeConfig.userPrompt.substring(0, 100), '->', resolvedPrompt.substring(0, 100));

    // If it still contains unreleased expressions, add input data context
    if (resolvedPrompt.includes('{{')) {
      messages.push({
        role: 'user',
        content: `${resolvedPrompt}\n\nInput data:\n${JSON.stringify(inputData, null, 2)}`
      });
    } else {
      messages.push({ role: 'user', content: resolvedPrompt });
    }
  }

  // If no messages, add default with input data
  if (messages.length === 0) {
    messages.push({
      role: 'user',
      content: `Process the following data:\n${JSON.stringify(inputData, null, 2)}`
    });
  }

  console.log('[Basic LLM Chain] Messages count:', messages.length);
  console.log('[Basic LLM Chain] Model:', nodeConfig.model || 'llama-3.3-70b-versatile');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: nodeConfig.model || 'llama-3.3-70b-versatile',
      messages,
      temperature: nodeConfig.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  interface GroqResponse {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      queue_time?: number;
      prompt_time?: number;
      completion_time?: number;
      total_time?: number;
    };
    model?: string;
  }

  const result = (await response.json()) as GroqResponse;
  const responseText = result.choices?.[0]?.message?.content || '';

  console.log('[Basic LLM Chain] Response length:', responseText.length);

  // Try to parse as JSON if requireOutputFormat is true
  let parsedResponse: unknown = responseText;
  let isJson = false;

  if (nodeConfig.requireOutputFormat) {
    try {
      // Try to extract JSON from the response
      const jsonText = extractJsonFromText(responseText);
      parsedResponse = JSON.parse(jsonText);
      isJson = true;
      console.log('[Basic LLM Chain] Parsed JSON response');
    } catch {
      // Keep as string
      console.log('[Basic LLM Chain] Could not parse as JSON');
    }
  }

  return {
    ...inputData,
    response: {
      text: isJson ? parsedResponse : responseText,
    },
    analysis: isJson ? parsedResponse : responseText,
    rawAnalysis: responseText,
    isJson,
    model: result.model,
    tokenUsage: {
      queue_time: result.usage?.queue_time,
      prompt_tokens: result.usage?.prompt_tokens,
      prompt_time: result.usage?.prompt_time,
      completion_tokens: result.usage?.completion_tokens,
      completion_time: result.usage?.completion_time,
      total_tokens: result.usage?.total_tokens,
      total_time: result.usage?.total_time,
    },
  };
}

// Re-export for convenience
export { executeTelegramNode } from './telegram.node.js';
export { executeGroqNode } from './groq.node.js';
export { executeAmoCRMNode } from './amocrm.node.js';
export { executeBitrix24Node } from './bitrix24.node.js';
export { executeZohoCRMNode } from './zoho.node.js';
export { executeSplitOutNode } from './split-out.node.js';
export { executeCodeNode } from './code.node.js';
export { executeEmailNode } from './email.node.js';
export { executeCityLookupNode } from './city-lookup.node.js';
export { executeGalltransRoutesNode } from './galltrans-routes.node.js';
export * from './flow-control.node.js';
