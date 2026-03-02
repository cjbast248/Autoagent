// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CallbackIntent {
  hasCallbackRequest: boolean;
  timeframe?: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  reason?: string;
  suggestedTime?: string;
  extractedPhones?: string[];
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Romanian callback patterns
const callbackPatterns = [
  /sună-?mă\s+(înapoi|mai târziu|peste|mâine|azi)/i,
  /telefon(eaz)?ă-?mă\s+(înapoi|mai târziu|peste|mâine|azi)/i,
  /apel(eaz)?ă-?mă\s+(înapoi|mai târziu|peste|mâine|azi)/i,
  /contacteaz[ăă]-?mă\s+(înapoi|mai târziu|peste|mâine|azi)/i,
  /îmi dai un telefon/i,
  /să vorbim mai târziu/i,
  /să ne vorbim/i,
  /să mă suni/i,
  /vreau să mă suni/i,
  /poți să mă suni/i,
  /call me back/i,
  /phone me/i
];

// Time extraction patterns
const timePatterns = [
  { pattern: /peste\s+(\d+)\s+minute?/i, unit: 'minutes' },
  { pattern: /în\s+(\d+)\s+minute?/i, unit: 'minutes' },
  { pattern: /peste\s+(\d+)\s+or[eă]/i, unit: 'hours' },
  { pattern: /în\s+(\d+)\s+or[eă]/i, unit: 'hours' },
  { pattern: /mâine\s+la\s+(\d{1,2}):?(\d{2})?/i, unit: 'tomorrow' },
  { pattern: /azi\s+la\s+(\d{1,2}):?(\d{2})?/i, unit: 'today' },
  { pattern: /diseară/i, unit: 'evening' },
  { pattern: /dimineață/i, unit: 'morning' },
  { pattern: /după-?amia?z[ăa]/i, unit: 'afternoon' }
];

// Urgency indicators
const urgencyIndicators = {
  urgent: ['urgent', 'imediat', 'acum', 'grabă', 'important foarte', 'critc'],
  high: ['important', 'cât mai repede', 'urgent', 'prioritate'],
  medium: ['când poți', 'când ai timp', 'normal'],
  low: ['când vrei', 'nu grăbește', 'când ți-e convenabil']
};

const detectCallbackIntent = async (text: string): Promise<CallbackIntent> => {
  console.log('Analyzing text for callback intent:', text);

  // Check for basic callback patterns first
  const hasBasicPattern = callbackPatterns.some(pattern => pattern.test(text));
  
  if (!hasBasicPattern) {
    // Use OpenAI for more sophisticated detection
    const openaiDetection = await detectWithOpenAI(text);
    if (!openaiDetection.hasCallbackRequest) {
      return { hasCallbackRequest: false, urgency: 'medium' };
    }
  }

  // Extract time information
  let timeframe = '';
  let suggestedTime = '';
  
  for (const timePattern of timePatterns) {
    const match = text.match(timePattern.pattern);
    if (match) {
      switch (timePattern.unit) {
        case 'minutes':
          const minutes = parseInt(match[1]);
          timeframe = `${minutes} minute`;
          suggestedTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
          break;
        case 'hours':
          const hours = parseInt(match[1]);
          timeframe = `${hours} ore`;
          suggestedTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
          break;
        case 'tomorrow':
          const hour = parseInt(match[1]);
          const minute = match[2] ? parseInt(match[2]) : 0;
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(hour, minute, 0, 0);
          timeframe = `mâine la ${hour}:${minute.toString().padStart(2, '0')}`;
          suggestedTime = tomorrow.toISOString();
          break;
        case 'today':
          const todayHour = parseInt(match[1]);
          const todayMinute = match[2] ? parseInt(match[2]) : 0;
          const today = new Date();
          today.setHours(todayHour, todayMinute, 0, 0);
          timeframe = `azi la ${todayHour}:${todayMinute.toString().padStart(2, '0')}`;
          suggestedTime = today.toISOString();
          break;
        case 'evening':
          const evening = new Date();
          evening.setHours(18, 0, 0, 0);
          if (evening.getTime() < Date.now()) {
            evening.setDate(evening.getDate() + 1);
          }
          timeframe = 'diseară';
          suggestedTime = evening.toISOString();
          break;
        case 'morning':
          const morning = new Date();
          morning.setDate(morning.getDate() + 1);
          morning.setHours(9, 0, 0, 0);
          timeframe = 'mâine dimineață';
          suggestedTime = morning.toISOString();
          break;
        case 'afternoon':
          const afternoon = new Date();
          afternoon.setHours(14, 0, 0, 0);
          if (afternoon.getTime() < Date.now()) {
            afternoon.setDate(afternoon.getDate() + 1);
          }
          timeframe = 'după-amiază';
          suggestedTime = afternoon.toISOString();
          break;
      }
      break;
    }
  }

  // Determine urgency
  let urgency: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  const lowerText = text.toLowerCase();
  
  for (const [level, indicators] of Object.entries(urgencyIndicators)) {
    if (indicators.some(indicator => lowerText.includes(indicator))) {
      urgency = level as 'low' | 'medium' | 'high' | 'urgent';
      break;
    }
  }

  // Extract potential phone numbers
  const phoneRegex = /(\+?\d{8,15})/g;
  const extractedPhones = text.match(phoneRegex) || [];

  // Extract reason/context
  const reasonIndicators = [
    'pentru', 'despre', 'legat de', 'în privința', 'referitor la',
    'am o întrebare', 'vreau să întreb', 'să discutăm'
  ];
  
  let reason = '';
  for (const indicator of reasonIndicators) {
    const index = lowerText.indexOf(indicator);
    if (index !== -1) {
      const afterIndicator = text.substring(index + indicator.length, index + indicator.length + 100);
      reason = afterIndicator.trim().split(/[.!?]/)[0];
      break;
    }
  }

  // Default timeframe if none detected
  if (!timeframe) {
    timeframe = 'mai târziu';
    suggestedTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
  }

  console.log('Callback intent detected:', {
    hasCallbackRequest: true,
    timeframe,
    urgency,
    reason,
    suggestedTime,
    extractedPhones
  });

  return {
    hasCallbackRequest: true,
    timeframe,
    urgency,
    reason: reason || undefined,
    suggestedTime,
    extractedPhones
  };
};

const detectWithOpenAI = async (text: string): Promise<CallbackIntent> => {
  if (!OPENAI_API_KEY) {
    return { hasCallbackRequest: false, urgency: 'medium' };
  }

  try {
    console.log('Using GPT-4.1 for enhanced callback detection...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Ești un expert în analiza conversațiilor în română pentru detectarea intențiilor de callback/reprogramare.

Analizează textul cu atenție pentru următoarele tipuri de cereri:
1. Cereri directe de callback: "sună-mă", "telefoneză-mă", "contactează-mă"
2. Cereri indirecte: "nu pot acum", "sunt ocupat", "vorbim mai târziu"
3. Programări: "să programăm", "să ne vedem", "să discutăm"
4. Amânări: "mai târziu", "altă dată", "peste câteva zile"

Contextele în care oamenii cer callback:
- Sunt la muncă/ocupați
- Nu au timp să vorbească
- Vor să se gândească la ofertă
- Vor mai multe informații
- Vor să discute cu familia
- Nu sunt într-un loc potrivit pentru conversație

Răspunde DOAR cu JSON valid în formatul:
{
  "hasCallbackRequest": boolean,
  "timeframe": "string cu când vrea să fie contactat",
  "urgency": "low|medium|high|urgent",
  "reason": "motivul pentru callback",
  "confidence": number între 0-100,
  "extractedPhones": ["array cu numere găsite"],
  "suggestedTime": "ISO string sau null"
}`
          },
          { 
            role: 'user', 
            content: `Analizează această conversație pentru callback intent:

"${text}"

Caută indicii ca:
- Expresii directe: "sună-mă", "telefoneză-mă", "call me back", "contactează-mă"
- Expresii indirecte: "nu pot acum", "sunt ocupat", "vorbim mai târziu", "să ne programăm"
- Timpuri: "mâine", "săptămâna viitoare", "peste o oră", "diseară"
- Motive: "să mă gândesc", "să vorbesc cu soția", "să discut cu familia"

Dacă nu există niciun indiciu clar de callback, hasCallbackRequest = false.`
          }
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return { hasCallbackRequest: false, urgency: 'medium' };
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      return { hasCallbackRequest: false, urgency: 'medium' };
    }

    console.log('GPT-4.1 raw response:', aiResponse);

    try {
      const parsed = JSON.parse(aiResponse);
      
      // Generate suggested time based on timeframe if provided
      let suggestedTime = '';
      if (parsed.hasCallbackRequest && parsed.timeframe) {
        const now = new Date();
        const lowerTimeframe = parsed.timeframe.toLowerCase();
        
        if (lowerTimeframe.includes('mâine') || lowerTimeframe.includes('tomorrow')) {
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          tomorrow.setHours(10, 0, 0, 0); // 10 AM tomorrow
          suggestedTime = tomorrow.toISOString();
        } else if (lowerTimeframe.includes('diseară') || lowerTimeframe.includes('evening')) {
          const evening = new Date(now);
          evening.setHours(18, 0, 0, 0);
          if (evening.getTime() < now.getTime()) {
            evening.setDate(evening.getDate() + 1);
          }
          suggestedTime = evening.toISOString();
        } else if (lowerTimeframe.includes('săptămâna') || lowerTimeframe.includes('week')) {
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          nextWeek.setHours(10, 0, 0, 0);
          suggestedTime = nextWeek.toISOString();
        } else if (lowerTimeframe.includes('ore') || lowerTimeframe.includes('hour')) {
          const hours = parseInt(lowerTimeframe.match(/\d+/)?.[0] || '2');
          suggestedTime = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
        } else {
          // Default to 2 hours from now
          suggestedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
        }
      }

      return {
        hasCallbackRequest: parsed.hasCallbackRequest || false,
        timeframe: parsed.timeframe || undefined,
        urgency: parsed.urgency || 'medium',
        reason: parsed.reason || undefined,
        suggestedTime: suggestedTime || undefined,
        extractedPhones: parsed.extractedPhones || []
      };
    } catch (parseError) {
      console.error('Failed to parse GPT-4.1 response:', parseError, 'Raw response:', aiResponse);
      return { hasCallbackRequest: false, urgency: 'medium' };
    }
  } catch (error) {
    console.error('GPT-4.1 detection error:', error);
    return { hasCallbackRequest: false, urgency: 'medium' };
  }
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, conversationId, phoneNumber, contactName, agentId, userId } = await req.json();

    // Input validation
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    console.log('🔍 Received agentId:', agentId);
    
    if (!conversationId || !phoneNumber) {
      throw new Error('Missing required conversation details');
    }

    console.log('Processing callback detection for:', { conversationId, phoneNumber, contactName });

    // Detect callback intent
    const intent = await detectCallbackIntent(text);

    if (!intent.hasCallbackRequest) {
      return new Response(
        JSON.stringify({ 
          callbackDetected: false,
          message: 'No callback request detected'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PRIORITIZE transmitted userId (from webhook) - this is the most reliable method
    let callbackUserId = userId;
    
    if (callbackUserId) {
      console.log('✅ Folosesc userId transmis direct din webhook (PRIORITAR):', callbackUserId);
    }
    
    // Try to get userId from saved call sessions first (most reliable)
    if (!callbackUserId && conversationId) {
      console.log('🔍 Căut sesiunea salvată pentru conversation_id:', conversationId);
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('call_sessions')
        .select('agent_owner_user_id, agent_id')
        .eq('session_id', conversationId)
        .maybeSingle();
      
      if (sessionData) {
        callbackUserId = sessionData.agent_owner_user_id;
        console.log('✅ Găsit proprietar din sesiune salvată:', callbackUserId);
      } else {
        console.log('⚠️ Nu am găsit sesiune salvată, caut prin agent ID...');
      }
    }
    
    if (!callbackUserId) {
      // Fallback: Find the agent owner based on agentId
      if (!agentId) {
        throw new Error('Either userId or agentId is required to create callback');
      }

      // Try to find agent by elevenlabs_agent_id first, then by agent_id
      let agentData = null;
      let agentError = null;
      
      console.log('🔍 Căutare proprietar agent pentru callback:', agentId);
      
      // First try elevenlabs_agent_id
      const { data: elevenLabsAgent, error: elevenLabsError } = await supabase
        .from('kalina_agents')
        .select('user_id, name')
        .eq('elevenlabs_agent_id', agentId)
        .maybeSingle();
      
      if (elevenLabsAgent) {
        agentData = elevenLabsAgent;
        console.log('✅ Agent găsit prin elevenlabs_agent_id:', agentId, 'Proprietar:', elevenLabsAgent.user_id);
      } else {
        console.log('⚠️ Agent nu a fost găsit prin elevenlabs_agent_id, încerc prin agent_id...');
        
        // Fallback to agent_id column
        const { data: normalAgent, error: normalError } = await supabase
          .from('kalina_agents')
          .select('user_id, name')
          .eq('agent_id', agentId)
          .maybeSingle();
        
        agentData = normalAgent;
        agentError = normalError;
        
        if (normalAgent) {
          console.log('✅ Agent găsit prin agent_id:', agentId, 'Proprietar:', normalAgent.user_id);
        } else {
          console.error('❌ Agent nu a fost găsit în niciuna din coloane pentru:', agentId);
          console.error('Erori:', { elevenLabsError, normalError });
        }
      }
      
      if (!agentData) {
        console.error('Could not find agent owner for agent:', agentId, { elevenLabsError, agentError });
        throw new Error(`Agent not found in system: ${agentId}. Asigură-te că agentul există în baza de date.`);
      }

      callbackUserId = agentData.user_id;
    } else {
      console.log('✅ Folosesc userId transmis direct:', callbackUserId);
    }
    
    // Check if there's already a callback scheduled for this phone number to prevent duplicates
    const { data: existingCallbacks, error: checkError } = await supabase
      .from('scheduled_calls')
      .select('id, user_id')
      .eq('phone_number', phoneNumber)
      .eq('status', 'scheduled')
      .gte('scheduled_datetime', new Date().toISOString());

    if (existingCallbacks && existingCallbacks.length > 0) {
      console.log('⚠️ Callback deja existent pentru acest număr:', phoneNumber, 'Callbacks existente:', existingCallbacks);
      
      // Check if we should use phone number mapping to determine the correct user
      const { data: phoneMapping, error: mappingError } = await supabase
        .from('phone_number_mappings')
        .select('user_id, is_primary')
        .eq('phone_number', phoneNumber)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (phoneMapping) {
        console.log('📞 Folosesc maparea de telefon pentru utilizatorul:', phoneMapping.user_id);
        callbackUserId = phoneMapping.user_id;
      } else {
        // If no mapping exists and there are multiple callbacks, skip creating a new one
        return new Response(
          JSON.stringify({
            callbackDetected: true,
            callbackId: existingCallbacks[0].id,
            intent: intent,
            message: `Callback deja programat pentru numărul ${phoneNumber}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`🎯 Creez callback pentru utilizatorul sunat: ${callbackUserId} (numărul: ${phoneNumber})`);

    // Create callback entry in scheduled_calls
    const callbackData = {
      user_id: callbackUserId, // Use agent owner's user_id
      client_name: contactName || 'Client necunoscut',
      phone_number: phoneNumber,
      scheduled_datetime: intent.suggestedTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      description: `Callback cerut în conversația ${conversationId}${intent.reason ? ': ' + intent.reason : ''}`,
      priority: intent.urgency,
      status: 'scheduled',
      notes: `Conversația originală: ${conversationId}. Motiv: ${intent.reason || 'Nu specificat'}. Timeframe cerut: ${intent.timeframe || 'mai târziu'}`,
      task_type: 'callback',
      agent_id: agentId
    };

    const { data: callbackRecord, error: insertError } = await supabase
      .from('scheduled_calls')
      .insert(callbackData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating callback:', insertError);
      throw new Error('Failed to create callback record');
    }

    console.log('Callback created successfully:', callbackRecord);

    // Also update the original conversation with callback info
    try {
      const { error: updateError } = await supabase
        .from('call_history')
        .update({
          notes: `Callback programat pentru ${intent.timeframe || 'mai târziu'}. ID: ${callbackRecord.id}`
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', callbackUserId);

      if (updateError) {
        console.warn('Failed to update conversation with callback info:', updateError);
      }
    } catch (updateError) {
      console.warn('Error updating conversation:', updateError);
    }

    return new Response(
      JSON.stringify({
        callbackDetected: true,
        callbackId: callbackRecord.id,
        intent: intent,
        scheduledTime: intent.suggestedTime,
        message: `Callback programat pentru ${intent.timeframe || 'mai târziu'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-callback-intent function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        callbackDetected: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});