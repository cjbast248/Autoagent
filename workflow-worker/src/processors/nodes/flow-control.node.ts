/**
 * Flow Control Nodes: IF, Switch, Filter, Sort, Limit, Merge, Loop
 */

interface IfConfig {
  condition?: string;
  field?: string;
  operator?: string;
  value?: unknown;
}

interface FilterConfig {
  field?: string;
  operator?: string;
  value?: unknown;
  conditions?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
}

interface SortConfig {
  field?: string;
  order?: 'asc' | 'desc';
}

interface LimitConfig {
  limit?: number;
  offset?: number;
}

// Evaluate a condition
function evaluateCondition(
  data: Record<string, unknown>,
  field: string,
  operator: string,
  value: unknown
): boolean {
  const fieldValue = getNestedValue(data, field);

  switch (operator) {
    case 'equals':
    case 'eq':
    case '==':
      return fieldValue == value;
    case 'strictEquals':
    case '===':
      return fieldValue === value;
    case 'notEquals':
    case 'ne':
    case '!=':
      return fieldValue != value;
    case 'gt':
    case '>':
      return Number(fieldValue) > Number(value);
    case 'gte':
    case '>=':
      return Number(fieldValue) >= Number(value);
    case 'lt':
    case '<':
      return Number(fieldValue) < Number(value);
    case 'lte':
    case '<=':
      return Number(fieldValue) <= Number(value);
    case 'contains':
      return String(fieldValue).includes(String(value));
    case 'notContains':
      return !String(fieldValue).includes(String(value));
    case 'startsWith':
      return String(fieldValue).startsWith(String(value));
    case 'endsWith':
      return String(fieldValue).endsWith(String(value));
    case 'isEmpty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'isNotEmpty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'isTrue':
      return fieldValue === true || fieldValue === 'true' || fieldValue === 1;
    case 'isFalse':
      return fieldValue === false || fieldValue === 'false' || fieldValue === 0;
    case 'exists':
      return fieldValue !== undefined;
    case 'notExists':
      return fieldValue === undefined;
    case 'regex':
      try {
        return new RegExp(String(value)).test(String(fieldValue));
      } catch {
        return false;
      }
    default:
      console.warn(`[IF] Unknown operator: ${operator}`);
      return false;
  }
}

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * IF Node - Branch based on condition
 */
export function executeIfNode(
  config: IfConfig,
  inputData: Record<string, unknown>
): { branch: 'true' | 'false'; data: Record<string, unknown> } {
  console.log('[IF] Evaluating condition...');

  const field = config.field || '';
  const operator = config.operator || 'isTrue';
  const value = config.value;

  let result = false;

  if (config.condition) {
    // Expression-based condition (simplified)
    try {
      // Very basic expression evaluation - just check if field exists and is truthy
      const fieldValue = getNestedValue(inputData, config.condition);
      result = Boolean(fieldValue);
    } catch (err) {
      console.error('[IF] Expression evaluation failed:', err);
      result = false;
    }
  } else if (field) {
    result = evaluateCondition(inputData, field, operator, value);
  }

  console.log(`[IF] Condition result: ${result}`);

  return {
    branch: result ? 'true' : 'false',
    data: { ...inputData, _ifResult: result },
  };
}

/**
 * Switch Node - Route to different paths based on value
 */
export function executeSwitchNode(
  config: { field?: string; cases?: Array<{ value: unknown; output: string }> },
  inputData: Record<string, unknown>
): { route: string; data: Record<string, unknown> } {
  console.log('[Switch] Evaluating...');

  const field = config.field || 'value';
  const cases = config.cases || [];
  const fieldValue = getNestedValue(inputData, field);

  let matchedRoute = 'default';

  for (const c of cases) {
    if (fieldValue === c.value || String(fieldValue) === String(c.value)) {
      matchedRoute = c.output || 'matched';
      break;
    }
  }

  console.log(`[Switch] Value: ${fieldValue}, Route: ${matchedRoute}`);

  return {
    route: matchedRoute,
    data: { ...inputData, _switchRoute: matchedRoute },
  };
}

/**
 * Filter Node - Filter items based on conditions
 */
export function executeFilterNode(
  config: FilterConfig,
  inputData: Record<string, unknown>
): Record<string, unknown> {
  console.log('[Filter] Filtering data...');

  // Find the array to filter
  let items: unknown[] = [];
  if (Array.isArray(inputData)) {
    items = inputData;
  } else if (inputData.items && Array.isArray(inputData.items)) {
    items = inputData.items;
  } else if (inputData.data && Array.isArray(inputData.data)) {
    items = inputData.data;
  } else {
    // Single item - check if it passes
    items = [inputData];
  }

  const conditions = config.conditions || [];
  if (config.field && config.operator) {
    conditions.push({
      field: config.field,
      operator: config.operator,
      value: config.value,
    });
  }

  if (conditions.length === 0) {
    console.log('[Filter] No conditions, passing through');
    return inputData;
  }

  const filteredItems = items.filter((item) => {
    const itemObj = item as Record<string, unknown>;
    return conditions.every((cond) =>
      evaluateCondition(itemObj, cond.field, cond.operator, cond.value)
    );
  });

  console.log(`[Filter] Filtered ${items.length} -> ${filteredItems.length} items`);

  return {
    ...inputData,
    items: filteredItems,
    _filtered: true,
    _originalCount: items.length,
    _filteredCount: filteredItems.length,
  };
}

/**
 * Sort Node - Sort items by field
 */
export function executeSortNode(
  config: SortConfig,
  inputData: Record<string, unknown>
): Record<string, unknown> {
  console.log('[Sort] Sorting data...');

  const field = config.field || 'id';
  const order = config.order || 'asc';

  // Find the array to sort
  let items: unknown[] = [];
  let itemsKey = 'items';

  if (Array.isArray(inputData)) {
    items = [...inputData];
  } else if (inputData.items && Array.isArray(inputData.items)) {
    items = [...inputData.items];
    itemsKey = 'items';
  } else if (inputData.data && Array.isArray(inputData.data)) {
    items = [...inputData.data];
    itemsKey = 'data';
  } else {
    console.log('[Sort] No array found, passing through');
    return inputData;
  }

  items.sort((a, b) => {
    const aVal = getNestedValue(a as Record<string, unknown>, field);
    const bVal = getNestedValue(b as Record<string, unknown>, field);

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else {
      comparison = Number(aVal) - Number(bVal);
    }

    return order === 'desc' ? -comparison : comparison;
  });

  console.log(`[Sort] Sorted ${items.length} items by ${field} (${order})`);

  return {
    ...inputData,
    [itemsKey]: items,
    _sorted: true,
    _sortField: field,
    _sortOrder: order,
  };
}

/**
 * Limit Node - Limit number of items
 */
export function executeLimitNode(
  config: LimitConfig,
  inputData: Record<string, unknown>
): Record<string, unknown> {
  console.log('[Limit] Limiting data...');

  const limit = config.limit || 10;
  const offset = config.offset || 0;

  // Find the array to limit
  let items: unknown[] = [];
  let itemsKey = 'items';

  if (Array.isArray(inputData)) {
    items = inputData;
  } else if (inputData.items && Array.isArray(inputData.items)) {
    items = inputData.items;
    itemsKey = 'items';
  } else if (inputData.data && Array.isArray(inputData.data)) {
    items = inputData.data;
    itemsKey = 'data';
  } else {
    console.log('[Limit] No array found, passing through');
    return inputData;
  }

  const limitedItems = items.slice(offset, offset + limit);

  console.log(`[Limit] Limited ${items.length} -> ${limitedItems.length} items (offset: ${offset}, limit: ${limit})`);

  return {
    ...inputData,
    [itemsKey]: limitedItems,
    _limited: true,
    _originalCount: items.length,
    _limitedCount: limitedItems.length,
  };
}

/**
 * Merge Node - Combine data from multiple sources
 */
export function executeMergeNode(
  config: { mode?: 'append' | 'combine' | 'keepKeyMatches' },
  inputData: Record<string, unknown>
): Record<string, unknown> {
  console.log('[Merge] Merging data...');

  const mode = config.mode || 'combine';

  // For now, just pass through - merge needs multiple inputs which requires special handling
  // In a real implementation, this would be handled by the workflow processor
  console.log(`[Merge] Mode: ${mode} - passing through (multi-input merge handled by processor)`);

  return {
    ...inputData,
    _merged: true,
    _mergeMode: mode,
  };
}

/**
 * Loop Node - Iterate over items
 * Returns items formatted for split execution
 */
export function executeLoopNode(
  config: { sourceField?: string },
  inputData: Record<string, unknown>
): { _splitItems: Array<Record<string, unknown>>; _loopConfig: typeof config; _originalInput: unknown } {
  console.log('[Loop] Setting up loop...');

  const sourceField = config.sourceField || 'items';

  // Find the array to loop over
  let items: unknown[] = [];

  if (Array.isArray(inputData)) {
    items = inputData;
  } else if (sourceField && inputData[sourceField] && Array.isArray(inputData[sourceField])) {
    items = inputData[sourceField] as unknown[];
  } else if (inputData.items && Array.isArray(inputData.items)) {
    items = inputData.items;
  } else if (inputData.data && Array.isArray(inputData.data)) {
    items = inputData.data;
  }

  if (items.length === 0) {
    console.log('[Loop] No items to loop over');
    return { _splitItems: [], _loopConfig: config, _originalInput: inputData };
  }

  console.log(`[Loop] Found ${items.length} items to iterate`);

  // Transform to split items format
  const splitItems = items.map((item, index) => ({
    item,
    _index: index,
    _total: items.length,
    ...inputData, // Include original context
  }));

  return {
    _splitItems: splitItems,
    _loopConfig: config,
    _originalInput: inputData,
  };
}
