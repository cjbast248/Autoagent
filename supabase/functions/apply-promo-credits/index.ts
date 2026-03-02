import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with user JWT for auth verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { promo_code, promo_credits } = await req.json();

    console.log(`🎁 Applying promo code "${promo_code}" for user ${user.id}`);

    // Verify promo code is "summit"
    if (promo_code !== 'summit') {
      return new Response(
        JSON.stringify({ error: 'Invalid promo code' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Parse promo credits (default to 100000)
    const creditsToAdd = parseInt(promo_credits || '100000', 10);

    // Check if user already has a balance record
    const { data: existingBalance, error: balanceError } = await supabaseAdmin
      .from('user_balance')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      console.error('Error checking balance:', balanceError);
      throw balanceError;
    }

    if (existingBalance) {
      // Update existing balance to add promo credits
      const newMonthlyFreeCredits = (existingBalance.monthly_free_credits || 10000) + creditsToAdd;

      const { error: updateError } = await supabaseAdmin
        .from('user_balance')
        .update({
          monthly_free_credits: newMonthlyFreeCredits,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        throw updateError;
      }

      console.log(`✅ Added ${creditsToAdd} credits to user ${user.id}. New total: ${newMonthlyFreeCredits}`);
    } else {
      // Create new balance record with promo credits
      const { error: insertError } = await supabaseAdmin
        .from('user_balance')
        .insert({
          user_id: user.id,
          balance_usd: 0,
          monthly_free_credits: 10000 + creditsToAdd, // Base 10k + promo
          monthly_credits_used: 0,
          month_start_date: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating balance:', insertError);
        throw insertError;
      }

      console.log(`✅ Created balance with ${10000 + creditsToAdd} credits for user ${user.id}`);
    }

    // Log the promo application (optional - for analytics)
    try {
      await supabaseAdmin.from('promo_usage').insert({
        user_id: user.id,
        promo_code: promo_code,
        credits_granted: creditsToAdd,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      // Non-critical - just log it
      console.warn('Could not log promo usage:', logError);
    }

    // Send Telegram notification for Summit promo
    if (promo_code === 'summit') {
      try {
        // Get user profile for name
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        const firstName = profile?.first_name || '';
        const lastName = profile?.last_name || '';
        const email = profile?.email || user.email || 'N/A';

        // Send Telegram notification
        const telegramMessage = `🎁 *SUMMIT PROMO APLICAT!*

👤 *Utilizator:* ${firstName} ${lastName}
📧 *Email:* ${email}
💰 *Credite acordate:* ${creditsToAdd.toLocaleString()}
🎯 *Promo code:* ${promo_code}
⏰ *Data:* ${new Date().toLocaleString('ro-RO')}`;

        const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: telegramMessage,
              parse_mode: 'Markdown'
            })
          });
          console.log('✅ Telegram notification sent for Summit promo');
        }
      } catch (telegramError) {
        // Non-critical - don't fail the request
        console.warn('Could not send Telegram notification:', telegramError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits_granted: creditsToAdd,
        message: `Successfully applied ${creditsToAdd} promo credits!`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in apply-promo-credits:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
