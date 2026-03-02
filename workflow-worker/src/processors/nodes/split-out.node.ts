interface SplitOutConfig {
  sourceField?: string;
  itemFieldName?: string;
  includeIndex?: boolean;
  includeTotal?: boolean;
}

interface SplitOutResult {
  _splitItems: Array<Record<string, unknown>>;
  _splitConfig: SplitOutConfig;
  _originalInput: unknown;
}

export function executeSplitOutNode(
  config: SplitOutConfig,
  inputData: Record<string, unknown>
): SplitOutResult {
  const sourceField = config.sourceField || 'data';
  const itemFieldName = config.itemFieldName || 'item';
  const includeIndex = config.includeIndex !== false;
  const includeTotal = config.includeTotal !== false;

  console.log('[SplitOut] Executing with sourceField:', sourceField);

  // Get the array from input data
  let arrayData: unknown[] = [];

  if (sourceField === 'root' && Array.isArray(inputData)) {
    arrayData = inputData;
  } else if (inputData && sourceField) {
    const parts = sourceField.split('.');
    let current: unknown = inputData;
    for (const part of parts) {
      if (current === null || current === undefined) break;
      current = (current as Record<string, unknown>)[part];
    }
    if (Array.isArray(current)) {
      arrayData = current;
    }
  }

  if (!Array.isArray(arrayData) || arrayData.length === 0) {
    console.warn('[SplitOut] No array found at sourceField:', sourceField);
    return { _splitItems: [], _splitConfig: config, _originalInput: inputData };
  }

  console.log(`[SplitOut] Found ${arrayData.length} items to split`);

  // Transform each item
  const splitItems = arrayData.map((item, index) => {
    const result: Record<string, unknown> = { [itemFieldName]: item };
    if (includeIndex) {
      result._index = index;
    }
    if (includeTotal) {
      result._total = arrayData.length;
    }
    return result;
  });

  return {
    _splitItems: splitItems,
    _splitConfig: config,
    _originalInput: inputData,
  };
}
