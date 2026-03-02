// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📱 Starting to send all user registrations to Telegram');

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('❌ Missing Telegram credentials');
      throw new Error("Telegram credentials not configured");
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all users with extended information
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id, 
        email, 
        first_name, 
        last_name, 
        created_at,
        account_type,
        plan
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching profiles:', error);
      throw error;
    }

    // Get statistics for all users
    const { data: statistics } = await supabase
      .from('user_statistics')
      .select('user_id, total_voice_calls, total_minutes_talked, total_spent_usd');

    const { data: balances } = await supabase
      .from('user_balance')
      .select('user_id, balance_usd');

    // Create lookup maps for quick access
    const statsMap = new Map(statistics?.map(s => [s.user_id, s]) || []);
    const balanceMap = new Map(balances?.map(b => [b.user_id, b]) || []);

    console.log(`📊 Found ${profiles?.length || 0} users to process`);

    let successCount = 0;
    let failCount = 0;

    // Send Telegram message for each user
    for (const profile of profiles || []) {
      try {
        const userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown';
        const createdDate = new Date(profile.created_at).toLocaleString('ro-RO', { 
          timeZone: 'Europe/Bucharest',
          dateStyle: 'short',
          timeStyle: 'short'
        });

        // Get user statistics
        const stats = statsMap.get(profile.id);
        const balance = balanceMap.get(profile.id);

        // Build detailed message
        let message = `👤 *Utilizator Înregistrat*\n\n`;
        message += `📧 *Email:* ${profile.email}\n`;
        message += `👤 *Nume:* ${userName}\n`;
        message += `🆔 *ID:* \`${profile.id}\`\n`;
        message += `📅 *Înregistrat:* ${createdDate}\n\n`;

        // Account info
        message += `💼 *Cont*\n`;
        message += `├ Tip: ${profile.account_type || 'regular'}\n`;
        message += `├ Plan: ${profile.plan || 'starter'}\n`;
        message += `└ Sold: $${balance?.balance_usd?.toFixed(2) || '0.00'}\n\n`;

        // Usage statistics
        if (stats) {
          message += `📊 *Statistici*\n`;
          message += `├ Apeluri: ${stats.total_voice_calls || 0}\n`;
          message += `├ Minute: ${stats.total_minutes_talked?.toFixed(0) || 0}\n`;
          message += `└ Cheltuit: $${stats.total_spent_usd?.toFixed(2) || '0.00'}`;
        } else {
          message += `📊 *Statistici:* Fără activitate`;
        }

        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const telegramResponse = await fetch(telegramUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
          }),
        });

        if (telegramResponse.ok) {
          successCount++;
          console.log(`✅ Sent notification for user: ${profile.email}`);
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          failCount++;
          const errorData = await telegramResponse.json();
          console.error(`❌ Failed to send for ${profile.email}:`, errorData);
        }
      } catch (userError) {
        failCount++;
        console.error(`❌ Error processing user ${profile.email}:`, userError);
      }
    }

    console.log(`✅ Completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalUsers: profiles?.length || 0,
        successCount,
        failCount,
        message: `Sent ${successCount} notifications to Telegram` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('❌ Error in telegram-send-all-users:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
