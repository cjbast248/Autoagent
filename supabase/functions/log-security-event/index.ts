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
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify JWT token to get authenticated user (prevents impersonation)
    const authHeader = req.headers.get('Authorization')
    let authenticatedUserId: string | null = null

    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
      if (!authError && user) {
        authenticatedUserId = user.id
      }
    }

    // Get request body
    const { user_id, event_type, severity, details, ip_address } = await req.json()

    // Security: Use authenticated user ID if available, otherwise fall back to provided user_id
    // This prevents impersonation attacks when user is authenticated
    const effectiveUserId = authenticatedUserId || user_id

    if (authenticatedUserId && user_id && authenticatedUserId !== user_id) {
      console.warn(`Security: User ID mismatch prevented - auth=${authenticatedUserId}, request=${user_id}`)
    }

    // Validate required fields
    if (!effectiveUserId || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, event_type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Get client IP address
    const clientIP = req.headers.get('x-forwarded-for') ||
                     req.headers.get('x-real-ip') ||
                     ip_address

    // Log the security event using the existing function
    const { error } = await supabase.rpc('log_security_event', {
      p_user_id: effectiveUserId,
      p_event_type: event_type,
      p_severity: severity || 'medium',
      p_details: details ? JSON.stringify(details) : null,
      p_ip_address: clientIP
    })

    if (error) {
      console.error('Error logging security event:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to log security event' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log(`Security event logged: ${event_type} for user ${user_id} (severity: ${severity})`)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in log-security-event function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})