import { SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../lib/config.js';
import { extractNestedValue, parsePrice } from '../../lib/utils.js';

interface AmoCRMConfig {
  operation: 'create' | 'update' | 'get' | 'get_many' | 'delete' | 'get_fields' | 'get_statuses' | 'get_pipelines' | 'get_users';
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
  pipelineId?: string; // For get_statuses operation
  addNote?: boolean;
  noteTextSource?: 'workflow' | 'static';
  noteWorkflowField?: string;
  noteText?: string;
}

interface AmoCRMConnection {
  access_token: string;
  refresh_token: string;
  base_domain: string;
  expires_at: string | null;
}

async function refreshAmoCRMToken(
  refreshToken: string,
  baseDomain: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const clientId = config.apis.amocrmClientId;
  const clientSecret = config.apis.amocrmClientSecret;

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

  return (await resp.json()) as { access_token: string; refresh_token: string; expires_in: number };
}

export async function executeAmoCRMNode(
  nodeConfig: AmoCRMConfig,
  inputData: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  console.log('[AmoCRM] Executing with operation:', nodeConfig.operation);

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

  const connection = amoConn as AmoCRMConnection;

  // Check if token needs refresh
  let accessToken = connection.access_token;
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const now = Date.now();

  if (expiresAt && expiresAt < now + 90000) {
    console.log('[AmoCRM] Refreshing token...');
    const refreshed = await refreshAmoCRMToken(connection.refresh_token, connection.base_domain);
    accessToken = refreshed.access_token;

    // Update token in database
    await supabase
      .from('amocrm_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString(),
      })
      .eq('user_id', userId);
  }

  const baseDomain = connection.base_domain;
  const apiBase = `https://${baseDomain}/api/v4`;
  const operation = nodeConfig.operation || 'create';
  const entityType = nodeConfig.resource || nodeConfig.entityType || 'leads';

  // Helper to build payload from field mappings
  // Returns { leadPayload, contactData } where contactData contains phone/email/name for contact creation
  // forCreate: if true, adds default name/price fields; if false (for update), only includes explicitly mapped fields
  const buildPayloadData = (forCreate: boolean = true): { leadPayload: Record<string, unknown>; contactData: { phone?: string; email?: string; name?: string } } => {
    const payload: Record<string, unknown> = {};
    const contactData: { phone?: string; email?: string; name?: string } = {};

    // For split mode, data comes as { item: {...}, _index, _total }
    const itemData = inputData.item as Record<string, unknown> | undefined;
    const flatData = itemData ? { ...inputData, ...itemData } : inputData;

    // Process field mappings
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
          // Handle contact fields separately
          if (fieldMapping.field === 'contact_phone') {
            contactData.phone = String(value);
          } else if (fieldMapping.field === 'contact_email') {
            contactData.email = String(value);
          } else if (fieldMapping.field === 'contact_name') {
            contactData.name = String(value);
          }
          // Handle custom fields
          else if (fieldMapping.field?.startsWith('custom_')) {
            const fieldId = fieldMapping.field.replace('custom_', '');
            if (fieldId) {
              if (!payload.custom_fields_values) {
                payload.custom_fields_values = [];
              }
              (payload.custom_fields_values as Array<unknown>).push({
                field_id: parseInt(fieldId),
                values: [{ value: String(value) }],
              });
            }
          } else if (fieldMapping.field === 'price') {
            const numPrice = parsePrice(value);
            if (numPrice !== null) {
              payload.price = numPrice;
            }
          } else {
            payload[fieldMapping.field] = value;
          }
        }
      }
    }

    // Only add default name/price for CREATE operations, not for UPDATE
    // UPDATE should only modify fields explicitly mapped by the user
    if (forCreate) {
      // Add name field if not present (required for leads on create)
      if (!payload.name && entityType === 'leads') {
        const title = (flatData.title || itemData?.title || inputData.title || 'Lead from workflow') as string;
        payload.name = title;
      }

      // Extract price if not set (only for create)
      if (!payload.price && entityType === 'leads') {
        const priceValue = flatData.price || itemData?.price;
        if (priceValue) {
          const numPrice = parsePrice(priceValue);
          if (numPrice !== null) {
            payload.price = numPrice;
          }
        }
      }
    }

    return { leadPayload: payload, contactData };
  };

  // Helper to create a contact and link it to a lead
  const createAndLinkContact = async (
    leadId: number,
    contactInfo: { phone?: string; email?: string; name?: string }
  ): Promise<{ contactId?: number; error?: string }> => {
    if (!contactInfo.phone && !contactInfo.email) {
      return {};
    }

    try {
      // Build contact payload with phone/email as custom fields
      const contactPayload: Record<string, unknown> = {
        name: contactInfo.name || contactInfo.phone || contactInfo.email || 'Contact',
      };

      const customFields: Array<unknown> = [];

      if (contactInfo.phone) {
        customFields.push({
          field_code: 'PHONE',
          values: [{ value: contactInfo.phone, enum_code: 'WORK' }],
        });
      }

      if (contactInfo.email) {
        customFields.push({
          field_code: 'EMAIL',
          values: [{ value: contactInfo.email, enum_code: 'WORK' }],
        });
      }

      if (customFields.length > 0) {
        contactPayload.custom_fields_values = customFields;
      }

      console.log('[AmoCRM] Creating contact:', JSON.stringify(contactPayload).substring(0, 300));

      // Create the contact
      const contactResp = await fetch(`${apiBase}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([contactPayload]),
      });

      const contactText = await contactResp.text();
      if (!contactResp.ok) {
        console.warn('[AmoCRM] Failed to create contact:', contactText.substring(0, 200));
        return { error: contactText.substring(0, 100) };
      }

      const contactData = JSON.parse(contactText);
      const contactId = contactData?._embedded?.contacts?.[0]?.id;

      if (!contactId) {
        return { error: 'Contact created but no ID returned' };
      }

      console.log('[AmoCRM] Contact created with ID:', contactId);

      // Link the contact to the lead
      const linkResp = await fetch(`${apiBase}/leads/${leadId}/link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ to_entity_id: contactId, to_entity_type: 'contacts' }]),
      });

      if (!linkResp.ok) {
        const linkText = await linkResp.text();
        console.warn('[AmoCRM] Failed to link contact to lead:', linkText.substring(0, 200));
        return { contactId, error: `Contact created but linking failed: ${linkText.substring(0, 50)}` };
      }

      console.log('[AmoCRM] Contact linked to lead successfully');
      return { contactId };
    } catch (err) {
      console.error('[AmoCRM] Error creating/linking contact:', err);
      return { error: (err as Error).message };
    }
  };

  let result: Record<string, unknown>;

  switch (operation) {
    case 'create': {
      // Pass true to include default name/price for new leads
      const { leadPayload: payloadData, contactData } = buildPayloadData(true);
      console.log('[AmoCRM] CREATE payload:', JSON.stringify(payloadData).substring(0, 500));
      console.log('[AmoCRM] Contact data:', JSON.stringify(contactData));

      const resp = await fetch(`${apiBase}/${entityType}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([payloadData]),
      });

      const text = await resp.text();

      if (!resp.ok) {
        let errorDetail = text.substring(0, 300);
        try {
          const errorJson = JSON.parse(text);
          if (errorJson.title) errorDetail = errorJson.title;
          if (errorJson.detail) errorDetail += `: ${errorJson.detail}`;
          if (errorJson['validation-errors']) {
            errorDetail += ` | Validation: ${JSON.stringify(errorJson['validation-errors'])}`;
          }
        } catch {
          // Keep original
        }
        throw new Error(`AmoCRM create error (${resp.status}): ${errorDetail}`);
      }

      const data = JSON.parse(text);
      const createdId = data?._embedded?.[entityType]?.[0]?.id;

      result = {
        ...inputData,
        amocrm_result: data,
        amocrm_created_id: createdId,
      };

      // Create and link contact if contact fields were provided
      if (createdId && entityType === 'leads' && (contactData.phone || contactData.email)) {
        const contactResult = await createAndLinkContact(createdId, contactData);
        if (contactResult.contactId) {
          result.amocrm_contact_id = contactResult.contactId;
        }
        if (contactResult.error) {
          result.amocrm_contact_error = contactResult.error;
        }
      }

      // Add note if configured
      if (nodeConfig.addNote && createdId && entityType === 'leads') {
        try {
          const itemData = inputData.item as Record<string, unknown> | undefined;
          const flatData = itemData ? { ...inputData, ...itemData } : inputData;
          let noteText = '';

          if (nodeConfig.noteTextSource === 'workflow' && nodeConfig.noteWorkflowField) {
            noteText = extractNestedValue(flatData, nodeConfig.noteWorkflowField) as string;
            if (!noteText && itemData) {
              const pathWithoutIndex = nodeConfig.noteWorkflowField.replace(/^\d+\./, '');
              noteText = extractNestedValue(itemData, pathWithoutIndex) as string;
            }
          } else {
            noteText = nodeConfig.noteText || '';
          }

          if (noteText) {
            // Note: We no longer auto-add fields - user controls what goes in the note via their template

            const noteResp = await fetch(`${apiBase}/leads/${createdId}/notes`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify([
                {
                  note_type: 'common',
                  params: { text: noteText },
                },
              ]),
            });

            if (noteResp.ok) {
              result.amocrm_note_created = true;
            } else {
              const noteRespText = await noteResp.text();
              console.warn('[AmoCRM] Failed to create note:', noteRespText.substring(0, 200));
              result.amocrm_note_error = noteRespText.substring(0, 100);
            }
          }
        } catch (noteErr) {
          console.error('[AmoCRM] Error creating note:', noteErr);
          result.amocrm_note_error = (noteErr as Error).message;
        }
      }
      break;
    }

    case 'update': {
      const recordId =
        nodeConfig.recordIdSource === 'workflow'
          ? extractNestedValue(inputData, nodeConfig.recordIdWorkflowField || 'id')
          : nodeConfig.recordId;

      if (!recordId) {
        throw new Error('AmoCRM update: No record ID specified');
      }

      // Pass false to avoid adding default name/price - only include explicitly mapped fields
      const { leadPayload } = buildPayloadData(false);
      const payloadData = { id: parseInt(String(recordId)), ...leadPayload };

      console.log('[AmoCRM] UPDATE payload (only explicitly mapped fields):', JSON.stringify(payloadData));

      const resp = await fetch(`${apiBase}/${entityType}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([payloadData]),
      });

      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`AmoCRM update error (${resp.status}): ${text.substring(0, 200)}`);
      }

      result = { ...inputData, amocrm_updated: JSON.parse(text) };

      // Add note if configured (also works for update operation)
      if (nodeConfig.addNote && recordId && entityType === 'leads') {
        try {
          const itemData = inputData.item as Record<string, unknown> | undefined;
          const flatData = itemData ? { ...inputData, ...itemData } : inputData;
          let noteText = '';

          if (nodeConfig.noteTextSource === 'workflow' && nodeConfig.noteWorkflowField) {
            noteText = extractNestedValue(flatData, nodeConfig.noteWorkflowField) as string;
            if (!noteText && itemData) {
              const pathWithoutIndex = nodeConfig.noteWorkflowField.replace(/^\d+\./, '');
              noteText = extractNestedValue(itemData, pathWithoutIndex) as string;
            }
          } else {
            noteText = nodeConfig.noteText || '';
          }

          if (noteText) {
            console.log('[AmoCRM] Adding note to lead:', recordId, 'text:', noteText.substring(0, 100));

            const noteResp = await fetch(`${apiBase}/leads/${recordId}/notes`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify([
                {
                  note_type: 'common',
                  params: { text: noteText },
                },
              ]),
            });

            if (noteResp.ok) {
              result.amocrm_note_created = true;
              console.log('[AmoCRM] Note added successfully');
            } else {
              const noteRespText = await noteResp.text();
              console.warn('[AmoCRM] Failed to create note:', noteRespText.substring(0, 200));
              result.amocrm_note_error = noteRespText.substring(0, 100);
            }
          } else {
            console.log('[AmoCRM] Note configured but text is empty, skipping');
          }
        } catch (noteErr) {
          console.error('[AmoCRM] Error creating note:', noteErr);
          result.amocrm_note_error = (noteErr as Error).message;
        }
      }
      break;
    }

    case 'get': {
      const recordId =
        nodeConfig.recordIdSource === 'workflow'
          ? extractNestedValue(inputData, nodeConfig.recordIdWorkflowField || 'id')
          : nodeConfig.recordId;

      if (!recordId) {
        throw new Error('AmoCRM get: No record ID specified');
      }

      // Include linked contacts for leads
      const getParams = entityType === 'leads' ? '?with=contacts' : '';
      const resp = await fetch(`${apiBase}/${entityType}/${recordId}${getParams}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`AmoCRM get error (${resp.status}): ${text.substring(0, 200)}`);
      }

      const recordData = JSON.parse(text);

      // Extract contact info (phone, email) from embedded contacts for leads
      if (entityType === 'leads') {
        const contacts = recordData._embedded?.contacts || [];
        const contactInfo: Array<{ id: number; name?: string; phone?: string; email?: string }> = [];

        for (const contact of contacts) {
          const info: { id: number; name?: string; phone?: string; email?: string } = { id: contact.id };
          if (contact.name) info.name = contact.name;

          // Extract phone and email from custom_fields_values
          if (contact.custom_fields_values) {
            for (const field of contact.custom_fields_values) {
              if (field.field_code === 'PHONE' && field.values?.[0]?.value) {
                info.phone = field.values[0].value;
              }
              if (field.field_code === 'EMAIL' && field.values?.[0]?.value) {
                info.email = field.values[0].value;
              }
            }
          }
          contactInfo.push(info);
        }

        recordData.contacts = contactInfo;
        // Also provide flat fields for convenience (first contact)
        if (contactInfo.length > 0) {
          recordData.contact_phone = contactInfo[0].phone;
          recordData.contact_email = contactInfo[0].email;
          recordData.contact_name = contactInfo[0].name;
        }
      }

      result = { ...inputData, amocrm_record: recordData };
      break;
    }

    case 'get_statuses': {
      // Get statuses from pipelines
      const pipelineId = nodeConfig.pipelineId;
      let endpoint = `${apiBase}/leads/pipelines`;
      if (pipelineId) {
        endpoint += `/${pipelineId}/statuses`;
      }

      const resp = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`AmoCRM get_statuses error (${resp.status}): ${text.substring(0, 200)}`);
      }

      const data = JSON.parse(text);
      const statuses = data?._embedded?.statuses || data?._embedded?.pipelines?.[0]?._embedded?.statuses || [];

      // Format statuses
      const formattedStatuses = statuses.map((s: Record<string, unknown>) => ({
        id: s.id,
        name: s.name,
        pipeline_id: s.pipeline_id,
        sort: s.sort,
        color: s.color,
        type: s.type,
      }));

      result = {
        ...inputData,
        statuses: formattedStatuses,
        total: formattedStatuses.length,
      };
      break;
    }

    case 'get_pipelines': {
      // Get all pipelines with their statuses
      const resp = await fetch(`${apiBase}/leads/pipelines`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`AmoCRM get_pipelines error (${resp.status}): ${text.substring(0, 200)}`);
      }

      const data = JSON.parse(text);
      const pipelines = data?._embedded?.pipelines || [];

      // Format pipelines with embedded statuses
      const formattedPipelines = pipelines.map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name,
        sort: p.sort,
        is_main: p.is_main,
        statuses: ((p._embedded as Record<string, unknown>)?.statuses as Array<Record<string, unknown>> || []).map((s: Record<string, unknown>) => ({
          id: s.id,
          name: s.name,
          sort: s.sort,
          color: s.color,
          type: s.type,
        })),
      }));

      result = {
        ...inputData,
        pipelines: formattedPipelines,
        total: formattedPipelines.length,
      };
      break;
    }

    case 'get_users': {
      // Get all users
      const resp = await fetch(`${apiBase}/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`AmoCRM get_users error (${resp.status}): ${text.substring(0, 200)}`);
      }

      const data = JSON.parse(text);
      const users = data?._embedded?.users || [];

      // Format users
      const formattedUsers = users.map((u: Record<string, unknown>) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        lang: u.lang,
        rights: u.rights,
      }));

      result = {
        ...inputData,
        users: formattedUsers,
        total: formattedUsers.length,
      };
      break;
    }

    default:
      console.warn(`[AmoCRM] Operation '${operation}' not implemented, passing through`);
      result = inputData;
  }

  return result;
}
