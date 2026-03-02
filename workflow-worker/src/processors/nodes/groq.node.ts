import { config } from '../../lib/config.js';

interface GroqConfig {
  customPrompt?: string;
  prompt?: string;
  inputExpression?: string;
  temperature?: number;
  model?: string;
  systemPrompt?: string;
}

/**
 * Get value from path with array support
 * Supports: lookupResults[0].pointId, cities[1].name, etc.
 */
function getValueFromPath(obj: unknown, path: string): unknown {
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
}

/**
 * Resolve template expressions like {{ $json.field }} or {{ field }}
 * Also supports n8n-style: {{ $('Node').item.json.path }} and array access {{ $json.array[0].field }}
 */
function resolveTemplates(template: string, data: Record<string, unknown>): string {
  if (!template) return '';

  let result = template;

  // First handle n8n-style: {{ $('NodeName').item.json['path'] }}
  result = result.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\['([^']+)'\]\s*\}\}/g, (match, _nodeName, path) => {
    const value = getValueFromPath(data, path);
    console.log(`[Groq Template] Resolving $('${_nodeName}').item.json['${path}'] -> ${value !== undefined ? JSON.stringify(value).substring(0, 100) : 'undefined'}`);
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    }
    return match;
  });

  // Handle n8n-style: {{ $('NodeName').item.json.path }} (dot notation with array access)
  result = result.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\.([^}\s]+)\s*\}\}/g, (match, _nodeName, path) => {
    const value = getValueFromPath(data, path.trim());
    console.log(`[Groq Template] Resolving $('${_nodeName}').item.json.${path} -> ${value !== undefined ? JSON.stringify(value).substring(0, 100) : 'undefined'}`);
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    }
    return match;
  });

  // Handle simple {{ $json.path }} with array support
  result = result.replace(/\{\{\s*\$json\.([^}\s]+)\s*\}\}/g, (match, path) => {
    const value = getValueFromPath(data, path.trim());
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    }
    return match;
  });

  // Handle {{ field }} style (without $json prefix)
  result = result.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_.\[\]]*)\s*\}\}/g, (match, path) => {
    // Skip if it starts with $ (already handled) or looks like JS expression
    if (path.startsWith('$') || path.includes('(')) return match;

    const value = getValueFromPath(data, path.trim());
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    }
    return match;
  });

  return result;
}

/**
 * Get the main data content from inputData, checking various common field names
 */
function getMainContent(inputData: Record<string, unknown>): string {
  console.log('[Groq] getMainContent - inputData keys:', Object.keys(inputData).join(', '));

  // Check common response fields from HTTP Request node and other sources
  const contentFields = [
    'http_response', 'http_body', 'http_data',
    'response', 'content', 'result',
    'transcript', 'summary', 'text', 'message',
    'rag_answer', 'groq_response', 'analysis',
    'listings', 'items', 'records'
  ];

  for (const field of contentFields) {
    if (inputData[field]) {
      const value = inputData[field];
      console.log(`[Groq] Found field "${field}" with type: ${typeof value}`);
      if (typeof value === 'string') return value;
      if (typeof value === 'object') return JSON.stringify(value, null, 2);
    }
  }

  // Check for nested body/data fields (common from webhook triggers)
  if (inputData.body && typeof inputData.body === 'object') {
    const body = inputData.body as Record<string, unknown>;
    console.log('[Groq] Found body object, keys:', Object.keys(body).join(', '));

    // Check for data inside body
    for (const field of contentFields) {
      if (body[field]) {
        const value = body[field];
        if (typeof value === 'string') return value;
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
      }
    }
    // Return the whole body if no specific field found
    return JSON.stringify(body, null, 2);
  }

  if (inputData.data && typeof inputData.data === 'object') {
    console.log('[Groq] Found data object');
    return JSON.stringify(inputData.data, null, 2);
  }

  // Fallback: stringify all input data
  console.log('[Groq] Fallback: using entire inputData');
  return JSON.stringify(inputData, null, 2);
}

export async function executeGroqNode(
  nodeConfig: GroqConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = config.apis.groqApiKey;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  console.log('[Groq] Config keys:', Object.keys(nodeConfig).join(', '));
  console.log('[Groq] Input data keys:', Object.keys(inputData).join(', '));

  // Get content to analyze
  const content = getMainContent(inputData);

  // Resolve inputExpression if provided (n8n-style expressions like {{ $('City Lookup').item.json.lookupResults[0].pointId }})
  let resolvedInput = '';
  if (nodeConfig.inputExpression) {
    console.log('[Groq] Resolving inputExpression:', nodeConfig.inputExpression.substring(0, 200));
    resolvedInput = resolveTemplates(nodeConfig.inputExpression, inputData);
    console.log('[Groq] Resolved inputExpression:', resolvedInput.substring(0, 200));
  }

  // Build actual data from City Lookup if available
  let actualCityData = '';
  if (inputData.lookupResults && Array.isArray(inputData.lookupResults)) {
    const results = inputData.lookupResults as Array<{
      pointId?: number;
      point_id?: number;
      pointName?: string;
      matched_name?: string;
      searchTerm?: string;
    }>;

    actualCityData = '\n\nDATE REALE DIN CITY LOOKUP:';
    results.forEach((r, i) => {
      const id = r.pointId || r.point_id;
      const name = r.pointName || r.matched_name || r.searchTerm;
      actualCityData += `\n- lookupResults[${i}].pointId = ${id} (${name})`;
    });

    if (inputData.date) {
      actualCityData += `\n- date = ${inputData.date}`;
    }

    console.log('[Groq] Added actual city data:', actualCityData);
  }

  // Resolve template expressions in customPrompt or prompt
  const promptTemplate = nodeConfig.customPrompt || nodeConfig.prompt || '';
  let prompt: string;

  if (promptTemplate) {
    prompt = resolveTemplates(promptTemplate, inputData);
    console.log('[Groq] Prompt template resolved, length:', prompt.length);

    // IMPORTANT: Add actual city data to override any hardcoded values in the prompt
    if (actualCityData) {
      prompt = `${prompt}${actualCityData}`;
    }

    // Add resolved input expression data if available
    if (resolvedInput && !resolvedInput.includes('{{')) {
      prompt = `${prompt}\n\nDATE DIN INPUT EXPRESSION:\n${resolvedInput}`;
    }

    // If prompt still contains unresolved templates or is just the template, add content
    if (prompt === promptTemplate || prompt.includes('{{')) {
      prompt = `${promptTemplate}\n\nDate de analizat:\n${content}`;
    }
  } else {
    // No prompt template - use default with content
    if (actualCityData) {
      prompt = `Creează un JSON cu datele de mai jos.${actualCityData}\n\nRĂSPUNDE DOAR CU JSON-ul, fără explicații!`;
    } else if (resolvedInput && !resolvedInput.includes('{{')) {
      prompt = `Analizeaza urmatoarele date si extrage informatiile cheie:\n\n${resolvedInput}`;
    } else {
      prompt = `Analizeaza urmatoarele date si extrage informatiile cheie:\n\n${content}`;
    }
  }

  console.log('[Groq] Executing analysis, prompt length:', prompt.length);
  console.log('[Groq] Input data keys:', Object.keys(inputData).join(', '));
  console.log('[Groq] Content preview:', content.substring(0, 200) + '...');

  // Build messages array
  const messages: Array<{ role: string; content: string }> = [];

  // Add system prompt if configured
  if (nodeConfig.systemPrompt) {
    messages.push({ role: 'system', content: nodeConfig.systemPrompt });
  }

  // Add user message
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: nodeConfig.model || 'llama-3.3-70b-versatile',
      messages,
      temperature: nodeConfig.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const result = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const analysis = result.choices?.[0]?.message?.content || '';

  // Try to parse as JSON if possible
  let parsedAnalysis: unknown = analysis;
  try {
    parsedAnalysis = JSON.parse(analysis);
  } catch {
    // Keep as string
  }

  console.log('[Groq] Analysis completed, response length:', analysis.length);

  return {
    ...inputData,
    analysis: parsedAnalysis,
    rawAnalysis: analysis,
  };
}
