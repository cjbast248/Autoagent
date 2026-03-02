// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🚀 Workflow campaign function invoked');

    // Parse request body
    const requestBody = await req.json();
    const { 
      campaign_id, 
      list_id, 
      agent_id,
      company_id,
      name,
      call_interval_seconds = 30,
      max_attempts = 3,
      retry_interval_minutes = 30
    } = requestBody;

    console.log('📝 Request data:', { campaign_id, list_id, agent_id, company_id, name });

    // Validation
    if (!agent_id || (!list_id && !campaign_id && !company_id)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: agent_id and (list_id or campaign_id or company_id)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user ID from headers
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID not found in headers' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify agent exists and belongs to user
    const { data: agent, error: agentError } = await supabase
      .from('kalina_agents')
      .select('*')
      .eq('agent_id', agent_id)
      .eq('user_id', userId)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agent not found or access denied' }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('✅ Agent verified:', agent.name);

    // Fetch contacts based on source
    let contacts = [];
    
    if (company_id) {
      console.log('📞 Fetching contacts from company:', company_id);
      
      // Fetch contacts from company_contacts
      const { data: companyContacts, error: contactsError } = await supabase
        .from('company_contacts')
        .select('*')
        .eq('company_id', company_id)
        .order('created_at')
        .limit(100);

      if (contactsError) {
        console.error('Error fetching company contacts:', contactsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch company contacts' }),
          { status: 500, headers: corsHeaders }
        );
      }

      contacts = (companyContacts || []).map(contact => ({
        name: contact.name || 'Contact',
        phone: contact.phone
      }));

    } else if (list_id) {
      console.log('📞 Fetching contacts from list:', list_id);
      
      // Fetch contacts from workflow_contacts (original logic)
      const { data: workflowContacts, error: contactsError } = await supabase
        .from('workflow_contacts')
        .select('*')
        .eq('list_id', list_id)
        .eq('status', 'pending')
        .order('created_at')
        .limit(100);

      if (contactsError) {
        console.error('Error fetching workflow contacts:', contactsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch workflow contacts' }),
          { status: 500, headers: corsHeaders }
        );
      }

      contacts = workflowContacts || [];
    }

    if (contacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No contacts found to call',
          contacts_processed: 0,
          successful_calls: 0,
          failed_calls: 0
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    console.log(`📋 Found ${contacts.length} contacts to process`);

    // Process contacts with call interval
    let successfulCalls = 0;
    let failedCalls = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        console.log(`📞 Processing contact ${i + 1}/${contacts.length}: ${contact.name} (${contact.phone})`);

        // Call the outbound function
        const { error: callError } = await supabase.functions.invoke('initiate-scheduled-call', {
          body: {
            agent_id: agent_id,
            phone_number: contact.phone,
            contact_name: contact.name,
            user_id: userId,
            batch_processing: true,
            dynamic_variables: {
              name: contact.name
            }
          }
        });

        if (callError) {
          console.error(`❌ Failed to call ${contact.phone}:`, callError);
          failedCalls++;
        } else {
          console.log(`✅ Successfully initiated call to ${contact.phone}`);
          successfulCalls++;
        }

        // Wait between calls (except for the last one) - use configured interval
        if (i < contacts.length - 1) {
          const interval = call_interval_seconds * 1000; // Convert to milliseconds
          console.log(`⏳ Waiting ${call_interval_seconds} seconds before next call...`);
          await new Promise(resolve => setTimeout(resolve, interval));
        }

      } catch (error) {
        console.error(`❌ Error processing contact ${contact.phone}:`, error);
        failedCalls++;
      }
    }

    const result = {
      message: 'Campaign execution completed',
      contacts_processed: contacts.length,
      successful_calls: successfulCalls,
      failed_calls: failedCalls,
      campaign_config: {
        call_interval_seconds,
        max_attempts,
        retry_interval_minutes
      }
    };

    console.log('🏁 Campaign completed:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Workflow campaign error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});