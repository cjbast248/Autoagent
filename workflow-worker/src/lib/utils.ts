/**
 * Extract nested value from object using dot notation path
 * Supports: $json.field, {{ $json.field }}, [0].field, field.nested.value
 */
export function extractNestedValue(obj: unknown, path: string): unknown {
  if (!path || !obj || typeof obj !== 'object') return undefined;

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
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    // Handle numeric indices
    const index = parseInt(part);
    if (!isNaN(index) && Array.isArray(current)) {
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Parse price string to number (e.g., "75 000 €" -> 75000)
 */
export function parsePrice(priceStr: unknown): number | null {
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
}

/**
 * Escape Markdown special characters for Telegram
 */
export function escapeMarkdown(text: string | undefined | null): string {
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

/**
 * Build execution order from workflow nodes and connections
 */
export function buildExecutionOrder(
  nodes: Array<{ id: string; type?: string; icon?: string; label?: string; config?: unknown }>,
  connections: Array<{ from: string; to: string }>,
  triggerType: string
): Array<{ id: string; type?: string; icon?: string; label?: string; config?: unknown }> {
  console.log(`[buildExecutionOrder] ========== START ==========`);
  console.log(`[buildExecutionOrder] Total nodes: ${nodes.length}`);
  console.log(`[buildExecutionOrder] Total connections: ${connections.length}`);
  console.log(`[buildExecutionOrder] Trigger type: ${triggerType}`);
  console.log(`[buildExecutionOrder] Nodes details:`);
  for (const n of nodes) {
    console.log(`  - "${n.label}" | id:${n.id.slice(0,8)} | icon:"${n.icon}" | type:"${n.type}"`);
  }
  console.log(`[buildExecutionOrder] Connections:`);
  for (const c of connections) {
    const fromNode = nodes.find(n => n.id === c.from);
    const toNode = nodes.find(n => n.id === c.to);
    console.log(`  - "${fromNode?.label || c.from.slice(0,8)}" -> "${toNode?.label || c.to.slice(0,8)}"`);
  }

  // Find the trigger node
  const triggerNode = nodes.find((n) => {
    const icon = n.icon?.toLowerCase() || '';
    const label = n.label?.toLowerCase() || '';
    const nodeType = n.type?.toLowerCase() || '';

    if (triggerType === 'call_history') {
      return icon === 'callhistory' || label.includes('call history');
    }

    // Check for webhook/trigger nodes (case-insensitive)
    return nodeType === 'trigger' ||
           icon === 'webhook' ||
           icon === 'webhook-trigger' ||
           icon.includes('trigger') ||
           (icon === 'webhook' && label.includes('receive'));
  });

  if (!triggerNode) {
    console.log(`[buildExecutionOrder] ⚠️ No trigger node found! Returning all non-trigger nodes.`);
    // If no trigger found, return all non-trigger nodes in order
    return nodes.filter((n) => n.type !== 'trigger');
  }

  console.log(`[buildExecutionOrder] ✅ Found trigger: ${triggerNode.label} (${triggerNode.id.slice(0,8)})`);

  // Build execution order starting from trigger
  const order: typeof nodes = [];
  const visited = new Set<string>();

  function traverse(nodeId: string) {
    if (visited.has(nodeId)) {
      console.log(`[buildExecutionOrder] Skipping already visited: ${nodeId.slice(0,8)}`);
      return;
    }
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      console.log(`[buildExecutionOrder] ⚠️ Node not found: ${nodeId.slice(0,8)}`);
      return;
    }

    // Skip trigger node itself, add others
    if (node.id !== triggerNode!.id) {
      console.log(`[buildExecutionOrder] Adding to order: ${node.label} (position ${order.length})`);
      order.push(node);
    }

    // Find connected nodes (outgoing)
    const outgoingConnections = connections.filter((c) => c.from === nodeId);
    console.log(`[buildExecutionOrder] ${node.label} has ${outgoingConnections.length} outgoing connections`);
    for (const conn of outgoingConnections) {
      const targetNode = nodes.find(n => n.id === conn.to);
      console.log(`[buildExecutionOrder] Following connection to: ${targetNode?.label || conn.to.slice(0,8)}`);
      traverse(conn.to);
    }
  }

  // Start from trigger node's connections
  const triggerConnections = connections.filter((c) => c.from === triggerNode!.id);
  console.log(`[buildExecutionOrder] Trigger has ${triggerConnections.length} outgoing connections`);
  for (const conn of triggerConnections) {
    const firstNode = nodes.find(n => n.id === conn.to);
    console.log(`[buildExecutionOrder] Starting traversal from: ${firstNode?.label || conn.to.slice(0,8)}`);
    traverse(conn.to);
  }

  console.log(`[buildExecutionOrder] ========== RESULT ==========`);
  console.log(`[buildExecutionOrder] Final order: ${order.map((n, i) => `${i+1}.${n.label}`).join(' -> ')}`);
  console.log(`[buildExecutionOrder] ========== END ==========`);

  return order;
}
