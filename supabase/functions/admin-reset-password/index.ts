// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ResetPasswordRequest {
  target_user_id: string;
  target_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const appUrl = Deno.env.get('APP_URL') || 'https://app.agentauto.app';
    
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization header to verify the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create a client with anon key for user verification
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Verify the user from the auth header
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin status
    const { data: isAdmin, error: adminError } = await supabaseAnon.rpc('is_admin_user', {
      _user_id: user.id
    });

    if (adminError || !isAdmin) {
      throw new Error('Access denied: Admin role required');
    }

    const { target_user_id, target_email }: ResetPasswordRequest = await req.json();

    console.log('Admin password reset request:', {
      admin_user_id: user.id,
      target_user_id,
      target_email
    });

    // Log the admin action
    await supabaseAnon.rpc('log_admin_action', {
      p_admin_user_id: user.id,
      p_action: 'RESET_USER_PASSWORD',
      p_target_user_id: target_user_id,
      p_details: { target_email }
    });

    // Send password reset email using Supabase Admin client
    // Use APP_URL from secrets for correct redirect
    const redirectUrl = `${appUrl}/reset-password`;
    console.log('Using redirect URL:', redirectUrl);
    
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: target_email,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (resetError) {
      console.error('Password reset error:', resetError);
      throw new Error(`Failed to send reset email: ${resetError.message}`);
    }

    console.log('Password reset email sent successfully to:', target_email);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password reset email sent successfully' 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in admin-reset-password function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        status: error.message === 'Unauthorized' || error.message.includes('Access denied') ? 403 : 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
