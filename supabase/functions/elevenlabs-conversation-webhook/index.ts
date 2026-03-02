// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-elevenlabs-signature, elevenlabs-signature',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ElevenLabsWebhookPayload {
  conversation_id: string;
  agent_id: string;
  status: 'started' | 'completed' | 'failed';
  phone_number?: string;
  duration_seconds?: number;
  cost_usd?: number;
  transcript?: any[];
  metadata?: any;
  // Inbound call specific fields
  phone_call?: {
    direction?: 'inbound' | 'outbound';
    from_number?: string;
    to_number?: string;
  };
}

// Global debounce map to prevent duplicate processing
const processingMap = new Map<string, Promise<any>>();

// Verify ElevenLabs webhook signature
async function verifyWebhookSignature(req: Request, body: string): Promise<boolean> {
  const webhookSecret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    console.warn('⚠️ ELEVENLABS_WEBHOOK_SECRET not configured - skipping signature verification');
    return true; // Allow if no secret configured
  }

  // Try different header names ElevenLabs might use
  const signature = req.headers.get('x-elevenlabs-signature') || 
                    req.headers.get('elevenlabs-signature') ||
                    req.headers.get('x-webhook-signature');

  if (!signature) {
    console.warn('⚠️ No signature header found in request');
    // Log all headers for debugging
    console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()));
    return true; // Allow for now while testing
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const hmac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(hmac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const isValid = signature === expectedSignature || 
                    signature === `sha256=${expectedSignature}`;
    
    if (isValid) {
      console.log('✅ Webhook signature verified successfully');
    } else {
      console.error('❌ Invalid webhook signature!');
      console.log('Expected:', expectedSignature);
      console.log('Received:', signature);
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  console.log('ElevenLabs conversation webhook called:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read body as text first for signature verification
    const bodyText = await req.text();
    
    // Verify webhook signature
    const isSignatureValid = await verifyWebhookSignature(req, bodyText);
    if (!isSignatureValid) {
      console.error('❌ Webhook signature verification failed!');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: ElevenLabsWebhookPayload = JSON.parse(bodyText);
    console.log('🎯 WEBHOOK PAYLOAD - Agent în conversația activă:', payload.agent_id);
    console.log('📞 WEBHOOK PAYLOAD - Conversation ID:', payload.conversation_id);
    console.log('🔍 WEBHOOK PAYLOAD - Complet:', payload);

    if (!payload.conversation_id || !payload.agent_id) {
      throw new Error('Missing required fields: conversation_id, agent_id');
    }

    // DATABASE CHECK: Prevent duplicate processing if conversation already exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('call_history')
      .select('id, cost_usd, created_at')
      .eq('conversation_id', payload.conversation_id)
      .maybeSingle();
    
    if (existingRecord) {
      console.log('🚫 DUPLICATE PREVENTION: Conversation already processed in database');
      console.log('📋 Existing record:', existingRecord);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Conversation already processed',
          existing_record_id: existingRecord.id
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // DEBOUNCING: Prevent duplicate processing of the same conversation
    const conversationKey = `${payload.conversation_id}-${payload.status}`;
    
    if (processingMap.has(conversationKey)) {
      console.log('⏳ DEBOUNCING: Conversation already being processed, waiting for completion...');
      try {
        const existingResult = await processingMap.get(conversationKey);
        return new Response(JSON.stringify({
          success: true,
          message: 'Conversation already processed (debounced)',
          result: existingResult
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.warn('⚠️ Error in debounced processing, continuing with new attempt');
        processingMap.delete(conversationKey);
      }
    }

    // Create processing promise
    const processingPromise = processConversation(supabase, payload);
    processingMap.set(conversationKey, processingPromise);
    
    try {
      const result = await processingPromise;
      return result;
    } finally {
      // Clean up after processing
      processingMap.delete(conversationKey);
    }

  } catch (error) {
    console.error('Error in ElevenLabs conversation webhook:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processConversation(supabase: any, payload: ElevenLabsWebhookPayload) {
  try {
    // Find the agent owner based on elevenlabs_agent_id
    console.log('🔍 Caut agentul în baza de date cu elevenlabs_agent_id:', payload.agent_id);
      
    const { data: agentData, error: agentError } = await supabase
      .from('kalina_agents')
      .select('user_id, name, agent_id')
      .eq('elevenlabs_agent_id', payload.agent_id)
      .single();

    let userId: string | null = null;
    let agentName = 'Agent necunoscut';

    if (agentData && !agentError) {
      userId = agentData.user_id;
      agentName = agentData.name;
      console.log(`✅ AGENT GĂSIT în kalina_agents - Proprietar: ${userId}, Nume: ${agentName}`);
    } else {
      console.warn('⚠️ Agent nu găsit în kalina_agents, caut în phone_numbers după connected_agent...');
      
      // Fallback: Try to find user via phone_numbers table (for shared numbers or inbound calls)
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('user_id, owner_user_id, label')
        .eq('connected_agent_id', payload.agent_id)
        .maybeSingle();
      
      if (phoneData) {
        userId = phoneData.owner_user_id || phoneData.user_id;
        agentName = `Agent pe ${phoneData.label}`;
        console.log(`✅ USER GĂSIT prin phone_numbers - Proprietar: ${userId}`);
      }
    }

    if (!userId) {
      console.error('❌ AGENT NU GĂSIT - Nu pot găsi proprietarul pentru agent:', payload.agent_id);
      console.error('❌ ACEST AGENT NU EXISTĂ ÎN SISTEMUL NOSTRU');
      
      return new Response(JSON.stringify({
        success: false,
        error: `Agent ${payload.agent_id} not found in system. Cannot process callback.`,
        message: 'Agent not registered in our system'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🎯 AGENT ACTIV - ID: ${payload.agent_id}`);
    console.log(`📝 AGENT ACTIV - Nume: ${agentName}`);
    console.log(`🔄 Procesez conversația pentru proprietarul corect al agentului...`);
    console.log(`🔄 Procesez conversația pentru proprietarul corect al agentului...`);

    // Only process completed conversations
    if (payload.status === 'completed') {
      // Get conversation details from ElevenLabs API
      let conversationDetails = null;
      try {
        const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
        if (apiKey) {
          const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${payload.conversation_id}`, {
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            conversationDetails = await response.json();
            console.log('Retrieved conversation details from ElevenLabs:', conversationDetails);
          }
        }
      } catch (error) {
        console.warn('Could not retrieve conversation details from ElevenLabs:', error);
      }

      // Calculate cost based on duration (0.15 per minute)
      // Priority: conversationDetails > payload > 0
      const COST_PER_MINUTE = 0.15;
      
      // Extract duration from ElevenLabs API response (most reliable source)
      let durationSeconds = 0;
      if (conversationDetails?.metadata?.call_duration_secs) {
        durationSeconds = conversationDetails.metadata.call_duration_secs;
        console.log('📊 Duration from metadata.call_duration_secs:', durationSeconds);
      } else if (conversationDetails?.call_duration_secs) {
        durationSeconds = conversationDetails.call_duration_secs;
        console.log('📊 Duration from call_duration_secs:', durationSeconds);
      } else if (conversationDetails?.analysis?.call_duration_secs) {
        durationSeconds = conversationDetails.analysis.call_duration_secs;
        console.log('📊 Duration from analysis.call_duration_secs:', durationSeconds);
      } else if (payload.duration_seconds && payload.duration_seconds > 0) {
        durationSeconds = payload.duration_seconds;
        console.log('📊 Duration from payload:', durationSeconds);
      }
      
      console.log('📊 Final duration seconds:', durationSeconds);
      console.log('📊 ConversationDetails keys:', conversationDetails ? Object.keys(conversationDetails) : 'null');
      
      const durationMinutes = durationSeconds / 60;
      const calculatedCost = Math.round(durationMinutes * COST_PER_MINUTE * 100) / 100; // Round to 2 decimals
      let finalCost = calculatedCost; // Always use calculated cost from duration
      const creditsUsed = Math.round(finalCost * 100);
      
      console.log(`💰 Cost calculation: ${durationSeconds}s = ${durationMinutes.toFixed(2)}min = ${creditsUsed} credite`);
      console.log(`💳 Final credits to deduct: ${creditsUsed}`);

      // ATOMIC TRANSACTION: Process balance deduction, statistics, and call history together
      if (finalCost > 0) {
        console.log(`💳 Starting atomic transaction: Deducting ${creditsUsed} credite from user ${userId}...`);
        
        try {
          // Use the new atomic transaction function
          const { data: transactionResult, error: transactionError } = await supabase.rpc('execute_atomic_call_transaction', {
            p_user_id: userId,
            p_amount: finalCost,
            p_duration_seconds: durationSeconds,
            p_description: `Apel vocal cu ${agentName} - ${creditsUsed} credite`,
            p_conversation_id: payload.conversation_id
          });

          if (transactionError) {
            console.error('❌ ATOMIC TRANSACTION FAILED:', transactionError);
            throw new Error(`Transaction failed: ${transactionError.message}`);
          }
          
          if (!transactionResult) {
            console.warn('⚠️ Transaction returned false - insufficient funds');
            throw new Error('Insufficient funds for call');
          }
          
          console.log('✅ ATOMIC TRANSACTION COMPLETED - Balance and statistics updated');
          
        } catch (atomicError) {
          console.error('❌ CRITICAL ERROR in atomic transaction:', atomicError);
          
          // RETRY LOGIC: Try individual operations as fallback
          console.log('🔄 Attempting fallback: individual operations...');
          
          try {
            const { data: deductResult, error: deductError } = await supabase
              .rpc('deduct_balance', {
                p_user_id: userId,
                p_amount: finalCost,
                p_description: `Apel vocal cu ${agentName} - ${creditsUsed} credite`,
                p_conversation_id: payload.conversation_id
              });

            if (deductError || !deductResult) {
              throw new Error('Balance deduction failed in fallback');
            }
            
            console.log('✅ Fallback: Balance deducted successfully');
            
            // Update statistics separately
            await supabase.rpc('update_user_statistics_with_spending', {
              p_user_id: userId,
              p_duration_seconds: durationSeconds,
              p_cost_usd: finalCost
            });
            
            console.log('✅ Fallback: Statistics updated successfully');
            
          } catch (fallbackError) {
            console.error('❌ FALLBACK FAILED:', fallbackError);
            // Continue with call recording but mark as failed transaction
            finalCost = 0; // Don't charge if we can't process payment
          }
        }
      }

      // Extract phone numbers and determine call direction
      let callerNumber = null;
      let phoneNumber = payload.phone_number || 'Unknown';
      let callDirection = 'outbound'; // Default to outbound
      
      // Check for inbound call indicators
      if (conversationDetails?.metadata?.phone_call) {
        const phoneCall = conversationDetails.metadata.phone_call;
        
        // Determine call direction
        if (phoneCall.direction === 'inbound') {
          callDirection = 'inbound';
          // For inbound: external_number is who called, agent_number is our number
          callerNumber = phoneCall.external_number || null; // Client who called
          phoneNumber = phoneCall.agent_number || payload.phone_number || 'Unknown'; // Our number
          console.log('📥 INBOUND CALL detected');
        } else {
          // For outbound: agent_number is FROM, external_number is TO
          callerNumber = phoneCall.agent_number || null; // Number we call FROM
          phoneNumber = phoneCall.external_number || payload.phone_number || 'Unknown'; // Number we call TO
          console.log('📤 OUTBOUND CALL detected');
        }
        
        console.log('Phone numbers extracted from conversation:', {
          callDirection,
          callerNumber,
          phoneNumber,
          originalPayloadPhone: payload.phone_number
        });
      } else if (payload.phone_call?.direction === 'inbound') {
        // Fallback: check payload directly
        callDirection = 'inbound';
        callerNumber = payload.phone_call.from_number || null;
        phoneNumber = payload.phone_call.to_number || payload.phone_number || 'Unknown';
        console.log('📥 INBOUND CALL detected from payload');
      }

      // Create call history record
      const callRecord = {
        user_id: userId,
        phone_number: phoneNumber,
        caller_number: callerNumber,
        contact_name: callDirection === 'inbound' 
          ? (callerNumber || 'Apel Inbound') 
          : (conversationDetails?.contact_name || 'Apel ElevenLabs'),
        call_status: payload.status === 'completed' ? 'success' : 'failed',
        summary: `${callDirection === 'inbound' ? '📥 Inbound' : '📤 Outbound'} - Conversație cu ${agentName} - ${durationSeconds}s`,
        dialog_json: JSON.stringify({
          agent_id: payload.agent_id,
          agent_name: agentName,
          transcript: payload.transcript || conversationDetails?.transcript || [],
          conversation_id: payload.conversation_id,
          elevenlabs_history_id: payload.conversation_id,
          webhook_payload: payload,
          conversation_details: conversationDetails,
          call_direction: callDirection
        }),
        call_date: new Date().toISOString(),
        cost_usd: finalCost, // Use the calculated/final cost
        agent_id: payload.agent_id, // This is the real ElevenLabs agent_id
        language: 'ro',
        conversation_id: payload.conversation_id,
        elevenlabs_history_id: payload.conversation_id,
        duration_seconds: durationSeconds, // Use extracted duration
        trigger_processed: false, // Mark as not yet processed by trigger
        call_direction: callDirection // Track inbound vs outbound
      };

      const { data: callData, error: callError } = await supabase
        .from('call_history')
        .insert([callRecord])
        .select()
        .single();

      if (callError) {
        console.error('Error saving call history:', callError);
        throw callError;
      }

      console.log('Call history saved successfully:', callData);

      // ============================================
      // 🎵 TRIGGER ASYNC AUDIO CACHING
      // Call get-conversation-audio function which will cache it
      // This is fire-and-forget, runs in background
      // ============================================
      console.log('🎵 Triggering async audio caching...');

      supabase.functions.invoke('get-conversation-audio', {
        body: { conversationId: payload.conversation_id }
      }).then((result: any) => {
        if (result.data?.audioUrl) {
          console.log('✅ Audio cached successfully:', result.data.audioUrl);
        } else {
          console.log('⚠️ Audio caching result:', result);
        }
      }).catch((err: any) => {
        console.warn('⚠️ Audio caching error (non-blocking):', err);
      });
      // ============================================

      // ============================================
      // 🤖 TRIGGER ASYNC CONCLUSION ANALYSIS
      // This will generate AI conclusion and THEN trigger workflows
      // ============================================
      console.log('🤖 Triggering async conclusion generation with trigger processing...');

      supabase.functions.invoke('analyze-conversation-conclusion', {
        body: {
          conversationId: payload.conversation_id,
          processTriggers: true // Flag to process triggers after conclusion
        }
      }).then((result: any) => {
        console.log('✅ Async conclusion + trigger processing completed:', result);
      }).catch((err: any) => {
        console.warn('⚠️ Async conclusion generation error (non-blocking):', err);
      });
      // ============================================

      // Check for callback intent in the conversation
      const transcriptText = payload.transcript?.map((entry: any) => 
        entry.message || entry.text || ''
      ).join(' ') || conversationDetails?.transcript?.map((entry: any) => 
        entry.message || entry.text || ''
      ).join(' ') || '';

      if (transcriptText) {
        try {
          console.log('Checking for callback intent in ElevenLabs conversation...');
          
          const { data: callbackData, error: callbackError } = await supabase.functions.invoke('detect-callback-intent', {
            body: {
              text: transcriptText,
              conversationId: payload.conversation_id,
              phoneNumber: payload.phone_number || conversationDetails?.phone_number,
              contactName: conversationDetails?.contact_name || 'Apelant necunoscut',
              agentId: payload.agent_id, // Use the real ElevenLabs agent_id
              userId: userId // Transmit explicit user_id-ul proprietarului agentului
            }
          });

          if (callbackError) {
            console.warn('Callback detection failed:', callbackError);
          } else if (callbackData?.callbackDetected) {
            console.log('Callback detected and scheduled from webhook:', callbackData);
          }
        } catch (callbackError) {
          console.warn('Error during callback detection from webhook:', callbackError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Conversation processed successfully, trigger processing delegated to conclusion analyzer',
        call_id: callData.id,
        user_id: userId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For non-completed conversations, just acknowledge
    return new Response(JSON.stringify({
      success: true,
      message: `Conversation ${payload.status} acknowledged`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in processConversation:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}