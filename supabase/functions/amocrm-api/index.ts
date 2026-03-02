// amoCRM API proxy - handles all amoCRM operations
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Verify token with Supabase
    const token = authHeader.replace("Bearer ", "");
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseAnonKey,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Get query parameters
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "get_many";
    const entityType = url.searchParams.get("entity_type") || "leads";
    const id = url.searchParams.get("id");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const filtersParam = url.searchParams.get("filters");

    // Get request body for POST operations
    let bodyData: any = {};
    if (req.method === "POST") {
      try {
        bodyData = await req.json();
      } catch {
        // No body
      }
    }

    // Get user's amoCRM connection
    const connectionResponse = await fetch(
      `${supabaseUrl}/rest/v1/amocrm_connections?user_id=eq.${userId}&status=eq.connected&order=updated_at.desc&limit=1`,
      {
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
      }
    );

    const connections = await connectionResponse.json();
    const connection = connections[0];

    if (!connection || !connection.access_token) {
      return new Response(
        JSON.stringify({ error: "No amoCRM connection. Please connect your amoCRM account." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let access_token = connection.access_token;
    let base_domain = connection.base_domain || "www.amocrm.ru";

    // Check if token needs refresh
    const now = Date.now();
    const exp = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;

    if (exp && exp <= now + 90_000) {
      console.log("[amocrm-api] Token expired or expiring soon, refreshing...");

      if (!connection.refresh_token) {
        return new Response(
          JSON.stringify({ error: "amoCRM refresh token missing. Reconnect your account." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get credentials for refresh
      const hasPerUserCredentials = !!(connection.client_id && connection.client_secret);
      const clientId = hasPerUserCredentials ? connection.client_id : Deno.env.get("AMOCRM_CLIENT_ID") || "";
      const clientSecret = hasPerUserCredentials ? connection.client_secret : Deno.env.get("AMOCRM_CLIENT_SECRET") || "";

      const refreshResponse = await fetch(`https://${base_domain}/oauth2/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
        }),
      });

      const refreshText = await refreshResponse.text();
      console.log("[amocrm-api] Refresh response:", refreshResponse.status);

      if (!refreshResponse.ok) {
        console.error("[amocrm-api] Refresh failed:", refreshText);
        return new Response(
          JSON.stringify({ error: "Failed to refresh amoCRM token. Please reconnect your account." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const refreshData = JSON.parse(refreshText);
      access_token = refreshData.access_token;
      base_domain = refreshData.base_domain || base_domain;

      // Update connection with new tokens
      const expiresAt = new Date(Date.now() + (refreshData.expires_in - 60) * 1000).toISOString();

      const updatePayload: any = {
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: expiresAt,
        base_domain: base_domain,
        updated_at: new Date().toISOString(),
      };

      if (hasPerUserCredentials) {
        updatePayload.client_id = connection.client_id;
        updatePayload.client_secret = connection.client_secret;
      }

      await fetch(`${supabaseUrl}/rest/v1/amocrm_connections?user_id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(updatePayload),
      });

      console.log("[amocrm-api] Token refreshed successfully");
    }

    console.log("[amocrm-api] Using base_domain:", base_domain);
    const apiBase = `https://${base_domain}/api/v4`;

    // Helper function to safely parse AmoCRM response
    const parseAmoCRMResponse = async (resp: Response, context: string) => {
      const text = await resp.text();
      console.log(`AmoCRM ${context} response:`, resp.status, text.substring(0, 500));

      if (!resp.ok) {
        // Check if it's HTML (error page)
        if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
          throw new Error(`AmoCRM returned HTML error page (${resp.status}). Check if domain "${base_domain}" is correct.`);
        }
        try {
          const errData = JSON.parse(text);
          throw new Error(errData.message || errData.title || errData.error || `AmoCRM error (${resp.status})`);
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw new Error(`AmoCRM error (${resp.status}): ${text.substring(0, 200)}`);
          }
          throw e;
        }
      }

      // Handle empty response (e.g., 204 No Content)
      if (!text || text.trim() === "") {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`AmoCRM returned invalid JSON: ${text.substring(0, 200)}`);
      }
    };

    let result: any;

    switch (action) {
      case "get": {
        if (!id) {
          return new Response(
            JSON.stringify({ error: "Missing id parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Include linked contacts for leads
        const getParams = entityType === "leads" ? "?with=contacts" : "";
        const resp = await fetch(`${apiBase}/${entityType}/${id}${getParams}`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const getData = await parseAmoCRMResponse(resp, "get");

        // Extract contact info (phone, email) from embedded contacts
        if (getData && entityType === "leads") {
          const embeddedContacts = getData._embedded?.contacts || [];
          const contactInfo: Array<{ id: number; name?: string; phone?: string; email?: string }> = [];

          // Fetch full contact details for each contact
          if (embeddedContacts.length > 0) {
            const contactIds = embeddedContacts.map((c: any) => c.id);
            const contactQueryParams = new URLSearchParams();
            contactQueryParams.set("limit", "50");
            for (const contactId of contactIds) {
              contactQueryParams.append("filter[id][]", String(contactId));
            }

            try {
              const contactsFetchUrl = `${apiBase}/contacts?${contactQueryParams.toString()}`;
              console.log("Fetching contact details for lead:", contactsFetchUrl);

              const contactsResp = await fetch(contactsFetchUrl, {
                headers: { Authorization: `Bearer ${access_token}` },
              });
              const contactsData = await parseAmoCRMResponse(contactsResp, "get_contact_details");
              const fetchedContacts = contactsData?._embedded?.contacts || [];

              for (const contact of fetchedContacts) {
                const info: { id: number; name?: string; phone?: string; email?: string } = { id: contact.id };
                if (contact.name) info.name = contact.name;

                // Extract phone and email from custom_fields_values
                if (contact.custom_fields_values) {
                  for (const field of contact.custom_fields_values) {
                    if (field.field_code === "PHONE" && field.values?.[0]?.value) {
                      info.phone = field.values[0].value;
                    }
                    if (field.field_code === "EMAIL" && field.values?.[0]?.value) {
                      info.email = field.values[0].value;
                    }
                  }
                }
                contactInfo.push(info);
              }
            } catch (contactsError) {
              console.error("Error fetching contact details:", contactsError);
              // Fall back to just contact IDs
              for (const contact of embeddedContacts) {
                contactInfo.push({ id: contact.id });
              }
            }
          }

          getData.contacts = contactInfo;
          // Also provide flat fields for convenience
          if (contactInfo.length > 0) {
            getData.contact_phone = contactInfo[0].phone;
            getData.contact_email = contactInfo[0].email;
            getData.contact_name = contactInfo[0].name;
          }
        }

        result = getData;
        break;
      }

      case "get_many": {
        const queryParams = new URLSearchParams();
        queryParams.set("limit", String(limit));

        // Include linked contacts for leads
        if (entityType === "leads") {
          queryParams.set("with", "contacts");
        }

        // Parse filters if provided
        if (filtersParam) {
          try {
            const filters = JSON.parse(filtersParam);
            let statusFilterIndex = 0;

            filters.forEach((f: any) => {
              if (f.field && f.value) {
                // Special handling for status_id - amoCRM requires filter[statuses][N][status_id] format
                if (f.field === "status_id" && entityType === "leads") {
                  queryParams.append(`filter[statuses][${statusFilterIndex}][status_id]`, f.value);
                  // If pipeline_id is provided, add it too
                  if (f.pipeline_id) {
                    queryParams.append(`filter[statuses][${statusFilterIndex}][pipeline_id]`, f.pipeline_id);
                  }
                  statusFilterIndex++;
                } else {
                  switch (f.operator) {
                    case "equals":
                      queryParams.append(`filter[${f.field}]`, f.value);
                      break;
                    case "greater_than":
                      queryParams.append(`filter[${f.field}][from]`, f.value);
                      break;
                    case "less_than":
                      queryParams.append(`filter[${f.field}][to]`, f.value);
                      break;
                    default:
                      queryParams.append(`filter[${f.field}]`, f.value);
                  }
                }
              }
            });
          } catch (e) {
            console.error("Error parsing filters:", e);
          }
        }

        const fetchUrl = `${apiBase}/${entityType}?${queryParams.toString()}`;
        console.log("Fetching:", fetchUrl);

        const resp = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const data = await parseAmoCRMResponse(resp, "get_many");

        // Process leads to extract contact info
        let processedData = data?._embedded?.[entityType] || [];

        if (entityType === "leads" && Array.isArray(processedData)) {
          // STEP 1: Collect all unique contact IDs from leads
          const allContactIds: number[] = [];
          for (const lead of processedData) {
            const contacts = lead._embedded?.contacts || [];
            for (const contact of contacts) {
              if (contact.id && !allContactIds.includes(contact.id)) {
                allContactIds.push(contact.id);
              }
            }
          }

          console.log(`Found ${allContactIds.length} unique contacts to fetch details for`);

          // STEP 2: Fetch contact details in batch (if there are any contacts)
          const contactDetailsMap: Map<number, { name?: string; phone?: string; email?: string }> = new Map();

          if (allContactIds.length > 0) {
            // AmoCRM allows filtering by multiple IDs using filter[id][]
            const contactQueryParams = new URLSearchParams();
            contactQueryParams.set("limit", "250"); // Max limit
            for (const contactId of allContactIds) {
              contactQueryParams.append("filter[id][]", String(contactId));
            }

            const contactsFetchUrl = `${apiBase}/contacts?${contactQueryParams.toString()}`;
            console.log("Fetching contact details:", contactsFetchUrl);

            try {
              const contactsResp = await fetch(contactsFetchUrl, {
                headers: { Authorization: `Bearer ${access_token}` },
              });
              const contactsData = await parseAmoCRMResponse(contactsResp, "get_contacts_details");
              const fetchedContacts = contactsData?._embedded?.contacts || [];

              console.log(`Fetched ${fetchedContacts.length} contact details`);

              // Build a map of contact ID -> details
              for (const contact of fetchedContacts) {
                const details: { name?: string; phone?: string; email?: string } = {};
                if (contact.name) details.name = contact.name;

                // Extract phone and email from custom_fields_values
                if (contact.custom_fields_values) {
                  for (const field of contact.custom_fields_values) {
                    if (field.field_code === "PHONE" && field.values?.[0]?.value) {
                      details.phone = field.values[0].value;
                    }
                    if (field.field_code === "EMAIL" && field.values?.[0]?.value) {
                      details.email = field.values[0].value;
                    }
                  }
                }

                contactDetailsMap.set(contact.id, details);
              }
            } catch (contactsError) {
              console.error("Error fetching contact details:", contactsError);
              // Continue without contact details - leads will still be returned
            }
          }

          // STEP 3: Enrich leads with contact details
          processedData = processedData.map((lead: any) => {
            const contacts = lead._embedded?.contacts || [];
            const contactInfo: Array<{ id: number; name?: string; phone?: string; email?: string }> = [];

            for (const contact of contacts) {
              const info: { id: number; name?: string; phone?: string; email?: string } = { id: contact.id };

              // Get details from our fetched map
              const details = contactDetailsMap.get(contact.id);
              if (details) {
                if (details.name) info.name = details.name;
                if (details.phone) info.phone = details.phone;
                if (details.email) info.email = details.email;
              }

              contactInfo.push(info);
            }

            // Add extracted contact info to lead
            const enrichedLead = { ...lead, contacts: contactInfo };

            // Also provide flat fields for convenience (first contact)
            if (contactInfo.length > 0) {
              enrichedLead.contact_phone = contactInfo[0].phone;
              enrichedLead.contact_email = contactInfo[0].email;
              enrichedLead.contact_name = contactInfo[0].name;
            }

            return enrichedLead;
          });
        }

        result = {
          data: processedData,
          total: data?._total_items || 0,
          page: data?._page || 1,
        };
        break;
      }

      case "get_fields": {
        const resp = await fetch(`${apiBase}/${entityType}/custom_fields`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const data = await parseAmoCRMResponse(resp, "get_fields");
        result = {
          fields: data?._embedded?.custom_fields || [],
        };
        break;
      }

      case "create": {
        if (!bodyData.data) {
          return new Response(
            JSON.stringify({ error: "Missing data in request body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Special handling for notes - they need to be created via leads/{id}/notes endpoint
        if (entityType === "notes") {
          const leadId = url.searchParams.get("lead_id");
          if (!leadId) {
            return new Response(
              JSON.stringify({ error: "Missing lead_id parameter for notes" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Extract note text from various possible locations in the payload
          let noteText = "";
          if (bodyData.data.params?.text) {
            noteText = bodyData.data.params.text;
          } else if (bodyData.data.text) {
            noteText = bodyData.data.text;
          } else if (typeof bodyData.data === "string") {
            noteText = bodyData.data;
          }

          if (!noteText || noteText.trim() === "") {
            return new Response(
              JSON.stringify({ error: "Note text cannot be empty" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const notePayload = [{
            note_type: bodyData.data.note_type || "common",
            params: { text: noteText }
          }];

          console.log("Creating note for lead:", leadId, "payload:", JSON.stringify(notePayload));

          const resp = await fetch(`${apiBase}/leads/${leadId}/notes`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(notePayload),
          });

          // Parse the response with specific handling for notes
          const noteRespText = await resp.text();
          console.log("AmoCRM note creation response:", resp.status, noteRespText.substring(0, 500));

          if (!resp.ok) {
            // Check if it's HTML (error page)
            if (noteRespText.startsWith("<!DOCTYPE") || noteRespText.startsWith("<html")) {
              throw new Error(`AmoCRM returned HTML error page (${resp.status}). Check if domain "${base_domain}" is correct.`);
            }
            try {
              const errData = JSON.parse(noteRespText);
              throw new Error(errData.message || errData.title || errData.error || `AmoCRM note error (${resp.status})`);
            } catch (e) {
              if (e instanceof SyntaxError) {
                throw new Error(`AmoCRM note error (${resp.status}): ${noteRespText.substring(0, 200)}`);
              }
              throw e;
            }
          }

          // Handle empty response (success with no body)
          if (!noteRespText || noteRespText.trim() === "") {
            result = { success: true, lead_id: leadId, message: "Note created" };
          } else {
            try {
              result = JSON.parse(noteRespText);
            } catch {
              // If response is not JSON but status is OK, treat as success
              result = { success: true, lead_id: leadId, raw_response: noteRespText.substring(0, 100) };
            }
          }
          break;
        }

        const createPayload = [bodyData.data];

        const resp = await fetch(`${apiBase}/${entityType}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createPayload),
        });
        result = await parseAmoCRMResponse(resp, "create");
        break;
      }

      case "update": {
        if (!id) {
          return new Response(
            JSON.stringify({ error: "Missing id parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!bodyData.data) {
          return new Response(
            JSON.stringify({ error: "Missing data in request body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updatePayload = [{ id: parseInt(id), ...bodyData.data }];

        const resp = await fetch(`${apiBase}/${entityType}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        });
        result = await parseAmoCRMResponse(resp, "update");
        break;
      }

      case "delete": {
        if (!id) {
          return new Response(
            JSON.stringify({ error: "Missing id parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const resp = await fetch(`${apiBase}/${entityType}/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${access_token}` },
        });

        if (resp.status === 204) {
          result = { success: true, deleted_id: id };
        } else {
          result = await parseAmoCRMResponse(resp, "delete");
        }
        break;
      }

      case "get_pipelines": {
        // Fetch all pipelines - amoCRM returns statuses embedded by default
        const resp = await fetch(`${apiBase}/leads/pipelines`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const data = await parseAmoCRMResponse(resp, "get_pipelines");
        const pipelines = data?._embedded?.pipelines || [];

        result = {
          pipelines: pipelines,
        };
        break;
      }

      case "get_statuses": {
        const pipelineId = url.searchParams.get("pipeline_id");
        let endpoint = `${apiBase}/leads/pipelines`;
        if (pipelineId) {
          endpoint += `/${pipelineId}/statuses`;
        }
        const resp = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const data = await parseAmoCRMResponse(resp, "get_statuses");
        result = {
          statuses: data?._embedded?.statuses || data?._embedded?.pipelines?.[0]?._embedded?.statuses || [],
        };
        break;
      }

      case "get_users": {
        const resp = await fetch(`${apiBase}/users`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const data = await parseAmoCRMResponse(resp, "get_users");
        result = {
          users: data?._embedded?.users || [],
        };
        break;
      }

      case "link": {
        // Link entities (e.g., link contact to lead)
        // POST /api/v4/{entity_type}/{id}/link
        if (!id) {
          return new Response(
            JSON.stringify({ error: "Missing id parameter for link action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!bodyData.data) {
          return new Response(
            JSON.stringify({ error: "Missing data in request body for link action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const linkPayload = Array.isArray(bodyData.data) ? bodyData.data : [bodyData.data];
        console.log(`Linking to ${entityType}/${id}:`, JSON.stringify(linkPayload));

        const resp = await fetch(`${apiBase}/${entityType}/${id}/link`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(linkPayload),
        });

        result = await parseAmoCRMResponse(resp, "link");
        if (result === null) {
          // Empty response means success
          result = { success: true, linked_to: id };
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("amoCRM API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
