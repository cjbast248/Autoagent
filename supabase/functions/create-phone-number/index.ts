// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Configure Asterisk endpoint via our Asterisk Config API
async function configureAsterisk(asteriskConfig: {
  asterisk_trunk_type: string;
  asterisk_pbx_domain: string;
  asterisk_username: string;
  asterisk_password: string;
  asterisk_config_id: string;
  asterisk_contact_user: string;
}, phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  const asteriskApiUrl = Deno.env.get('ASTERISK_API_URL');
  const asteriskApiKey = Deno.env.get('ASTERISK_API_KEY');

  if (!asteriskApiUrl || !asteriskApiKey) {
    console.log('[Asterisk] API not configured, skipping Asterisk configuration');
    return { success: false, error: 'Asterisk API not configured' };
  }

  try {
    console.log('[Asterisk] Configuring phone number:', phoneNumber);

    const response = await fetch(`${asteriskApiUrl}/api/phone-numbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': asteriskApiKey,
      },
      body: JSON.stringify({
        id: asteriskConfig.asterisk_config_id,
        trunk_type: asteriskConfig.asterisk_trunk_type,
        pbx_domain: asteriskConfig.asterisk_pbx_domain,
        username: asteriskConfig.asterisk_username,
        password: asteriskConfig.asterisk_password,
        phone_number: phoneNumber,
        contact_user: asteriskConfig.asterisk_contact_user,
      }),
    });

    const result = await response.json();
    console.log('[Asterisk] Response:', { status: response.status, result });

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to configure Asterisk' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Asterisk] Configuration error:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const requestData = await req.json()

    // Extract asterisk config if present
    const asteriskConfig = requestData.asterisk_config;
    delete requestData.asterisk_config;

    const sipData = requestData;
    console.log('Creating phone number with data:', sipData)
    console.log('Asterisk config:', asteriskConfig ? 'provided' : 'not provided')

    // Get ElevenLabs API key from environment
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key is not configured')
    }

    // Validate SIP data before sending to ElevenLabs
    if (!sipData.phone_number || !sipData.label) {
      throw new Error('Phone number and label are required')
    }

    // Ensure outbound configuration is complete for SIP trunks
    if (!sipData.outbound_trunk_config?.address || !sipData.outbound_trunk_config?.credentials?.username) {
      throw new Error('Outbound SIP configuration (address and username) is required')
    }

    // Clean inbound trunk config - keep only fields ElevenLabs expects
    if (sipData.inbound_trunk_config) {
      sipData.inbound_trunk_config = {
        ...(sipData.inbound_trunk_config.media_encryption && {
          media_encryption: sipData.inbound_trunk_config.media_encryption,
        }),
        ...(sipData.inbound_trunk_config.allowed_addresses && {
          allowed_addresses: sipData.inbound_trunk_config.allowed_addresses,
        }),
        ...(sipData.inbound_trunk_config.credentials && {
          credentials: sipData.inbound_trunk_config.credentials,
        }),
      };
      console.log('Inbound trunk config:', JSON.stringify(sipData.inbound_trunk_config));
    }

    console.log('Processed SIP data:', JSON.stringify(sipData, null, 2))

    // Call ElevenLabs API to create phone number
    const response = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify(sipData)
    })

    const result = await response.json()
    console.log('ElevenLabs response:', { status: response.status, result })

    if (!response.ok) {
      console.error('ElevenLabs API error:', result)
      const errorMessage = result.detail?.message || result.message || 'Failed to create phone number in ElevenLabs'

      // Provide more specific error messages for common issues
      if (errorMessage.includes('inbound trunk')) {
        throw new Error('Configurația SIP inbound nu este validă. Verifică adresele permise și credențialele.')
      } else if (errorMessage.includes('outbound trunk')) {
        throw new Error('Configurația SIP outbound nu este validă. Verifică adresa serverului și credențialele.')
      } else if (errorMessage.includes('phone_number')) {
        throw new Error('Numărul de telefon nu este valid sau este deja în folosință.')
      }

      throw new Error(errorMessage)
    }

    // Configure Asterisk if asterisk_config was provided
    let asteriskConfigured = false;
    let asteriskError: string | undefined;

    if (asteriskConfig && asteriskConfig.asterisk_trunk_type) {
      console.log('[Asterisk] Attempting to configure Asterisk endpoint...');
      const asteriskResult = await configureAsterisk(asteriskConfig, sipData.phone_number);
      asteriskConfigured = asteriskResult.success;
      asteriskError = asteriskResult.error;

      if (!asteriskConfigured) {
        console.warn('[Asterisk] Configuration failed (non-blocking):', asteriskError);
        // Note: We don't throw here - ElevenLabs succeeded, Asterisk is optional
      } else {
        console.log('[Asterisk] Configuration successful!');
      }
    }

    return new Response(
      JSON.stringify({
        ...result,
        asterisk_configured: asteriskConfigured,
        asterisk_error: asteriskError,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error creating phone number:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while creating the phone number',
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})