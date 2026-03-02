// @ts-nocheck
// Force redeploy v3 - Fix esm import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Input validation helpers
const validatePhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Handle Moldovan numbers starting with 0 (convert to +373)
  if (/^0\d{8}$/.test(cleanPhone)) {
    return true; // Valid Moldovan format: 079416481
  }
  
  // International format validation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(cleanPhone);
};

const validateInput = (data: any) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }
  
  const { agent_id, phone_number, contact_name, user_id, phone_id, batch_processing, caller_number, is_test_call, dynamic_variables } = data;
  
  // Validate required fields
  if (!agent_id || typeof agent_id !== 'string' || agent_id.length > 100) {
    throw new Error('Invalid agent ID');
  }
  
  if (!phone_number || typeof phone_number !== 'string') {
    throw new Error('Phone number is required');
  }
  
  if (!user_id || typeof user_id !== 'string') {
    throw new Error('User ID is required');
  }
  
  // Validate phone number format
  const cleanPhone = phone_number.replace(/[\s\-\(\)]/g, '');
  if (!validatePhoneNumber(cleanPhone)) {
    throw new Error('Invalid phone number format');
  }
  
  // Normalize Moldovan numbers to international format for ElevenLabs
  let normalizedPhone = cleanPhone;
  if (/^0\d{8}$/.test(cleanPhone)) {
    normalizedPhone = '+373' + cleanPhone.substring(1);
  } else if (!/^\+/.test(cleanPhone)) {
    normalizedPhone = '+' + cleanPhone;
  }
  
  // Validate optional fields
  if (contact_name && (typeof contact_name !== 'string' || contact_name.length > 200)) {
    throw new Error('Contact name too long');
  }
  
  if (caller_number && typeof caller_number !== 'string') {
    throw new Error('Invalid caller number');
  }
  
  if (phone_id && typeof phone_id !== 'string') {
    throw new Error('Invalid phone ID');
  }
  
  return { agent_id, phone_number: normalizedPhone, contact_name, user_id, phone_id, batch_processing, caller_number, is_test_call, dynamic_variables };
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData = await req.json();
    
    // Log raw request to debug phone_id issue
    console.log('📥 RAW REQUEST BODY:', JSON.stringify(requestData, null, 2));
    
    const { agent_id, phone_number, contact_name, user_id, phone_id, batch_processing, caller_number, is_test_call, dynamic_variables } = validateInput(requestData);

    console.log('✅ VALIDATED REQUEST:', { agent_id, phone_number, contact_name, user_id, phone_id, batch_processing, caller_number, is_test_call })
    
    if (phone_id) {
      console.log('📞 PHONE_ID PROVIDED:', phone_id);
    } else {
      console.log('⚠️ NO PHONE_ID - will use default phone selection');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get ElevenLabs API credentials
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    
    console.log('API Key exists:', !!elevenLabsApiKey)
    
    if (!elevenLabsApiKey) {
      console.error('❌ ElevenLabs API key not configured')
      return new Response(
        JSON.stringify({ 
          error: 'ElevenLabs API key nu este configurat în Supabase Secrets. Configurați ELEVENLABS_API_KEY în Edge Functions Secrets.',
          success: false,
          details: 'Mergeți la Project Settings > Edge Functions > Manage secrets și adăugați ELEVENLABS_API_KEY'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Configure phone number for call - use test number for test calls
    let agentPhoneId, callerNumber, phoneProviderType;

    if (is_test_call) {
      // Get secure test configuration for test calls
      try {
        const configResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/get-test-phone-config`, {
          method: 'POST',
          headers: {
            'Authorization': req.headers.get('Authorization') || '',
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
          }
        });
        
        if (!configResponse.ok) {
          throw new Error(`Failed to get test phone config: ${configResponse.status}`);
        }
        
        const testConfig = await configResponse.json();
        
        if (testConfig.error) {
          console.error('❌ Error from test config:', testConfig.error);
          return new Response(
            JSON.stringify({ 
              error: testConfig.error,
              success: false
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        agentPhoneId = testConfig.testPhoneId;
        callerNumber = testConfig.testPhoneNumber;
        phoneProviderType = 'sip'; // Test calls always use SIP
        
        console.log('🧪 Using secure test phone configuration:', { agentPhoneId, callerNumber, remainingCalls: testConfig.remainingCalls });
        
      } catch (error) {
        console.error('❌ Error fetching test phone config:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Nu am putut obține configurația pentru apeluri de test. Încercați din nou.',
            success: false,
            details: error.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      // Get user's phone number from database (for regular calls)
      let phoneQuery = supabase
        .from('phone_numbers')
        .select('elevenlabs_phone_id, phone_number, provider_type')
        .or(`user_id.eq.${user_id},and(is_shared.eq.true,shared_with_user_id.eq.${user_id})`)
        .eq('status', 'active');
      
      // If phone_id is provided, use it specifically, otherwise get the first available
      if (phone_id) {
        console.log('🎯 Using specific phone_id:', phone_id);
        phoneQuery = phoneQuery.eq('id', phone_id).limit(1);
      } else {
        console.log('⚠️ No phone_id provided, using default selection');
        phoneQuery = phoneQuery
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);
      }
      
      const { data: userPhoneNumbers, error: phoneError } = await phoneQuery;

      if (phoneError) {
        console.error('❌ Error fetching user phone numbers:', phoneError);
        return new Response(
          JSON.stringify({ 
            error: 'Nu s-au putut găsi numerele de telefon ale utilizatorului',
            success: false,
            details: phoneError.message
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!userPhoneNumbers || userPhoneNumbers.length === 0) {
        console.error('❌ No active phone numbers found for user:', user_id);
        return new Response(
          JSON.stringify({ 
            error: 'Nu aveți niciun număr de telefon activ înregistrat. Vă rugăm să adăugați un număr de telefon în secțiunea Phone Numbers.',
            success: false,
            details: 'Utilizatorul nu are numere de telefon active'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const userPhone = userPhoneNumbers[0];
      agentPhoneId = userPhone.elevenlabs_phone_id;
      callerNumber = userPhone.phone_number;
      phoneProviderType = userPhone.provider_type || 'sip';
      
      console.log('📱 SELECTED PHONE:', { 
        elevenlabs_phone_id: agentPhoneId, 
        phone_number: callerNumber,
        provider_type: phoneProviderType,
        was_specific: !!phone_id 
      });

      if (!agentPhoneId) {
        console.error('❌ Phone number missing ElevenLabs configuration');
        return new Response(
          JSON.stringify({ 
            error: 'Numărul de telefon nu este configurat corect cu ElevenLabs. Vă rugăm să reconfigurați numărul în secțiunea Phone Numbers.',
            success: false,
            details: 'Phone number missing elevenlabs_phone_id'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    console.log('User phone details:', { agentPhoneId, callerNumber, user_id })

    // Fetch contact information from the contacts database
    let contactInfo = null
    const { data: contactData, error: contactError } = await supabase
      .from('contacts_database')
      .select('*')
      .eq('user_id', user_id)
      .eq('telefon', phone_number)
      .single()

    if (!contactError && contactData) {
      contactInfo = contactData
      console.log('📋 Contact info found:', contactInfo)
    } else {
      console.log('ℹ️ No contact info found for phone number:', phone_number)
    }

    // Fetch contact interaction history
    let interactionHistory = []
    if (contactInfo) {
      const { data: historyData, error: historyError } = await supabase
        .from('contact_interactions')
        .select('*')
        .eq('user_id', user_id)
        .eq('contact_id', contactInfo.id)
        .order('interaction_date', { ascending: false })
        .limit(5)

      if (!historyError && historyData) {
        interactionHistory = historyData
        console.log('📚 Interaction history found:', interactionHistory.length, 'interactions')
      }
    }

    // Build context for the agent with contact information
    let contextInstructions = ""
    if (contactInfo) {
      contextInstructions = `INFORMAȚII CONTACT:
- Nume: ${contactInfo.nume}
- Telefon: ${contactInfo.telefon}
- Email: ${contactInfo.email || 'N/A'}
- Companie: ${contactInfo.company || 'N/A'}
- Locație: ${contactInfo.locatie || 'N/A'}, ${contactInfo.tara || 'N/A'}
- Status: ${contactInfo.status}
- Note: ${contactInfo.notes || 'Nu există note'}
- Info suplimentare: ${contactInfo.info || 'Nu există informații suplimentare'}

ISTORIC INTERACȚIUNI ANTERIOARE:
${interactionHistory.length > 0 ? 
  interactionHistory.map(h => 
    `- ${h.interaction_date}: ${h.interaction_type} (${h.call_status || 'N/A'}) - ${h.summary || 'Fără sumar'}`
  ).join('\n')
  : 'Prima interacțiune cu acest contact'}

Folosește aceste informații pentru a personaliza conversația și a face referire la interacțiunile anterioare dacă este relevant.`
    } else {
      const displayName = contact_name || `KALINA - ${phone_number}`;
      contextInstructions = `CONTACT NOU:
- Telefon: ${phone_number}
- Nume: ${displayName}

Acest este un contact nou, fără istoric anterior de interacțiuni.`
    }

    console.log(`🚀 Inițiere apel pentru ${phone_number} cu agentul ${agent_id} pentru utilizatorul ${user_id} de pe ${callerNumber}`)

    const requestBody = {
      agent_id: agent_id,
      agent_phone_number_id: agentPhoneId,
      to_number: phone_number,
      conversation_config_override: {
        agent: {
          prompt: {
            prompt: contextInstructions
          }
        }
      }
    }

    // Add dynamic variables in the correct ElevenLabs format
    if (dynamic_variables && Object.keys(dynamic_variables).length > 0) {
      requestBody.conversation_initiation_client_data = {
        dynamic_variables: dynamic_variables
      }
      console.log('🏷️  Dynamic variables added in conversation_initiation_client_data:', dynamic_variables)
    }

    console.log('📤 Request body pentru ElevenLabs:', JSON.stringify(requestBody, null, 2))

    // Determine the correct ElevenLabs endpoint based on provider type
    let elevenLabsEndpoint;
    
    if (phoneProviderType === 'twilio') {
      elevenLabsEndpoint = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';
      console.log('📞 Using TWILIO endpoint for call');
    } else {
      elevenLabsEndpoint = 'https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call';
      console.log('📞 Using SIP TRUNK endpoint for call');
    }

    // Make the call to ElevenLabs
    const response = await fetch(elevenLabsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify(requestBody),
    })

    console.log('📡 ElevenLabs response status:', response.status)
    console.log('📡 ElevenLabs response headers:', Object.fromEntries(response.headers.entries()))

    let elevenLabsData
    let responseText = ''
    
    try {
      responseText = await response.text()
      console.log('📝 ElevenLabs raw response:', responseText)
      
      if (responseText) {
        elevenLabsData = JSON.parse(responseText)
        console.log('✅ Parsed ElevenLabs data:', JSON.stringify(elevenLabsData, null, 2))
      }
    } catch (parseError) {
      console.error('❌ Error parsing ElevenLabs response:', parseError)
      console.error('📄 Raw response was:', responseText)
    }

    if (!response.ok) {
      console.error('❌ ElevenLabs API error:', response.status, responseText)
      
      // Check if it's a "busy", "no answer", or "declined" - these should NOT retry
      const shouldNotRetry = elevenLabsData?.message && (
        elevenLabsData.message.includes('Busy Here') ||
        elevenLabsData.message.includes('486') ||
        elevenLabsData.message.includes('No Answer') ||
        elevenLabsData.message.includes('408') ||
        elevenLabsData.message.includes('Decline') ||
        elevenLabsData.message.includes('603')
      );

      if (shouldNotRetry) {
        console.log('🚫 Call failed with user response - NOT scheduling retry:', elevenLabsData.message);
        
        // Store as failed without retry
        const callHistoryData = {
          user_id: user_id,
          phone_number: phone_number,
          caller_number: callerNumber,
          contact_name: contact_name || phone_number,
          call_status: 'failed',
          summary: `Apel eșuat către ${contact_name || phone_number}: ${elevenLabsData.message}`,
          agent_id: agent_id,
          conversation_id: elevenLabsData?.conversation_id || null,
          elevenlabs_history_id: elevenLabsData?.conversation_id || null,
          dialog_json: JSON.stringify({
            request: requestBody,
            response: elevenLabsData,
            initiated_at: new Date().toISOString(),
            batch_processing: batch_processing || false,
            is_test_call: is_test_call || false,
            caller_phone_details: { elevenlabs_phone_id: agentPhoneId, phone_number: callerNumber }
          }),
          call_date: new Date().toISOString(),
          cost_usd: 0,
          duration_seconds: 0,
          language: 'ro'
        };

        const { data: insertData, error: insertError } = await supabase
          .from('call_history')
          .insert(callHistoryData)
          .select();

        return new Response(
          JSON.stringify({
            success: false,
            message: `Call failed: ${elevenLabsData.message}`,
            conversationId: elevenLabsData?.conversation_id,
            callHistoryId: insertData?.[0]?.id,
            shouldRetry: false
          }),
          {
            status: 200, // Return 200 for handled failure
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Handle specific phone number not found error
      if (response.status === 404 && elevenLabsData?.detail?.status === 'phone_number_not_found') {
        return new Response(
          JSON.stringify({ 
            error: 'Numărul de telefon nu este configurat corect în ElevenLabs. Contactați administratorul pentru configurarea numerelor de telefon.',
            details: 'Phone number ID not found in ElevenLabs',
            success: false,
            status_code: response.status
          }),
          {
            status: 400, // Return 400 instead of 404 for better UX
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      // Enhanced error message based on status code
      let errorMessage = `Eroare ElevenLabs: ${response.status}`
      
      if (response.status === 401) {
        errorMessage += ' - API Key invalid sau lipsă'
      } else if (response.status === 400) {
        errorMessage += ' - Date de intrare invalide (verificați Agent ID și numărul de telefon)'
      } else if (response.status === 404) {
        errorMessage += ' - Agent sau numărul de telefon nu a fost găsit'
      } else if (response.status === 429) {
        errorMessage += ' - Prea multe cereri (rate limit)'
      } else if (response.status >= 500) {
        errorMessage += ' - Eroare server ElevenLabs'
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: responseText,
          success: false,
          status_code: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Apel inițiat cu succes:', elevenLabsData)

    // Determine call status based on ElevenLabs response
    let callStatus = is_test_call ? 'test' : 'initiated'
    let callSummary = `Apel ${is_test_call ? 'de test ' : ''}inițiat către ${contact_name || phone_number}`
    
    if (elevenLabsData) {
      const message = elevenLabsData.message || ''
      const success = elevenLabsData.success
      
      if (success === false) {
        callStatus = is_test_call ? 'test_failed' : 'failed'
        callSummary = `Apel ${is_test_call ? 'de test ' : ''}eșuat către ${contact_name || phone_number}: ${message}`
      } else if (success === true) {
        if (message.includes('initiated')) {
          callStatus = is_test_call ? 'test' : 'initiated'
          callSummary = `Apel ${is_test_call ? 'de test ' : ''}inițiat către ${contact_name || phone_number}`
        } else {
          callStatus = is_test_call ? 'test' : 'success'
          callSummary = `Apel ${is_test_call ? 'de test ' : ''}reușit către ${contact_name || phone_number}`
        }
      }
      
      // Check for specific SIP error patterns
      if (message.includes('TEMPORARILY_UNAVAILABLE') || message.includes('480')) {
        callStatus = is_test_call ? 'test_busy' : 'busy'
        callSummary = `Apel ${is_test_call ? 'de test ' : ''}ocupat către ${contact_name || phone_number}: temporar indisponibil`
      } else if (message.includes('FORBIDDEN') || message.includes('403')) {
        callStatus = is_test_call ? 'test_failed' : 'failed'
        callSummary = `Apel ${is_test_call ? 'de test ' : ''}interzis către ${contact_name || phone_number}: acces refuzat`
      } else if (message.includes('NOT_FOUND') || message.includes('404')) {
        callStatus = is_test_call ? 'test_failed' : 'failed'
        callSummary = `Apel ${is_test_call ? 'de test ' : ''}eșuat către ${contact_name || phone_number}: număr negăsit`
      }
    }

    // Store call initiation in database
    const callHistoryData = {
      user_id: user_id,
      phone_number: phone_number,
      caller_number: callerNumber, // Add the caller number
      contact_name: contact_name || phone_number,
      call_status: callStatus,
      summary: callSummary,
      agent_id: agent_id,
      conversation_id: elevenLabsData?.conversation_id || null,
      elevenlabs_history_id: elevenLabsData?.conversation_id || null,
      dialog_json: JSON.stringify({
        request: requestBody,
        response: elevenLabsData,
        initiated_at: new Date().toISOString(),
        batch_processing: batch_processing || false,
        is_test_call: is_test_call || false,
        caller_phone_details: { elevenlabs_phone_id: agentPhoneId, phone_number: callerNumber }
      }),
      call_date: new Date().toISOString(),
      cost_usd: 0, // Will be updated when call completes
      duration_seconds: 0, // Will be updated when call completes
      language: 'ro'
    }

    const { data: insertData, error: insertError } = await supabase
      .from('call_history')
      .insert(callHistoryData)
      .select()

    if (insertError) {
      console.error('Error inserting call history:', insertError)
      // Continue even if database insert fails
    } else {
      console.log('Call history inserted:', insertData)
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: elevenLabsData?.conversation_id,
        callHistoryId: insertData?.[0]?.id,
        agent_id: agent_id,
        user_id: user_id,
        phone_number: phone_number,
        elevenlabs_data: elevenLabsData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('💥 Eroare critică în inițierea apelului:', error)
    console.error('🔍 Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Eroare necunoscută în inițierea apelului',
        details: error.stack || 'Nu sunt disponibile detalii suplimentare',
        success: false,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
