// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Configurații
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Prompt injection sanitization - removes dangerous patterns
const sanitizePrompt = (input: string): string => {
  if (!input) return input;

  // Remove common prompt injection patterns
  let sanitized = input
    // Remove attempts to override system instructions
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi, '[FILTERED]')
    .replace(/forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi, '[FILTERED]')
    .replace(/disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi, '[FILTERED]')
    // Remove attempts to change role/persona
    .replace(/you\s+are\s+now\s+(a|an|the)\s+/gi, '[FILTERED] ')
    .replace(/act\s+as\s+(a|an|the|if)\s+/gi, '[FILTERED] ')
    .replace(/pretend\s+(to\s+be|you('re|are))\s+/gi, '[FILTERED] ')
    // Remove attempts to extract system prompt
    .replace(/what\s+(is|are)\s+your\s+(system\s+)?(prompt|instructions?|rules?)/gi, '[FILTERED]')
    .replace(/repeat\s+(your\s+)?(system\s+)?(prompt|instructions?)/gi, '[FILTERED]')
    .replace(/show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions?)/gi, '[FILTERED]')
    // Remove markdown/code injection attempts that could break formatting
    .replace(/```\s*(system|assistant|user)\s*/gi, '``` ')
    // Remove attempts to simulate different roles
    .replace(/<\|?(system|assistant|user|im_start|im_end)\|?>/gi, '[FILTERED]')
    // Remove attempts to inject JSON/function calls
    .replace(/\{\s*"role"\s*:\s*"(system|assistant)"/gi, '[FILTERED]')
    .replace(/\{\s*"function_call"/gi, '[FILTERED]');

  return sanitized;
};

// Input validation helpers
const validateInput = (data: any) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { message, userId, model = 'gpt-4o-mini', agentId, systemPrompt } = data;

  // Validate message
  if (!message || typeof message !== 'string' || message.length === 0 || message.length > 5000) {
    throw new Error('Invalid message: must be 1-5000 characters');
  }

  // Validate model
  const allowedModels = ['gpt-4o-mini', 'gpt-4o'];
  if (model && !allowedModels.includes(model)) {
    throw new Error('Invalid model specified');
  }

  // Validate agentId if provided
  if (agentId && (typeof agentId !== 'string' || agentId.length > 100)) {
    throw new Error('Invalid agentId');
  }

  // Validate systemPrompt if provided
  if (systemPrompt && (typeof systemPrompt !== 'string' || systemPrompt.length > 10000)) {
    throw new Error('System prompt too long');
  }

  // Sanitize user inputs to prevent prompt injection
  const sanitizedMessage = sanitizePrompt(message);
  const sanitizedSystemPrompt = systemPrompt ? sanitizePrompt(systemPrompt) : systemPrompt;

  return { message: sanitizedMessage, userId, model, agentId, systemPrompt: sanitizedSystemPrompt };
};

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions pentru extragerea completă a datelor utilizatorului
const getUserStatistics = async (userId: string) => {
  try {
    const { data: stats } = await supabase
      .from('user_statistics')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    const { data: balance } = await supabase
      .from('user_balance')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return { stats, balance, profile };
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return { stats: null, balance: null, profile: null };
  }
};

const getAllCallHistory = async (userId: string) => {
  try {
    const { data: calls } = await supabase
      .from('call_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    return calls || [];
  } catch (error) {
    console.error('Error fetching call history:', error);
    return [];
  }
};

const getTodaysCallHistory = async (userId: string) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { data: calls } = await supabase
      .from('call_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    return calls || [];
  } catch (error) {
    console.error('Error fetching today calls:', error);
    return [];
  }
};

const getYesterdayCallHistory = async (userId: string) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);

    const { data: calls } = await supabase
      .from('call_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    return calls || [];
  } catch (error) {
    console.error('Error fetching yesterday calls:', error);
    return [];
  }
};

const getDateRangeCallHistory = async (userId: string, daysBack: number) => {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysBack);
    
    const { data: calls } = await supabase
      .from('call_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', targetDate.toISOString())
      .order('created_at', { ascending: false });

    return calls || [];
  } catch (error) {
    console.error(`Error fetching calls from ${daysBack} days back:`, error);
    return [];
  }
};

const getUserAgents = async (userId: string) => {
  try {
    const { data: agents } = await supabase
      .from('kalina_agents')
      .select('*')
      .eq('user_id', userId);

    return agents || [];
  } catch (error) {
    console.error('Error fetching user agents:', error);
    return [];
  }
};

const getUserConversations = async (userId: string) => {
  try {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return conversations || [];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
};

const getUserContacts = async (userId: string) => {
  try {
    const { data: contacts } = await supabase
      .from('contacts_database')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return contacts || [];
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
};

const getUserCampaigns = async (userId: string) => {
  try {
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return campaigns || [];
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }
};

const getUserPhoneNumbers = async (userId: string) => {
  try {
    const { data: phones } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', userId);

    return phones || [];
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return [];
  }
};

const getUserActiveAgents = async (userId: string) => {
  try {
    const { data: activeAgents } = await supabase
      .from('active_agents')
      .select('*')
      .eq('user_id', userId);

    return activeAgents || [];
  } catch (error) {
    console.error('Error fetching active agents:', error);
    return [];
  }
};

const getUserKnowledgeDocuments = async (userId: string) => {
  try {
    const { data: documents } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return documents || [];
  } catch (error) {
    console.error('Error fetching knowledge documents:', error);
    return [];
  }
};

const getCallbackRequests = async (userId: string) => {
  try {
    const { data: callbacks } = await supabase
      .from('callback_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return callbacks || [];
  } catch (error) {
    console.error('Error fetching callback requests:', error);
    return [];
  }
};

const getBalanceTransactions = async (userId: string) => {
  try {
    const { data: transactions } = await supabase
      .from('balance_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return transactions || [];
  } catch (error) {
    console.error('Error fetching balance transactions:', error);
    return [];
  }
};

const getConversationAnalytics = async (userId: string) => {
  try {
    const { data: analytics } = await supabase
      .from('conversation_analytics_cache')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return analytics || [];
  } catch (error) {
    console.error('Error fetching conversation analytics:', error);
    return [];
  }
};

const generateUserContext = (userData: any) => {
  const { 
    stats, balance, profile, todaysCalls, yesterdaysCalls, allCalls, agents, conversations, 
    contacts, campaigns, phoneNumbers, activeAgents, documents, callbacks, 
    transactions, analytics 
  } = userData;
  
  let context = `=== INFORMAȚII COMPLETE DESPRE UTILIZATOR ===\n\n`;
  
  // PROFIL UTILIZATOR
  if (profile) {
    context += `👤 PROFIL UTILIZATOR:\n`;
    context += `Nume: ${profile.first_name || ''} ${profile.last_name || ''}\n`;
    context += `Email: ${profile.email || 'Nu este disponibil'}\n`;
    context += `Tip cont: ${profile.account_type || 'regular'}\n`;
    context += `Planul: ${profile.plan || 'starter'}\n`;
    if (profile.telegram_chat_id) context += `Telegram conectat: Da\n`;
    context += `Creat la: ${new Date(profile.created_at).toLocaleDateString('ro-RO')}\n\n`;
  }

  // BALANȚĂ CONT ȘI TRANZACȚII
  if (balance) {
    context += `💰 BALANȚĂ CONT:\n`;
    context += `Balanța curentă: $${balance.balance_usd || 0}\n`;
    if (transactions && transactions.length > 0) {
      context += `Ultima tranzacție: ${transactions[0].description} - $${transactions[0].amount} (${new Date(transactions[0].created_at).toLocaleDateString('ro-RO')})\n`;
      const totalCredits = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + Number(t.amount), 0);
      const totalSpent = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      context += `Total încărcat: $${totalCredits}\n`;
      context += `Total cheltuit în tranzacții: $${totalSpent}\n`;
    }
    context += `\n`;
  }

  // STATISTICI GENERALE
  if (stats) {
    context += `📊 STATISTICI GENERALE:\n`;
    context += `Total apeluri efectuate: ${stats.total_voice_calls || 0}\n`;
    context += `Total minute vorbite: ${stats.total_minutes_talked || 0}\n`;
    context += `Total conversații: ${stats.total_conversations || 0}\n`;
    context += `Total mesaje: ${stats.total_messages || 0}\n`;
    context += `Total cheltuit: $${stats.total_spent_usd || 0}\n`;
    context += `Agenți folosiți: ${stats.agents_used || 0}\n\n`;
  }

  // APELURI DE ASTĂZI
  if (todaysCalls && todaysCalls.length > 0) {
    context += `📞 APELURI DE ASTĂZI (${todaysCalls.length} total):\n`;
    const successfulToday = todaysCalls.filter(call => call.call_status === 'completed').length;
    const failedToday = todaysCalls.filter(call => call.call_status === 'failed').length;
    context += `Reușite: ${successfulToday}, Eșuate: ${failedToday}\n`;
    
    todaysCalls.slice(0, 8).forEach((call: any, index: number) => {
      const duration = call.duration_seconds ? Math.round(call.duration_seconds / 60) : 0;
      const cost = call.cost_usd || 0;
      const time = new Date(call.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
      const status = call.call_status === 'completed' ? '✅' : call.call_status === 'failed' ? '❌' : '⏳';
      context += `${index + 1}. ${status} ${call.contact_name || call.phone_number} - ${duration}min - $${cost} (${time})\n`;
    });
    context += `\n`;
  } else {
    context += `📞 APELURI DE ASTĂZI: Nu au fost efectuate apeluri astăzi.\n\n`;
  }

  // APELURI DE IERI
  if (yesterdaysCalls && yesterdaysCalls.length > 0) {
    context += `📞 APELURI DE IERI (${yesterdaysCalls.length} total):\n`;
    const successfulYesterday = yesterdaysCalls.filter(call => call.call_status === 'completed').length;
    const failedYesterday = yesterdaysCalls.filter(call => call.call_status === 'failed').length;
    context += `Reușite: ${successfulYesterday}, Eșuate: ${failedYesterday}\n`;
    
    yesterdaysCalls.slice(0, 5).forEach((call: any, index: number) => {
      const duration = call.duration_seconds ? Math.round(call.duration_seconds / 60) : 0;
      const cost = call.cost_usd || 0;
      const time = new Date(call.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
      const status = call.call_status === 'completed' ? '✅' : call.call_status === 'failed' ? '❌' : '⏳';
      context += `${index + 1}. ${status} ${call.contact_name || call.phone_number} - ${duration}min - $${cost} (${time})\n`;
    });
    context += `\n`;
  } else {
    context += `📞 APELURI DE IERI: Nu au fost efectuate apeluri ieri.\n\n`;
  }

  // ISTORICUL COMPLET AL APELURILOR
  if (allCalls && allCalls.length > 0) {
    const completedCalls = allCalls.filter(call => call.call_status === 'completed');
    const failedCalls = allCalls.filter(call => call.call_status === 'failed');
    const busyCalls = allCalls.filter(call => call.call_status === 'busy');
    const totalCost = allCalls.reduce((sum, call) => sum + (Number(call.cost_usd) || 0), 0);
    const totalDuration = allCalls.reduce((sum, call) => sum + (Number(call.duration_seconds) || 0), 0);
    
    context += `📈 ISTORIC COMPLET APELURI (ultimele ${allCalls.length}):\n`;
    context += `Reușite: ${completedCalls.length}, Eșuate: ${failedCalls.length}, Ocupate: ${busyCalls.length}\n`;
    context += `Cost total: $${totalCost.toFixed(4)}, Durată totală: ${Math.round(totalDuration / 60)} minute\n`;
    context += `Ultimul apel: ${new Date(allCalls[0].created_at).toLocaleDateString('ro-RO')} - ${allCalls[0].contact_name || allCalls[0].phone_number}\n\n`;
  }

  // AGENȚI AI
  if (agents && agents.length > 0) {
    context += `🤖 AGENȚI AI (${agents.length} total):\n`;
    agents.forEach((agent: any, index: number) => {
      const status = agent.is_active ? '🟢 Activ' : '🔴 Inactiv';
      context += `${index + 1}. ${agent.name} ${status} (ID: ${agent.agent_id})\n`;
      if (agent.description) context += `   Descriere: ${agent.description.substring(0, 80)}...\n`;
    });
    context += `\n`;
  }

  // CONTACTE
  if (contacts && contacts.length > 0) {
    context += `👥 CONTACTE (${contacts.length} din baza de date):\n`;
    contacts.slice(0, 10).forEach((contact: any, index: number) => {
      context += `${index + 1}. ${contact.nume} - ${contact.telefon}`;
      if (contact.company) context += ` (${contact.company})`;
      if (contact.status) context += ` [${contact.status}]`;
      context += `\n`;
    });
    if (contacts.length > 10) context += `... și încă ${contacts.length - 10} contacte\n`;
    context += `\n`;
  }

  // CAMPANII
  if (campaigns && campaigns.length > 0) {
    context += `📢 CAMPANII (${campaigns.length} active):\n`;
    campaigns.slice(0, 5).forEach((campanie: any, index: number) => {
      context += `${index + 1}. ${campanie.name} - Status: ${campanie.status || 'necunoscut'}\n`;
    });
    if (campaigns.length > 5) context += `... și încă ${campaigns.length - 5} campanii\n`;
    context += `\n`;
  }

  // NUMERE DE TELEFON
  if (phoneNumbers && phoneNumbers.length > 0) {
    context += `📞 NUMERE DE TELEFON (${phoneNumbers.length} disponibile):\n`;
    phoneNumbers.forEach((phone: any, index: number) => {
      context += `${index + 1}. ${phone.phone_number} - ${phone.description || 'fără descriere'}\n`;
    });
    context += `\n`;
  }

  // AGENȚI ACTIVI
  if (activeAgents && activeAgents.length > 0) {
    context += `🟢 AGENȚI ACTIVI (${activeAgents.length}):\n`;
    activeAgents.forEach((agent: any, index: number) => {
      context += `${index + 1}. ${agent.name} - Status: ${agent.status || 'necunoscut'}\n`;
    });
    context += `\n`;
  }

  // DOCUMENTE DE CUNOȘTINȚE
  if (documents && documents.length > 0) {
    context += `📚 DOCUMENTE DE CUNOȘTINȚE (${documents.length}):\n`;
    documents.slice(0, 5).forEach((doc: any, index: number) => {
      context += `${index + 1}. ${doc.title} - ${doc.description?.substring(0, 80) || 'fără descriere'}\n`;
    });
    if (documents.length > 5) context += `... și încă ${documents.length - 5} documente\n`;
    context += `\n`;
  }

  // CALLBACK-URI PROGRAMATE
  if (callbacks && callbacks.length > 0) {
    context += `📅 CALLBACK-URI PROGRAMATE (${callbacks.length}):\n`;
    callbacks.slice(0, 5).forEach((cb: any, index: number) => {
      context += `${index + 1}. ${cb.client_name} - ${new Date(cb.scheduled_time).toLocaleString('ro-RO')} - Status: ${cb.status}\n`;
    });
    if (callbacks.length > 5) context += `... și încă ${callbacks.length - 5} callback-uri\n`;
    context += `\n`;
  }

  // ANALITICE CONVERSAȚII
  if (analytics && analytics.length > 0) {
    context += `📈 ANALITICE CONVERSAȚII (${analytics.length} recente):\n`;
    analytics.forEach((an: any, index: number) => {
      context += `${index + 1}. Conversație ID: ${an.conversation_id} - Scor satisfacție: ${an.satisfaction_score || 'N/A'}\n`;
    });
    context += `\n`;
  }

  return context;
};

// Tool execution functions pentru MCP/JARVIS functionality
const executeInitiateCall = async (userId: string, contactName: string, phoneNumber: string, agentType?: string) => {
  try {
    let stepByStepLog = "🔍 **Caut contact și agent pentru apel...**\n\n";
    
    console.log('🚀 Initiating call:', { userId, contactName, phoneNumber, agentType });
    
    // First check call history for this contact
    const allCalls = await getAllCallHistory(userId);
    const contactCalls = allCalls.filter(call => 
      call.phone_number === phoneNumber || 
      call.contact_name?.toLowerCase() === contactName.toLowerCase()
    );
    
    if (contactCalls.length > 0) {
      const successfulCalls = contactCalls.filter(call => call.call_status === 'completed');
      const failedCalls = contactCalls.filter(call => call.call_status === 'failed' || call.call_status === 'no-answer');
      stepByStepLog += `📞 **Am găsit contactul în istoric:**\n`;
      stepByStepLog += `   • Total apeluri: ${contactCalls.length}\n`;
      stepByStepLog += `   • Apeluri reușite: ${successfulCalls.length}\n`;
      stepByStepLog += `   • Apeluri nerăspunse/eșuate: ${failedCalls.length}\n`;
      stepByStepLog += `   • Ultimul apel: ${new Date(contactCalls[0].created_at).toLocaleDateString('ro-RO')}\n\n`;
    } else {
      stepByStepLog += `📞 **Contact nou** - nu există istoric de apeluri anterioare\n\n`;
    }
    
    // Find suitable agent
    stepByStepLog += `🤖 **Caut agentul potrivit...**\n`;
    const agents = await getUserAgents(userId);
    let selectedAgent = null;
    
    if (agentType) {
      // Search for agent by type/description
      selectedAgent = agents.find(agent => 
        agent.description?.toLowerCase().includes(agentType.toLowerCase()) ||
        agent.name.toLowerCase().includes(agentType.toLowerCase())
      );
      
      if (selectedAgent) {
        stepByStepLog += `   ✅ Am găsit agentul "${selectedAgent.name}" pentru tipul "${agentType}"\n\n`;
      } else {
        stepByStepLog += `   ⚠️ Nu am găsit agent specific pentru "${agentType}", folosesc agentul principal\n\n`;
      }
    }
    
    // Fallback to first active agent
    if (!selectedAgent) {
      selectedAgent = agents.find(agent => agent.is_active) || agents[0];
    }
    
    if (!selectedAgent) {
      return {
        success: false,
        message: stepByStepLog + `❌ **EROARE:** Nu am găsit niciun agent disponibil în contul tău. Te rog să creezi mai întâi un agent.`,
        data: null
      };
    }
    
    stepByStepLog += `🚀 **Inițiez apelul...**\n`;
    stepByStepLog += `   • Agent: ${selectedAgent.name}\n`;
    stepByStepLog += `   • Contact: ${contactName}\n`;
    stepByStepLog += `   • Telefon: ${phoneNumber}\n\n`;
    
    // Check if ElevenLabs agent exists and is valid
    if (!selectedAgent.elevenlabs_agent_id && !selectedAgent.agent_id) {
      stepByStepLog += `❌ **EROARE: Agentul nu are ID valid pentru ElevenLabs!**\n`;
      stepByStepLog += `   • **Soluție**: Recrează agentul sau contactează support\n`;
      
      return {
        success: false,
        message: stepByStepLog,
        data: { agent: selectedAgent.name, contact: contactName, phone: phoneNumber, error: 'Invalid agent ID' }
      };
    }

    // Call the initiate-scheduled-call function
    const { data: callResult, error } = await supabase.functions.invoke('initiate-scheduled-call', {
      body: {
        agent_id: selectedAgent.elevenlabs_agent_id || selectedAgent.agent_id,
        phone_number: phoneNumber,
        contact_name: contactName,
        user_id: userId,
        is_test_call: false
      }
    });
    
    if (error) {
      console.error('Error initiating call:', error);
      stepByStepLog += `❌ **EROARE ÎN APELARE!**\n`;
      stepByStepLog += `   • Eroare: ${error.message}\n`;
      
      if (error.message.includes('auth retry') || error.message.includes('authentication')) {
        stepByStepLog += `   • **Cauză probabilă**: Problemă cu ElevenLabs API key\n`;
        stepByStepLog += `   • **Soluții**:\n`;
        stepByStepLog += `     - Verifică că ElevenLabs API key este valid\n`;
        stepByStepLog += `     - Încearcă să recreezi agentul\n`;
        stepByStepLog += `     - Contactează administratorul pentru verificarea API key-ului\n`;
      }
      
      return {
        success: false,
        message: stepByStepLog,
        data: { 
          agent: selectedAgent.name, 
          contact: contactName, 
          phone: phoneNumber, 
          error: error.message,
          agentId: selectedAgent.elevenlabs_agent_id || selectedAgent.agent_id
        }
      };
    }

    if (!callResult?.success) {
      const errorMsg = callResult?.message || 'Apelul nu a putut fi inițiat';
      stepByStepLog += `❌ **APELUL A EȘUAT!**\n`;
      stepByStepLog += `   • Eroare: ${errorMsg}\n`;
      
      if (errorMsg.includes('auth retry') || errorMsg.includes('max auth')) {
        stepByStepLog += `   • **Problemă**: ElevenLabs API authentication\n`;
        stepByStepLog += `   • **Soluții posibile**:\n`;
        stepByStepLog += `     1. Verifică ElevenLabs API key în setări\n`;
        stepByStepLog += `     2. Verifică că agentul există în ElevenLabs\n`;
        stepByStepLog += `     3. Încearcă cu alt agent sau recreează agentul\n`;
      }
      
      return {
        success: false,
        message: stepByStepLog,
        data: { 
          agent: selectedAgent.name, 
          contact: contactName, 
          phone: phoneNumber, 
          error: errorMsg,
          callResult 
        }
      };
    }
    
    console.log('✅ Call initiated successfully:', callResult);
    stepByStepLog += `✅ **APEL INIȚIAT CU SUCCES!**\n`;
    stepByStepLog += `   • ID conversație: ${callResult?.conversation_id || 'N/A'}\n`;
    stepByStepLog += `   • Status: Apelul este în curs...\n`;

    // Additional success info if available
    if (callResult.elevenlabs_data) {
      if (callResult.elevenlabs_data.success) {
        stepByStepLog += `   • Serviciu vocal: ✅ Conectat cu succes\n`;
      } else {
        stepByStepLog += `   • Serviciu vocal: ⚠️ ${callResult.elevenlabs_data.message}\n`;
      }
    }
    
    return {
      success: true,
      message: stepByStepLog,
      data: {
        agent: selectedAgent.name,
        contact: contactName,
        phone: phoneNumber,
        conversationId: callResult?.conversation_id,
        callResult,
        contactHistory: {
          totalCalls: contactCalls.length,
          successfulCalls: contactCalls.filter(call => call.call_status === 'completed').length,
          failedCalls: contactCalls.filter(call => call.call_status === 'failed' || call.call_status === 'no-answer').length
        }
      }
    };
    
  } catch (error) {
    console.error('Error in executeInitiateCall:', error);
    return {
      success: false,
      message: `❌ **EROARE CRITICĂ:** ${error.message}`,
      data: null
    };
  }
};

const executeFindAgent = async (userId: string, agentType: string) => {
  try {
    const agents = await getUserAgents(userId);
    
    const matchingAgents = agents.filter(agent => 
      agent.description?.toLowerCase().includes(agentType.toLowerCase()) ||
      agent.name.toLowerCase().includes(agentType.toLowerCase()) ||
      agent.system_prompt?.toLowerCase().includes(agentType.toLowerCase())
    );
    
    return {
      success: true,
      message: `Am găsit ${matchingAgents.length} agent(i) pentru "${agentType}"`,
      data: matchingAgents
    };
  } catch (error) {
    return {
      success: false,
      message: `Eroare la căutarea agentului: ${error.message}`,
      data: null
    };
  }
};

const executeSearchContact = async (userId: string, query: string) => {
  try {
    let stepLog = `🔍 **Caut contacte pentru: "${query}"**\n\n`;
    
    const contacts = await getUserContacts(userId);
    stepLog += `📊 Total contacte în baza de date: ${contacts.length}\n\n`;
    
    const matchingContacts = contacts.filter(contact => 
      contact.nume?.toLowerCase().includes(query.toLowerCase()) ||
      contact.telefon?.includes(query) ||
      contact.company?.toLowerCase().includes(query.toLowerCase())
    );
    
    if (matchingContacts.length > 0) {
      stepLog += `✅ **Am găsit ${matchingContacts.length} contact(e):**\n`;
      matchingContacts.forEach((contact, index) => {
        stepLog += `   ${index + 1}. **${contact.nume}** - ${contact.telefon}\n`;
        if (contact.company) stepLog += `      Companie: ${contact.company}\n`;
        if (contact.locatie) stepLog += `      Locație: ${contact.locatie}\n`;
      });
    } else {
      stepLog += `❌ **Nu am găsit contacte** care să corespundă cu "${query}"\n`;
      stepLog += `💡 **Sugestii:** Încearcă să cauți după:\n`;
      stepLog += `   • Nume parțial (ex: "Ion" pentru "Ion Popescu")\n`;
      stepLog += `   • Numărul de telefon\n`;
      stepLog += `   • Numele companiei\n`;
    }
    
    return {
      success: true,
      message: stepLog,
      data: matchingContacts
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ **Eroare la căutarea contactului:** ${error.message}`,
      data: null
    };
  }
};

const executeScheduleCallback = async (userId: string, clientName: string, phoneNumber: string, scheduledTime: string, reason?: string) => {
  try {
    const { data, error } = await supabase
      .from('callback_requests')
      .insert({
        user_id: userId,
        client_name: clientName,
        phone_number: phoneNumber,
        scheduled_time: new Date(scheduledTime).toISOString(),
        reason: reason || 'Programat din chat AI',
        status: 'scheduled',
        priority: 'medium'
      })
      .select()
      .single();
    
    if (error) {
      return {
        success: false,
        message: `Eroare la programarea callback-ului: ${error.message}`,
        data: null
      };
    }
    
    return {
      success: true,
      message: `Callback-ul pentru ${clientName} (${phoneNumber}) a fost programat cu succes pentru ${new Date(scheduledTime).toLocaleString('ro-RO')}`,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      message: `Eroare la programarea callback-ului: ${error.message}`,
      data: null
    };
  }
};

const executeGetConversationDetails = async (userId: string, conversationId: string) => {
  try {
    console.log('🔍 Getting conversation details:', { userId, conversationId });
    
    // Call the get-elevenlabs-conversation function
    const { data, error } = await supabase.functions.invoke('get-elevenlabs-conversation', {
      body: { conversationId }
    });

    if (error) {
      console.error('Error getting conversation details:', error);
      return {
        success: false,
        message: `Nu am putut obține detaliile conversației: ${error.message}`,
        data: null
      };
    }

    console.log('✅ Conversation details retrieved successfully');
    return {
      success: true,
      message: `Am găsit conversația ${conversationId}`,
      data: {
        conversationId,
        transcript: data.transcript || [],
        analysis: data.analysis || {},
        metadata: data.metadata || {},
        duration: data.metadata?.call_duration_secs || 0,
        cost: data.metadata?.cost || 0,
        status: data.status || 'unknown',
        summary: data.analysis?.transcript_summary || 'Fără sumar disponibil'
      }
    };
  } catch (error) {
    console.error('Error in executeGetConversationDetails:', error);
    return {
      success: false,
      message: `Eroare la obținerea detaliilor conversației: ${error.message}`,
      data: null
    };
  }
};

const executeCreateAgent = async (userId: string, agentName: string, agentType?: string, customPrompt?: string) => {
  console.log('🤖 Creating agent:', { userId, agentName, agentType, customPrompt });
  
  let stepLog = `🤖 **Creez agentul "${agentName}"...**\n\n`;
  
  try {
    // Step 1: Determine agent type and generate prompt
    stepLog += `📝 **Configurez tipul de agent...**\n`;
    
    const agentTemplates = {
      'sales': {
        prompt: 'Ești un agent de vânzări profesionist și persuasiv. Obiectivul tău este să convingi clienții să cumpere produsele noastre prin prezentarea beneficiilor și rezolvarea obiecțiilor. Folosești tehnici de vânzare eficiente și ești persistent dar respectuos.',
        voice: 'EXAVITQu4vr4xnSDxMaL', // Sarah - professional voice
        description: 'Agent specializat în vânzări și conversii'
      },
      'support': {
        prompt: 'Ești un agent de suport client amabil și eficient. Obiectivul tău este să ajuți clienții să rezolve problemele și să răspunzi la întrebările lor. Ești răbdător, empatic și găsești întotdeauna soluții.',
        voice: '9BWtsMINqrJLrRacOk9x', // Aria - friendly voice  
        description: 'Agent pentru suport client și rezolvare probleme'
      },
      'consultant': {
        prompt: 'Ești un consultant expert în domeniul tău. Obiectivul tău este să oferi sfaturi valoroase și să ghidezi clienții către cele mai bune soluții. Ești cunoscător, profesionist și oferă recomandări personalizate.',
        voice: 'CwhRBWXzGAHq8TQ4Fs17', // Roger - authoritative voice
        description: 'Agent consultant pentru sfaturi și ghidare'
      },
      'marketing': {
        prompt: 'Ești un agent de marketing creativ și persuasiv. Te concentrezi pe prezentarea ofertelor, promoțiilor și beneficiilor produselor într-un mod atractiv. Știi să creezi interes și să motivezi acțiunea.',
        voice: 'XB0fDUnXU5powFXDhCwa', // Charlotte - energetic voice
        description: 'Agent pentru marketing și promovare'
      }
    };

    const selectedType = agentType || 'consultant';
    const template = agentTemplates[selectedType] || agentTemplates['consultant'];
    const systemPrompt = customPrompt || template.prompt;

    stepLog += `   • Tip agent: ${selectedType.toUpperCase()}\n`;
    stepLog += `   • Voce selectată: ${template.voice}\n`;
    stepLog += `   • Prompt generat: ✅\n\n`;

    // Step 2: Generate enhanced prompt using AI
    stepLog += `🧠 **Generez prompt personalizat cu AI...**\n`;
    
    const { data: promptResult, error: promptError } = await supabase.functions.invoke('prompt-generation', {
      body: {
        websiteUrl: '',
        additionalPrompt: systemPrompt,
        agentType: selectedType,
        language: 'ro'
      }
    });

    let enhancedPrompt = systemPrompt;
    if (!promptError && promptResult?.response) {
      enhancedPrompt = promptResult.response;
      stepLog += `   • Prompt îmbunătățit cu AI: ✅\n`;
    } else {
      stepLog += `   • Folosesc prompt standard: ⚠️\n`;
    }
    stepLog += "\n";

    // Step 3: Create agent in ElevenLabs
    stepLog += `🚀 **Creez agentul în ElevenLabs...**\n`;
    
    const { data: result, error } = await supabase.functions.invoke('create-elevenlabs-agent', {
      body: {
        conversation_config: {
          agent: {
            language: 'ro',
            prompt: {
              prompt: enhancedPrompt
            }
          },
          tts: {
            voice_id: template.voice,
            model_id: 'eleven_multilingual_v2'
          }
        },
        name: agentName
      }
    });

    if (error) {
      stepLog += `❌ **EROARE la crearea în ElevenLabs!**\n`;
      stepLog += `   • Detalii: ${error.message}\n`;
      stepLog += `   • **Soluții posibile:**\n`;
      stepLog += `     1. Verifică ElevenLabs API key\n`;
      stepLog += `     2. Verifică quota și billing ElevenLabs\n`;
      stepLog += `     3. Încearcă cu alt nume pentru agent\n`;
      
      return {
        success: false,
        message: stepLog,
        data: { error: error.message }
      };
    }

    if (!result?.agent_id) {
      stepLog += `❌ **EROARE: Nu am primit ID pentru agent!**\n`;
      return {
        success: false,
        message: stepLog,
        data: { error: 'No agent ID received' }
      };
    }

    stepLog += `   • Agent creat în ElevenLabs: ✅\n`;
    stepLog += `   • Agent ID: ${result.agent_id}\n\n`;

    // Step 4: Save to database
    stepLog += `💾 **Salvez agentul în baza de date...**\n`;
    
    const { error: dbError } = await supabase
      .from('kalina_agents')
      .insert({
        agent_id: result.agent_id,
        user_id: userId,
        name: agentName,
        description: template.description,
        system_prompt: enhancedPrompt,
        voice_id: template.voice,
        provider: 'elevenlabs',
        elevenlabs_agent_id: result.agent_id,
        is_active: true
      });

    if (dbError) {
      stepLog += `⚠️ **Avertisment**: Agent creat dar nu salvat în DB\n`;
      stepLog += `   • Eroare DB: ${dbError.message}\n`;
    } else {
      stepLog += `   • Salvat în baza de date: ✅\n`;
    }

    stepLog += `\n✅ **AGENT CREAT CU SUCCES!**\n`;
    stepLog += `   • Nume: ${agentName}\n`;
    stepLog += `   • Tip: ${selectedType}\n`;
    stepLog += `   • ID: ${result.agent_id}\n`;
    stepLog += `   • Status: Activ și gata de utilizare\n`;
    stepLog += `\n🎯 **Agentul poate fi folosit pentru:**\n`;
    
    if (selectedType === 'sales') {
      stepLog += `   • Apeluri de vânzări\n   • Prezentarea produselor\n   • Închiderea dealurilor\n`;
    } else if (selectedType === 'support') {
      stepLog += `   • Suport clienți\n   • Rezolvarea problemelor\n   • Întrebări și răspunsuri\n`;
    } else if (selectedType === 'marketing') {
      stepLog += `   • Promovarea ofertelor\n   • Prezentarea campaniilor\n   • Generarea interesului\n`;
    } else {
      stepLog += `   • Consultanță și sfaturi\n   • Ghidare clienți\n   • Recomandări personalizate\n`;
    }

    return {
      success: true,
      message: stepLog,
      data: {
        agentId: result.agent_id,
        name: agentName,
        type: selectedType,
        voice: template.voice,
        prompt: enhancedPrompt,
        result
      }
    };

  } catch (error) {
    console.error('❌ Error in executeCreateAgent:', error);
    stepLog += `❌ **EROARE CRITICĂ la crearea agentului!**\n`;
    stepLog += `   • Detalii tehnice: ${error.message}\n`;
    stepLog += `   • **Acțiuni recomandate:**\n`;
    stepLog += `     1. Verifică conexiunea la internet\n`;
    stepLog += `     2. Verifică configurația ElevenLabs\n`;
    stepLog += `     3. Încearcă cu alt nume sau tip de agent\n`;
    stepLog += `     4. Contactează support pentru asistență\n`;
    
    return {
      success: false,
      message: stepLog,
      data: { error: error.message }
    };
  }
};

// === 🛠️ MCP EXECUTION FUNCTIONS - ACCES TOTAL ===

// === AGENT MANAGEMENT FUNCTIONS ===
const executeManageAgent = async (userId: string, args: any) => {
  try {
    let stepLog = "🤖 **Gestionez agenții AI...**\n\n";
    const { action, agent_id, agent_name, system_prompt, voice_id, description, new_name } = args;

    switch (action) {
      case 'list':
        const agents = await getUserAgents(userId);
        stepLog += `📋 **Lista agenți (${agents.length} total):**\n`;
        agents.forEach((agent: any, index: number) => {
          const status = agent.is_active ? '🟢 Activ' : '🔴 Inactiv';
          stepLog += `${index + 1}. **${agent.name}** ${status}\n`;
          stepLog += `   • ID: ${agent.agent_id || agent.elevenlabs_agent_id}\n`;
          stepLog += `   • Tip: ${agent.description || 'General'}\n`;
          if (agent.voice_id) stepLog += `   • Voce: ${agent.voice_id}\n`;
          stepLog += `\n`;
        });
        break;

      case 'get_details':
        if (!agent_id) throw new Error('ID agent necesar pentru detalii');
        const { data: agentDetails } = await supabase
          .from('kalina_agents')
          .select('*')
          .eq('user_id', userId)
          .or(`agent_id.eq.${agent_id},elevenlabs_agent_id.eq.${agent_id}`)
          .single();

        if (!agentDetails) throw new Error('Agent nu a fost găsit');

        stepLog += `🔍 **Detalii agent "${agentDetails.name}":**\n`;
        stepLog += `   • ID: ${agentDetails.agent_id || agentDetails.elevenlabs_agent_id}\n`;
        stepLog += `   • Status: ${agentDetails.is_active ? '🟢 Activ' : '🔴 Inactiv'}\n`;
        stepLog += `   • Descriere: ${agentDetails.description || 'Fără descriere'}\n`;
        stepLog += `   • Voce: ${agentDetails.voice_id}\n`;
        stepLog += `   • Provider: ${agentDetails.provider || 'custom'}\n`;
        stepLog += `   • Creat: ${new Date(agentDetails.created_at).toLocaleDateString('ro-RO')}\n`;
        if (agentDetails.system_prompt) {
          stepLog += `   • Prompt: ${agentDetails.system_prompt.substring(0, 100)}...\n`;
        }
        break;

      case 'update':
        if (!agent_id) throw new Error('ID agent necesar pentru actualizare');
        
        const updateData: any = {};
        if (agent_name) updateData.name = agent_name;
        if (system_prompt) updateData.system_prompt = system_prompt;
        if (voice_id) updateData.voice_id = voice_id;
        if (description) updateData.description = description;
        updateData.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from('kalina_agents')
          .update(updateData)
          .eq('user_id', userId)
          .or(`agent_id.eq.${agent_id},elevenlabs_agent_id.eq.${agent_id}`);

        if (updateError) throw updateError;

        stepLog += `✅ **Agent actualizat cu succes!**\n`;
        stepLog += `   • Modificările au fost salvate\n`;
        if (agent_name) stepLog += `   • Nume nou: ${agent_name}\n`;
        if (description) stepLog += `   • Descriere nouă: ${description}\n`;
        break;

      case 'activate':
      case 'deactivate':
        if (!agent_id) throw new Error('ID agent necesar');
        
        const isActive = action === 'activate';
        const { error: statusError } = await supabase
          .from('kalina_agents')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .or(`agent_id.eq.${agent_id},elevenlabs_agent_id.eq.${agent_id}`);

        if (statusError) throw statusError;

        stepLog += `✅ **Agent ${isActive ? 'activat' : 'dezactivat'} cu succes!**\n`;
        stepLog += `   • Status nou: ${isActive ? '🟢 Activ' : '🔴 Inactiv'}\n`;
        break;

      case 'delete':
        if (!agent_id) throw new Error('ID agent necesar pentru ștergere');
        
        const { error: deleteError } = await supabase
          .from('kalina_agents')
          .delete()
          .eq('user_id', userId)
          .or(`agent_id.eq.${agent_id},elevenlabs_agent_id.eq.${agent_id}`);

        if (deleteError) throw deleteError;

        stepLog += `✅ **Agent șters cu succes!**\n`;
        stepLog += `   • Agentul a fost eliminat din baza de date\n`;
        stepLog += `   • ⚠️ Această acțiune nu poate fi anulată\n`;
        break;

      case 'clone':
        if (!agent_id || !new_name) throw new Error('ID agent și nume nou necesare pentru clonare');
        
        const { data: originalAgent } = await supabase
          .from('kalina_agents')
          .select('*')
          .eq('user_id', userId)
          .or(`agent_id.eq.${agent_id},elevenlabs_agent_id.eq.${agent_id}`)
          .single();

        if (!originalAgent) throw new Error('Agent original nu a fost găsit');

        // Create cloned agent in database
        const { data: clonedAgent, error: cloneError } = await supabase
          .from('kalina_agents')
          .insert({
            user_id: userId,
            name: new_name,
            description: `Clonat din ${originalAgent.name}`,
            system_prompt: originalAgent.system_prompt,
            voice_id: originalAgent.voice_id,
            provider: originalAgent.provider,
            is_active: false
          })
          .select()
          .single();

        if (cloneError) throw cloneError;

        stepLog += `✅ **Agent clonat cu succes!**\n`;
        stepLog += `   • Nume nou: ${new_name}\n`;
        stepLog += `   • Status: 🔴 Inactiv (se va activa manual)\n`;
        stepLog += `   • ID nou: ${clonedAgent.id}\n`;
        break;

      default:
        throw new Error(`Acțiune necunoscută: ${action}`);
    }

    return {
      success: true,
      message: stepLog,
      data: null
    };

  } catch (error) {
    console.error('Error in executeManageAgent:', error);
    return {
      success: false,
      message: `❌ **Eroare la gestionarea agentului:** ${error.message}`,
      data: null
    };
  }
};

// === CONTACT MANAGEMENT FUNCTIONS ===
const executeManageContacts = async (userId: string, args: any) => {
  try {
    let stepLog = "👥 **Gestionez contactele...**\n\n";
    const { action, contact_id, nume, telefon, email, company, locatie, notes, tags, csv_data } = args;

    switch (action) {
      case 'list':
        const contacts = await getUserContacts(userId);
        stepLog += `📋 **Lista contacte (${contacts.length} total):**\n`;
        contacts.forEach((contact: any, index: number) => {
          stepLog += `${index + 1}. **${contact.nume}** - ${contact.telefon}\n`;
          if (contact.company) stepLog += `   • Companie: ${contact.company}\n`;
          if (contact.email) stepLog += `   • Email: ${contact.email}\n`;
          if (contact.locatie) stepLog += `   • Locație: ${contact.locatie}\n`;
          stepLog += `\n`;
        });
        break;

      case 'create':
        if (!nume || !telefon) throw new Error('Nume și telefon sunt obligatorii');
        
        const { data: newContact, error: createError } = await supabase
          .from('contacts_database')
          .insert({
            user_id: userId,
            nume,
            telefon,
            email,
            company,
            locatie,
            notes,
            tags,
            status: 'active'
          })
          .select()
          .single();

        if (createError) throw createError;

        stepLog += `✅ **Contact creat cu succes!**\n`;
        stepLog += `   • Nume: ${nume}\n`;
        stepLog += `   • Telefon: ${telefon}\n`;
        if (email) stepLog += `   • Email: ${email}\n`;
        if (company) stepLog += `   • Companie: ${company}\n`;
        break;

      case 'update':
        if (!contact_id) throw new Error('ID contact necesar pentru actualizare');
        
        const updateData: any = {};
        if (nume) updateData.nume = nume;
        if (telefon) updateData.telefon = telefon;
        if (email) updateData.email = email;
        if (company) updateData.company = company;
        if (locatie) updateData.locatie = locatie;
        if (notes) updateData.notes = notes;
        if (tags) updateData.tags = tags;
        updateData.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from('contacts_database')
          .update(updateData)
          .eq('id', contact_id)
          .eq('user_id', userId);

        if (updateError) throw updateError;

        stepLog += `✅ **Contact actualizat cu succes!**\n`;
        stepLog += `   • Modificările au fost salvate\n`;
        break;

      case 'delete':
        if (!contact_id) throw new Error('ID contact necesar pentru ștergere');
        
        const { error: deleteError } = await supabase
          .from('contacts_database')
          .delete()
          .eq('id', contact_id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        stepLog += `✅ **Contact șters cu succes!**\n`;
        stepLog += `   • Contactul a fost eliminat din baza de date\n`;
        break;

      case 'import_csv':
        if (!csv_data) throw new Error('Date CSV necesare pentru import');
        
        const lines = csv_data.split('\n').filter(line => line.trim());
        const importedContacts = [];
        let errors = 0;

        for (let i = 0; i < lines.length; i++) {
          try {
            const [csvNume, csvTelefon, csvEmail, csvCompany] = lines[i].split(',').map(s => s.trim());
            if (csvNume && csvTelefon) {
              const { error } = await supabase
                .from('contacts_database')
                .insert({
                  user_id: userId,
                  nume: csvNume,
                  telefon: csvTelefon,
                  email: csvEmail || null,
                  company: csvCompany || null,
                  status: 'active'
                });

              if (!error) {
                importedContacts.push(csvNume);
              } else {
                errors++;
              }
            }
          } catch {
            errors++;
          }
        }

        stepLog += `✅ **Import CSV finalizat!**\n`;
        stepLog += `   • Contacte importate: ${importedContacts.length}\n`;
        if (errors > 0) stepLog += `   • Erori: ${errors}\n`;
        break;

      case 'export_csv':
        const exportContacts = await getUserContacts(userId);
        let csvContent = 'Nume,Telefon,Email,Companie,Locatie\n';
        exportContacts.forEach(contact => {
          csvContent += `"${contact.nume}","${contact.telefon}","${contact.email || ''}","${contact.company || ''}","${contact.locatie || ''}"\n`;
        });

        stepLog += `✅ **Export CSV pregătit!**\n`;
        stepLog += `   • Total contacte: ${exportContacts.length}\n`;
        stepLog += `   • Format: CSV standard\n`;
        stepLog += `\n📄 **Date CSV:**\n\`\`\`\n${csvContent.substring(0, 500)}...\n\`\`\`\n`;
        break;

      default:
        throw new Error(`Acțiune necunoscută: ${action}`);
    }

    return {
      success: true,
      message: stepLog,
      data: null
    };

  } catch (error) {
    console.error('Error in executeManageContacts:', error);
    return {
      success: false,
      message: `❌ **Eroare la gestionarea contactelor:** ${error.message}`,
      data: null
    };
  }
};

// === CAMPAIGN MANAGEMENT FUNCTIONS ===
const executeManageCampaigns = async (userId: string, args: any) => {
  try {
    let stepLog = "📢 **Gestionez campaniile...**\n\n";
    const { action, campaign_id, name, description, agent_id, contacts, sms_enabled, sms_message } = args;

    switch (action) {
      case 'list':
        const campaigns = await getUserCampaigns(userId);
        stepLog += `📋 **Lista campanii (${campaigns.length} total):**\n`;
        campaigns.forEach((campaign: any, index: number) => {
          const status = campaign.status || 'draft';
          const statusIcon = status === 'active' ? '🟢' : status === 'completed' ? '✅' : '⏸️';
          stepLog += `${index + 1}. **${campaign.name}** ${statusIcon} ${status}\n`;
          stepLog += `   • Total contacte: ${campaign.total_contacts || 0}\n`;
          stepLog += `   • Apeluri efectuate: ${campaign.called_contacts || 0}\n`;
          stepLog += `   • Reușite: ${campaign.successful_calls || 0}\n`;
          stepLog += `\n`;
        });
        break;

      case 'create':
        if (!name) throw new Error('Numele campaniei este obligatoriu');
        
        const { data: newCampaign, error: createError } = await supabase
          .from('campaigns')
          .insert({
            user_id: userId,
            name,
            description,
            agent_id,
            sms_enabled: sms_enabled || false,
            sms_message,
            status: 'draft',
            total_contacts: contacts ? contacts.length : 0
          })
          .select()
          .single();

        if (createError) throw createError;

        stepLog += `✅ **Campanie creată cu succes!**\n`;
        stepLog += `   • Nume: ${name}\n`;
        stepLog += `   • Status: 📝 Draft\n`;
        if (agent_id) stepLog += `   • Agent: ${agent_id}\n`;
        if (contacts) stepLog += `   • Contacte: ${contacts.length}\n`;
        break;

      case 'start':
        if (!campaign_id) throw new Error('ID campanie necesar');
        
        const { error: startError } = await supabase
          .from('campaigns')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString() 
          })
          .eq('id', campaign_id)
          .eq('user_id', userId);

        if (startError) throw startError;

        stepLog += `✅ **Kampanie pornită cu succes!**\n`;
        stepLog += `   • Status: 🟢 Activă\n`;
        stepLog += `   • Apelurile vor începe în curând\n`;
        break;

      case 'stop':
        if (!campaign_id) throw new Error('ID campanie necesar');
        
        const { error: stopError } = await supabase
          .from('campaigns')
          .update({ 
            status: 'paused',
            updated_at: new Date().toISOString() 
          })
          .eq('id', campaign_id)
          .eq('user_id', userId);

        if (stopError) throw stopError;

        stepLog += `✅ **Campanie oprită cu succes!**\n`;
        stepLog += `   • Status: ⏸️ Pauză\n`;
        stepLog += `   • Apelurile au fost oprite\n`;
        break;

      default:
        throw new Error(`Acțiune necunoscută: ${action}`);
    }

    return {
      success: true,
      message: stepLog,
      data: null
    };

  } catch (error) {
    console.error('Error in executeManageCampaigns:', error);
    return {
      success: false,
      message: `❌ **Eroare la gestionarea campaniei:** ${error.message}`,
      data: null
    };
  }
};

// === DOCUMENT MANAGEMENT FUNCTIONS ===
const executeManageDocuments = async (userId: string, args: any) => {
  try {
    let stepLog = "📚 **Gestionez documentele...**\n\n";
    const { action, document_id, agent_id, document_name, document_content, file_type } = args;

    switch (action) {
      case 'list':
        const documents = await getUserKnowledgeDocuments(userId);
        stepLog += `📋 **Lista documente (${documents.length} total):**\n`;
        documents.forEach((doc: any, index: number) => {
          stepLog += `${index + 1}. **${doc.name}**\n`;
          stepLog += `   • Tip: ${doc.file_type || 'text'}\n`;
          stepLog += `   • Mărime: ${doc.content?.length || 0} caractere\n`;
          stepLog += `   • Creat: ${new Date(doc.created_at).toLocaleDateString('ro-RO')}\n`;
          stepLog += `\n`;
        });
        break;

      case 'upload':
        if (!document_name || !document_content) throw new Error('Nume și conținut document necesare');
        
        const { data: newDoc, error: uploadError } = await supabase
          .from('knowledge_documents')
          .insert({
            user_id: userId,
            name: document_name,
            content: document_content,
            file_type: file_type || 'text'
          })
          .select()
          .single();

        if (uploadError) throw uploadError;

        stepLog += `✅ **Document încărcat cu succes!**\n`;
        stepLog += `   • Nume: ${document_name}\n`;
        stepLog += `   • Tip: ${file_type || 'text'}\n`;
        stepLog += `   • Mărime: ${document_content.length} caractere\n`;
        break;

      case 'delete':
        if (!document_id) throw new Error('ID document necesar pentru ștergere');
        
        const { error: deleteError } = await supabase
          .from('knowledge_documents')
          .delete()
          .eq('id', document_id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        stepLog += `✅ **Document șters cu succes!**\n`;
        stepLog += `   • Documentul a fost eliminat din baza de date\n`;
        break;

      case 'link_to_agent':
        if (!document_id || !agent_id) throw new Error('ID document și agent necesare');
        
        const { error: linkError } = await supabase
          .from('agent_documents')
          .insert({
            agent_id,
            document_id
          });

        if (linkError) throw linkError;

        stepLog += `✅ **Document asociat cu agentul!**\n`;
        stepLog += `   • Documentul este acum disponibil pentru agent\n`;
        break;

      default:
        throw new Error(`Acțiune necunoscută: ${action}`);
    }

    return {
      success: true,
      message: stepLog,
      data: null
    };

  } catch (error) {
    console.error('Error in executeManageDocuments:', error);
    return {
      success: false,
      message: `❌ **Eroare la gestionarea documentelor:** ${error.message}`,
      data: null
    };
  }
};

// === SYSTEM CONFIGURATION FUNCTIONS ===
const executeSystemConfig = async (userId: string, args: any) => {
  try {
    let stepLog = "⚙️ **Configurez sistemul...**\n\n";
    const { action, phone_number, label } = args;

    switch (action) {
      case 'list_phone_numbers':
        const phoneNumbers = await getUserPhoneNumbers(userId);
        stepLog += `📞 **Numere de telefon (${phoneNumbers.length} total):**\n`;
        phoneNumbers.forEach((phone: any, index: number) => {
          const isPrimary = phone.is_primary ? '⭐ Principal' : '';
          stepLog += `${index + 1}. **${phone.phone_number}** ${isPrimary}\n`;
          stepLog += `   • Etichetă: ${phone.label || 'Fără etichetă'}\n`;
          stepLog += `   • Status: ${phone.status || 'active'}\n`;
          stepLog += `\n`;
        });
        break;

      case 'get_system_status':
        const userStats = await getUserStatistics(userId);
        stepLog += `📊 **Status sistem pentru utilizator:**\n`;
        stepLog += `   • Balanță: $${userStats.balance?.balance_usd || 0}\n`;
        stepLog += `   • Total apeluri: ${userStats.stats?.total_voice_calls || 0}\n`;
        stepLog += `   • Total minute: ${userStats.stats?.total_minutes_talked || 0}\n`;
        stepLog += `   • Total cheltuit: $${userStats.stats?.total_spent_usd || 0}\n`;
        
        const agents = await getUserAgents(userId);
        const activeAgents = agents.filter(a => a.is_active).length;
        stepLog += `   • Agenți activi: ${activeAgents}/${agents.length}\n`;
        break;

      case 'check_balance':
        const balance = await getUserStatistics(userId);
        stepLog += `💰 **Balanță cont:**\n`;
        stepLog += `   • Balanța curentă: $${balance.balance?.balance_usd || 0}\n`;
        
        const transactions = await getBalanceTransactions(userId);
        if (transactions && transactions.length > 0) {
          stepLog += `   • Ultima tranzacție: ${transactions[0].description}\n`;
          stepLog += `   • Suma: $${transactions[0].amount}\n`;
          stepLog += `   • Data: ${new Date(transactions[0].created_at).toLocaleDateString('ro-RO')}\n`;
        }
        break;

      default:
        throw new Error(`Acțiune necunoscută: ${action}`);
    }

    return {
      success: true,
      message: stepLog,
      data: null
    };

  } catch (error) {
    console.error('Error in executeSystemConfig:', error);
    return {
      success: false,
      message: `❌ **Eroare la configurarea sistemului:** ${error.message}`,
      data: null
    };
  }
};

// === ANALYTICS & REPORTING FUNCTIONS ===
const executeAnalyticsReporting = async (userId: string, args: any) => {
  try {
    let stepLog = "📊 **Generez analize și rapoarte...**\n\n";
    const { action, report_type, start_date, end_date, export_format, agent_id } = args;

    switch (action) {
      case 'generate_report':
        stepLog += `📈 **Raport ${report_type || 'general'}:**\n`;
        
        const userStats = await getUserStatistics(userId);
        const allCalls = await getAllCallHistory(userId);
        
        stepLog += `   • Perioada: ${report_type || 'toată perioada'}\n`;
        stepLog += `   • Total apeluri: ${allCalls.length}\n`;
        
        const successful = allCalls.filter(call => call.call_status === 'completed').length;
        const failed = allCalls.length - successful;
        stepLog += `   • Apeluri reușite: ${successful} (${((successful/allCalls.length)*100).toFixed(1)}%)\n`;
        stepLog += `   • Apeluri eșuate: ${failed} (${((failed/allCalls.length)*100).toFixed(1)}%)\n`;
        
        const totalCost = allCalls.reduce((sum, call) => sum + (Number(call.cost_usd) || 0), 0);
        stepLog += `   • Cost total: $${totalCost.toFixed(4)}\n`;
        
        const totalDuration = allCalls.reduce((sum, call) => sum + (Number(call.duration_seconds) || 0), 0);
        stepLog += `   • Timp total: ${Math.round(totalDuration / 60)} minute\n`;
        break;

      case 'call_analytics':
        const todaysCalls = await getTodaysCallHistory(userId);
        const yesterdaysCalls = await getYesterdayCallHistory(userId);
        
        stepLog += `📞 **Analiză apeluri:**\n`;
        stepLog += `   • Astăzi: ${todaysCalls.length} apeluri\n`;
        stepLog += `   • Ieri: ${yesterdaysCalls.length} apeluri\n`;
        
        if (todaysCalls.length > 0) {
          const avgDuration = todaysCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / todaysCalls.length;
          stepLog += `   • Durată medie astăzi: ${Math.round(avgDuration / 60)} minute\n`;
        }
        break;

      case 'agent_performance':
        const agents = await getUserAgents(userId);
        stepLog += `🤖 **Performanță agenți:**\n`;
        
        for (const agent of agents) {
          const agentCalls = allCalls.filter(call => call.agent_id === agent.agent_id);
          stepLog += `   • **${agent.name}**: ${agentCalls.length} apeluri\n`;
        }
        break;

      default:
        throw new Error(`Acțiune necunoscută: ${action}`);
    }

    return {
      success: true,
      message: stepLog,
      data: null
    };

  } catch (error) {
    console.error('Error in executeAnalyticsReporting:', error);
    return {
      success: false,
      message: `❌ **Eroare la generarea raportului:** ${error.message}`,
      data: null
    };
  }
};

// === USER CLARIFICATION FUNCTIONS ===
const executeClarifyIntent = async (args: any) => {
  try {
    const { clarification_type, question, options, suggested_action } = args;
    let stepLog = "🤔 **Solicit clarificări...**\n\n";

    stepLog += `❓ **${question}**\n\n`;

    if (options && options.length > 0) {
      stepLog += `📋 **Opțiuni disponibile:**\n`;
      options.forEach((option: string, index: number) => {
        stepLog += `${index + 1}. ${option}\n`;
      });
      stepLog += `\n`;
    }

    if (suggested_action) {
      stepLog += `💡 **Sugestie:** ${suggested_action}\n\n`;
    }

    switch (clarification_type) {
      case 'unclear_request':
        stepLog += `ℹ️ Te rog să oferi mai multe detalii pentru a putea să te ajut mai binet.`;
        break;
      case 'multiple_options':
        stepLog += `ℹ️ Te rog să alegi una dintre opțiunile de mai sus.`;
        break;
      case 'missing_info':
        stepLog += `ℹ️ Te rog să completezi informațiile lipsă.`;
        break;
      case 'confirm_action':
        stepLog += `⚠️ Te rog să confirmi dacă vrei să continui cu această acțiune.`;
        break;
      default:
        stepLog += `ℹ️ Te rog să clarifici cererea pentru a putea să te ajut.`;
    }

    return {
      success: true,
      message: stepLog,
      data: { clarification_type, question, options, suggested_action }
    };

  } catch (error) {
    console.error('Error in executeClarifyIntent:', error);
    return {
      success: false,
      message: `❌ **Eroare la cererea de clarificare:** ${error.message}`,
      data: null
    };
  }
};

// Tool definitions for OpenAI function calling
// 🛠️ TOOLS MCP - ACCES TOTAL PLATFORMĂ
const tools = [
  // === DATA ACCESS & ANALYSIS ===
  {
    type: "function",
    function: {
      name: "get_conversation_details",
      description: "Obține detaliile complete ale unei conversații, inclusiv transcript-ul complet și analiza",
      parameters: {
        type: "object",
        properties: {
          conversation_id: {
            type: "string",
            description: "ID-ul conversației de analizat"
          }
        },
        required: ["conversation_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_historical_data",
      description: "Obține date istorice despre apeluri, agenți sau activitate din orice perioadă. FOLOSEȘTE ACEASTĂ FUNCȚIE pentru toate întrebările despre date din trecut! Pentru întrebări despre 'ultimii X oameni' sau 'ultimele conversații', folosește time_period: 'recent' sau 'all'.",
      parameters: {
        type: "object",
        properties: {
          data_type: {
            type: "string",
            enum: ['calls', 'agents', 'contacts', 'campaigns', 'statistics'],
            description: "Tipul de date solicitate"
          },
          time_period: {
            type: "string",
            enum: ['today', 'yesterday', 'last_week', 'last_month', 'recent', 'all', 'custom'],
            description: "Perioada pentru care se solicită datele. Folosește 'recent' sau 'all' pentru ultimele conversații/apeluri."
          },
          start_date: {
            type: "string",
            description: "Data de început (format YYYY-MM-DD) pentru perioada custom"
          },
          end_date: {
            type: "string", 
            description: "Data de sfârșit (format YYYY-MM-DD) pentru perioada custom"
          }
        },
        required: ["data_type", "time_period"]
      }
    }
  },

  // === AGENT MANAGEMENT ===
  {
    type: "function",
    function: {
      name: "create_agent",
      description: "Creează un nou agent AI pentru apeluri. Oferă opțiuni multiple și explică fiecare pas.",
      parameters: {
        type: "object",
        properties: {
          agent_name: {
            type: "string",
            description: "Numele agentului"
          },
          agent_type: {
            type: "string",
            enum: ['sales', 'support', 'consultant', 'marketing'],
            description: "Tipul agentului - sales (vânzări), support (suport client), consultant (consultanță), marketing (promovare)"
          },
          custom_prompt: {
            type: "string",
            description: "Prompt personalizat pentru agent (opțional)"
          }
        },
        required: ["agent_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "manage_agent",
      description: "Gestionează agenți existenți - editează, șterge, testează, clonează sau obține detalii",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["update", "delete", "clone", "test", "list", "get_details", "activate", "deactivate"],
            description: "Acțiunea care va fi executată asupra agentului"
          },
          agent_id: {
            type: "string",
            description: "ID-ul agentului (pentru update, delete, clone, test, get_details)"
          },
          agent_name: {
            type: "string",
            description: "Numele nou al agentului (pentru update)"
          },
          system_prompt: {
            type: "string",
            description: "Prompt-ul nou pentru agent (pentru update)"
          },
          voice_id: {
            type: "string",
            description: "ID-ul vocii noi (pentru update)"
          },
          description: {
            type: "string",
            description: "Descrierea nouă (pentru update)"
          },
          new_name: {
            type: "string",
            description: "Numele pentru agentul clonat (pentru clone)"
          }
        },
        required: ["action"]
      }
    }
  },

  // === CALL MANAGEMENT ===
  {
    type: "function",
    function: {
      name: "initiate_call",
      description: "Inițiază un apel telefonic către un contact folosind un agent AI. FOLOSEȘTE ACEASTĂ FUNCȚIE când utilizatorul cere să sune pe cineva.",
      parameters: {
        type: "object",
        properties: {
          contact_name: {
            type: "string",
            description: "Numele persoanei care va fi sunată"
          },
          phone_number: {
            type: "string",
            description: "Numărul de telefon (format internațional cu +)"
          },
          agent_type: {
            type: "string",
            description: "Tipul de agent dorit (ex: vânzări, suport, consultanță)"
          }
        },
        required: ["contact_name", "phone_number"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "find_agent",
      description: "Găsește agenți AI potriviți pe baza unei descrieri sau tipului dorit",
      parameters: {
        type: "object",
        properties: {
          agent_type: {
            type: "string",
            description: "Tipul sau descrierea agentului căutat"
          }
        },
        required: ["agent_type"]
      }
    }
  },

  // === CONTACT MANAGEMENT ===
  {
    type: "function",
    function: {
      name: "search_contact",
      description: "Caută contacte în baza de date pe baza numelui, telefonului sau companiei",
      parameters: {
        type: "object", 
        properties: {
          query: {
            type: "string",
            description: "Termenul de căutare (nume, telefon sau companie)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "manage_contacts",
      description: "Gestionează contactele - creează, editează, șterge, caută sau face import/export",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["create", "update", "delete", "list", "get_details", "import_csv", "export_csv"],
            description: "Acțiunea care va fi executată"
          },
          contact_id: {
            type: "string",
            description: "ID-ul contactului (pentru update, delete, get_details)"
          },
          nume: {
            type: "string",
            description: "Numele contactului"
          },
          telefon: {
            type: "string",
            description: "Numărul de telefon"
          },
          email: {
            type: "string",
            description: "Adresa de email"
          },
          company: {
            type: "string",
            description: "Compania"
          },
          locatie: {
            type: "string",
            description: "Locația"
          },
          notes: {
            type: "string",
            description: "Note despre contact"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tag-uri pentru contact"
          },
          csv_data: {
            type: "string",
            description: "Datele CSV pentru import (format: nume,telefon,email,company)"
          }
        },
        required: ["action"]
      }
    }
  },

  // === CAMPAIGN MANAGEMENT ===
  {
    type: "function",
    function: {
      name: "manage_campaigns",
      description: "Gestionează campaniile - creează, editează, start/stop, analizează rezultate",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["create", "update", "start", "stop", "pause", "delete", "list", "get_results", "get_details"],
            description: "Acțiunea care va fi executată"
          },
          campaign_id: {
            type: "string",
            description: "ID-ul campaniei (pentru update, start, stop, delete, get_results)"
          },
          name: {
            type: "string",
            description: "Numele campaniei"
          },
          description: {
            type: "string",
            description: "Descrierea campaniei"
          },
          agent_id: {
            type: "string",
            description: "ID-ul agentului pentru campanie"
          },
          contacts: {
            type: "array",
            items: { type: "string" },
            description: "Lista de ID-uri ale contactelor"
          },
          sms_enabled: {
            type: "boolean",
            description: "Dacă SMS-ul este activat"
          },
          sms_message: {
            type: "string",
            description: "Mesajul SMS"
          }
        },
        required: ["action"]
      }
    }
  },

  // === DOCUMENT & KNOWLEDGE BASE ===
  {
    type: "function",
    function: {
      name: "manage_documents",
      description: "Gestionează documentele și knowledge base - upload, editare, ștergere, asociere cu agenți",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["upload", "delete", "list", "link_to_agent", "unlink_from_agent", "get_agent_documents"],
            description: "Acțiunea care va fi executată"
          },
          document_id: {
            type: "string",
            description: "ID-ul documentului (pentru delete, link, unlink)"
          },
          agent_id: {
            type: "string",
            description: "ID-ul agentului (pentru link, unlink, get_agent_documents)"
          },
          document_name: {
            type: "string",
            description: "Numele documentului (pentru upload)"
          },
          document_content: {
            type: "string",
            description: "Conținutul documentului (pentru upload)"
          },
          file_type: {
            type: "string",
            description: "Tipul fișierului (pentru upload)"
          }
        },
        required: ["action"]
      }
    }
  },

  // === SYSTEM CONFIGURATION ===
  {
    type: "function",
    function: {
      name: "system_config",
      description: "Configurează sistemul - numere telefon, webhook-uri, setări avansate",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list_phone_numbers", "add_phone_number", "update_phone_number", "delete_phone_number", "get_system_status", "check_balance", "view_settings"],
            description: "Acțiunea de configurare"
          },
          phone_number: {
            type: "string",
            description: "Numărul de telefon"
          },
          label: {
            type: "string",
            description: "Eticheta pentru numărul de telefon"
          }
        },
        required: ["action"]
      }
    }
  },

  // === ANALYTICS & REPORTING ===
  {
    type: "function",
    function: {
      name: "analytics_reporting",
      description: "Generează rapoarte și analize - rapoarte personalizate, export date, analize sentiment",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["generate_report", "export_data", "analyze_sentiment", "get_dashboard_data", "call_analytics", "agent_performance"],
            description: "Tipul de analiză sau raport"
          },
          report_type: {
            type: "string",
            enum: ["daily", "weekly", "monthly", "custom"],
            description: "Tipul raportului"
          },
          start_date: {
            type: "string",
            description: "Data de început pentru raport"
          },
          end_date: {
            type: "string",
            description: "Data de sfârșit pentru raport"
          },
          export_format: {
            type: "string",
            enum: ["csv", "excel", "json"],
            description: "Formatul de export"
          },
          agent_id: {
            type: "string",
            description: "ID-ul agentului pentru analiză specifică"
          }
        },
        required: ["action"]
      }
    }
  },

  // === SCHEDULING & CALLBACKS ===
  {
    type: "function",
    function: {
      name: "schedule_callback",
      description: "Programează un callback pentru o dată și oră viitoare",
      parameters: {
        type: "object",
        properties: {
          client_name: {
            type: "string",
            description: "Numele clientului"
          },
          phone_number: {
            type: "string", 
            description: "Numărul de telefon"
          },
          scheduled_time: {
            type: "string",
            description: "Data și ora programată (format ISO)"
          },
          reason: {
            type: "string",
            description: "Motivul callback-ului"
          }
        },
        required: ["client_name", "phone_number", "scheduled_time"]
      }
    }
  },

  // === USER CLARIFICATION & LEARNING ===
  {
    type: "function",
    function: {
      name: "clarify_intent",
      description: "Întreabă utilizatorul pentru clarificări când ceva nu este clar sau oferă sugestii alternative",
      parameters: {
        type: "object",
        properties: {
          clarification_type: {
            type: "string",
            enum: ["unclear_request", "multiple_options", "missing_info", "suggest_alternatives", "confirm_action"],
            description: "Tipul clarificării necesare"
          },
          question: {
            type: "string",
            description: "Întrebarea specifică pentru utilizator"
          },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Opțiunile disponibile (dacă este cazul)"
          },
          suggested_action: {
            type: "string",
            description: "Acțiunea sugerată"
          }
        },
        required: ["clarification_type", "question"]
      }
    }
  }
];

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { message, userId, model, agentId, systemPrompt } = validateInput(requestData);

    console.log('Processing chat message:', { message, userId, model, agentId });

    // Extrage TOATE datele utilizatorului pentru context complet
    const [
      userStats, todaysCalls, yesterdaysCalls, allCalls, userAgents, conversations,
      contacts, campaigns, phoneNumbers, activeAgents, documents,
      callbacks, transactions, analytics
    ] = await Promise.all([
      getUserStatistics(userId),
      getTodaysCallHistory(userId),
      getYesterdayCallHistory(userId),
      getAllCallHistory(userId),
      getUserAgents(userId),
      getUserConversations(userId),
      getUserContacts(userId),
      getUserCampaigns(userId),
      getUserPhoneNumbers(userId),
      getUserActiveAgents(userId),
      getUserKnowledgeDocuments(userId),
      getCallbackRequests(userId),
      getBalanceTransactions(userId),
      getConversationAnalytics(userId)
    ]);

    // Generează contextul complet cu TOATE datele utilizatorului
    const userContext = generateUserContext({
      ...userStats,
      todaysCalls,
      yesterdaysCalls,
      allCalls,
      agents: userAgents,
      conversations,
      contacts,
      campaigns,
      phoneNumbers,
      activeAgents,
      documents,
      callbacks,
      transactions,
      analytics
    });

    let contextText = '';
    
    // Dacă avem un agent ID, căutăm în documentele sale folosind embedding-uri
    if (agentId) {
      try {
        // Vector search implementation
        // Fetch agent's knowledge documents embeddings and perform similarity search
        const { data: agentDocs } = await supabase
          .from('knowledge_documents')
          .select('id, content, embedding')
          .eq('agent_id', agentId);

        if (agentDocs && agentDocs.length > 0) {
          // For simplicity, concatenate top 3 documents content as context
          contextText = agentDocs.slice(0, 3).map((doc: any) => doc.content).join('\n\n');
        }
      } catch (error) {
        console.error('Error in vector search:', error);
      }
    }

    // Pas 3: Creează prompt-ul pentru OpenAI cu context complet
    const finalSystemPrompt = systemPrompt || `Ești JARVIS, asistentul AI personal al utilizatorului pentru platforma Kalina. Ești foarte inteligent, prietenos și eficient.

INFORMAȚII IMPORTANTE:
- Utilizatorul are acces COMPLET la toată istorica sa de apeluri și date din contul său
- Poți accesa informații despre apelurile de azi, ieri și din orice perioadă din trecut
- Ai acces la toate agentii, contactele și campaniile utilizatorului  
- Poți inițializa apeluri, căuta contacte, programa callback-uri și crea agenți
- NICIODATĂ nu spune că nu ai acces la datele istorice - le ai!

CONTEXT UTILIZATOR (include date de azi ȘI ieri):
${userContext}

${contextText ? `INFORMAȚII SPECIFICE DIN BAZA DE CUNOȘTINȚE:
${contextText}

` : ''}INSTRUCȚIUNI SPECIALE - RAPORTARE PAS CU PAS:
1. 🔍 Când cauți ceva, spune "🔍 **Caut [ce cauți]...**"
2. 📊 Când analizezi date, spune "📊 **Analizez istoricul...**" 
3. 🚀 Când inițiezi acțiuni, spune "🚀 **Inițiez [acțiunea]...**"
4. ✅ Când reușești, spune "✅ **[Rezultatul pozitiv]**"
5. ❌ Când eșuezi, spune "❌ **[Problema și soluția]**"

PENTRU ÎNTREBĂRI DESPRE CONVERSAȚII/APELURI RECENTE:
- Când utilizatorul întreabă despre "ultimii X oameni" sau "ultimele conversații", FOLOSEȘTE tool-ul get_historical_data
- Setează time_period la "recent" sau "all" pentru a obține ultimele conversații
- Nu spune niciodată că nu ai acces la date - ai acces complet la istoricul utilizatorului!

PENTRU APELURI:
- Verifică ÎNTOTDEAUNA istoricul contactului înainte de apel
- Raportează: "📞 **Am găsit contactul [nume] în istoric:**\n   • Total apeluri: X\n   • Apeluri reușite: Y\n   • Ultimul apel: [dată]"

PENTRU CREAREA AGENȚILOR:
- Raportează fiecare pas: generare prompt, configurare voce, testare
- Oferă opțiuni pentru tipuri de agenți (vânzări, suport, consultanță)

Folosește tool-urile disponibile pentru a ajuta utilizatorul cu toate nevoile sale.`;

    const messages = [
      { role: 'system', content: finalSystemPrompt },
      { role: 'user', content: message }
    ];

    // Pas 4: Trimite request la OpenAI cu tool calling
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.1, // Very low temperature for consistent tool usage
        tools: tools,
        tool_choice: "auto"
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to generate response');
    }

    const openaiData = await openaiResponse.json();
    const aiMessage = openaiData.choices[0]?.message;

    if (!aiMessage) {
      throw new Error('No response generated');
    }

    let finalResponse = aiMessage.content || '';
    let toolResults = [];

    // Handle tool calls if present
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      console.log('🛠️ Tool calls detected:', aiMessage.tool_calls.length);
      
      for (const toolCall of aiMessage.tool_calls) {
        console.log('Executing tool:', toolCall.function.name, toolCall.function.arguments);
        
        try {
          const args = JSON.parse(toolCall.function.arguments);
          let toolResult;
          
          switch (toolCall.function.name) {
            case 'get_conversation_details':
              toolResult = await executeGetConversationDetails(
                userId,
                args.conversation_id
              );
              break;
              
            case 'get_historical_data':
              const { data_type, time_period, start_date, end_date } = args;
              console.log('🔍 Getting historical data:', { data_type, time_period, start_date, end_date });
              
              let historicalData = '';
              let stepLog = `🔍 **Caut date istorice pentru ${data_type}...**\n\n`;
              
              try {
                if (data_type === 'calls') {
                  if (time_period === 'yesterday') {
                    const yesterdayData = await getYesterdayCallHistory(userId);
                    stepLog += `📊 **Analiza apeluri de ieri:**\n`;
                    stepLog += `   • Total apeluri: ${yesterdayData.length}\n`;
                    
                    const successful = yesterdayData.filter(call => call.call_status === 'completed').length;
                    const failed = yesterdayData.length - successful;
                    stepLog += `   • Apeluri reușite: ${successful}\n`;
                    stepLog += `   • Apeluri eșuate: ${failed}\n`;
                    
                    if (yesterdayData.length > 0) {
                      const avgDuration = yesterdayData.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / yesterdayData.length;
                      stepLog += `   • Durata medie: ${avgDuration.toFixed(1)} secunde\n`;
                      
                      // Show last 10 calls as examples
                      stepLog += `\n📞 **Ultimele 10 apeluri:**\n`;
                      yesterdayData.slice(0, 10).forEach((call: any, index: number) => {
                        const time = new Date(call.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
                        const status = call.call_status === 'completed' ? '✅' : call.call_status === 'failed' ? '❌' : '⏳';
                        stepLog += `${index + 1}. ${status} ${call.contact_name || call.phone_number} - ${time}\n`;
                      });
                    }
                    
                    historicalData = stepLog;
                    
                  } else if (time_period === 'today') {
                    const todayData = await getTodaysCallHistory(userId);
                    stepLog += `📊 **Analiza apeluri de azi:**\n`;
                    stepLog += `   • Total apeluri: ${todayData.length}\n`;
                    
                    const successful = todayData.filter(call => call.call_status === 'completed').length;
                    const failed = todayData.length - successful;
                    stepLog += `   • Apeluri reușite: ${successful}\n`;
                    stepLog += `   • Apeluri eșuate: ${failed}\n`;
                    
                    if (todayData.length > 0) {
                      const avgDuration = todayData.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / todayData.length;
                      stepLog += `   • Durata medie: ${avgDuration.toFixed(1)} secunde\n`;
                      
                      // Show last 10 calls as examples
                      stepLog += `\n📞 **Ultimele 10 apeluri:**\n`;
                      todayData.slice(0, 10).forEach((call: any, index: number) => {
                        const time = new Date(call.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
                        const status = call.call_status === 'completed' ? '✅' : call.call_status === 'failed' ? '❌' : '⏳';
                        stepLog += `${index + 1}. ${status} ${call.contact_name || call.phone_number} - ${time}\n`;
                      });
                    }
                    
                    historicalData = stepLog;
                    
                  } else if (time_period === 'last_week' || time_period === 'last_month') {
                    const days = time_period === 'last_week' ? 7 : 30;
                    const periodData = await getDateRangeCallHistory(userId, days);
                    
                    stepLog += `📊 **Analiza apeluri ultima ${time_period === 'last_week' ? 'săptămână' : 'lună'}:**\n`;
                    stepLog += `   • Total apeluri: ${periodData?.length || 0}\n`;
                    
                    if (periodData && periodData.length > 0) {
                      const successful = periodData.filter(call => call.call_status === 'completed').length;
                      const failed = periodData.length - successful;
                      stepLog += `   • Apeluri reușite: ${successful}\n`;
                      stepLog += `   • Apeluri eșuate: ${failed}\n`;
                      
                      const avgDuration = periodData.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / periodData.length;
                      stepLog += `   • Durata medie: ${avgDuration.toFixed(1)} secunde\n`;
                      
                      // Show last 15 calls as examples
                      stepLog += `\n📞 **Ultimele 15 apeluri:**\n`;
                      periodData.slice(0, 15).forEach((call: any, index: number) => {
                        const date = new Date(call.created_at).toLocaleDateString('ro-RO');
                        const time = new Date(call.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
                        const status = call.call_status === 'completed' ? '✅' : call.call_status === 'failed' ? '❌' : '⏳';
                        stepLog += `${index + 1}. ${status} ${call.contact_name || call.phone_number} - ${date} ${time}\n`;
                      });
                    }
                    
                    historicalData = stepLog;
                  } else if (time_period === 'recent' || time_period === 'all') {
                    // Handle queries like "last 40 people" or "recent conversations"
                    const recentData = await getAllCallHistory(userId);
                    
                    stepLog += `📊 **Analiza apeluri recente (ultimele ${recentData.length} apeluri):**\n`;
                    stepLog += `   • Total apeluri în istoric: ${recentData.length}\n`;
                    
                    if (recentData.length > 0) {
                      const successful = recentData.filter(call => call.call_status === 'completed').length;
                      const failed = recentData.length - successful;
                      stepLog += `   • Apeluri reușite: ${successful}\n`;
                      stepLog += `   • Apeluri eșuate: ${failed}\n`;
                      
                      const avgDuration = recentData.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / recentData.length;
                      stepLog += `   • Durata medie: ${avgDuration.toFixed(1)} secunde\n`;
                      
                      // Show last 40 calls as requested
                      const showCount = Math.min(40, recentData.length);
                      stepLog += `\n📞 **Ultimele ${showCount} apeluri/conversații:**\n`;
                      recentData.slice(0, showCount).forEach((call: any, index: number) => {
                        const date = new Date(call.created_at).toLocaleDateString('ro-RO');
                        const time = new Date(call.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
                        const status = call.call_status === 'completed' ? '✅' : call.call_status === 'failed' ? '❌' : '⏳';
                        const duration = call.duration_seconds ? `${Math.round(call.duration_seconds / 60)}min` : 'N/A';
                        stepLog += `${index + 1}. ${status} ${call.contact_name || call.phone_number} - ${duration} - ${date} ${time}\n`;
                      });
                      
                      if (recentData.length > 40) {
                        stepLog += `\n💡 **Notă:** Am afișat ultimele 40 de apeluri din totalul de ${recentData.length}. Pentru mai multe detalii, specifică perioada dorită.\n`;
                      }
                    }
                    
                    historicalData = stepLog;
                  }
                } else if (data_type === 'statistics') {
                  const { stats } = await getUserStatistics(userId);
                  stepLog += `📊 **Statistici generale utilizator:**\n`;
                  if (stats) {
                    stepLog += `   • Total minute vorbite: ${stats.total_minutes_talked || 0}\n`;
                    stepLog += `   • Total apeluri voce: ${stats.total_voice_calls || 0}\n`;
                    stepLog += `   • Total cheltuit: $${stats.total_spent_usd || 0}\n`;
                    stepLog += `   • Agenți folosiți: ${stats.agents_used || 0}\n`;
                  }
                  historicalData = stepLog;
                }
                
                stepLog += `\n✅ **Date găsite și procesate cu succes!**`;
                
              } catch (error) {
                console.error('Error getting historical data:', error);
                stepLog += `❌ **Eroare la obținerea datelor:**\n`;
                stepLog += `   • ${error.message}\n`;
              }
              
              toolResult = {
                success: true,
                message: historicalData || 'Nu am găsit date pentru perioada solicitată',
                data: null
              };
              break;
              
            case 'create_agent':
              toolResult = await executeCreateAgent(
                userId,
                args.agent_name,
                args.agent_type,
                args.custom_prompt
              );
              break;

            // === AGENT MANAGEMENT ===
            case 'manage_agent':
              toolResult = await executeManageAgent(userId, args);
              break;
              
            case 'initiate_call':
              toolResult = await executeInitiateCall(
                userId, 
                args.contact_name, 
                args.phone_number, 
                args.agent_type
              );
              break;
              
            case 'find_agent':
              toolResult = await executeFindAgent(userId, args.agent_type);
              break;

            // === CONTACT MANAGEMENT ===
            case 'search_contact':
              toolResult = await executeSearchContact(userId, args.query);
              break;

            case 'manage_contacts':
              toolResult = await executeManageContacts(userId, args);
              break;

            // === CAMPAIGN MANAGEMENT ===
            case 'manage_campaigns':
              toolResult = await executeManageCampaigns(userId, args);
              break;

            // === DOCUMENT MANAGEMENT ===
            case 'manage_documents':
              toolResult = await executeManageDocuments(userId, args);
              break;

            // === SYSTEM CONFIGURATION ===
            case 'system_config':
              toolResult = await executeSystemConfig(userId, args);
              break;

            // === ANALYTICS & REPORTING ===
            case 'analytics_reporting':
              toolResult = await executeAnalyticsReporting(userId, args);
              break;
              
            case 'schedule_callback':
              toolResult = await executeScheduleCallback(
                userId,
                args.client_name,
                args.phone_number,
                args.scheduled_time,
                args.reason
              );
              break;

            // === USER CLARIFICATION ===
            case 'clarify_intent':
              toolResult = await executeClarifyIntent(args);
              break;
              
            default:
              toolResult = {
                success: false,
                message: `Tool necunoscut: ${toolCall.function.name}`,
                data: null
              };
          }
          
          toolResults.push({
            tool: toolCall.function.name,
            ...toolResult
          });
          
          console.log(`✅ Tool ${toolCall.function.name} executed:`, toolResult);
          
        } catch (error) {
          console.error(`❌ Error executing tool ${toolCall.function.name}:`, error);
          toolResults.push({
            tool: toolCall.function.name,
            success: false,
            message: `Eroare la executarea acțiunii: ${error.message}`,
            data: null
          });
        }
      }
      
        // If tools were executed, create a follow-up response
        if (toolResults.length > 0) {
          const toolSummary = toolResults.map(result => 
            result.message || `${result.success ? '✅' : '❌'} Acțiune executată`
          ).join('\n\n');
          
          // If we have detailed tool messages, use them directly
          const hasDetailedMessages = toolResults.some(result => result.message && result.message.length > 50);
          
          if (hasDetailedMessages) {
            // Use the detailed tool messages directly
            finalResponse = toolSummary;
          } else {
            // Generate a follow-up response that includes tool results
            const followUpMessages = [
              { role: 'system', content: finalSystemPrompt },
              { role: 'user', content: message },
              { role: 'assistant', content: aiMessage.content || '', tool_calls: aiMessage.tool_calls },
              { role: 'user', content: `Rezultatele acțiunilor executate:\n${toolSummary}\n\nTe rog să confirmi utilizatorului ce s-a întâmplat și să oferi un răspuns relevant. FOLOSEȘTE informațiile din rezultate pentru a explica exact ce s-a întâmplat.` }
            ];
            
            const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: model,
                messages: followUpMessages,
                max_tokens: 1000,
                temperature: 0.3,
              }),
            });
            
            if (followUpResponse.ok) {
              const followUpData = await followUpResponse.json();
              const generatedResponse = followUpData.choices[0]?.message?.content;
              if (generatedResponse && generatedResponse.trim()) {
                finalResponse = generatedResponse;
              } else {
                // Fallback to tool summary if OpenAI doesn't generate a response
                finalResponse = toolSummary;
              }
            } else {
              // Fallback to tool summary if OpenAI call fails
              finalResponse = toolSummary;
            }
          }
        }
    }

    console.log('Generated response:', finalResponse);

    return new Response(
      JSON.stringify({ 
        response: finalResponse,
        contextFound: contextText.length > 0,
        chunksUsed: contextText ? contextText.split('\n\n').length : 0,
        toolsExecuted: toolResults.length,
        toolResults: toolResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in chat-with-agent function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
