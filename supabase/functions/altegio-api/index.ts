// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_BASE_URL = 'https://api.alteg.io/api/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

type AltegioAction =
  | 'list'
  | 'create'
  | 'update'
  | 'cancel'
  | 'get'
  | 'list_services'
  | 'list_branches'
  | 'list_staff';

interface AltegioConfig {
  baseUrl?: string;
  partnerId?: string;
  partnerToken?: string;
  userToken?: string;
  appId?: string;
  useCustomCreds?: boolean;
  action?: AltegioAction;
  bookingId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceId?: string;
  staffId?: string;
  branchId?: string;
  startAt?: string;
  status?: string;
  comment?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  salonId?: string | number;
  companyId?: string | number;
  // Advanced filters for list bookings
  filterStatus?: string;
  filterStaffId?: string | number;
  filterServiceId?: string | number;
  filterBranchId?: string | number;
  filterClientId?: string | number;
  filterClientPhone?: string;
  filterClientEmail?: string;
  offset?: number;
  page?: number;
}

function buildAuthHeader(partnerToken: string, userToken: string) {
  // Altegio API format: "Bearer {partner_token}, User {user_token}"
  // Ensure no extra spaces
  return `Bearer ${partnerToken.trim()}, User ${userToken.trim()}`;
}

async function resolveConfig(
  config: AltegioConfig = {},
  inputData: any = {},
  userId?: string | null
) {
  const useCustom = !!config.useCustomCreds;

  // Partner token - always from env or custom
  const partnerToken =
    (useCustom ? config.partnerToken : undefined) ||
    Deno.env.get('ALTEGIO_PARTNER_TOKEN') ||
    Deno.env.get('ALTEGIO_PARTNER_KEY');

  const baseUrl =
    (useCustom ? config.baseUrl : undefined) ||
    Deno.env.get('ALTEGIO_BASE_URL') ||
    DEFAULT_BASE_URL;

  const salonId =
    config.salonId ||
    config.companyId ||
    inputData?.salon_id ||
    inputData?.company_id;

  // Try to get user-specific token from altegio_installations
  let userToken: string | undefined = undefined;
  
  if (!useCustom && salonId && userId) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: installation } = await supabase
          .from('altegio_installations')
          .select('user_data, agentauto_user_id')
          .eq('salon_id', salonId)
          .eq('agentauto_user_id', userId)
          .eq('status', 'active')
          .single();
        
        if (installation?.user_data) {
          const userData = installation.user_data as Record<string, unknown>;
          // user_token can be in user_data directly or nested
          userToken = 
            (userData.user_token as string) ||
            (userData.userToken as string) ||
            (userData.token as string);
          
          if (userToken) {
            console.log('[altegio-api] Using user-specific token from installation');
          }
        }
      }
    } catch (err) {
      console.warn('[altegio-api] Failed to fetch user token from installations:', err);
    }
  }

  // Fallback to custom or global tokens
  if (!userToken) {
    userToken =
      (useCustom ? config.userToken : undefined) ||
      Deno.env.get('ALTEGIO_SYSTEM_USER_TOKEN') ||
      Deno.env.get('ALTEGIO_USER_TOKEN');
  }

  if (!partnerToken || !userToken) {
    throw new Error('Missing Altegio tokens. Set ALTEGIO_PARTNER_TOKEN and ALTEGIO_SYSTEM_USER_TOKEN or provide custom creds.');
  }

  return { partnerToken, userToken, baseUrl, salonId };
}

interface AltegioRequestOptions {
  method?: string;
  query?: Record<string, any>;
  body?: any;
}

interface AltegioResponse {
  status: number;
  data: any;
}

async function callAltegio(
  baseUrl: string,
  partnerToken: string,
  userToken: string,
  path: string,
  opts: AltegioRequestOptions = {},
): Promise<AltegioResponse> {
  // Construct URL properly - ensure baseUrl doesn't end with / and path starts with /
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Manually construct URL to preserve baseUrl path
  const fullUrl = `${cleanBaseUrl}${cleanPath}`;
  const url = new URL(fullUrl);
  
  if (opts.query) {
    Object.entries(opts.query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .forEach(([k, v]) => url.searchParams.append(k, String(v)));
  }

  const authHeader = buildAuthHeader(partnerToken, userToken);
  const headers: Record<string, string> = {
    Authorization: authHeader,
    Accept: 'application/vnd.api.v2+json',
  };

  const init: RequestInit = {
    method: opts.method || 'GET',
    headers,
  };

  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }

  // Log request details (without exposing full tokens)
  const authParts = authHeader.split(' ');
  console.log('[altegio-api] Making request:', {
    url: url.toString(),
    method: opts.method || 'GET',
    hasAuth: !!authHeader,
    authHeaderFormat: authParts.length > 0 ? `${authParts[0]} ${authParts[1]?.substring(0, 10)}... User ${authParts[3]?.substring(0, 10)}...` : 'invalid',
    hasBody: !!opts.body,
    headers: Object.keys(headers),
  });

  const res = await fetch(url.toString(), init);
  const text = await res.text();
  
  // Log response details
  console.log('[altegio-api] Response:', {
    status: res.status,
    statusText: res.statusText,
    contentType: res.headers.get('content-type'),
    textLength: text.length,
    textPreview: text.substring(0, 500),
    isHTML: text.includes('<!DOCTYPE') || text.includes('<html'),
  });
  
  // If HTML response, log more details for debugging
  if (text.includes('<!DOCTYPE') || text.includes('<html')) {
    console.error('[altegio-api] HTML Response Details:', {
      fullUrl: url.toString(),
      authHeaderLength: authHeader.length,
      responseHeaders: Object.fromEntries(res.headers.entries()),
      first500Chars: text.substring(0, 500),
    });
  }
  
  // Check if response is HTML (usually means authentication failed or wrong endpoint)
  const isHTML = (str: string): boolean => {
    return /^\s*<[^>]+>/.test(str) || str.includes('<!DOCTYPE') || str.includes('<html') || str.includes('<HTML');
  };
  
  if (isHTML(text)) {
    console.error('[altegio-api] Received HTML response instead of JSON:', text.substring(0, 500));
    throw new Error(`Altegio API returned HTML instead of JSON (status ${res.status}). This usually means:
1. Invalid credentials (partner_token or user_token)
2. Wrong base URL
3. Authentication failed - check your tokens in Supabase secrets or custom credentials`);
  }
  
  let json: any = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch (e) {
    // If it's not HTML and not JSON, it might be plain text error
    if (text.length < 500) {
      throw new Error(`Altegio API returned invalid response: ${text}`);
    }
    throw new Error(`Altegio API returned invalid response (not JSON, not HTML). Status: ${res.status}`);
  }

  if (!res.ok) {
    console.error('[altegio-api] Request failed', {
      url: url.toString(),
      status: res.status,
      statusText: res.statusText,
      bodyPreview: text.substring(0, 500),
    });
    // Try to extract error message from JSON response
    let errorMessage = `Altegio API ${res.status}: ${res.statusText}`;
    if (json && typeof json === 'object') {
      if (json.error) errorMessage = String(json.error);
      else if (json.message) errorMessage = String(json.message);
      else if (json.errors && Array.isArray(json.errors) && json.errors.length > 0) {
        errorMessage = json.errors.map((e: any) => e.message || e).join(', ');
      }
    } else if (typeof json === 'string' && json.length < 500) {
      errorMessage = json;
    }
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).statusText = res.statusText;
    (error as any).url = url.toString();
    (error as any).responseBody = text;
    (error as any).responseJson = json;
    throw error;
  }

  return { status: res.status, data: json };
}

function expandPaths(paths: string[]): string[] {
  const expanded: string[] = [];
  for (const path of paths) {
    expanded.push(path);
    if (!path.endsWith('/')) {
      expanded.push(`${path}/`);
    }
  }
  return expanded;
}

async function callAltegioWithFallback(
  baseUrl: string,
  partnerToken: string,
  userToken: string,
  paths: string[],
  opts: AltegioRequestOptions = {},
): Promise<AltegioResponse> {
  let lastError: any = null;
  const expandedPaths = expandPaths(paths);
  for (const path of expandedPaths) {
    try {
      return await callAltegio(baseUrl, partnerToken, userToken, path, opts);
    } catch (error) {
      lastError = error;
      const status = (error as any)?.status;
      if (status === 404) {
        console.warn('[altegio-api] Path returned 404, trying fallback if available', {
          path,
          url: (error as any)?.url,
        });
        continue;
      }
      throw error;
    }
  }

  if (lastError) {
    const attempted = expandedPaths.join(', ');
    (lastError as any).message = `${(lastError as any).message || 'Altegio error'} (paths tried: ${attempted})`;
    throw lastError;
  }
  throw new Error('Unknown Altegio error. No paths provided for fallback.');
}

function normalizeBranchResponse(data: any, fallbackId: string | number) {
  if (!data || typeof data !== 'object') return undefined;
  const candidates = [
    (data as any).branches,
    (data as any).filials,
    (data as any).locations,
    (data as any).offices,
    (data as any).data?.branches,
    (data as any).data?.filials,
    (data as any).data?.locations,
  ];
  for (const list of candidates) {
    if (Array.isArray(list) && list.length >= 0) {
      return list;
    }
  }
  const name =
    (data as any).name ||
    (data as any).title ||
    (data as any).data?.name ||
    (data as any).data?.title;
  return [
    {
      id: fallbackId,
      name: name || `Branch ${fallbackId}`,
      synthetic: true,
    },
  ];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user ID from Authorization header if available
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (supabaseUrl && supabaseAnonKey) {
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
          });
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id || null;
        }
      } catch (err) {
        console.warn('[altegio-api] Failed to get user from auth header:', err);
      }
    }

    const body = await req.json();
    const { action, config, inputData } = body || {};

    console.log('[altegio-api] action:', action, 'config keys:', Object.keys(config || {}), 'userId:', userId);

    if (!action) {
      return new Response(JSON.stringify({ success: false, error: 'Missing action' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { partnerToken, userToken, baseUrl, salonId } = await resolveConfig(config, inputData, userId);
    
    // Log for debugging (without exposing tokens)
    console.log('[altegio-api] Resolved config:', {
      baseUrl,
      hasPartnerToken: !!partnerToken,
      hasUserToken: !!userToken,
      salonId,
      action,
      userId: userId || 'none',
      useCustomCreds: config?.useCustomCreds || false,
    });

    const resolvedAction: AltegioAction = action as AltegioAction;

    let result: any = null;

    switch (resolvedAction) {
      case 'list_services': {
        if (!salonId) throw new Error('Missing salon_id/company_id for list_services');
        result = await callAltegio(baseUrl, partnerToken, userToken, `/company/${salonId}/services`, {
          method: 'GET',
        });
        break;
      }
      case 'list_branches': {
        if (!salonId) throw new Error('Missing salon_id/company_id for list_branches');
        const branchPaths = [
          `/company/${salonId}/branches`,
          `/branches/${salonId}`,
          `/company/${salonId}/filials`,
          `/filials/${salonId}`,
          `/company/${salonId}/locations`,
        ];
        try {
          result = await callAltegioWithFallback(
            baseUrl,
            partnerToken,
            userToken,
            branchPaths,
            { method: 'GET' },
          );
        } catch (error) {
          if ((error as any)?.status === 404) {
            console.warn('[altegio-api] Direct branches endpoints unavailable, trying company info approach');
            const companyResult = await callAltegio(
              baseUrl,
              partnerToken,
              userToken,
              `/company/${salonId}`,
              { method: 'GET' },
            );
            const branches = normalizeBranchResponse(companyResult?.data, salonId);
            result = { status: 200, data: { success: true, data: branches } };
          } else {
            throw error;
          }
        }
        break;
      }
      case 'list_staff': {
        if (!salonId) throw new Error('Missing salon_id/company_id for list_staff');
        const branchId = config?.branchId || config?.filterBranchId;
        const staffPaths = branchId
          ? [
              `/company/${salonId}/branches/${branchId}/staff`,
              `/branches/${branchId}/staff`,
              `/staff/branch/${branchId}`,
              `/company/${salonId}/staff/${branchId}`,
              `/filials/${branchId}/staff`,
              `/company/${salonId}/masters/${branchId}`,
              `/masters/${branchId}`,
            ]
          : [
              `/company/${salonId}/staff`,
              `/staff/${salonId}`,
              `/company/${salonId}/masters`,
              `/masters/${salonId}`,
              `/company/${salonId}/employees`,
            ];
        result = await callAltegioWithFallback(
          baseUrl,
          partnerToken,
          userToken,
          staffPaths,
          { method: 'GET' },
        );
        break;
      }
      case 'list': {
        if (!salonId) throw new Error('Missing salon_id/company_id for list bookings');
        
        // Build query parameters with all available filters
        const query: Record<string, any> = {};
        
        // Date range filters
        if (config?.fromDate) {
          query.date_from = config.fromDate;
          query.start_date = config.fromDate;
        }
        if (config?.toDate) {
          query.date_to = config.toDate;
          query.end_date = config.toDate;
        }
        
        // Pagination
        if (config?.limit) {
          const limit = Math.min(Number(config.limit) || 50, 200);
          query.limit = limit;
          query.count = limit;
        }
        if (config?.offset !== undefined) query.offset = Number(config.offset);
        if (config?.page) {
          const pageNum = Number(config.page);
          query.page = pageNum;
          query.page_num = pageNum;
        }
        
        // Status filter
        if (config?.filterStatus) query.status = config.filterStatus;
        if (config?.status && !config.filterStatus) query.status = config.status;
        
        // Staff filter
        if (config?.filterStaffId) query.staff_id = Number(config.filterStaffId);
        if (config?.staffId && !config.filterStaffId) query.staff_id = Number(config.staffId);
        
        // Service filter
        if (config?.filterServiceId) query.service_id = Number(config.filterServiceId);
        if (config?.serviceId && !config.filterServiceId) query.service_id = Number(config.serviceId);
        
        // Branch filter
        if (config?.filterBranchId) query.branch_id = Number(config.filterBranchId);
        if (config?.branchId && !config.filterBranchId) query.branch_id = Number(config.branchId);
        
        // Client filters
        if (config?.filterClientId) query.client_id = Number(config.filterClientId);
        if (config?.filterClientPhone) query.client_phone = config.filterClientPhone;
        if (config?.filterClientEmail) query.client_email = config.filterClientEmail;
        
        result = await callAltegioWithFallback(
          baseUrl,
          partnerToken,
          userToken,
          [
            `/book_record/company/${salonId}`,
            `/records/${salonId}`,
          ],
          {
            method: 'GET',
            query,
          },
        );
        break;
      }
      case 'get': {
        const bookingId = config?.bookingId || inputData?.booking_id;
        if (!bookingId) throw new Error('Missing bookingId for get');
        const getPaths = salonId
          ? [
              `/book_record/${bookingId}`,
              `/records/${salonId}/${bookingId}`,
              `/records/${bookingId}`,
            ]
          : [
              `/book_record/${bookingId}`,
              `/records/${bookingId}`,
            ];
        result = await callAltegioWithFallback(
          baseUrl,
          partnerToken,
          userToken,
          getPaths,
          {
            method: 'GET',
          },
        );
        break;
      }
      case 'create': {
        if (!salonId) throw new Error('Missing salon_id/company_id for create booking');
        
        // Validate required fields
        const customerPhone = config?.customerPhone || inputData?.customer_phone;
        const customerName = config?.customerName || inputData?.customer_name;
        const startAt = config?.startAt || inputData?.start_at || inputData?.datetime;
        
        if (!customerPhone && !customerName) {
          throw new Error('At least customer phone or name is required for create booking');
        }
        if (!startAt) {
          throw new Error('Start datetime is required for create booking');
        }
        
        // Parse serviceId - can be single value or array
        let services: number[] = [];
        if (config?.serviceId) {
          if (Array.isArray(config.serviceId)) {
            services = config.serviceId.map(s => Number(s)).filter(s => !isNaN(s));
          } else if (typeof config.serviceId === 'string' && config.serviceId.includes(',')) {
            services = config.serviceId.split(',').map(s => Number(s.trim())).filter(s => !isNaN(s));
          } else {
            const serviceNum = Number(config.serviceId);
            if (!isNaN(serviceNum)) services = [serviceNum];
          }
        }
        
        const payload = {
          phone: customerPhone,
          fullname: customerName,
          email: config?.customerEmail || inputData?.customer_email || undefined,
          appointments: [
            {
              id: 0,
              services: services.length > 0 ? services : undefined,
              staff_id: config?.staffId ? Number(config.staffId) : undefined,
              datetime: startAt,
              comment: config?.comment || inputData?.comment || undefined,
              branch_id: config?.branchId ? Number(config.branchId) : undefined,
            },
          ],
        };
        
        // Remove undefined fields
        Object.keys(payload).forEach(key => {
          if (payload[key] === undefined) delete payload[key];
        });
        if (payload.appointments[0].services === undefined) delete payload.appointments[0].services;
        if (payload.appointments[0].staff_id === undefined) delete payload.appointments[0].staff_id;
        if (payload.appointments[0].branch_id === undefined) delete payload.appointments[0].branch_id;
        if (payload.appointments[0].comment === undefined) delete payload.appointments[0].comment;
        
        result = await callAltegioWithFallback(
          baseUrl,
          partnerToken,
          userToken,
          [
            `/book_record/company/${salonId}`,
            `/records/${salonId}`,
          ],
          {
            method: 'POST',
            body: payload,
          },
        );
        break;
      }
      case 'update': {
        const bookingId = config?.bookingId || inputData?.booking_id || inputData?.id;
        if (!bookingId) throw new Error('Missing bookingId for update');
        
        // Parse serviceId - can be single value or array
        let services: number[] | undefined = undefined;
        if (config?.serviceId !== undefined && config?.serviceId !== '') {
          if (Array.isArray(config.serviceId)) {
            services = config.serviceId.map(s => Number(s)).filter(s => !isNaN(s));
          } else if (typeof config.serviceId === 'string' && config.serviceId.includes(',')) {
            services = config.serviceId.split(',').map(s => Number(s.trim())).filter(s => !isNaN(s));
          } else {
            const serviceNum = Number(config.serviceId);
            if (!isNaN(serviceNum)) services = [serviceNum];
          }
        }
        
        const payload: any = {};
        
        // Only include fields that are provided
        if (config?.customerPhone !== undefined || inputData?.customer_phone !== undefined) {
          payload.phone = config?.customerPhone || inputData?.customer_phone;
        }
        if (config?.customerName !== undefined || inputData?.customer_name !== undefined) {
          payload.fullname = config?.customerName || inputData?.customer_name;
        }
        if (config?.customerEmail !== undefined || inputData?.customer_email !== undefined) {
          payload.email = config?.customerEmail || inputData?.customer_email;
        }
        if (config?.status !== undefined) {
          payload.status = config.status;
        }
        
        // Build appointments array only if any appointment field is provided
        const appointment: any = { id: Number(bookingId) };
        let hasAppointmentFields = false;
        
        if (services !== undefined && services.length > 0) {
          appointment.services = services;
          hasAppointmentFields = true;
        }
        if (config?.staffId !== undefined && config.staffId !== '') {
          appointment.staff_id = Number(config.staffId);
          hasAppointmentFields = true;
        }
        if (config?.startAt !== undefined && config.startAt !== '') {
          appointment.datetime = config.startAt;
          hasAppointmentFields = true;
        }
        if (config?.comment !== undefined) {
          appointment.comment = config.comment;
          hasAppointmentFields = true;
        }
        if (config?.branchId !== undefined && config.branchId !== '') {
          appointment.branch_id = Number(config.branchId);
          hasAppointmentFields = true;
        }
        
        if (hasAppointmentFields) {
          payload.appointments = [appointment];
        }
        
        const updatePaths = salonId
          ? [
              `/book_record/${bookingId}`,
              `/records/${salonId}/${bookingId}`,
              `/records/${bookingId}`,
            ]
          : [
              `/book_record/${bookingId}`,
              `/records/${bookingId}`,
            ];
        result = await callAltegioWithFallback(
          baseUrl,
          partnerToken,
          userToken,
          updatePaths,
          {
            method: 'PATCH',
            body: payload,
          },
        );
        break;
      }
      case 'cancel': {
        const bookingId = config?.bookingId || inputData?.booking_id;
        if (!bookingId) throw new Error('Missing bookingId for cancel');
        const cancelPaths = salonId
          ? [
              `/book_record/${bookingId}`,
              `/records/${salonId}/${bookingId}`,
              `/records/${bookingId}`,
            ]
          : [
              `/book_record/${bookingId}`,
              `/records/${bookingId}`,
            ];
        result = await callAltegioWithFallback(
          baseUrl,
          partnerToken,
          userToken,
          cancelPaths,
          {
            method: 'DELETE',
          },
        );
        break;
      }
      default:
        return new Response(JSON.stringify({ success: false, error: `Unsupported action ${action}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    return new Response(JSON.stringify({
      success: true,
      action: resolvedAction,
      data: result?.data,
      status: result?.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[altegio-api] error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
