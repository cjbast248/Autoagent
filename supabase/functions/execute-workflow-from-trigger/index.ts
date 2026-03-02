import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface TriggerPayload {
  workflow_id: string;
  trigger_id: string;
  trigger_type: 'call_history' | 'webhook';
  data: any;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  console.log('🚀 Execute Workflow from Trigger called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: TriggerPayload = await req.json();
    console.log('📦 Trigger payload:', JSON.stringify(payload, null, 2));

    const { workflow_id, trigger_id, trigger_type, data, user_id } = payload;

    if (!workflow_id || !data) {
      throw new Error('Missing required fields: workflow_id, data');
    }

    // Fetch the workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflow_id)
      .single();

    if (workflowError || !workflow) {
      console.error('❌ Workflow not found:', workflowError);
      throw new Error(`Workflow not found: ${workflow_id}`);
    }

    console.log('✅ Workflow loaded:', workflow.name);

    // Parse nodes and connections
    const nodes = typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes;
    const connections = typeof workflow.connections === 'string' ? JSON.parse(workflow.connections) : workflow.connections;

    if (!nodes || nodes.length === 0) {
      throw new Error('Workflow has no nodes');
    }

    // Build execution order - find nodes after trigger
    const executionOrder = buildExecutionOrder(nodes, connections, trigger_type);
    console.log('📋 Execution order:', executionOrder.map(n => n.label));

    // Execute each node in order
    let currentData = data;
    const results: any[] = [];
    let splitMode = false;
    let splitItems: any[] = [];

    for (let i = 0; i < executionOrder.length; i++) {
      const node = executionOrder[i];
      console.log(`⚡ Executing node: ${node.label} (${node.type})`);

      try {
        // If in split mode, execute for each item
        if (splitMode && splitItems.length > 0) {
          console.log(`🔀 Split mode: Executing ${node.label} for ${splitItems.length} items`);
          const itemResults: any[] = [];
          let successCount = 0;
          let errorCount = 0;

          for (let itemIdx = 0; itemIdx < splitItems.length; itemIdx++) {
            const itemData = splitItems[itemIdx];
            const itemPreview = itemData.item?.title || itemData.title || `Item ${itemIdx + 1}`;
            console.log(`  📦 Item ${itemIdx + 1}/${splitItems.length}: "${itemPreview}"`);

            try {
              const itemResult = await executeNode(node, itemData, user_id, supabase);
              itemResults.push({
                index: itemIdx,
                status: 'success',
                itemTitle: itemPreview,
                result: itemResult,
                createdId: itemResult?.amocrm_created_id
              });
              successCount++;
            } catch (itemError: any) {
              console.error(`  ❌ Item ${itemIdx + 1} ("${itemPreview}") failed:`, itemError.message);
              console.error(`  📋 Item data:`, JSON.stringify(itemData, null, 2).substring(0, 500));
              itemResults.push({
                index: itemIdx,
                status: 'error',
                itemTitle: itemPreview,
                error: itemError.message,
                itemData: {
                  title: itemData.item?.title || itemData.title,
                  price: itemData.item?.price || itemData.price
                }
              });
              errorCount++;
              // Continue with next item
            }
          }

          results.push({
            node: node.label,
            status: errorCount === splitItems.length ? 'error' : 'success',
            splitExecution: true,
            itemsProcessed: splitItems.length,
            successCount,
            errorCount,
            itemResults
          });
          console.log(`✅ Node ${node.label} completed: ${successCount} success, ${errorCount} errors out of ${splitItems.length} items`);
        } else {
          // Normal single execution
          const result = await executeNode(node, currentData, user_id, supabase);

          // Check if this is a Split Out node that returned split items
          if (result && result._splitItems && Array.isArray(result._splitItems)) {
            console.log(`🔀 Split Out detected: ${result._splitItems.length} items`);
            splitMode = true;
            splitItems = result._splitItems;
            results.push({
              node: node.label,
              status: 'success',
              splitOut: true,
              itemCount: result._splitItems.length
            });
          } else {
            results.push({ node: node.label, status: 'success', result });
            currentData = result || currentData;
          }
          console.log(`✅ Node ${node.label} completed`);
        }
      } catch (nodeError: any) {
        console.error(`❌ Node ${node.label} failed:`, nodeError);
        results.push({ node: node.label, status: 'error', error: nodeError.message });
        // Continue with next node or break depending on error type
        break;
      }
    }

    // Update trigger statistics
    if (trigger_id) {
      await supabase
        .from('call_history_triggers')
        .update({
          total_triggers: workflow.total_triggers ? workflow.total_triggers + 1 : 1,
          last_triggered_at: new Date().toISOString()
        })
        .eq('id', trigger_id);
    }

    // Update workflow last_run
    await supabase
      .from('workflows')
      .update({ last_run: new Date().toISOString() })
      .eq('id', workflow_id);

    // Calculate summary statistics
    const totalSuccess = results.reduce((sum, r) => sum + (r.successCount || (r.status === 'success' ? 1 : 0)), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errorCount || (r.status === 'error' ? 1 : 0)), 0);
    const createdIds = results
      .filter(r => r.itemResults)
      .flatMap(r => r.itemResults.filter((ir: any) => ir.createdId).map((ir: any) => ir.createdId));

    console.log('🎉 Workflow execution completed');
    console.log(`📊 Summary: ${totalSuccess} success, ${totalErrors} errors, ${createdIds.length} records created`);

    return new Response(JSON.stringify({
      success: totalErrors === 0 || totalSuccess > 0,
      message: totalErrors === 0
        ? 'Workflow executed successfully'
        : `Workflow completed with ${totalErrors} error(s) and ${totalSuccess} success`,
      results,
      nodesExecuted: results.length,
      summary: {
        totalSuccess,
        totalErrors,
        created_count: createdIds.length,
        created_ids: createdIds,
        errors: results
          .filter(r => r.itemResults)
          .flatMap(r => r.itemResults.filter((ir: any) => ir.status === 'error').map((ir: any) => `${ir.itemTitle}: ${ir.error}`))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error executing workflow:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildExecutionOrder(nodes: any[], connections: any[], triggerType: string): any[] {
  // Find the trigger node (Call History Trigger or Webhook)
  const triggerNode = nodes.find(n => {
    if (triggerType === 'call_history') {
      return n.icon === 'CallHistory' || n.label?.toLowerCase().includes('call history');
    }
    return n.type === 'trigger' || n.icon === 'Webhook';
  });

  if (!triggerNode) {
    // If no trigger found, return all non-trigger nodes in order
    return nodes.filter(n => n.type !== 'trigger');
  }

  // Build execution order starting from trigger
  const order: any[] = [];
  const visited = new Set<string>();
  
  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Skip trigger node itself, add others
    if (node.id !== triggerNode.id) {
      order.push(node);
    }
    
    // Find connected nodes (outgoing)
    const outgoingConnections = connections.filter(c => c.from === nodeId);
    for (const conn of outgoingConnections) {
      traverse(conn.to);
    }
  }

  // Start from trigger node's connections
  const triggerConnections = connections.filter(c => c.from === triggerNode.id);
  for (const conn of triggerConnections) {
    traverse(conn.to);
  }

  return order;
}

async function executeNode(node: any, inputData: any, userId: string, supabase: any): Promise<any> {
  const icon = node.icon?.toLowerCase() || '';
  const label = node.label?.toLowerCase() || '';
  const config = node.config || {};

  // Telegram Node
  if (icon === 'telegram' || label.includes('telegram')) {
    return await executeTelegramNode(config, inputData);
  }

  // Groq Analysis Node
  if (icon === 'groqanalysis' || label.includes('groq')) {
    return await executeGroqNode(config, inputData);
  }

  // Zoho CRM Node
  if (icon === 'zohocrm' || label.includes('zoho')) {
    return await executeZohoNode(config, inputData, userId, supabase);
  }

  // amoCRM Node
  if (icon.includes('amocrm') || label.includes('amocrm')) {
    return await executeAmoCRMNode(config, inputData, userId, supabase);
  }

  // End Node - just pass through
  if (node.type === 'end' || icon === 'end') {
    return inputData;
  }

  // Split Out Node - handled specially in main execution loop
  if (icon === 'split-out' || icon === 'split_out' || label.includes('split out') || label.includes('split-out')) {
    return await executeSplitOutNode(config, inputData);
  }

  // Default - pass through
  return inputData;
}

async function executeSplitOutNode(config: any, inputData: any): Promise<any> {
  const sourceField = config.sourceField || 'data';
  const itemFieldName = config.itemFieldName || 'item';
  const includeIndex = config.includeIndex !== false;
  const includeTotal = config.includeTotal !== false;

  console.log('🔀 Split Out node - config:', JSON.stringify(config, null, 2));
  console.log('🔀 Split Out node - inputData keys:', Object.keys(inputData || {}));

  // Get the array from input data
  let arrayData: any[] = [];

  if (sourceField === 'root' && Array.isArray(inputData)) {
    arrayData = inputData;
  } else if (inputData && sourceField) {
    const parts = sourceField.split('.');
    let current = inputData;
    for (const part of parts) {
      if (current === null || current === undefined) break;
      current = current[part];
    }
    if (Array.isArray(current)) {
      arrayData = current;
    }
  }

  if (!Array.isArray(arrayData) || arrayData.length === 0) {
    console.warn('⚠️ Split Out: No array found at sourceField:', sourceField);
    // Return empty array to signal no items to process
    return { _splitItems: [], _splitConfig: config };
  }

  console.log(`🔀 Split Out: Found ${arrayData.length} items to split`);

  // Transform each item
  const splitItems = arrayData.map((item, index) => {
    const result: any = { [itemFieldName]: item };
    if (includeIndex) {
      result._index = index;
    }
    if (includeTotal) {
      result._total = arrayData.length;
    }
    return result;
  });

  // Return special marker for split items
  return {
    _splitItems: splitItems,
    _splitConfig: config,
    _originalInput: inputData
  };
}

async function executeTelegramNode(config: any, inputData: any): Promise<any> {
  const botToken = config.botToken;
  const chatId = config.chatId;
  
  if (!botToken || !chatId) {
    throw new Error('Telegram: Missing botToken or chatId');
  }

  console.log('📱 Telegram node - inputData:', JSON.stringify(inputData, null, 2));
  console.log('📱 Telegram node - config:', JSON.stringify(config, null, 2));

  // Build message from input data - SHOW ALL AVAILABLE DATA
  let message = '';
  
  if (typeof inputData === 'string') {
    message = inputData;
  } else if (inputData) {
    const parts: string[] = [];
    
    // === CALL DETAILS ===
    if (inputData.contact_name) parts.push(`👤 *Contact:* ${escapeMarkdown(inputData.contact_name)}`);
    if (inputData.phone_number) parts.push(`📞 *Telefon:* ${escapeMarkdown(inputData.phone_number)}`);
    if (inputData.caller_number) parts.push(`📲 *Apelant:* ${escapeMarkdown(inputData.caller_number)}`);
    if (inputData.agent_name) parts.push(`🤖 *Agent:* ${escapeMarkdown(inputData.agent_name)}`);
    if (inputData.call_date) parts.push(`📅 *Data:* ${escapeMarkdown(inputData.call_date)}`);
    if (inputData.call_status) parts.push(`📊 *Status:* ${escapeMarkdown(inputData.call_status)}`);
    
    // === DURATION & COST ===
    if (inputData.duration_seconds !== undefined && inputData.duration_seconds !== null) {
      const mins = Math.floor(inputData.duration_seconds / 60);
      const secs = inputData.duration_seconds % 60;
      parts.push(`⏱️ *Durată:* ${mins}:${secs.toString().padStart(2, '0')}`);
    }
    if (inputData.duration_formatted) parts.push(`🕐 *Durată:* ${escapeMarkdown(inputData.duration_formatted)}`);
    if (inputData.cost_usd !== undefined && inputData.cost_usd !== null) {
      parts.push(`💰 *Cost:* $${Number(inputData.cost_usd).toFixed(4)}`);
    }
    
    // === AI ANALYSIS - MOST IMPORTANT ===
    if (inputData.ai_score !== undefined && inputData.ai_score !== null) {
      parts.push(`\n⭐ *Scor AI:* ${inputData.ai_score}/100`);
    }
    
    if (inputData.ai_tags && Array.isArray(inputData.ai_tags) && inputData.ai_tags.length > 0) {
      parts.push(`🏷️ *Tag-uri:* ${inputData.ai_tags.map((t: string) => escapeMarkdown(t)).join(', ')}`);
    }
    
    // AI Conclusion - the main analysis
    if (inputData.conclusion) {
      parts.push(`\n📝 *Concluzie AI:*\n${escapeMarkdown(inputData.conclusion)}`);
    }
    
    // Summary (usually just initial description, less important than conclusion)
    if (inputData.summary && inputData.summary !== inputData.conclusion) {
      // Only show summary if different from conclusion
      parts.push(`\n📋 *Notă:* ${escapeMarkdown(inputData.summary)}`);
    }
    
    // === TRANSCRIPT (optional, can be long) ===
    if (inputData.transcript && config.includeTranscription !== false) {
      const transcriptText = typeof inputData.transcript === 'string' 
        ? inputData.transcript 
        : JSON.stringify(inputData.transcript);
      // Limit transcript to avoid Telegram message limit
      const truncatedTranscript = transcriptText.length > 800 
        ? transcriptText.substring(0, 800) + '...' 
        : transcriptText;
      parts.push(`\n💬 *Transcript:*\n${escapeMarkdown(truncatedTranscript)}`);
    }
    
    // Audio link
    if (inputData.audio_url) {
      parts.push(`\n🔊 [Ascultă audio](${inputData.audio_url})`);
    }
    
    // Conversation ID for reference
    if (inputData.conversation_id) {
      parts.push(`\n🆔 _${escapeMarkdown(inputData.conversation_id)}_`);
    }
    
    message = parts.length > 0 ? parts.join('\n') : JSON.stringify(inputData, null, 2);
  }

  // Add header
  message = `🔔 *Notificare Call History Trigger*\n${'─'.repeat(20)}\n\n${message}`;

  console.log('📱 Telegram message to send:', message);

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    }),
  });

  const result = await response.json();
  
  if (!result.ok) {
    console.error('❌ Telegram API error:', result);
    // Try without Markdown if parsing fails
    if (result.description?.includes('parse')) {
      console.log('🔄 Retrying without Markdown...');
      const retryResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.replace(/\*/g, '').replace(/_/g, ''),
        }),
      });
      const retryResult = await retryResponse.json();
      if (!retryResult.ok) {
        throw new Error(`Telegram error: ${retryResult.description}`);
      }
      return { telegram_sent: true, message_id: retryResult.result?.message_id };
    }
    throw new Error(`Telegram error: ${result.description}`);
  }

  return { telegram_sent: true, message_id: result.result?.message_id };
}

// Helper to escape Markdown special characters
function escapeMarkdown(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/\-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

async function executeGroqNode(config: any, inputData: any): Promise<any> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const transcript = inputData.transcript || inputData.summary || JSON.stringify(inputData);
  const prompt = config.customPrompt || `Analizează următoarea conversație telefonică și extrage informațiile cheie:\n\n${transcript}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: config.temperature || 0.7,
    }),
  });

  const result = await response.json();
  const analysis = result.choices?.[0]?.message?.content || '';

  // Try to parse as JSON if possible
  let parsedAnalysis = analysis;
  try {
    parsedAnalysis = JSON.parse(analysis);
  } catch {
    // Keep as string
  }

  return {
    ...inputData,
    analysis: parsedAnalysis,
    rawAnalysis: analysis,
  };
}

async function executeZohoNode(config: any, inputData: any, userId: string, supabase: any): Promise<any> {
  // Get Zoho connection for user
  const { data: zohoConn } = await supabase
    .from('zoho_crm_connections')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .single();

  if (!zohoConn) {
    throw new Error('No Zoho CRM connection found');
  }

  // Only support update operation for triggers
  if (config.operation === 'update' && config.recordId) {
    const recordId = config.recordIdSource === 'workflow' 
      ? extractNestedValue(inputData, config.recordIdWorkflowField || 'id')
      : config.recordId;

    if (!recordId) {
      throw new Error('No record ID found for Zoho update');
    }

    const fields: Record<string, any> = {};
    for (const fieldMapping of (config.fields || [])) {
      const value = fieldMapping.valueSource === 'workflow'
        ? extractNestedValue(inputData, fieldMapping.workflowField)
        : fieldMapping.value;
      
      if (value !== undefined && value !== null) {
        fields[fieldMapping.field] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
    }

    const response = await fetch(`https://www.zohoapis.com/crm/v2/${config.resource || 'Leads'}/${recordId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Zoho-oauthtoken ${zohoConn.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [fields] }),
    });

    const result = await response.json();
    return { ...inputData, zoho_update: result };
  }

  return inputData;
}

function extractNestedValue(obj: any, path: string): any {
  if (!path || !obj) return undefined;

  // Remove n8n expression wrapper if present: {{ $json.field }} -> field
  let cleanPath = path.trim();
  if (cleanPath.startsWith('{{') && cleanPath.endsWith('}}')) {
    cleanPath = cleanPath.slice(2, -2).trim();
  }
  // Remove $json. prefix if present
  if (cleanPath.startsWith('$json.')) {
    cleanPath = cleanPath.slice(6);
  }

  // Handle array notation: [0].field -> 0.field
  cleanPath = cleanPath.replace(/\[(\d+)\]/g, '.$1');
  // Remove leading dot if any
  if (cleanPath.startsWith('.')) {
    cleanPath = cleanPath.slice(1);
  }

  const parts = cleanPath.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    // Handle numeric indices
    const index = parseInt(part);
    if (!isNaN(index) && Array.isArray(current)) {
      current = current[index];
    } else {
      current = current[part];
    }
  }

  return current;
}

async function executeAmoCRMNode(config: any, inputData: any, userId: string, supabase: any): Promise<any> {
  console.log('🔷 AmoCRM node - config:', JSON.stringify(config, null, 2));
  console.log('🔷 AmoCRM node - inputData:', JSON.stringify(inputData, null, 2));

  // Get amoCRM connection for user
  const { data: amoConn, error: connError } = await supabase
    .from('amocrm_connections')
    .select('access_token, refresh_token, base_domain, expires_at')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .single();

  if (connError || !amoConn) {
    throw new Error('No amoCRM connection found. Please connect your amoCRM account first.');
  }

  // Check if token needs refresh
  let accessToken = amoConn.access_token;
  const expiresAt = amoConn.expires_at ? new Date(amoConn.expires_at).getTime() : 0;
  const now = Date.now();

  if (expiresAt && expiresAt < now + 90000) {
    // Token expired or expiring soon, refresh it
    console.log('🔄 Refreshing amoCRM token...');
    const refreshed = await refreshAmoCRMToken(amoConn.refresh_token, amoConn.base_domain);
    accessToken = refreshed.access_token;

    // Update token in database
    await supabase
      .from('amocrm_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString()
      })
      .eq('user_id', userId);
  }

  const baseDomain = amoConn.base_domain || Deno.env.get('AMOCRM_BASE_DOMAIN');
  const apiBase = `https://${baseDomain}/api/v4`;

  const operation = config.operation || 'create';
  // UI saves as 'resource', but also check 'entityType' for backwards compatibility
  const entityType = config.resource || config.entityType || 'leads';

  console.log('🔷 AmoCRM operation:', operation, 'entityType:', entityType);

  // Helper to convert price string to number (e.g., "75 000 €" -> 75000)
  const parsePrice = (priceStr: any): number | null => {
    if (typeof priceStr === 'number') return priceStr;
    if (typeof priceStr !== 'string') return null;
    // Remove currency symbols, spaces, and non-numeric chars except dots/commas
    const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(/\s/g, '');
    // Handle European format (1.000,50) vs US format (1,000.50)
    let normalized = cleaned;
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Has both - determine format
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        // European: 1.000,50 -> 1000.50
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // US: 1,000.50 -> 1000.50
        normalized = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Only comma - could be decimal or thousands
      const parts = cleaned.split(',');
      if (parts[1] && parts[1].length <= 2) {
        // Likely decimal
        normalized = cleaned.replace(',', '.');
      } else {
        // Likely thousands separator
        normalized = cleaned.replace(/,/g, '');
      }
    }
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  };

  // Build the data payload from field mappings
  const buildPayloadData = () => {
    const payload: Record<string, any> = {};

    // For split mode, data comes as { item: {...}, _index, _total }
    // Flatten the structure for easier access
    const flatData = inputData.item ? { ...inputData, ...inputData.item } : inputData;

    console.log('🔷 AmoCRM buildPayloadData - flatData keys:', Object.keys(flatData));

    // Process field mappings
    if (config.fields && Array.isArray(config.fields)) {
      for (const fieldMapping of config.fields) {
        let value: any;

        if (fieldMapping.valueSource === 'workflow') {
          // Get value from workflow data
          const workflowPath = fieldMapping.workflowField || fieldMapping.value || fieldMapping.path;

          // Try multiple extraction strategies
          value = extractNestedValue(flatData, workflowPath);

          // If still not found and path looks like array access, try item directly
          if (value === undefined && inputData.item) {
            // Try without array index prefix (e.g., "0.title" -> "title")
            const pathWithoutIndex = workflowPath.replace(/^\d+\./, '');
            value = extractNestedValue(inputData.item, pathWithoutIndex);
          }

          console.log(`🔷 Field mapping: ${fieldMapping.field} <- ${workflowPath} = ${JSON.stringify(value)?.substring(0, 100)}`);
        } else {
          // Static value
          value = fieldMapping.value;
        }

        if (value !== undefined && value !== null && value !== '') {
          // Handle custom fields (format: custom_X where X is field_id)
          if (fieldMapping.field?.startsWith('custom_')) {
            const fieldId = fieldMapping.field.replace('custom_', '');
            if (fieldId) {
              if (!payload.custom_fields_values) {
                payload.custom_fields_values = [];
              }
              payload.custom_fields_values.push({
                field_id: parseInt(fieldId),
                values: [{ value: String(value) }]
              });
            }
          } else if (fieldMapping.field === 'price') {
            // Auto-convert price string to number
            const numPrice = parsePrice(value);
            if (numPrice !== null) {
              payload.price = numPrice;
            }
          } else {
            // Standard field
            payload[fieldMapping.field] = value;
          }
        }
      }
    }

    // Add name field if not already present (required for leads)
    if (!payload.name && entityType === 'leads') {
      // Try multiple sources for the name
      const title = flatData.title || inputData.item?.title || inputData.title || 'Lead from workflow';
      payload.name = title;
    }

    // If no price set but we have it in input, try to extract
    if (!payload.price && entityType === 'leads') {
      const priceValue = flatData.price || inputData.item?.price;
      if (priceValue) {
        const numPrice = parsePrice(priceValue);
        if (numPrice !== null) {
          payload.price = numPrice;
        }
      }
    }

    console.log('🔷 AmoCRM final payload:', JSON.stringify(payload, null, 2));
    return payload;
  };

  let result: any;

  switch (operation) {
    case 'create': {
      const payloadData = buildPayloadData();
      console.log('🔷 AmoCRM CREATE payload:', JSON.stringify(payloadData, null, 2));

      const resp = await fetch(`${apiBase}/${entityType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([payloadData]),
      });

      const text = await resp.text();
      console.log('🔷 AmoCRM response:', resp.status, text.substring(0, 500));

      if (!resp.ok) {
        // Parse error details from amoCRM response
        let errorDetail = text.substring(0, 300);
        try {
          const errorJson = JSON.parse(text);
          if (errorJson.title) errorDetail = errorJson.title;
          if (errorJson.detail) errorDetail += `: ${errorJson.detail}`;
          if (errorJson['validation-errors']) {
            const validationErrors = errorJson['validation-errors'];
            errorDetail += ` | Validation: ${JSON.stringify(validationErrors)}`;
          }
        } catch {
          // Keep original text
        }
        console.error('🔷 AmoCRM CREATE failed - payload was:', JSON.stringify(payloadData, null, 2));
        throw new Error(`AmoCRM create error (${resp.status}): ${errorDetail}`);
      }

      const data = JSON.parse(text);
      const createdId = data?._embedded?.[entityType]?.[0]?.id;

      result = {
        ...inputData,
        amocrm_result: data,
        amocrm_created_id: createdId
      };

      // Add note if configured
      if (config.addNote && createdId && entityType === 'leads') {
        try {
          let noteText = '';
          const flatData = inputData.item ? { ...inputData, ...inputData.item } : inputData;

          if (config.noteTextSource === 'workflow' && config.noteWorkflowField) {
            noteText = extractNestedValue(flatData, config.noteWorkflowField);
            // Also try from item directly
            if (!noteText && inputData.item) {
              const pathWithoutIndex = config.noteWorkflowField.replace(/^\d+\./, '');
              noteText = extractNestedValue(inputData.item, pathWithoutIndex);
            }
          } else {
            noteText = config.noteText || '';
          }

          if (noteText) {
            // Build comprehensive note with all available data
            let fullNote = noteText;

            // Add link if available and not already in note
            const link = flatData.link || inputData.item?.link;
            if (link && !fullNote.includes(link)) {
              fullNote += `\n\n🔗 Link: ${link}`;
            }

            // Add phone if available
            const phone = flatData.phone || inputData.item?.phone;
            if (phone && !fullNote.includes(phone)) {
              fullNote += `\n📞 Telefon: ${phone}`;
            }

            // Add region if available
            const region = flatData.region || inputData.item?.region;
            if (region && !fullNote.includes(region)) {
              fullNote += `\n📍 Regiune: ${region}`;
            }

            console.log('🔷 AmoCRM creating note for lead:', createdId, 'text length:', fullNote.length);

            const noteResp = await fetch(`${apiBase}/leads/${createdId}/notes`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify([{
                note_type: 'common',
                params: {
                  text: fullNote
                }
              }]),
            });

            const noteRespText = await noteResp.text();
            console.log('🔷 AmoCRM note response:', noteResp.status, noteRespText.substring(0, 200));

            if (noteResp.ok) {
              result.amocrm_note_created = true;
            } else {
              console.warn('⚠️ Failed to create note:', noteRespText.substring(0, 200));
              result.amocrm_note_error = noteRespText.substring(0, 100);
            }
          }
        } catch (noteErr: any) {
          console.error('⚠️ Error creating note:', noteErr.message);
          result.amocrm_note_error = noteErr.message;
        }
      }
      break;
    }

    case 'update': {
      const recordId = config.recordIdSource === 'workflow'
        ? extractNestedValue(inputData, config.recordIdWorkflowField || 'id')
        : config.recordId;

      if (!recordId) {
        throw new Error('AmoCRM update: No record ID specified');
      }

      const payloadData = { id: parseInt(recordId), ...buildPayloadData() };
      console.log('🔷 AmoCRM UPDATE payload:', JSON.stringify(payloadData, null, 2));

      const resp = await fetch(`${apiBase}/${entityType}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([payloadData]),
      });

      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`AmoCRM update error (${resp.status}): ${text.substring(0, 200)}`);
      }

      result = { ...inputData, amocrm_updated: JSON.parse(text) };
      break;
    }

    case 'get': {
      const recordId = config.recordIdSource === 'workflow'
        ? extractNestedValue(inputData, config.recordIdWorkflowField || 'id')
        : config.recordId;

      if (!recordId) {
        throw new Error('AmoCRM get: No record ID specified');
      }

      const resp = await fetch(`${apiBase}/${entityType}/${recordId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`AmoCRM get error (${resp.status}): ${text.substring(0, 200)}`);
      }

      result = { ...inputData, amocrm_record: JSON.parse(text) };
      break;
    }

    default:
      console.warn(`⚠️ AmoCRM operation '${operation}' not implemented, passing through`);
      result = inputData;
  }

  return result;
}

async function refreshAmoCRMToken(refreshToken: string, baseDomain: string): Promise<any> {
  const clientId = Deno.env.get('AMOCRM_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('AMOCRM_CLIENT_SECRET') || '';

  const resp = await fetch(`https://${baseDomain}/oauth2/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AmoCRM token refresh failed: ${text.substring(0, 200)}`);
  }

  return await resp.json();
}
