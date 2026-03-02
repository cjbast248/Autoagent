// ============================================================================
// BITRIX24 CRM NODE
// Workflow worker node for Bitrix24 CRM integration
// Supports: Leads, Deals, Contacts, Companies, Tasks, Activities
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../lib/config.js';
import { extractNestedValue, parsePrice } from '../../lib/utils.js';

// ============================================================================
// INTERFACES
// ============================================================================

interface Bitrix24Config {
  operation: 'create' | 'update' | 'get' | 'get_many' | 'delete' |
             'get_fields' | 'get_statuses' | 'get_stages' | 'get_pipelines' | 'get_users';
  resource?: string;
  entityType?: string;
  fields?: Array<{
    field: string;
    valueSource: 'workflow' | 'static';
    workflowField?: string;
    value?: string;
    path?: string;
  }>;
  recordId?: string;
  recordIdSource?: 'workflow' | 'static';
  recordIdWorkflowField?: string;
  pipelineId?: string; // For get_stages
  // For get_many
  filters?: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  limit?: number;
  // For get_statuses
  entityTypeId?: number; // 1=Lead, 2=Deal, 3=Contact, 4=Company
  categoryId?: string;   // Deal category/pipeline
}

interface Bitrix24Connection {
  access_token: string;
  refresh_token: string;
  portal_domain: string;
  client_endpoint: string;
  expires_at: string | null;
  client_id?: string;
  client_secret?: string;
}

interface Bitrix24ApiResponse {
  result?: unknown;
  total?: number;
  error?: string;
  error_description?: string;
  time?: {
    start: number;
    finish: number;
    duration: number;
  };
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

async function refreshBitrix24Token(
  refreshToken: string,
  clientId?: string,
  clientSecret?: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  // Use per-user credentials if provided, otherwise use global
  const finalClientId = clientId || config.apis.bitrix24ClientId;
  const finalClientSecret = clientSecret || config.apis.bitrix24ClientSecret;

  if (!finalClientId || !finalClientSecret) {
    throw new Error('Bitrix24 credentials not configured');
  }

  console.log('[Bitrix24] Refreshing token...');

  const tokenUrl = 'https://oauth.bitrix.info/oauth/token/';
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: finalClientId,
    client_secret: finalClientSecret,
    refresh_token: refreshToken,
  });

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Bitrix24 token refresh failed: ${text.substring(0, 200)}`);
  }

  const data = await resp.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  console.log('[Bitrix24] Token refreshed, expires in', data.expires_in, 'seconds');

  return data;
}

// ============================================================================
// API HELPER
// ============================================================================

async function callBitrix24API(
  method: string,
  params: Record<string, unknown>,
  accessToken: string,
  clientEndpoint: string
): Promise<Bitrix24ApiResponse> {
  const url = `${clientEndpoint}${method}`;

  console.log('[Bitrix24] API call:', method, JSON.stringify(params).substring(0, 300));

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(params),
  });

  const text = await resp.text();

  let data: Bitrix24ApiResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Bitrix24 API returned invalid JSON: ${text.substring(0, 200)}`);
  }

  if (data.error) {
    throw new Error(`Bitrix24 API error: ${data.error} - ${data.error_description || ''}`);
  }

  return data;
}

// ============================================================================
// RESOURCE MAPPING
// ============================================================================

const RESOURCE_METHODS: Record<string, { add: string; update: string; get: string; list: string; delete: string; fields: string }> = {
  leads: {
    add: 'crm.lead.add',
    update: 'crm.lead.update',
    get: 'crm.lead.get',
    list: 'crm.lead.list',
    delete: 'crm.lead.delete',
    fields: 'crm.lead.fields',
  },
  deals: {
    add: 'crm.deal.add',
    update: 'crm.deal.update',
    get: 'crm.deal.get',
    list: 'crm.deal.list',
    delete: 'crm.deal.delete',
    fields: 'crm.deal.fields',
  },
  contacts: {
    add: 'crm.contact.add',
    update: 'crm.contact.update',
    get: 'crm.contact.get',
    list: 'crm.contact.list',
    delete: 'crm.contact.delete',
    fields: 'crm.contact.fields',
  },
  companies: {
    add: 'crm.company.add',
    update: 'crm.company.update',
    get: 'crm.company.get',
    list: 'crm.company.list',
    delete: 'crm.company.delete',
    fields: 'crm.company.fields',
  },
  tasks: {
    add: 'tasks.task.add',
    update: 'tasks.task.update',
    get: 'tasks.task.get',
    list: 'tasks.task.list',
    delete: 'tasks.task.delete',
    fields: 'tasks.task.getfields',
  },
  activities: {
    add: 'crm.activity.add',
    update: 'crm.activity.update',
    get: 'crm.activity.get',
    list: 'crm.activity.list',
    delete: 'crm.activity.delete',
    fields: 'crm.activity.fields',
  },
};

// ============================================================================
// MAIN EXECUTE FUNCTION
// ============================================================================

export async function executeBitrix24Node(
  nodeConfig: Bitrix24Config,
  inputData: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  console.log('[Bitrix24] Executing with operation:', nodeConfig.operation);

  // Get Bitrix24 connection for user
  const { data: b24Conn, error: connError } = await supabase
    .from('bitrix24_connections')
    .select('access_token, refresh_token, portal_domain, client_endpoint, expires_at, client_id, client_secret')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .single();

  if (connError || !b24Conn) {
    throw new Error('No Bitrix24 connection found. Please connect your Bitrix24 account first.');
  }

  const connection = b24Conn as Bitrix24Connection;

  // Check if token needs refresh (5 min buffer)
  let accessToken = connection.access_token;
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const now = Date.now();

  if (expiresAt && expiresAt < now + 300000) {
    console.log('[Bitrix24] Token expired or expiring soon, refreshing...');
    const refreshed = await refreshBitrix24Token(
      connection.refresh_token,
      connection.client_id,
      connection.client_secret
    );
    accessToken = refreshed.access_token;

    // Update token in database
    await supabase
      .from('bitrix24_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString(),
      })
      .eq('user_id', userId);
  }

  const clientEndpoint = connection.client_endpoint || `https://${connection.portal_domain}/rest/`;
  const operation = nodeConfig.operation || 'create';
  const entityType = nodeConfig.resource || nodeConfig.entityType || 'leads';
  const methods = RESOURCE_METHODS[entityType];

  if (!methods && !['get_statuses', 'get_pipelines', 'get_users'].includes(operation)) {
    throw new Error(`Unknown Bitrix24 resource type: ${entityType}`);
  }

  // Helper to build payload from field mappings
  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};

    // For split mode, data comes as { item: {...}, _index, _total }
    const itemData = inputData.item as Record<string, unknown> | undefined;
    const flatData = itemData ? { ...inputData, ...itemData } : inputData;

    if (nodeConfig.fields && Array.isArray(nodeConfig.fields)) {
      for (const fieldMapping of nodeConfig.fields) {
        let value: unknown;

        if (fieldMapping.valueSource === 'workflow') {
          const workflowPath = fieldMapping.workflowField || fieldMapping.value || fieldMapping.path || '';
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
          const field = fieldMapping.field;

          // Handle multifield types (PHONE, EMAIL, WEB, IM)
          if (['PHONE', 'EMAIL', 'WEB', 'IM'].includes(field.toUpperCase())) {
            const multiValue = Array.isArray(value) ? value : [{ VALUE: String(value), VALUE_TYPE: 'WORK' }];
            payload[field.toUpperCase()] = multiValue;
          }
          // Handle price/opportunity
          else if (['OPPORTUNITY', 'PRICE', 'AMOUNT'].includes(field.toUpperCase())) {
            const numPrice = parsePrice(value);
            if (numPrice !== null) {
              payload[field.toUpperCase()] = numPrice;
            }
          }
          // Handle custom fields (UF_CRM_*)
          else if (field.startsWith('UF_CRM_') || field.startsWith('UF_')) {
            payload[field] = value;
          }
          // Standard fields
          else {
            payload[field.toUpperCase()] = value;
          }
        }
      }
    }

    return payload;
  };

  let result: Record<string, unknown>;

  switch (operation) {
    // ========================================================================
    // CREATE - with fetch of created record for full output
    // ========================================================================
    case 'create': {
      const payload = buildPayload();
      console.log('[Bitrix24] CREATE payload:', JSON.stringify(payload).substring(0, 500));

      const params = { fields: payload };
      const response = await callBitrix24API(methods.add, params, accessToken, clientEndpoint);
      const createdId = response.result;

      console.log('[Bitrix24] Created', entityType, 'with ID:', createdId);

      // Fetch the created record to return full data
      let createdRecord: unknown = null;
      if (createdId) {
        try {
          const getParams = entityType === 'tasks'
            ? { taskId: createdId }
            : { id: createdId };
          const getResponse = await callBitrix24API(methods.get, getParams, accessToken, clientEndpoint);
          createdRecord = entityType === 'tasks'
            ? (getResponse.result as Record<string, unknown>)?.task
            : getResponse.result;
          console.log('[Bitrix24] Fetched created record successfully');
        } catch (fetchErr) {
          console.warn('[Bitrix24] Could not fetch created record:', (fetchErr as Error).message);
        }
      }

      result = {
        ...inputData,
        bitrix24_result: response,
        bitrix24_created_id: createdId,
        bitrix24_record: createdRecord,
      };
      break;
    }

    // ========================================================================
    // UPDATE - with fetch of updated record for verification
    // ========================================================================
    case 'update': {
      // UI stores expression in recordId, worker expected recordIdWorkflowField - support both
      const recordId =
        nodeConfig.recordIdSource === 'workflow'
          ? extractNestedValue(inputData, nodeConfig.recordIdWorkflowField || nodeConfig.recordId || 'id')
          : nodeConfig.recordId;

      if (!recordId) {
        throw new Error('Bitrix24 update: No record ID specified');
      }

      const payload = buildPayload();
      console.log('[Bitrix24] UPDATE payload for ID', recordId, ':', JSON.stringify(payload).substring(0, 500));

      const params = entityType === 'tasks'
        ? { taskId: recordId, fields: payload }
        : { id: recordId, fields: payload };

      const response = await callBitrix24API(methods.update, params, accessToken, clientEndpoint);

      // Check if update was successful (Bitrix24 returns {result: true} on success)
      const updateSuccess = response.result === true;
      console.log('[Bitrix24] Updated', entityType, 'ID:', recordId, '- success:', updateSuccess);

      // Fetch the updated record to return current state
      let updatedRecord: unknown = null;
      if (updateSuccess) {
        try {
          const getParams = entityType === 'tasks'
            ? { taskId: recordId }
            : { id: recordId };
          const getResponse = await callBitrix24API(methods.get, getParams, accessToken, clientEndpoint);
          updatedRecord = entityType === 'tasks'
            ? (getResponse.result as Record<string, unknown>)?.task
            : getResponse.result;
          console.log('[Bitrix24] Fetched updated record successfully');
        } catch (fetchErr) {
          console.warn('[Bitrix24] Could not fetch updated record:', (fetchErr as Error).message);
        }
      }

      result = {
        ...inputData,
        bitrix24_updated: updateSuccess,
        bitrix24_updated_id: recordId,
        bitrix24_record: updatedRecord,
        bitrix24_result: response,
      };
      break;
    }

    // ========================================================================
    // GET (single record)
    // ========================================================================
    case 'get': {
      // UI stores expression in recordId, worker expected recordIdWorkflowField - support both
      const recordId =
        nodeConfig.recordIdSource === 'workflow'
          ? extractNestedValue(inputData, nodeConfig.recordIdWorkflowField || nodeConfig.recordId || 'id')
          : nodeConfig.recordId;

      if (!recordId) {
        throw new Error('Bitrix24 get: No record ID specified');
      }

      const params = entityType === 'tasks'
        ? { taskId: recordId }
        : { id: recordId };

      const response = await callBitrix24API(methods.get, params, accessToken, clientEndpoint);

      console.log('[Bitrix24] Retrieved', entityType, 'ID:', recordId);

      // Tasks return { result: { task: {...} } }
      const recordData = entityType === 'tasks'
        ? (response.result as Record<string, unknown>)?.task
        : response.result;

      result = {
        ...inputData,
        bitrix24_record: recordData,
      };
      break;
    }

    // ========================================================================
    // GET MANY (list with filters) - with proper pagination
    // ========================================================================
    case 'get_many': {
      const baseParams: Record<string, unknown> = {};

      // Build filter from config
      if (nodeConfig.filters && nodeConfig.filters.length > 0) {
        const filter: Record<string, unknown> = {};
        for (const f of nodeConfig.filters) {
          // Bitrix24 filter format: FIELD_NAME or >FIELD_NAME, <FIELD_NAME, etc.
          let filterKey = f.field.toUpperCase();
          switch (f.operator) {
            case 'greater_than':
              filterKey = `>${f.field.toUpperCase()}`;
              break;
            case 'less_than':
              filterKey = `<${f.field.toUpperCase()}`;
              break;
            case 'greater_equal':
              filterKey = `>=${f.field.toUpperCase()}`;
              break;
            case 'less_equal':
              filterKey = `<=${f.field.toUpperCase()}`;
              break;
            case 'not_equals':
              filterKey = `!${f.field.toUpperCase()}`;
              break;
            case 'contains':
              // Bitrix24 uses % as wildcard - wrap value with % for contains
              filterKey = f.field.toUpperCase();
              filter[filterKey] = `%${f.value}%`;
              continue; // Skip the normal assignment below
          }
          filter[filterKey] = f.value;
        }
        baseParams.filter = filter;
      }

      // Pagination: Bitrix24 returns max 50 records per request
      const BATCH_SIZE = 50;
      const maxRecords = nodeConfig.limit || 500; // Default max 500 if no limit
      let allRecords: unknown[] = [];
      let start = 0;
      let totalFromApi = 0;
      let hasMore = true;

      console.log('[Bitrix24] GET_MANY: Starting pagination, max records:', maxRecords);

      while (hasMore && allRecords.length < maxRecords) {
        const params = { ...baseParams, start };
        const response = await callBitrix24API(methods.list, params, accessToken, clientEndpoint);

        // Extract records based on entity type
        let batchRecords: unknown[];
        if (entityType === 'tasks') {
          batchRecords = (response.result as Record<string, unknown>)?.tasks as unknown[] || [];
        } else {
          batchRecords = response.result as unknown[] || [];
        }

        // Update total from API (first response usually has this)
        if (response.total !== undefined) {
          totalFromApi = response.total;
        }

        allRecords = [...allRecords, ...batchRecords];
        console.log('[Bitrix24] GET_MANY: Fetched batch at start=', start, ', got', batchRecords.length, ', total so far:', allRecords.length);

        // Check if we should continue
        if (batchRecords.length < BATCH_SIZE) {
          // No more records available
          hasMore = false;
        } else if (allRecords.length >= maxRecords) {
          // Reached our limit
          hasMore = false;
        } else {
          // Move to next batch
          start += BATCH_SIZE;
        }

        // Safety: prevent infinite loops (max 20 iterations = 1000 records)
        if (start > 1000) {
          console.warn('[Bitrix24] GET_MANY: Safety limit reached, stopping pagination');
          hasMore = false;
        }
      }

      // Apply exact limit if specified
      if (nodeConfig.limit && allRecords.length > nodeConfig.limit) {
        allRecords = allRecords.slice(0, nodeConfig.limit);
      }

      console.log('[Bitrix24] GET_MANY: Final count:', allRecords.length, 'of', totalFromApi || allRecords.length, 'total');

      result = {
        ...inputData,
        bitrix24_records: allRecords,
        bitrix24_total: totalFromApi || allRecords.length,
        bitrix24_fetched: allRecords.length,
      };
      break;
    }

    // ========================================================================
    // DELETE - with verification from API response
    // ========================================================================
    case 'delete': {
      // UI stores expression in recordId, worker expected recordIdWorkflowField - support both
      const recordId =
        nodeConfig.recordIdSource === 'workflow'
          ? extractNestedValue(inputData, nodeConfig.recordIdWorkflowField || nodeConfig.recordId || 'id')
          : nodeConfig.recordId;

      if (!recordId) {
        throw new Error('Bitrix24 delete: No record ID specified');
      }

      const params = entityType === 'tasks'
        ? { taskId: recordId }
        : { id: recordId };

      const response = await callBitrix24API(methods.delete, params, accessToken, clientEndpoint);

      // Verify deletion was successful (Bitrix24 returns {result: true} on success)
      const deleteSuccess = response.result === true;
      console.log('[Bitrix24] Deleted', entityType, 'ID:', recordId, '- success:', deleteSuccess);

      if (!deleteSuccess) {
        console.warn('[Bitrix24] Delete may have failed, API returned:', JSON.stringify(response));
      }

      result = {
        ...inputData,
        bitrix24_deleted: deleteSuccess,
        bitrix24_deleted_id: recordId,
        bitrix24_result: response,
      };
      break;
    }

    // ========================================================================
    // GET FIELDS
    // ========================================================================
    case 'get_fields': {
      const response = await callBitrix24API(methods.fields, {}, accessToken, clientEndpoint);

      console.log('[Bitrix24] Retrieved fields for', entityType);

      result = {
        ...inputData,
        bitrix24_fields: response.result,
      };
      break;
    }

    // ========================================================================
    // GET STATUSES
    // ========================================================================
    case 'get_statuses': {
      // CRM statuses are entity-specific
      // Lead statuses: STATUS
      // Deal stages: STAGE_ID (per category/pipeline)
      const response = await callBitrix24API('crm.status.list', {}, accessToken, clientEndpoint);

      const allStatuses = response.result as Array<Record<string, unknown>> || [];

      // Filter by entity type if specified
      let filteredStatuses = allStatuses;
      if (nodeConfig.entityTypeId) {
        const entityIdPrefix = {
          1: 'STATUS',      // Leads
          2: 'DEAL_STAGE',  // Deals
          3: 'CONTACT_SOURCE', // Contacts
          4: 'COMPANY_TYPE',   // Companies
        }[nodeConfig.entityTypeId];

        if (entityIdPrefix) {
          filteredStatuses = allStatuses.filter(s =>
            String(s.ENTITY_ID || '').startsWith(entityIdPrefix)
          );
        }
      }

      console.log('[Bitrix24] Retrieved', filteredStatuses.length, 'statuses');

      result = {
        ...inputData,
        bitrix24_statuses: filteredStatuses,
        bitrix24_total: filteredStatuses.length,
      };
      break;
    }

    // ========================================================================
    // GET STAGES (for specific pipeline)
    // ========================================================================
    case 'get_stages': {
      const pipelineId = nodeConfig.pipelineId || '0';
      console.log('[Bitrix24] Getting stages for pipeline:', pipelineId);

      const response = await callBitrix24API(
        'crm.dealcategory.stage.list',
        { id: pipelineId },
        accessToken,
        clientEndpoint
      );

      const stages = response.result as Array<Record<string, unknown>> || [];

      console.log('[Bitrix24] Retrieved', stages.length, 'stages for pipeline', pipelineId);

      result = {
        ...inputData,
        bitrix24_stages: stages,
        bitrix24_pipeline_id: pipelineId,
        bitrix24_total: stages.length,
      };
      break;
    }

    // ========================================================================
    // GET PIPELINES (Deal Categories)
    // ========================================================================
    case 'get_pipelines': {
      const response = await callBitrix24API('crm.dealcategory.list', {}, accessToken, clientEndpoint);

      const pipelines = response.result as Array<Record<string, unknown>> || [];

      // Add default pipeline (ID: 0)
      const allPipelines = [
        { ID: '0', NAME: 'Default Pipeline', SORT: '0' },
        ...pipelines,
      ];

      // Get stages for each pipeline
      const pipelinesWithStages = await Promise.all(
        allPipelines.map(async (pipeline) => {
          const stagesResponse = await callBitrix24API(
            'crm.dealcategory.stage.list',
            { id: pipeline.ID },
            accessToken,
            clientEndpoint
          );
          return {
            ...pipeline,
            stages: stagesResponse.result || [],
          };
        })
      );

      console.log('[Bitrix24] Retrieved', pipelinesWithStages.length, 'pipelines with stages');

      result = {
        ...inputData,
        bitrix24_pipelines: pipelinesWithStages,
        bitrix24_total: pipelinesWithStages.length,
      };
      break;
    }

    // ========================================================================
    // GET USERS
    // ========================================================================
    case 'get_users': {
      const response = await callBitrix24API('user.get', {}, accessToken, clientEndpoint);

      const users = response.result as Array<Record<string, unknown>> || [];

      // Format users
      const formattedUsers = users.map(u => ({
        id: u.ID,
        name: `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim(),
        email: u.EMAIL,
        active: u.ACTIVE,
        department: u.UF_DEPARTMENT,
      }));

      console.log('[Bitrix24] Retrieved', formattedUsers.length, 'users');

      result = {
        ...inputData,
        bitrix24_users: formattedUsers,
        bitrix24_total: formattedUsers.length,
      };
      break;
    }

    // ========================================================================
    // DEFAULT
    // ========================================================================
    default:
      console.warn(`[Bitrix24] Operation '${operation}' not implemented, passing through`);
      result = inputData;
  }

  return result;
}
