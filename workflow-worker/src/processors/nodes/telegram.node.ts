import { escapeMarkdown } from '../../lib/utils.js';

interface DroppedField {
  key: string;
  path: string;
  expression?: string;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
  text?: string;
  parseMode?: 'none' | 'Markdown' | 'MarkdownV2' | 'HTML';
  droppedFields?: DroppedField[];
  selectedFields?: string[];
  includeTranscription?: boolean;
}

/**
 * Get value from path with array support
 * Supports: lookupResults[0].pointId, analysis.id_from, etc.
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
 * Resolve expressions like {{ $json.analysis }} or {{ JSON.stringify($json.analysis) }}
 */
function resolveExpression(expr: string, data: Record<string, unknown>): string {
  if (!expr) return '';

  let result = expr;

  // Handle {{ JSON.stringify($json.field) }} pattern
  result = result.replace(/\{\{\s*JSON\.stringify\s*\(\s*\$json\.([^)\s]+)\s*\)\s*\}\}/g, (match, path) => {
    const value = getValueFromPath(data, path.trim());
    if (value !== undefined && value !== null) {
      return typeof value === 'string' ? value : JSON.stringify(value);
    }
    return match;
  });

  // Handle {{ $json.path }} pattern with array support
  result = result.replace(/\{\{\s*\$json\.([^}\s]+)\s*\}\}/g, (match, path) => {
    const value = getValueFromPath(data, path.trim());
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return match;
  });

  // Handle n8n-style: {{ $('NodeName').item.json.path }}
  result = result.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\.([^}\s]+)\s*\}\}/g, (match, _nodeName, path) => {
    const value = getValueFromPath(data, path.trim());
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return match;
  });

  return result;
}

export async function executeTelegramNode(
  config: TelegramConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { botToken, chatId } = config;

  if (!botToken || !chatId) {
    throw new Error('Telegram: Missing botToken or chatId');
  }

  console.log('[Telegram] Executing with config:', { chatId, hasToken: !!botToken, hasText: !!config.text });
  console.log('[Telegram] Input data keys:', Object.keys(inputData).join(', '));

  // Build message from various sources
  let message = '';

  // 1. First priority: explicit text field with expression resolution
  if (config.text && config.text.trim()) {
    message = resolveExpression(config.text, inputData);
    console.log('[Telegram] Using text field:', message.substring(0, 200));
  }

  // 2. Second priority: droppedFields (n8n-style field selection)
  if ((!message || message.includes('{{')) && config.droppedFields && config.droppedFields.length > 0) {
    console.log('[Telegram] Processing droppedFields:', config.droppedFields.length);
    const fieldLines: string[] = [];

    for (const field of config.droppedFields) {
      let value: unknown;

      // If expression is provided, resolve it
      if (field.expression) {
        const resolved = resolveExpression(field.expression, inputData);
        if (resolved && !resolved.includes('{{')) {
          value = resolved;
        }
      }

      // If no value yet, try the path
      if (value === undefined && field.path) {
        value = getValueFromPath(inputData, field.path);
      }

      if (value !== undefined && value !== null) {
        const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        fieldLines.push(`${field.key}: ${displayValue}`);
      }
    }

    if (fieldLines.length > 0) {
      message = fieldLines.join('\n');
      console.log('[Telegram] Built message from droppedFields');
    }
  }

  // 3. Third priority: selectedFields
  if ((!message || message.includes('{{')) && config.selectedFields && config.selectedFields.length > 0) {
    const fieldLines: string[] = [];
    for (const fieldPath of config.selectedFields) {
      const value = getValueFromPath(inputData, fieldPath);
      if (value !== undefined && value !== null) {
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        fieldLines.push(`${fieldPath}: ${displayValue}`);
      }
    }
    if (fieldLines.length > 0) {
      message = fieldLines.join('\n');
    }
  }

  // 4. Fourth priority: auto-detect common fields from input
  if (!message || message.includes('{{')) {
    const parts: string[] = [];

    // Check for analysis result (from Groq node)
    if (inputData.analysis) {
      const analysisStr = typeof inputData.analysis === 'string'
        ? inputData.analysis
        : JSON.stringify(inputData.analysis, null, 2);
      parts.push(`📊 Analiza:\n${analysisStr}`);
    }

    // Call details
    if (inputData.contact_name) parts.push(`*Contact:* ${escapeMarkdown(String(inputData.contact_name))}`);
    if (inputData.phone_number) parts.push(`*Telefon:* ${escapeMarkdown(String(inputData.phone_number))}`);
    if (inputData.caller_number) parts.push(`*Apelant:* ${escapeMarkdown(String(inputData.caller_number))}`);
    if (inputData.agent_name) parts.push(`*Agent:* ${escapeMarkdown(String(inputData.agent_name))}`);
    if (inputData.call_date) parts.push(`*Data:* ${escapeMarkdown(String(inputData.call_date))}`);
    if (inputData.call_status) parts.push(`*Status:* ${escapeMarkdown(String(inputData.call_status))}`);

    // Duration & Cost
    if (inputData.duration_seconds !== undefined && inputData.duration_seconds !== null) {
      const durationSec = Number(inputData.duration_seconds);
      const mins = Math.floor(durationSec / 60);
      const secs = durationSec % 60;
      parts.push(`*Durata:* ${mins}:${secs.toString().padStart(2, '0')}`);
    }
    if (inputData.cost_usd !== undefined && inputData.cost_usd !== null) {
      parts.push(`*Cost:* $${Number(inputData.cost_usd).toFixed(4)}`);
    }

    // AI Analysis
    if (inputData.ai_score !== undefined && inputData.ai_score !== null) {
      parts.push(`\n*Scor AI:* ${inputData.ai_score}/100`);
    }

    if (inputData.ai_tags && Array.isArray(inputData.ai_tags) && inputData.ai_tags.length > 0) {
      parts.push(`*Tag-uri:* ${(inputData.ai_tags as string[]).map((t) => escapeMarkdown(t)).join(', ')}`);
    }

    if (inputData.conclusion) {
      parts.push(`\n*Concluzie AI:*\n${escapeMarkdown(String(inputData.conclusion))}`);
    }

    if (inputData.summary && inputData.summary !== inputData.conclusion) {
      parts.push(`\n*Nota:* ${escapeMarkdown(String(inputData.summary))}`);
    }

    // Transcript
    if (inputData.transcript && config.includeTranscription !== false) {
      const transcriptText = typeof inputData.transcript === 'string'
        ? inputData.transcript
        : JSON.stringify(inputData.transcript);
      const truncatedTranscript = transcriptText.length > 800
        ? transcriptText.substring(0, 800) + '...'
        : transcriptText;
      parts.push(`\n*Transcript:*\n${escapeMarkdown(truncatedTranscript)}`);
    }

    // Audio link
    if (inputData.audio_url) {
      parts.push(`\n[Asculta audio](${inputData.audio_url})`);
    }

    // Conversation ID
    if (inputData.conversation_id) {
      parts.push(`\n_${escapeMarkdown(String(inputData.conversation_id))}_`);
    }

    if (parts.length > 0) {
      message = parts.join('\n');
    } else {
      // Fallback: stringify entire input
      message = JSON.stringify(inputData, null, 2);
    }
  }

  // Add header if not already present
  if (!message.startsWith('*Notificare') && !message.startsWith('📊')) {
    message = `📬 *Notificare Workflow*\n${'─'.repeat(20)}\n\n${message}`;
  }

  // Determine parse mode
  const parseMode = config.parseMode === 'none' ? undefined : (config.parseMode || 'Markdown');

  console.log('[Telegram] Final message length:', message.length);
  console.log('[Telegram] Message preview:', message.substring(0, 300));

  // Send message
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message.substring(0, 4096), // Telegram message limit
      parse_mode: parseMode,
    }),
  });

  interface TelegramResponse {
    ok: boolean;
    description?: string;
    result?: { message_id?: number };
  }

  const result = (await response.json()) as TelegramResponse;

  if (!result.ok) {
    console.error('[Telegram] API error:', result);
    // Try without Markdown if parsing fails
    if (result.description?.includes('parse') || result.description?.includes('can\'t parse')) {
      console.log('[Telegram] Retrying without Markdown...');
      const plainMessage = message.replace(/\*/g, '').replace(/_/g, '').replace(/\[/g, '').replace(/\]/g, '');
      const retryResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainMessage.substring(0, 4096),
        }),
      });
      const retryResult = (await retryResponse.json()) as TelegramResponse;
      if (!retryResult.ok) {
        throw new Error(`Telegram error: ${retryResult.description}`);
      }
      return { ...inputData, telegram_sent: true, telegram_message_id: retryResult.result?.message_id };
    }
    throw new Error(`Telegram error: ${result.description}`);
  }

  return { ...inputData, telegram_sent: true, telegram_message_id: result.result?.message_id };
}
