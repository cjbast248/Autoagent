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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get auth user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Rate limiting check - max 5 test calls per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    console.log(`Checking test calls since ${oneHourAgo} for user ${user.id}`)
    
    const { data: recentCalls, error: callError } = await supabase
      .from('call_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('call_status', 'test')
      .gte('created_at', oneHourAgo)

    if (callError) {
      console.error('Error checking recent calls:', callError)
    }

    console.log(`Found ${recentCalls?.length || 0} recent test calls`)

    if (recentCalls && recentCalls.length >= 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Maximum 5 test calls per hour.' 
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Get test phone configuration from secrets
    const testPhoneNumber = Deno.env.get('TEST_PHONE_NUMBER') || '+373793150402'
    const testPhoneId = Deno.env.get('TEST_PHONE_ID') || 'phnum_1401k5rs9xrqfdcbf559kt1pe98d'

    // Log the access for security monitoring
    console.log(`Test phone config requested by user: ${user.id} at ${new Date().toISOString()}`)
    console.log(`Returning config: phoneId=${testPhoneId}, phoneNumber=${testPhoneNumber}, remainingCalls=${Math.max(0, 5 - (recentCalls?.length || 0))}`)

    return new Response(
      JSON.stringify({
        testPhoneNumber,
        testPhoneId,
        remainingCalls: Math.max(0, 5 - (recentCalls?.length || 0))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in get-test-phone-config function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})