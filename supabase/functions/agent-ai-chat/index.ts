// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();

    if (!message || !userId) {
      throw new Error('Message and userId are required');
    }

    console.log('Processing message:', message, 'for user:', userId);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // STEP 1: Check user balance before processing
    const COST_PER_QUESTION = 0.08; // USD per question
    
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balance')
      .select('balance_usd')
      .eq('user_id', userId)
      .maybeSingle();

    if (balanceError) {
      console.error('Error checking balance:', balanceError);
      throw new Error('Nu am putut verifica balanța contului.');
    }

    const currentBalance = balanceData?.balance_usd || 0;
    
    if (currentBalance < COST_PER_QUESTION) {
      return new Response(
        JSON.stringify({ 
          error: 'insufficient_balance',
          response: `Sold insuficient! Ai nevoie de $${COST_PER_QUESTION} pentru a pune o întrebare. Soldul tău curent: $${currentBalance.toFixed(2)}. Te rog să îți reîncarci contul.`,
          required_balance: COST_PER_QUESTION,
          current_balance: currentBalance
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // System tools for OpenAI
    const tools = [
      {
        type: "function",
        function: {
          name: "query_conversation_analytics",
          description: "Search and analyze conversation data from analytics cache",
          parameters: {
            type: "object",
            properties: {
              search_query: { type: "string", description: "What to search for in conversations" },
              date_range: { type: "string", description: "Date range filter (e.g., 'last_week', 'last_month')" },
              agent_filter: { type: "string", description: "Filter by specific agent" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_phone_numbers_by_criteria",
          description: "Extract phone numbers of callers based on specific criteria",
          parameters: {
            type: "object",
            properties: {
              criteria: { type: "string", description: "Criteria for filtering (e.g., 'asked about price', 'unhappy customers')" },
              limit: { type: "number", description: "Maximum number of results" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "analyze_agent_performance",
          description: "Analyze performance metrics for agents",
          parameters: {
            type: "object",
            properties: {
              agent_id: { type: "string", description: "Specific agent ID or 'all' for comparison" },
              metric: { type: "string", description: "Performance metric (e.g., 'success_rate', 'duration', 'satisfaction')" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_conversation_trends",
          description: "Get trends and statistics from conversations",
          parameters: {
            type: "object",
            properties: {
              period: { type: "string", description: "Time period (e.g., 'last_30_days', 'this_month')" },
              metric: { type: "string", description: "What to analyze (e.g., 'common_questions', 'response_patterns')" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "test_data_connection",
          description: "Test database connection and show sample data",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Number of records to return" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_analytics_overview",
          description: "Get overview of available analytics data and explain what Agent AI can analyze",
          parameters: {
            type: "object",
            properties: {
              include_examples: { type: "boolean", description: "Include example queries" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_all_conversation_data",
          description: "Get all conversation data including call history, analytics cache, and detailed transcripts",
          parameters: {
            type: "object",
            properties: {
              include_transcripts: { type: "boolean", description: "Include full transcripts" },
              date_filter: { type: "string", description: "Date filter (last_week, last_month, all)" },
              limit: { type: "number", description: "Limit results" }
            }
          }
        }
      }
    ];

    // Function implementations
    async function getAnalyticsOverview(params: any) {
      console.log('Getting analytics overview for user:', userId);
      
      const { data: conversations, error } = await supabase
        .from('conversation_analytics_cache')
        .select('*')
        .eq('user_id', userId)
        .limit(5);
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      const overview = {
        total_conversations: conversations?.length || 0,
        data_types_available: [
          "Transcripturi complete ale conversațiilor",
          "Informații despre agenți (nume, ID-uri, performanță)",
          "Date și ore ale apelurilor", 
          "Numere de telefon și nume contacte",
          "Status-uri apeluri (success/failed)",
          "Durată conversații în secunde",
          "Costuri și credite folosite",
          "Analize sentiment și emoții"
        ],
        example_questions: [
          "Câte conversații au fost în ultima săptămână?",
          "Care sunt cei mai performanți agenți?",
          "Arată-mi clienții care au întrebat despre preț",
          "Ce întrebări frecvente primesc?",
          "Care sunt numerele clienților nemulțumiți?",
          "Cum evoluează volumul de apeluri?",
          "Care agent are cea mai bună rată de succes?",
          "Cât timp durează în medie o conversație?"
        ],
        capabilities: [
          "Căutare în transcripturi după cuvinte cheie",
          "Filtrare după agenți, date, status",
          "Extragere numere telefon după criterii",
          "Calcul statistici și metrici",
          "Analiză performanță agenți",
          "Identificare tendințe și pattern-uri",
          "Export date în format structurat"
        ]
      };

      if (conversations && conversations.length > 0) {
        overview.sample_data = {
          agents_found: [...new Set(conversations.map(c => c.agent_name).filter(Boolean))],
          date_range: {
            oldest: conversations.reduce((min, c) => c.call_date < min ? c.call_date : min, conversations[0].call_date),
            newest: conversations.reduce((max, c) => c.call_date > max ? c.call_date : max, conversations[0].call_date)
          }
        };
      }

      return overview;
    }

    async function getAllConversationData(params: any) {
      console.log('Getting all conversation data for user:', userId);
      
      // Get data from multiple sources for comprehensive analysis
      const [analyticsData, callHistoryData] = await Promise.all([
        // Analytics cache data
        supabase
          .from('conversation_analytics_cache')
          .select('*')
          .eq('user_id', userId)
          .order('call_date', { ascending: false })
          .limit(params.limit || 100),
        
        // Call history data
        supabase
          .from('call_history')
          .select('*')
          .eq('user_id', userId)
          .order('call_date', { ascending: false })
          .limit(params.limit || 100)
      ]);

      if (analyticsData.error) {
        console.error('Analytics data error:', analyticsData.error);
      }
      
      if (callHistoryData.error) {
        console.error('Call history data error:', callHistoryData.error);
      }

      const combinedData = {
        analytics_cache: analyticsData.data || [],
        call_history: callHistoryData.data || [],
        total_analytics_conversations: analyticsData.data?.length || 0,
        total_call_history: callHistoryData.data?.length || 0,
        data_sources: ['conversation_analytics_cache', 'call_history']
      };

      // Add summary statistics
      if (analyticsData.data && analyticsData.data.length > 0) {
        combinedData.summary = {
          unique_agents: [...new Set(analyticsData.data.map(c => c.agent_id).filter(Boolean))].length,
          date_range: {
            oldest: analyticsData.data.reduce((min, c) => c.call_date < min ? c.call_date : min, analyticsData.data[0].call_date),
            newest: analyticsData.data.reduce((max, c) => c.call_date > max ? c.call_date : max, analyticsData.data[0].call_date)
          },
          success_rate: ((analyticsData.data.filter(c => c.call_status === 'success').length / analyticsData.data.length) * 100).toFixed(1),
          avg_duration: analyticsData.data.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / analyticsData.data.length
        };
      }

      return combinedData;
    }
    async function testDataConnection(params: any) {
      console.log('Testing data connection for user:', userId);
      
      const { data, error } = await supabase
        .from('conversation_analytics_cache')
        .select('conversation_id, agent_id, call_date, contact_name, phone_number')
        .eq('user_id', userId)
        .order('call_date', { ascending: false })
        .limit(params.limit || 5);
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Found', data?.length || 0, 'conversations for user');
      return {
        total_found: data?.length || 0,
        conversations: data || [],
        user_id: userId
      };
    }
    async function queryConversationAnalytics(params: any) {
      console.log('Querying conversation analytics:', params);
      
      let query = supabase
        .from('conversation_analytics_cache')
        .select('*')
        .eq('user_id', userId);

      // Add date filtering
      if (params.date_range) {
        const now = new Date();
        let startDate = new Date();
        
        switch (params.date_range) {
          case 'last_week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'last_month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'last_30_days':
            startDate.setDate(now.getDate() - 30);
            break;
        }
        
        query = query.gte('call_date', startDate.toISOString());
      }

      // Add agent filtering
      if (params.agent_filter) {
        query = query.eq('agent_id', params.agent_filter);
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;

      // Search in transcript data
      if (params.search_query && data) {
        const filtered = data.filter(conversation => {
          const transcript = conversation.transcript;
          if (transcript && Array.isArray(transcript)) {
            const fullText = transcript.map(t => t.text || '').join(' ').toLowerCase();
            return fullText.includes(params.search_query.toLowerCase());
          }
          return false;
        });
        return filtered;
      }

      return data || [];
    }

    async function getPhoneNumbersByCriteria(params: any) {
      console.log('Getting phone numbers by criteria:', params);
      
      const { data, error } = await supabase
        .from('conversation_analytics_cache')
        .select('phone_number, contact_name, transcript, call_date')
        .eq('user_id', userId)
        .limit(params.limit || 50);

      if (error) throw error;

      if (!data) return [];

      // Filter based on criteria
      const filtered = data.filter(conversation => {
        const transcript = conversation.transcript;
        if (transcript && Array.isArray(transcript)) {
          const fullText = transcript.map(t => t.text || '').join(' ').toLowerCase();
          const criteria = params.criteria.toLowerCase();
          
          // Common patterns
          if (criteria.includes('preț') || criteria.includes('price')) {
            return fullText.includes('preț') || fullText.includes('cost') || fullText.includes('price');
          }
          if (criteria.includes('nemulțumit') || criteria.includes('unhappy')) {
            return fullText.includes('nemulțumit') || fullText.includes('probleme') || fullText.includes('angry');
          }
          if (criteria.includes('ora') || criteria.includes('time')) {
            return fullText.includes('ora') || fullText.includes('timp') || fullText.includes('când');
          }
          
          return fullText.includes(criteria);
        }
        return false;
      });

      return filtered.map(conv => ({
        phone_number: conv.phone_number,
        contact_name: conv.contact_name,
        call_date: conv.call_date
      }));
    }

    async function analyzeAgentPerformance(params: any) {
      console.log('Analyzing agent performance:', params);
      
      let query = supabase
        .from('conversation_analytics_cache')
        .select('agent_id, agent_name, call_status, duration_seconds, cost_credits, call_date')
        .eq('user_id', userId);

      if (params.agent_id && params.agent_id !== 'all') {
        query = query.eq('agent_id', params.agent_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      if (!data) return [];

      // Group by agent and calculate metrics
      const agentStats: any = {};
      
      data.forEach(conv => {
        const agentId = conv.agent_id || 'unknown';
        if (!agentStats[agentId]) {
          agentStats[agentId] = {
            agent_name: conv.agent_name,
            total_calls: 0,
            successful_calls: 0,
            total_duration: 0,
            total_cost: 0,
            avg_duration: 0,
            success_rate: 0
          };
        }
        
        agentStats[agentId].total_calls++;
        agentStats[agentId].total_duration += conv.duration_seconds || 0;
        agentStats[agentId].total_cost += conv.cost_credits || 0;
        
        if (conv.call_status === 'success') {
          agentStats[agentId].successful_calls++;
        }
      });

      // Calculate averages and rates
      Object.keys(agentStats).forEach(agentId => {
        const stats = agentStats[agentId];
        stats.avg_duration = stats.total_duration / stats.total_calls;
        stats.success_rate = (stats.successful_calls / stats.total_calls) * 100;
      });

      return Object.values(agentStats);
    }

    async function getConversationTrends(params: any) {
      console.log('Getting conversation trends:', params);
      
      const now = new Date();
      let startDate = new Date();
      
      switch (params.period) {
        case 'last_30_days':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'this_month':
          startDate.setDate(1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      const { data, error } = await supabase
        .from('conversation_analytics_cache')
        .select('*')
        .eq('user_id', userId)
        .gte('call_date', startDate.toISOString());

      if (error) throw error;

      if (!data) return [];

      // Analyze trends based on metric
      const trends: any = {
        total_conversations: data.length,
        success_rate: data.length > 0 ? (data.filter(c => c.call_status === 'success').length / data.length) * 100 : 0,
        avg_duration: data.length > 0 ? data.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / data.length : 0,
        common_questions: []
      };

      // Extract common questions/keywords
      const keywords: any = {};
      data.forEach(conv => {
        const transcript = conv.transcript;
        if (transcript && Array.isArray(transcript)) {
          const text = transcript.map(t => t.text || '').join(' ').toLowerCase();
          
          // Common question patterns
          const patterns = ['preț', 'cost', 'ora', 'timp', 'când', 'cum', 'unde', 'ce'];
          patterns.forEach(pattern => {
            if (text.includes(pattern)) {
              keywords[pattern] = (keywords[pattern] || 0) + 1;
            }
          });
        }
      });

      trends.common_questions = Object.entries(keywords)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }));

      return trends;
    }

    // Call GPT with tools
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Ești un asistent AI specialist în analiza datelor de conversații din platforma Kalina AI. 

DESPRE DATELE DISPONIBILE:
- Ai acces la conversațiile utilizatorului din cache-ul de analiză
- Poți căuta în transcripturi, analiza performanța agenților, extrage contacte
- Datele includ: transcripturi complete, informații agenți, numere telefon, date/ore, costuri, durată

CAPACITĂȚI PRINCIPALE:
1. Căutare în transcripturi după cuvinte cheie (preț, oferte, nemulțumiri)
2. Analiză performanță agenți (rata de succes, durată medie, numărul de apeluri)
3. Extragere numere telefon după criterii (clienți interesați, nemulțumiți, etc.)
4. Statistici și tendințe (întrebări frecvente, evoluția volumului)

STIL DE RĂSPUNS:
- Răspunde în română, concis dar informativ
- Când folosești funcțiile, explică ce ai găsit
- Oferă insights și recomandări practice
- Dacă nu găsești date, sugerează criterii alternative

CÂND NU AI DATE:
- Verifică dacă utilizatorul are conversații în cache
- Sugerează să verifice în secțiunea Analytics dacă datele sunt disponibile
- Oferă ajutor pentru a înțelege ce tipuri de întrebări poți răspunde`
          },
          {
            role: 'user',
            content: message
          }
        ],
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.3
      }),
    });

    const gptData = await gptResponse.json();
    console.log('GPT Response:', JSON.stringify(gptData, null, 2));
    
    if (gptData.error) {
      throw new Error(gptData.error.message);
    }

    let result = gptData.choices[0].message;

    // Handle tool calls (new format)
    if (result.tool_calls && result.tool_calls.length > 0) {
      const toolCall = result.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      console.log('Calling function:', functionName, 'with args:', functionArgs);
      
      let functionResult;
      
      switch (functionName) {
        case 'query_conversation_analytics':
          functionResult = await queryConversationAnalytics(functionArgs);
          break;
        case 'get_phone_numbers_by_criteria':
          functionResult = await getPhoneNumbersByCriteria(functionArgs);
          break;
        case 'analyze_agent_performance':
          functionResult = await analyzeAgentPerformance(functionArgs);
          break;
        case 'get_conversation_trends':
          functionResult = await getConversationTrends(functionArgs);
          break;
        case 'test_data_connection':
          functionResult = await testDataConnection(functionArgs);
          break;
        case 'get_analytics_overview':
          functionResult = await getAnalyticsOverview(functionArgs);
          break;
        case 'get_all_conversation_data':
          functionResult = await getAllConversationData(functionArgs);
          break;
        default:
          functionResult = { error: 'Unknown function' };
      }

      console.log('Function result:', functionResult);

      // Send function result back to GPT
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'Analizează rezultatele și oferă un răspuns clar și util în română.'
            },
            {
              role: 'user',
              content: message
            },
            {
              role: 'assistant',
              content: null,
              tool_calls: result.tool_calls
            },
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult)
            }
          ],
          temperature: 0.3
        }),
      });

      const followUpData = await followUpResponse.json();
      console.log('Follow-up response:', followUpData);
      result = followUpData.choices[0].message;
    }

    // STEP 2: Deduct cost from user balance after successful processing
    const { error: deductError } = await supabase
      .from('user_balance')
      .update({ 
        balance_usd: currentBalance - COST_PER_QUESTION,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (deductError) {
      console.error('Error deducting balance:', deductError);
      // Continue anyway - don't fail the response if balance deduction fails
    } else {
      console.log(`Deducted $${COST_PER_QUESTION} from user ${userId}. New balance: $${(currentBalance - COST_PER_QUESTION).toFixed(2)}`);
    }

    return new Response(
      JSON.stringify({ 
        response: result.content || 'Am analizat datele tale.',
        functionCalled: result.tool_calls?.[0]?.function?.name || null,
        cost_deducted: COST_PER_QUESTION,
        remaining_balance: (currentBalance - COST_PER_QUESTION).toFixed(2)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-ai-chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        response: 'Scuze, am întâmpinat o problemă tehnică. Te rog să încerci din nou.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});