// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const textEncoder = new TextEncoder();

async function sha256Hex(input: string) {
  const buffer = textEncoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeJsonParse(str: string | undefined | null) {
  if (!str) return undefined;
  try {
    return JSON.parse(str);
  } catch (_e) {
    return undefined;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());

    // Altegio poate trimite fie query GET, fie body (rar). Citim oricum body pentru debugging.
    const rawBody = await req.text();
    let parsedBody: any = {};
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch (_e) {
      parsedBody = rawBody ? { raw: rawBody } : {};
    }

    const userData = query.user_data || parsedBody.user_data;
    const userDataSign = query.user_data_sign || parsedBody.user_data_sign;
    const salonIdFromQuery = query.salon_id || query.company_id;
    const applicationId = query.application_id || parsedBody.application_id;
    const redirect = query.redirect || parsedBody.redirect || 'https://app.agentauto.app/account/workflow?altegio=connected';
    const state = query.state || parsedBody.state;

    const partnerToken =
      Deno.env.get('ALTEGIO_PARTNER_TOKEN') ||
      Deno.env.get('ALTEGIO_PARTNER_KEY');

    if (!userData || !userDataSign || !partnerToken) {
      console.log('[altegio-callback] missing params', { hasUserData: !!userData, hasSign: !!userDataSign, hasPartner: !!partnerToken });
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing user_data / user_data_sign or partner token not set in env',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expectedSign = await sha256Hex(userData + partnerToken);
    const signatureOk = expectedSign === userDataSign;

    // Decodăm user_data pentru log și pentru a extrage salon_id.
    let decodedUserData: any;
    try {
      const jsonString = atob(userData);
      decodedUserData = safeJsonParse(jsonString) ?? jsonString;
    } catch (e) {
      decodedUserData = { decode_error: String(e), raw: userData };
    }

    const salonId =
      decodedUserData?.salon_id ||
      decodedUserData?.company_id ||
      salonIdFromQuery;

    const agentautoUserId =
      typeof state === 'string' && /^[0-9a-fA-F-]{36}$/.test(state) ? state : null;

    console.log('[altegio-callback] received', {
      method: req.method,
      headers: Object.fromEntries(req.headers),
      query,
      parsedBody,
      signatureOk,
      expectedSign,
      userDataSign,
      salonId,
      applicationId,
      state,
    });

    // Persistăm dacă avem cheile și tabela există; nu facem fail dacă insert-ul eșuează.
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey);
        const payloadToStore = {
          salon_id: salonId,
          application_id: applicationId,
          state,
          agentauto_user_id: agentautoUserId,
          status: 'active',
          user_data: decodedUserData,
          raw_user_data: userData,
          user_data_sign: userDataSign,
          signature_valid: signatureOk,
          updated_at: new Date().toISOString(),
        };
        await supabase
          .from('altegio_installations')
          .upsert(payloadToStore, { onConflict: 'salon_id' });
      } else {
        console.log('[altegio-callback] skip db write (missing SUPABASE_URL or SERVICE_ROLE_KEY)');
      }
    } catch (dbErr) {
      console.warn('[altegio-callback] db write failed (table missing or other error):', dbErr);
    }

    // Redirect cu parametri utili pentru frontend.
    const redirectUrl = new URL(redirect);
    if (salonId) redirectUrl.searchParams.set('salon_id', `${salonId}`);
    if (!signatureOk) redirectUrl.searchParams.set('sig', 'invalid');
    redirectUrl.searchParams.set('altegio', 'connected');

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl.toString(),
      },
    });
  } catch (error) {
    console.error('[altegio-callback] error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
