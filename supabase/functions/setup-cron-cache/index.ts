// @ts-nocheck
// Setup cron job for automatic conversation caching
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create the cron job to run every 10 minutes
    const cronQuery = `
      SELECT cron.schedule(
        'cache-conversations-every-10min',
        '*/10 * * * *',
        $$
        SELECT
          net.http_post(
            url:='${SUPABASE_URL}/functions/v1/cache-elevenlabs-conversations',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${SUPABASE_SERVICE_ROLE_KEY}"}'::jsonb,
            body:='{}'::jsonb
          ) as request_id;
        $$
      );
    `;

    // Execute the cron setup
    const { data, error } = await supabase.rpc('exec_sql', { query: cronQuery });

    if (error) {
      console.error('Error setting up cron job:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Cron job configured successfully',
      schedule: 'Every 10 minutes',
      endpoint: '/functions/v1/cache-elevenlabs-conversations'
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Setup error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
});