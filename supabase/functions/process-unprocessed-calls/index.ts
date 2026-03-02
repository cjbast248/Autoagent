// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  console.log('🔄 Process Unprocessed Calls - Starting batch processing...');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find all unprocessed calls with cost > 0
    const { data: unprocessedCalls, error: fetchError } = await supabase
      .from('call_history')
      .select('id, user_id, cost_usd, duration_seconds, agent_id, conversation_id, contact_name, call_date')
      .eq('cost_processed', false)
      .gt('cost_usd', 0)
      .order('call_date', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching unprocessed calls:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${unprocessedCalls?.length || 0} unprocessed calls`);

    if (!unprocessedCalls || unprocessedCalls.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No unprocessed calls found',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = {
      processed: 0,
      failed: 0,
      skipped: 0,
      total_deducted: 0,
      details: [] as any[]
    };

    for (const call of unprocessedCalls) {
      const creditsUsed = Math.round((call.cost_usd || 0) * 100);
      console.log(`\n💳 Processing call ${call.id}:`);
      console.log(`   User: ${call.user_id}`);
      console.log(`   Credite: ${creditsUsed}`);
      console.log(`   Duration: ${call.duration_seconds}s`);
      console.log(`   Conversation: ${call.conversation_id}`);

      try {
        // Check if already processed via balance_transactions
        const { data: existingTransaction } = await supabase
          .from('balance_transactions')
          .select('id')
          .eq('user_id', call.user_id)
          .eq('conversation_id', call.conversation_id)
          .maybeSingle();

        if (existingTransaction) {
          console.log(`   ⏭️ Already has transaction, marking as processed`);
          
          // Just mark as processed
          await supabase
            .from('call_history')
            .update({ cost_processed: true })
            .eq('id', call.id);
          
          results.skipped++;
          results.details.push({
            call_id: call.id,
            status: 'skipped',
            reason: 'Already has transaction'
          });
          continue;
        }

        // Use atomic transaction to deduct balance
        const { data: transactionResult, error: transactionError } = await supabase.rpc('execute_atomic_call_transaction', {
          p_user_id: call.user_id,
          p_amount: call.cost_usd,
          p_duration_seconds: call.duration_seconds || 0,
          p_description: `Batch processing: ${call.contact_name || 'Call'} - ${creditsUsed} credite`,
          p_conversation_id: call.conversation_id
        });

        if (transactionError) {
          console.error(`   ❌ Transaction error:`, transactionError);
          
          results.failed++;
          results.details.push({
            call_id: call.id,
            status: 'failed',
            error: transactionError.message
          });
          continue;
        }

        // Mark as processed
        await supabase
          .from('call_history')
          .update({ cost_processed: true })
          .eq('id', call.id);

        console.log(`   ✅ Successfully deducted ${creditsUsed} credite`);
        
        results.processed++;
        results.total_deducted += call.cost_usd;
        results.details.push({
          call_id: call.id,
          status: 'success',
          amount_deducted: call.cost_usd
        });

      } catch (error) {
        console.error(`   ❌ Error processing call ${call.id}:`, error);
        
        results.failed++;
        results.details.push({
          call_id: call.id,
          status: 'error',
          error: error.message
        });
      }
    }

    const totalCreditsDeducted = Math.round(results.total_deducted * 100);
    console.log('\n📊 BATCH PROCESSING COMPLETE:');
    console.log(`   ✅ Processed: ${results.processed}`);
    console.log(`   ⏭️ Skipped: ${results.skipped}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   💰 Total deducted: ${totalCreditsDeducted} credite`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Batch processing complete',
      ...results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in batch processing:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
