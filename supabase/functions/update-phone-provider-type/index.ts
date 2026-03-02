// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phone_id, provider_type } = await req.json()

    if (!phone_id || !provider_type) {
      throw new Error('phone_id and provider_type are required')
    }

    if (!['sip', 'twilio'].includes(provider_type)) {
      throw new Error('provider_type must be either "sip" or "twilio"')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get auth header to verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    console.log(`🔄 Updating phone ${phone_id} to provider_type: ${provider_type} for user ${user.id}`)

    // Update the phone number's provider_type
    const { data, error } = await supabase
      .from('phone_numbers')
      .update({ provider_type })
      .eq('id', phone_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating provider_type:', error)
      throw error
    }

    console.log('✅ Successfully updated provider_type:', data)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Provider type updated to ${provider_type}`,
        phone: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('💥 Error in update-phone-provider-type:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
