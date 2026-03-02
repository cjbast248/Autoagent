// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phoneId } = await req.json()
    
    if (!phoneId) {
      throw new Error('Phone ID is required')
    }

    console.log('🔄 Re-syncing phone number:', phoneId)

    // Get phone number configuration from database
    const { data: phoneData, error: fetchError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('id', phoneId)
      .single()

    if (fetchError || !phoneData) {
      console.error('❌ Failed to fetch phone data:', fetchError)
      throw new Error('Phone number not found')
    }

    console.log('📞 Phone data retrieved:', {
      phone_number: phoneData.phone_number,
      label: phoneData.label,
      elevenlabs_phone_id: phoneData.elevenlabs_phone_id
    })

    // Get ElevenLabs API key
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured')
    }

    // First, fetch current phone configuration from ElevenLabs to get the actual phone number
    const getResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/phone-numbers/${encodeURIComponent(phoneData.elevenlabs_phone_id)}`,
      {
        method: 'GET',
        headers: {
          'Xi-Api-Key': elevenLabsApiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!getResponse.ok) {
      const errorData = await getResponse.text()
      console.error('❌ Failed to fetch from ElevenLabs:', getResponse.status, errorData)
      throw new Error(`Failed to fetch phone from ElevenLabs: ${getResponse.status}`)
    }

    const elevenLabsPhone = await getResponse.json()
    console.log('📥 Retrieved from ElevenLabs:', elevenLabsPhone)

    // Update phone_number in database if it's missing or different
    const actualPhoneNumber = elevenLabsPhone.phone_number
    if (actualPhoneNumber && actualPhoneNumber !== phoneData.phone_number) {
      console.log('🔧 Updating phone_number in database:', actualPhoneNumber)
      
      const { error: updatePhoneError } = await supabase
        .from('phone_numbers')
        .update({ phone_number: actualPhoneNumber })
        .eq('id', phoneId)

      if (updatePhoneError) {
        console.error('⚠️ Failed to update phone_number:', updatePhoneError)
      } else {
        console.log('✅ Phone number field updated successfully')
        // Update local phoneData with the new number
        phoneData.phone_number = actualPhoneNumber
      }
    }

    // Prepare update payload with SIP trunk configuration
    const updatePayload = {
      phone_number: phoneData.phone_number || actualPhoneNumber,
      label: phoneData.label,
      provider: 'sip_trunk',
      outbound_trunk_config: {
        address: phoneData.outbound_address,
        transport: phoneData.transport_type || 'tcp',
        credentials: {
          username: phoneData.outbound_username,
          password: phoneData.outbound_password
        },
        media_encryption: 'allowed'
      }
    }

    // Add inbound config if present
    if (phoneData.inbound_address) {
      updatePayload.inbound_trunk_config = {
        address: phoneData.inbound_address,
        transport: phoneData.transport_type || 'tcp',
        credentials: {
          username: phoneData.inbound_username,
          password: phoneData.inbound_password
        }
      }
    }

    // Add custom headers if present
    if (phoneData.custom_headers && Object.keys(phoneData.custom_headers).length > 0) {
      if (updatePayload.outbound_trunk_config) {
        updatePayload.outbound_trunk_config.headers = phoneData.custom_headers
      }
      if (updatePayload.inbound_trunk_config) {
        updatePayload.inbound_trunk_config.headers = phoneData.custom_headers
      }
    }

    console.log('📤 Sending update to ElevenLabs:', JSON.stringify(updatePayload, null, 2))

    // Update phone number in ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/phone-numbers/${encodeURIComponent(phoneData.elevenlabs_phone_id)}`,
      {
        method: 'PATCH',
        headers: {
          'Xi-Api-Key': elevenLabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ ElevenLabs API error:', response.status, errorData)
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    console.log('✅ Phone number synced successfully:', data)

    // Update sync timestamp in database
    const { error: updateError } = await supabase
      .from('phone_numbers')
      .update({ 
        updated_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', phoneId)

    if (updateError) {
      console.error('⚠️ Failed to update sync timestamp:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Phone number synced successfully',
        data 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('💥 Error in update-elevenlabs-phone function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
