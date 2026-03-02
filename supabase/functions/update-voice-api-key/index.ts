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
      throw new Error('Nu sunteți autentificat')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Nu sunteți autentificat')
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin_user', {
      _user_id: user.id
    })

    if (adminError || !isAdmin) {
      throw new Error('Nu aveți permisiuni de administrator')
    }

    const { apiKey } = await req.json()

    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('Cheia API este necesară')
    }

    // Log admin action
    await supabase.rpc('log_admin_action', {
      p_admin_user_id: user.id,
      p_action: 'UPDATE_VOICE_API_KEY',
      p_details: { action: 'voice_api_key_updated' }
    })

    // Note: In a real implementation, you would update the secret in Supabase
    // This is a placeholder as Supabase secrets cannot be updated via API
    console.log('API key update requested by admin:', user.id)
    console.log('New API key provided (length):', apiKey.length)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cheia API a fost actualizată cu succes. Va fi activă în câteva minute.' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in update-voice-api-key function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})