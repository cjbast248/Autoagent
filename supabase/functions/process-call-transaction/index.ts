// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface TransactionRequest {
  p_user_id: string;
  p_amount: number;
  p_duration_seconds: number;
  p_description: string;
  p_conversation_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { p_user_id, p_amount, p_duration_seconds, p_description, p_conversation_id }: TransactionRequest = await req.json();

    console.log(`💰 ATOMIC TRANSACTION START for user ${p_user_id}: $${p_amount}`);

    // Execute atomic transaction using PostgreSQL transaction
    const { data: result, error } = await supabase.rpc('execute_atomic_call_transaction', {
      p_user_id,
      p_amount,
      p_duration_seconds,
      p_description,
      p_conversation_id
    });

    if (error) {
      console.error('❌ Atomic transaction failed:', error);
      throw error;
    }

    console.log('✅ ATOMIC TRANSACTION COMPLETED');

    return new Response(JSON.stringify({
      success: true,
      result: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in atomic transaction:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});