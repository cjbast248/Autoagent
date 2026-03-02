// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const companyId = pathParts[pathParts.length - 1];

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get phone number from query params or request body
    let phoneNumber: string;
    if (req.method === 'GET') {
      phoneNumber = url.searchParams.get('phone') || '';
    } else {
      const { phone } = await req.json();
      phoneNumber = phone || '';
    }

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get contact from company
    const { data: contact, error: contactError } = await supabaseClient
      .from('company_contacts')
      .select('*')
      .eq('company_id', companyId)
      .eq('phone', phoneNumber)
      .single();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ error: 'Contact not found in this company' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get call history for this contact and user
    const { data: callHistory, error: callError } = await supabaseClient
      .from('call_history')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('user_id', company.user_id)
      .order('call_date', { ascending: false });

    // Prepare response
    const response = {
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        country: contact.country,
        location: contact.location,
        metadata: contact.metadata,
        created_at: contact.created_at
      },
      company: {
        id: company.id,
        name: company.name,
        description: company.description
      },
      conversations: (callHistory || []).map(call => ({
        id: call.id,
        agent_id: call.agent_id,
        conversation_id: call.conversation_id,
        call_date: call.call_date,
        call_status: call.call_status,
        duration_seconds: call.duration_seconds,
        cost_usd: call.cost_usd,
        summary: call.summary,
        dialog_json: call.dialog_json ? JSON.parse(call.dialog_json) : null
      })),
      stats: {
        total_calls: callHistory?.length || 0,
        last_call: callHistory?.[0]?.call_date || null,
        total_duration: callHistory?.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) || 0,
        answered_calls: callHistory?.filter(call => call.call_status === 'completed').length || 0
      },
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});