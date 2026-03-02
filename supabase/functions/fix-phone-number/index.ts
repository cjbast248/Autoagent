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

    const { phoneId, phoneNumber } = await req.json()
    
    if (!phoneId || !phoneNumber) {
      throw new Error('Phone ID and Phone Number are required')
    }

    console.log('🔧 Fixing phone number:', { phoneId, phoneNumber })

    // Update phone number in database
    const { data, error } = await supabase
      .from('phone_numbers')
      .update({ 
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', phoneId)
      .select()

    if (error) {
      console.error('❌ Failed to update phone number:', error)
      throw new Error(`Failed to update phone number: ${error.message}`)
    }

    console.log('✅ Phone number updated successfully:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Phone number updated successfully',
        data 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('💥 Error in fix-phone-number function:', error)
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
