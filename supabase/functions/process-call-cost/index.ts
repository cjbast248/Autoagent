import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse webhook payload from ElevenLabs
    const payload = await req.json();
    
    console.log('📞 Received call cost webhook:', JSON.stringify(payload, null, 2));

    // Extract relevant data - ElevenLabs sends different formats
    const conversation_id = payload.conversation_id || payload.data?.conversation_id;
    const cost_usd = payload.cost_usd || payload.data?.cost_usd || payload.analysis?.cost || 0;
    const duration_seconds = payload.duration_seconds || payload.data?.duration_seconds || payload.metadata?.call_duration_secs || 0;
    
    // Get user_id from the call_history or call_sessions
    let user_id = payload.user_id || payload.data?.user_id;

    if (!conversation_id) {
      console.log('⚠️ No conversation_id in payload, skipping');
      return new Response(
        JSON.stringify({ success: false, message: 'No conversation_id provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📞 Processing call:', { conversation_id, cost_usd, duration_seconds, user_id });

    // If user_id not in payload, find it from call_history or call_sessions
    if (!user_id) {
      // Try call_history first
      const { data: callData } = await supabaseClient
        .from('call_history')
        .select('user_id, cost_processed')
        .eq('conversation_id', conversation_id)
        .maybeSingle();

      if (callData) {
        user_id = callData.user_id;
        
        // Check if already processed
        if (callData.cost_processed) {
          console.log('⏭️ Cost already processed for this call, skipping');
          return new Response(
            JSON.stringify({ success: true, message: 'Already processed', skipped: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Try call_sessions
        const { data: sessionData } = await supabaseClient
          .from('call_sessions')
          .select('agent_owner_user_id')
          .eq('session_id', conversation_id)
          .maybeSingle();

        if (sessionData) {
          user_id = sessionData.agent_owner_user_id;
        }
      }
    }

    if (!user_id) {
      console.log('⚠️ Could not find user_id for conversation:', conversation_id);
      return new Response(
        JSON.stringify({ success: false, message: 'User not found for this conversation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip if cost is 0
    if (!cost_usd || cost_usd <= 0) {
      console.log('⏭️ Cost is 0 or negative, skipping deduction');
      
      // Still update call_history to mark as processed
      await supabaseClient
        .from('call_history')
        .update({
          cost_processed: true,
          duration_seconds: duration_seconds || 0,
        })
        .eq('conversation_id', conversation_id);

      return new Response(
        JSON.stringify({ success: true, message: 'No cost to deduct', cost_usd: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💰 Attempting to deduct balance:', { user_id, cost_usd, conversation_id });

    // Use the atomic transaction function that already exists in the database
    // This function handles:
    // 1. Idempotency check (won't double-charge same conversation_id)
    // 2. Balance deduction with row-level locking
    // 3. Statistics update
    // 4. Transaction logging
    const { data: transactionResult, error: transactionError } = await supabaseClient
      .rpc('execute_atomic_call_transaction', {
        p_user_id: user_id,
        p_amount: cost_usd,
        p_duration_seconds: duration_seconds || 0,
        p_description: `Call cost: ${conversation_id}`,
        p_conversation_id: conversation_id,
      });

    if (transactionError) {
      console.error('❌ Atomic transaction failed:', transactionError);
      
      // Check if it's an idempotency skip (already processed)
      if (transactionError.message?.includes('Duplicate')) {
        return new Response(
          JSON.stringify({ success: true, message: 'Already processed (idempotency check)' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw transactionError;
    }

    console.log('✅ Atomic transaction result:', transactionResult);

    // Update call_history with cost info and mark as processed
    const { error: updateError } = await supabaseClient
      .from('call_history')
      .update({
        cost_usd: cost_usd,
        cost_processed: true,
        duration_seconds: duration_seconds || 0,
      })
      .eq('conversation_id', conversation_id);

    if (updateError) {
      console.error('⚠️ Failed to update call_history:', updateError);
      // Don't fail the request, the balance was already deducted
    }

    // Get the new balance for response
    const { data: balanceData } = await supabaseClient
      .from('user_balance')
      .select('balance_usd')
      .eq('user_id', user_id)
      .single();

    console.log('✅ Cost processed successfully:', {
      conversation_id,
      cost_usd,
      duration_seconds,
      new_balance: balanceData?.balance_usd,
    });

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id,
        cost_deducted: cost_usd,
        duration_seconds,
        new_balance: balanceData?.balance_usd,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Error processing call cost:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
