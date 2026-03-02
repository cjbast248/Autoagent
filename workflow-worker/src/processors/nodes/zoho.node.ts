import { SupabaseClient } from '@supabase/supabase-js';
import { extractNestedValue } from '../../lib/utils.js';

interface ZohoCRMConfig {
  operation: 'create' | 'update' | 'get' | 'get_many' | 'delete' | 'get_fields' | 'create_or_update' | 'get_picklist_values';
  resource?: string;
  module?: string;
  picklistField?: string;
  fields?: Array<{
    field: string;
    value: string;
    valueSource?: 'workflow' | 'static';
    workflowField?: string;
    isExpression?: boolean;
  }>;
  filters?: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  recordId?: string;
  recordIdSource?: 'manual' | 'workflow';
  recordIdIsExpression?: boolean;
  combineFilters?: 'AND' | 'OR';
  returnAll?: boolean;
  limit?: number;
  duplicateCheckFields?: string[];
}

interface ZohoCRMConnection {
  access_token: string;
  refresh_token: string;
  client_id: string;
  client_secret: string;
  zoho_region: string;
}

async function refreshZohoToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  zohoRegion: string,
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  if (!clientId || !clientSecret) {
    throw new Error('Zoho OAuth credentials not configured');
  }

  // Build accounts domain based on region
  const accountsDomain = zohoRegion === 'com' ? 'accounts.zoho.com' :
                        zohoRegion === 'in' ? 'accounts.zoho.in' :
                        zohoRegion === 'au' ? 'accounts.zoho.com.au' :
                        zohoRegion === 'jp' ? 'accounts.zoho.jp' :
                        'accounts.zoho.eu';

  const tokenResponse = await fetch(
    `https://${accountsDomain}/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`,
    { method: 'POST' }
  );

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Zoho token refresh failed: ${text.substring(0, 200)}`);
  }

  const tokenData = await tokenResponse.json() as { access_token?: string };

  if (tokenData.access_token) {
    // Update token in database
    await supabase
      .from('zoho_crm_connections')
      .update({ access_token: tokenData.access_token })
      .eq('user_id', userId);

    return tokenData.access_token;
  }

  throw new Error('Failed to refresh Zoho token');
}

async function callZohoAPI(
  endpoint: string,
  method: string,
  accessToken: string,
  zohoRegion: string,
  body?: unknown
): Promise<unknown> {
  // Build API domain based on region
  const apiDomain = zohoRegion === 'com' ? 'www.zohoapis.com' :
                   zohoRegion === 'in' ? 'www.zohoapis.in' :
                   zohoRegion === 'au' ? 'www.zohoapis.com.au' :
                   zohoRegion === 'jp' ? 'www.zohoapis.jp' :
                   'www.zohoapis.eu';

  const url = `https://${apiDomain}/crm/v2/${endpoint}`;

  console.log(`[Zoho] API Call: ${method} ${url}`);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  const text = await response.text();
  let result: unknown;

  try {
    result = JSON.parse(text);
  } catch {
    result = text;
  }

  if (!response.ok) {
    console.error('[Zoho] API Error:', text.substring(0, 500));
    throw new Error(`Zoho API error (${response.status}): ${text.substring(0, 200)}`);
  }

  return result;
}

export async function executeZohoCRMNode(
  nodeConfig: ZohoCRMConfig,
  inputData: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  console.log('[Zoho CRM] Executing with operation:', nodeConfig.operation);

  // Get Zoho CRM connection for user
  const { data: zohoConn, error: connError } = await supabase
    .from('zoho_crm_connections')
    .select('access_token, refresh_token, client_id, client_secret, zoho_region')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .single();

  if (connError || !zohoConn) {
    throw new Error('No Zoho CRM connection found. Please connect your Zoho CRM account first.');
  }

  const connection = zohoConn as ZohoCRMConnection;

  if (!connection.client_id || !connection.client_secret) {
    throw new Error('Zoho OAuth credentials not configured. Please reconnect your Zoho CRM account with your credentials.');
  }

  let accessToken = connection.access_token;
  const zohoRegion = connection.zoho_region || 'eu';

  // Attempt token refresh if we get 401
  const callAPIWithRetry = async (endpoint: string, method: string, body?: unknown): Promise<unknown> => {
    try {
      return await callZohoAPI(endpoint, method, accessToken, zohoRegion, body);
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('401') || errorMsg.includes('INVALID_TOKEN')) {
        console.log('[Zoho CRM] Token expired, refreshing...');
        accessToken = await refreshZohoToken(
          connection.refresh_token,
          connection.client_id,
          connection.client_secret,
          zohoRegion,
          supabase,
          userId
        );
        return await callZohoAPI(endpoint, method, accessToken, zohoRegion, body);
      }
      throw error;
    }
  };

  const operation = nodeConfig.operation || 'get_many';
  const module = nodeConfig.resource || nodeConfig.module || 'Leads';

  // Helper to resolve expressions in values
  const resolveValue = (value: string, isExpression: boolean): string => {
    if (!isExpression) return value;

    // Simple expression resolution: {{ $json.field }}
    let resolved = value;
    const matches = value.matchAll(/\{\{\s*\$json\.([^}]+)\s*\}\}/g);

    for (const match of matches) {
      const path = match[1].trim();
      const extractedValue = extractNestedValue(inputData, path);
      if (extractedValue !== undefined) {
        resolved = resolved.replace(match[0], String(extractedValue));
      }
    }

    return resolved;
  };

  // Helper to build payload from field mappings
  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};

    // For split mode, data comes as { item: {...}, _index, _total }
    const itemData = inputData.item as Record<string, unknown> | undefined;
    const flatData = itemData ? { ...inputData, ...itemData } : inputData;

    if (nodeConfig.fields && Array.isArray(nodeConfig.fields)) {
      for (const fieldMapping of nodeConfig.fields) {
        if (!fieldMapping.field) continue;

        let value: unknown;

        if (fieldMapping.isExpression) {
          value = resolveValue(fieldMapping.value, true);
        } else if (fieldMapping.valueSource === 'workflow') {
          const workflowPath = fieldMapping.workflowField || fieldMapping.value || '';
          value = extractNestedValue(flatData, workflowPath);

          // Try from item directly if not found
          if (value === undefined && itemData) {
            const pathWithoutIndex = workflowPath.replace(/^\d+\./, '');
            value = extractNestedValue(itemData, pathWithoutIndex);
          }
        } else {
          value = fieldMapping.value;
        }

        if (value !== undefined && value !== null && value !== '') {
          payload[fieldMapping.field] = value;
        }
      }
    }

    return payload;
  };

  let result: Record<string, unknown>;

  switch (operation) {
    case 'get': {
      const recordId = nodeConfig.recordIdIsExpression
        ? resolveValue(nodeConfig.recordId || '', true)
        : nodeConfig.recordId || '';

      if (!recordId) {
        throw new Error('Record ID is required for GET operation');
      }

      console.log(`[Zoho CRM] Getting ${module} record: ${recordId}`);

      const response = await callAPIWithRetry(`${module}/${recordId}`, 'GET') as { data?: Array<Record<string, unknown>> };

      const record = response.data?.[0];

      if (!record) {
        throw new Error(`Record ${recordId} not found`);
      }

      console.log(`[Zoho CRM] Retrieved record:`, record.id);

      result = {
        ...inputData,
        zoho_record: record,
        zoho_id: record.id,
      };
      break;
    }

    case 'get_many': {
      console.log(`[Zoho CRM] Getting ${module} records with filters`);

      const validFilters = (nodeConfig.filters || []).filter(f => f.field && f.value);

      // Build search criteria if filters exist
      let criteriaParam = '';
      if (validFilters.length > 0) {
        const criteriaArr = validFilters.map(f => {
          const value = String(f.value).replace(/"/g, '\\"');
          switch (f.operator) {
            case 'equals':
              return `(${f.field}:equals:${value})`;
            case 'not_equals':
              return `(${f.field}:not_equals:${value})`;
            case 'contains':
              return `(${f.field}:contains:${value})`;
            case 'starts_with':
              return `(${f.field}:starts_with:${value})`;
            case 'ends_with':
              return `(${f.field}:ends_with:${value})`;
            case 'greater_than':
              return `(${f.field}:greater_than:${value})`;
            case 'less_than':
              return `(${f.field}:less_than:${value})`;
            default:
              return `(${f.field}:equals:${value})`;
          }
        });

        const combiner = nodeConfig.combineFilters === 'OR' ? 'or' : 'and';
        const criteria = criteriaArr.join(combiner);
        criteriaParam = `&criteria=${encodeURIComponent(criteria)}`;
      }

      // Pagination: Zoho returns max 200 records per request
      const BATCH_SIZE = 200;
      const maxRecords = nodeConfig.returnAll ? 1000 : (nodeConfig.limit || 50); // Default max 1000 if returnAll
      let allRecords: Array<Record<string, unknown>> = [];
      let page = 1;
      let hasMore = true;
      let totalFromApi = 0;

      console.log(`[Zoho CRM] GET_MANY: Starting pagination, max records: ${maxRecords}`);

      while (hasMore && allRecords.length < maxRecords) {
        const perPage = Math.min(BATCH_SIZE, maxRecords - allRecords.length);
        const endpoint = `${module}?per_page=${perPage}&page=${page}${criteriaParam}`;

        const response = await callAPIWithRetry(endpoint, 'GET') as {
          data?: Array<Record<string, unknown>>;
          info?: { count?: number; more_records?: boolean; page?: number };
        };

        const batchRecords = response.data || [];
        const moreRecords = response.info?.more_records || false;

        // Update total from API (first response usually has this)
        if (response.info?.count !== undefined) {
          totalFromApi = response.info.count;
        }

        allRecords = [...allRecords, ...batchRecords];
        console.log(`[Zoho CRM] GET_MANY: Fetched page ${page}, got ${batchRecords.length}, total so far: ${allRecords.length}`);

        // Check if we should continue
        if (!moreRecords || batchRecords.length < perPage) {
          // No more records available
          hasMore = false;
        } else if (allRecords.length >= maxRecords) {
          // Reached our limit
          hasMore = false;
        } else {
          // Move to next page
          page += 1;
        }

        // Safety: prevent infinite loops (max 10 pages = 2000 records)
        if (page > 10) {
          console.warn('[Zoho CRM] GET_MANY: Safety limit reached (10 pages), stopping pagination');
          hasMore = false;
        }
      }

      // Apply exact limit if specified
      if (nodeConfig.limit && !nodeConfig.returnAll && allRecords.length > nodeConfig.limit) {
        allRecords = allRecords.slice(0, nodeConfig.limit);
      }

      console.log(`[Zoho CRM] GET_MANY: Final count: ${allRecords.length} of ${totalFromApi || allRecords.length} total`);

      // Return records with split mode for table display
      // Each record will be displayed as a separate row in table output mode
      result = {
        ...inputData,
        zoho_records: allRecords,
        zoho_total: totalFromApi || allRecords.length,
        zoho_fetched: allRecords.length,
        _splitItems: allRecords, // This enables split mode - each record becomes a row
      };
      break;
    }

    case 'get_fields': {
      console.log(`[Zoho CRM] Getting fields for ${module}`);

      const response = await callAPIWithRetry(`settings/fields?module=${module}`, 'GET') as { fields?: Array<Record<string, unknown>> };

      const fields = response.fields || [];

      console.log(`[Zoho CRM] Retrieved ${fields.length} fields`);

      result = {
        ...inputData,
        zoho_fields: fields,
        zoho_fields_count: fields.length,
      };
      break;
    }

    case 'get_picklist_values': {
      const picklistField = nodeConfig.picklistField;

      if (!picklistField) {
        throw new Error('Picklist field is required for GET_PICKLIST_VALUES operation');
      }

      console.log(`[Zoho CRM] Getting picklist values for field: ${picklistField} in ${module}`);

      // Get field metadata to extract picklist values
      const response = await callAPIWithRetry(`settings/fields?module=${module}`, 'GET') as { fields?: Array<Record<string, unknown>> };

      const fields = response.fields || [];
      const targetField = fields.find((f: any) => f.api_name === picklistField);

      if (!targetField) {
        throw new Error(`Field ${picklistField} not found in ${module}`);
      }

      // Extract picklist values
      const pickListValues = (targetField as any).pick_list_values || [];
      const values = pickListValues.map((pv: any) => ({
        display_value: pv.display_value || pv.actual_value,
        actual_value: pv.actual_value,
        id: pv.id,
        sequence_number: pv.sequence_number,
      }));

      console.log(`[Zoho CRM] Retrieved ${values.length} picklist values for ${picklistField}`);

      result = {
        ...inputData,
        zoho_picklist_field: picklistField,
        zoho_picklist_values: values,
        zoho_picklist_count: values.length,
      };
      break;
    }

    case 'create': {
      const payload = buildPayload();

      console.log(`[Zoho CRM] Creating ${module} record:`, JSON.stringify(payload, null, 2));

      if (Object.keys(payload).length === 0) {
        throw new Error('No fields provided for CREATE operation');
      }

      const response = await callAPIWithRetry(module, 'POST', { data: [payload] }) as { data?: Array<{ details?: { id?: string } }> };

      const createdId = response.data?.[0]?.details?.id;

      if (!createdId) {
        throw new Error('Failed to create record - no ID returned');
      }

      console.log(`[Zoho CRM] Created record with ID: ${createdId}`);

      result = {
        ...inputData,
        zoho_id: createdId,
        zoho_created: true,
      };
      break;
    }

    case 'update': {
      const recordId = nodeConfig.recordIdIsExpression
        ? resolveValue(nodeConfig.recordId || '', true)
        : nodeConfig.recordId || '';

      if (!recordId) {
        throw new Error('Record ID is required for UPDATE operation');
      }

      const payload = buildPayload();

      console.log(`[Zoho CRM] Updating ${module} record ${recordId}:`, JSON.stringify(payload, null, 2));

      if (Object.keys(payload).length === 0) {
        throw new Error('No fields provided for UPDATE operation');
      }

      const updatePayload = { ...payload, id: recordId };
      const response = await callAPIWithRetry(module, 'PUT', { data: [updatePayload] }) as { data?: Array<{ details?: { id?: string } }> };

      const updatedId = response.data?.[0]?.details?.id;

      console.log(`[Zoho CRM] Updated record: ${updatedId || recordId}`);

      result = {
        ...inputData,
        zoho_id: updatedId || recordId,
        zoho_updated: true,
      };
      break;
    }

    case 'delete': {
      const recordId = nodeConfig.recordIdIsExpression
        ? resolveValue(nodeConfig.recordId || '', true)
        : nodeConfig.recordId || '';

      if (!recordId) {
        throw new Error('Record ID is required for DELETE operation');
      }

      console.log(`[Zoho CRM] Deleting ${module} record: ${recordId}`);

      await callAPIWithRetry(`${module}?ids=${recordId}`, 'DELETE');

      console.log(`[Zoho CRM] Deleted record: ${recordId}`);

      result = {
        ...inputData,
        zoho_deleted: true,
        zoho_id: recordId,
      };
      break;
    }

    case 'create_or_update': {
      const payload = buildPayload();
      const duplicateCheckFields = nodeConfig.duplicateCheckFields || ['Email'];

      console.log(`[Zoho CRM] Upsert ${module} record (checking: ${duplicateCheckFields.join(', ')})`);

      if (Object.keys(payload).length === 0) {
        throw new Error('No fields provided for CREATE_OR_UPDATE operation');
      }

      // Use Zoho's upsert API with duplicate_check_fields
      const upsertPayload = {
        data: [payload],
        duplicate_check_fields: duplicateCheckFields,
        trigger: ['approval', 'workflow', 'blueprint'],
      };

      const response = await callAPIWithRetry(`${module}/upsert`, 'POST', upsertPayload) as {
        data?: Array<{
          details?: { id?: string };
          status?: string;
          action?: string;
        }>;
      };

      const resultData = response.data?.[0];
      const recordId = resultData?.details?.id;
      const action = resultData?.action || resultData?.status || 'unknown';

      console.log(`[Zoho CRM] Upsert result: ${action}, ID: ${recordId}`);

      result = {
        ...inputData,
        zoho_id: recordId,
        zoho_action: action,
        zoho_upserted: true,
      };
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return result;
}
