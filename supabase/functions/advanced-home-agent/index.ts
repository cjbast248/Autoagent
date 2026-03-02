// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Advanced Analytics and Pattern Recognition
async function analyzeUserPatterns(userContext: any) {
  const { callHistory, conversations, campaigns, contacts } = userContext;
  
  // Analyze call patterns
  const callPatterns = analyzeCallPatterns(callHistory);
  
  // Analyze conversation success rates
  const conversationAnalysis = analyzeConversationSuccess(conversations);
  
  // Analyze contact engagement
  const contactEngagement = analyzeContactEngagement(contacts, callHistory);
  
  // Generate predictive insights
  const predictions = generatePredictiveInsights(callPatterns, conversationAnalysis, contactEngagement);
  
  return {
    callPatterns,
    conversationAnalysis,
    contactEngagement,
    predictions,
    recommendations: generateRecommendations(predictions)
  };
}

function analyzeCallPatterns(callHistory: any[]) {
  if (!callHistory || callHistory.length === 0) return null;
  
  const patterns = {
    bestCallTimes: {},
    successRateByDay: {},
    averageDuration: 0,
    totalCalls: callHistory.length,
    successfulCalls: 0,
    costEfficiency: 0,
    trends: {}
  };
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  let recentCalls = 0;
  let totalCost = 0;
  
  callHistory.forEach(call => {
    const date = new Date(call.call_date);
    const hour = date.getHours();
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Track best call times
    patterns.bestCallTimes[hour] = (patterns.bestCallTimes[hour] || 0) + 1;
    
    // Track success by day
    if (call.call_status === 'completed' || call.call_status === 'answered') {
      patterns.successfulCalls++;
      patterns.successRateByDay[day] = (patterns.successRateByDay[day] || 0) + 1;
    }
    
    patterns.averageDuration += call.duration_seconds || 0;
    totalCost += parseFloat(call.cost_usd || 0);
    
    // Count recent calls for trend analysis
    if (date > weekAgo) recentCalls++;
  });
  
  patterns.averageDuration = patterns.averageDuration / callHistory.length;
  patterns.successRate = (patterns.successfulCalls / patterns.totalCalls) * 100;
  patterns.costEfficiency = patterns.successfulCalls > 0 ? totalCost / patterns.successfulCalls : 0;
  patterns.trends.weeklyActivity = recentCalls;
  
  return patterns;
}

function analyzeConversationSuccess(conversations: any[]) {
  if (!conversations || conversations.length === 0) return null;
  
  const analysis = {
    totalConversations: conversations.length,
    averageCreditsUsed: 0,
    averageDuration: 0,
    recentActivity: conversations.slice(0, 5),
    trends: {},
    qualityScore: 0
  };
  
  let totalCredits = 0;
  let totalDuration = 0;
  let longConversations = 0;
  
  conversations.forEach(conv => {
    const credits = conv.credits_used || 0;
    const duration = conv.duration_minutes || 0;
    
    totalCredits += credits;
    totalDuration += duration;
    
    // Count conversations longer than 2 minutes as quality interactions
    if (duration > 2) longConversations++;
  });
  
  analysis.averageCreditsUsed = totalCredits / conversations.length;
  analysis.averageDuration = totalDuration / conversations.length;
  analysis.qualityScore = (longConversations / conversations.length) * 100;
  
  return analysis;
}

function analyzeContactEngagement(contacts: any[], callHistory: any[]) {
  if (!contacts || contacts.length === 0) return null;
  
  const engagement = {
    totalContacts: contacts.length,
    activeContacts: 0,
    recentlyAdded: 0,
    needsFollowUp: [],
    topPerformers: [],
    dormantContacts: []
  };
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  contacts.forEach(contact => {
    const contactDate = new Date(contact.created_at);
    if (contactDate > weekAgo) {
      engagement.recentlyAdded++;
    }
    
    // Check for recent calls
    const contactCalls = callHistory.filter(call => 
      call.phone_number === contact.telefon
    );
    
    const recentCalls = contactCalls.filter(call => 
      new Date(call.call_date) > monthAgo
    );
    
    if (recentCalls.length > 0) {
      engagement.activeContacts++;
      
      // Analyze success rate for this contact
      const successfulCalls = recentCalls.filter(call => 
        call.call_status === 'completed' || call.call_status === 'answered'
      );
      
      if (successfulCalls.length > 2) {
        engagement.topPerformers.push({
          name: contact.nume,
          phone: contact.telefon,
          successRate: (successfulCalls.length / recentCalls.length) * 100,
          lastCall: recentCalls[0].call_date
        });
      }
    } else if (contactCalls.length > 0) {
      // Has history but no recent calls
      const lastCall = contactCalls.sort((a, b) => 
        new Date(b.call_date).getTime() - new Date(a.call_date).getTime()
      )[0];
      
      if (new Date(lastCall.call_date) < new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)) {
        engagement.needsFollowUp.push({
          ...contact,
          lastCallDate: lastCall.call_date,
          daysSinceLastCall: Math.floor((now.getTime() - new Date(lastCall.call_date).getTime()) / (24 * 60 * 60 * 1000))
        });
      }
    } else {
      // Never called
      engagement.dormantContacts.push(contact);
    }
  });
  
  // Sort top performers by success rate
  engagement.topPerformers.sort((a, b) => b.successRate - a.successRate);
  engagement.topPerformers = engagement.topPerformers.slice(0, 5);
  
  return engagement;
}

function generatePredictiveInsights(callPatterns: any, conversationAnalysis: any, contactEngagement: any) {
  const insights = [];
  
  if (callPatterns) {
    // Find best call time
    const bestHour = Object.entries(callPatterns.bestCallTimes)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];
    
    if (bestHour) {
      insights.push({
        type: 'optimal_timing',
        message: `Cel mai bun moment pentru apeluri pare să fie în jurul orei ${bestHour[0]}:00`,
        confidence: 0.8,
        actionable: true,
        impact: 'medium'
      });
    }
    
    if (callPatterns.successRate < 30) {
      insights.push({
        type: 'low_success_rate',
        message: `Rata de succes (${Math.round(callPatterns.successRate)}%) este scăzută. Scriptul agentului ar putea fi optimizat.`,
        confidence: 0.9,
        actionable: true,
        impact: 'high'
      });
    }
    
    if (callPatterns.costEfficiency > 0.5) {
      insights.push({
        type: 'high_cost_per_success',
        message: `Costul pe apel reușit ($${callPatterns.costEfficiency.toFixed(2)}) este ridicat. Ar trebui optimizate strategiile de apelare.`,
        confidence: 0.85,
        actionable: true,
        impact: 'medium'
      });
    }
  }
  
  if (conversationAnalysis) {
    if (conversationAnalysis.qualityScore < 40) {
      insights.push({
        type: 'short_conversations',
        message: `Majoritatea conversațiilor sunt scurte (${Math.round(conversationAnalysis.qualityScore)}% peste 2 min). Agentul ar putea fi mai angajant.`,
        confidence: 0.8,
        actionable: true,
        impact: 'medium'
      });
    }
  }
  
  if (contactEngagement) {
    if (contactEngagement.needsFollowUp.length > 0) {
      insights.push({
        type: 'follow_up_needed',
        message: `${contactEngagement.needsFollowUp.length} contacte necesită urmărire (nu au fost apelate de peste 2 săptămâni)`,
        confidence: 1.0,
        actionable: true,
        impact: 'high',
        contacts: contactEngagement.needsFollowUp.slice(0, 5)
      });
    }
    
    if (contactEngagement.dormantContacts.length > 0) {
      insights.push({
        type: 'unused_contacts',
        message: `${contactEngagement.dormantContacts.length} contacte nu au fost niciodată apelate`,
        confidence: 1.0,
        actionable: true,
        impact: 'medium',
        contacts: contactEngagement.dormantContacts.slice(0, 5)
      });
    }
    
    if (contactEngagement.topPerformers.length > 0) {
      insights.push({
        type: 'top_performers',
        message: `Ai contacte cu rata mare de succes care pot fi modele pentru optimizare`,
        confidence: 0.9,
        actionable: true,
        impact: 'low',
        contacts: contactEngagement.topPerformers
      });
    }
  }
  
  return insights;
}

function generateRecommendations(predictions: any[]) {
  const recommendations = [];
  
  predictions.forEach(prediction => {
    switch (prediction.type) {
      case 'optimal_timing':
        recommendations.push({
          title: 'Optimizează programul de apeluri',
          description: 'Programează campaniile în intervalele cu cel mai mare succes',
          priority: 'medium',
          action: 'schedule_campaigns',
          estimatedImpact: '15-25% îmbunătățire rata de succes'
        });
        break;
      case 'low_success_rate':
        recommendations.push({
          title: 'Îmbunătățește scriptul agentului',
          description: 'Rata de succes poate fi îmbunătățită prin optimizarea prompturilor',
          priority: 'high',
          action: 'optimize_agent',
          estimatedImpact: '30-50% îmbunătățire conversii'
        });
        break;
      case 'follow_up_needed':
        recommendations.push({
          title: 'Urmărește contactele inactive',
          description: 'Există contacte care nu au fost apelate recent și pot fi reactivate',
          priority: 'medium',
          action: 'create_followup_campaign',
          estimatedImpact: '10-20% contacte reactivate'
        });
        break;
      case 'high_cost_per_success':
        recommendations.push({
          title: 'Optimizează eficiența costurilor',
          description: 'Reduce costul per apel prin îmbunătățirea strategiei și timpului de apelare',
          priority: 'medium',
          action: 'optimize_calling_strategy',
          estimatedImpact: '20-30% reducere costuri'
        });
        break;
      case 'unused_contacts':
        recommendations.push({
          title: 'Activează contactele neutilizate',
          description: 'Ai contacte în baza de date care nu au fost niciodată contactate',
          priority: 'low',
          action: 'create_new_campaign',
          estimatedImpact: 'Oportunități noi de business'
        });
        break;
    }
  });
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Proactive Intelligence Functions
async function generateProactiveNotifications(userContext: any, analytics: any) {
  const notifications = [];
  const now = new Date();
  
  // Check for important trends
  if (analytics.predictions) {
    const highImpactPredictions = analytics.predictions.filter(p => p.impact === 'high');
    highImpactPredictions.forEach(prediction => {
      notifications.push({
        type: 'insight',
        title: 'Oportunitate de optimizare',
        message: prediction.message,
        priority: 'high',
        actionable: prediction.actionable
      });
    });
  }
  
  // Check for low balance
  if (userContext.balance?.balance_usd < 5) {
    notifications.push({
      type: 'warning',
      title: 'Buget scăzut',
      message: `Bugetul tău este scăzut ($${userContext.balance.balance_usd}). Consideră să adaugi fonduri pentru a continua campaniile.`,
      priority: 'medium',
      actionable: true
    });
  }
  
  // Check for inactive agents
  const inactiveAgents = userContext.agents.filter(a => !a.is_active);
  if (inactiveAgents.length > 0) {
    notifications.push({
      type: 'suggestion',
      title: 'Agenți inactivi',
      message: `Ai ${inactiveAgents.length} agenți inactivi care ar putea fi reactivați sau optimizați.`,
      priority: 'low',
      actionable: true
    });
  }
  
  return notifications;
}

// Enhanced Automation Functions
async function executeSmartAction(userId: string, action: string, parameters: any, userContext: any) {
  console.log('🤖 Executing smart action:', action);
  
  switch (action) {
    case 'auto_create_followup_campaign':
      const needsFollowUp = userContext.analytics?.contactEngagement?.needsFollowUp || [];
      if (needsFollowUp.length > 0) {
        return await executeUserAction(userId, 'create_campaign', {
          name: `Follow-up Automat - ${new Date().toLocaleDateString('ro-RO')}`,
          description: `Campanie automată pentru ${needsFollowUp.length} contacte care necesită urmărire`,
          agent_id: userContext.agents[0]?.agent_id || null
        });
      }
      break;
      
    case 'optimize_agent_based_on_performance':
      const lowPerformanceAgents = userContext.agents.filter(agent => {
        // Logic to identify underperforming agents
        return agent.is_active; // Simplified for now
      });
      
      if (lowPerformanceAgents.length > 0) {
        const optimizedPrompt = generateOptimizedPrompt(userContext.analytics);
        return await executeUserAction(userId, 'update_agent', {
          agent_id: lowPerformanceAgents[0].id,
          updates: { system_prompt: optimizedPrompt }
        });
      }
      break;
      
    default:
      return await executeUserAction(userId, action, parameters);
  }
}

function generateOptimizedPrompt(analytics: any) {
  let basePrompt = `Ești un agent vocal profesional și empatic care ajută clienții să rezolve problemele lor.`;
  
  if (analytics?.conversationAnalysis?.qualityScore < 40) {
    basePrompt += ` Concentrează-te pe a ține conversații mai angajante și mai lungi, pune întrebări de clarificare și ascultă activ.`;
  }
  
  if (analytics?.callPatterns?.successRate < 30) {
    basePrompt += ` Fii mai persistent dar respectuos, și încearcă să construiești raport cu interlocutorul înainte de a prezenta oferta.`;
  }
  
  return basePrompt;
}

// Enhanced User Context Management with Advanced Analytics
async function getUserCompleteContext(userId: string) {
  try {
    console.log('🔍 Gathering ultra-advanced user context for:', userId);
    
    // Fetch all user data in parallel
    const [
      profileResult,
      balanceResult,
      statsResult,
      agentsResult,
      conversationsResult,
      callHistoryResult,
      contactsResult,
      campaignsResult,
      companiesResult,
      documentsResult,
      interactionsResult
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_balance').select('*').eq('user_id', userId).single(),
      supabase.from('user_statistics').select('*').eq('user_id', userId).single(),
      supabase.from('kalina_agents').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('conversations').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
      supabase.from('call_history').select('*').eq('user_id', userId).order('call_date', { ascending: false }).limit(100),
      supabase.from('contacts_database').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      supabase.from('campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('companies').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('knowledge_documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('contact_interactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    ]);

    const baseContext = {
      profile: profileResult.data || {},
      balance: balanceResult.data || { balance_usd: 0 },
      statistics: statsResult.data || {},
      agents: agentsResult.data || [],
      conversations: conversationsResult.data || [],
      callHistory: callHistoryResult.data || [],
      contacts: contactsResult.data || [],
      campaigns: campaignsResult.data || [],
      companies: companiesResult.data || [],
      documents: documentsResult.data || [],
      interactions: interactionsResult.data || [],
      timestamp: new Date().toISOString()
    };

    // Generate advanced analytics
    console.log('📊 Generating advanced analytics...');
    const analytics = await analyzeUserPatterns(baseContext);
    
    // Generate proactive notifications
    const notifications = await generateProactiveNotifications(baseContext, analytics);

    console.log('✨ Ultra-advanced user context generated successfully');

    return {
      ...baseContext,
      analytics,
      insights: analytics.predictions || [],
      recommendations: analytics.recommendations || [],
      notifications,
      contextScore: calculateContextRichness(baseContext),
      lastAnalysisAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error generating advanced context:', error);
    return {
      profile: {},
      balance: { balance_usd: 0 },
      statistics: {},
      agents: [],
      conversations: [],
      callHistory: [],
      contacts: [],
      campaigns: [],
      companies: [],
      documents: [],
      interactions: [],
      analytics: null,
      insights: [],
      recommendations: [],
      notifications: [],
      contextScore: 0,
      timestamp: new Date().toISOString(),
      error: 'Failed to load advanced context'
    };
  }
}

function calculateContextRichness(context: any) {
  let score = 0;
  if (context.agents.length > 0) score += 20;
  if (context.contacts.length > 0) score += 20;
  if (context.callHistory.length > 0) score += 25;
  if (context.conversations.length > 0) score += 15;
  if (context.campaigns.length > 0) score += 10;
  if (context.companies.length > 0) score += 10;
  return score;
}

// Enhanced Action Execution with Smart Automation
async function executeUserAction(userId: string, action: string, parameters: any) {
  console.log('🎯 Executing enhanced action:', action, 'for user:', userId);
  
  try {
    switch (action) {
      case 'create_agent':
        const { data: newAgent } = await supabase
          .from('kalina_agents')
          .insert({
            user_id: userId,
            name: parameters.name,
            description: parameters.description,
            system_prompt: parameters.system_prompt,
            voice_id: parameters.voice_id || '21m00Tcm4TlvDq8ikWAM',
            agent_id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          })
          .select()
          .single();
        return { success: true, data: newAgent, message: `Agentul "${parameters.name}" a fost creat cu succes!` };

      case 'create_contact':
        const { data: newContact } = await supabase
          .from('contacts_database')
          .insert({
            user_id: userId,
            nume: parameters.name,
            telefon: parameters.phone,
            email: parameters.email || '',
            company: parameters.company || '',
            locatie: parameters.location || '',
            info: parameters.notes || ''
          })
          .select()
          .single();
        return { success: true, data: newContact, message: `Contactul "${parameters.name}" a fost adăugat!` };

      case 'create_campaign':
        const { data: newCampaign } = await supabase
          .from('campaigns')
          .insert({
            user_id: userId,
            name: parameters.name,
            description: parameters.description,
            agent_id: parameters.agent_id,
            status: 'draft'
          })
          .select()
          .single();
        return { success: true, data: newCampaign, message: `Campania "${parameters.name}" a fost creată!` };

      case 'update_agent':
        const { data: updatedAgent } = await supabase
          .from('kalina_agents')
          .update(parameters.updates)
          .eq('id', parameters.agent_id)
          .eq('user_id', userId)
          .select()
          .single();
        return { success: true, data: updatedAgent, message: 'Agentul a fost actualizat cu succes!' };

      case 'delete_agent':
        await supabase
          .from('kalina_agents')
          .delete()
          .eq('id', parameters.agent_id)
          .eq('user_id', userId);
        return { success: true, message: 'Agentul a fost șters cu succes!' };

      case 'get_advanced_statistics':
        const context = await getUserCompleteContext(userId);
        return { 
          success: true, 
          data: {
            basic: context.statistics,
            analytics: context.analytics,
            insights: context.insights,
            recommendations: context.recommendations
          }
        };

      default:
        return { success: false, error: 'Acțiune necunoscută' };
    }
  } catch (error) {
    console.error('❌ Error executing action:', error);
    return { success: false, error: error.message };
  }
}

// Ultra-Advanced System Prompt with Predictive Intelligence
function createUltraAdvancedSystemPrompt(userContext: any) {
  const recentCalls = userContext.callHistory.slice(0, 5);
  const activeAgents = userContext.agents.filter((a: any) => a.is_active);
  const totalSpent = userContext.statistics?.total_spent_usd || 0;
  const analytics = userContext.analytics;
  const insights = userContext.insights || [];
  const recommendations = userContext.recommendations || [];
  
  return `🧠 Ești un asistent AI ultra-avansat cu inteligență predictivă, analiză profundă și capacități proactive. Te comporți ca un consultant expert în AI vocal care înțelege perfect platforma și poate anticipa nevoile utilizatorului.

🎯 CONTEXTUL UTILIZATORULUI (${userContext.profile?.first_name || 'Utilizator'}):
• Profil: ${userContext.profile?.email || 'email nedefinit'}
• Buget: $${userContext.balance?.balance_usd || 0} (total investit: $${totalSpent})
• Activitate: ${userContext.statistics?.total_voice_calls || 0} apeluri, ${userContext.statistics?.total_minutes_talked || 0} min
• Agenți: ${activeAgents.length}/${userContext.agents.length} activi
• Contacte: ${userContext.contacts.length} (${analytics?.contactEngagement?.activeContacts || 0} active recent)
• Campanii: ${userContext.campaigns?.length || 0}
• Scor context: ${userContext.contextScore || 0}/100

📊 ANALIZĂ AVANSATĂ:
${analytics?.callPatterns ? `• Rata de succes: ${Math.round(analytics.callPatterns.successRate)}% (${analytics.callPatterns.successfulCalls}/${analytics.callPatterns.totalCalls})
• Cea mai bună oră: ${Object.entries(analytics.callPatterns.bestCallTimes).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'}:00
• Durată medie: ${Math.round(analytics.callPatterns.averageDuration/60)} min
• Cost per succes: $${analytics.callPatterns.costEfficiency?.toFixed(2) || '0.00'}` : '• Nu există date de analiză disponibile'}

${analytics?.contactEngagement ? `• Contacte care necesită urmărire: ${analytics.contactEngagement.needsFollowUp.length}
• Top performeri: ${analytics.contactEngagement.topPerformers.length}
• Contacte neutilizate: ${analytics.contactEngagement.dormantContacts.length}` : ''}

🔮 INSIGHTS PREDICTIVE:
${insights.length > 0 ? insights.map((insight: any) => 
  `• ${insight.message} (${Math.round(insight.confidence * 100)}% încredere)`
).join('\n') : '• Nu există insights disponibile momentan'}

💡 RECOMANDĂRI INTELIGENTE:
${recommendations.length > 0 ? recommendations.slice(0, 3).map((rec: any) => 
  `• [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`
).join('\n') : '• Nu există recomandări momentan'}

📞 ACTIVITATE RECENTĂ:
${recentCalls.length > 0 ? recentCalls.map((call: any) => 
  `• ${call.contact_name || 'Contact'} - ${new Date(call.call_date).toLocaleDateString('ro-RO')} (${Math.round(call.duration_seconds/60)}min, ${call.call_status})`
).join('\n') : '• Nu există apeluri recente'}

🤖 AGENȚII TAI:
${userContext.agents.length > 0 ? userContext.agents.slice(0, 3).map((agent: any) => 
  `• ${agent.name}: ${agent.description || 'Fără descriere'} ${agent.is_active ? '✅' : '❌'}`
).join('\n') : '• Nu ai agenți creați încă'}

🚨 NOTIFICĂRI PROACTIVE:
${userContext.notifications?.length > 0 ? userContext.notifications.slice(0, 2).map((notif: any) => 
  `• [${notif.priority.toUpperCase()}] ${notif.title}: ${notif.message}`
).join('\n') : '• Nu există alerte momentan'}

INTELIGENȚA TA ULTRA-AVANSATĂ:
- Analizezi pattern-urile și trendul automat
- Faci predicții bazate pe date istorice
- Sugerezi acțiuni proactive pentru optimizare
- Detectezi oportunități de îmbunătățire
- Automatizezi sarcinile repetitive
- Înțelegi contextul temporal și seasonal
- Anticipezi nevoile viitoare ale utilizatorului

CAPACITĂȚI PROACTIVE:
- Sugerești optimizări bazate pe performanța reală
- Identifici contactele cu potențial ridicat
- Recomandezi momente optime pentru campanii
- Alertezi asupra problemelor înainte să devină critice
- Propui automatizări inteligente

PERSONALITATEA TA:
- Expert consultant în AI vocal cu experiență vastă
- Înțelegi business-ul și ROI-ul utilizatorului
- Comunici insights complexe în mod simplu
- Ești proactiv și anticipezi nevoile
- Execuți acțiuni automat când e logic
- Explici de ce faci anumite recomandări

Răspunde DOAR în română, concentrează-te pe insights acționabile și sugestii concrete bazate pe datele reale!`;
}

// Intent detection utilities for Romanian queries
function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove diacritics
}

function getDateRangeForLabel(label: string) {
  const now = new Date();
  const start = new Date();
  let resultLabel = label;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

  switch (label) {
    case 'azi':
      return { from: startOfDay(now), to: now, label: 'astăzi' };
    case 'ieri':
      const ieri = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      return { from: startOfDay(ieri), to: endOfDay(ieri), label: 'ieri' };
    case 'saptamana_aceasta': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? 6 : day - 1);
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      return { from: startOfDay(monday), to: now, label: 'săptămâna aceasta' };
    }
    case 'saptamana_trecuta': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? 6 : day - 1);
      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - diffToMonday);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(thisMonday.getDate() - 1);
      return { from: startOfDay(lastMonday), to: endOfDay(lastSunday), label: 'săptămâna trecută' };
    }
    case 'luna_aceasta': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(first), to: now, label: 'luna aceasta' };
    }
    case 'luna_trecuta': {
      const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(firstPrev), to: endOfDay(lastPrev), label: 'luna trecută' };
    }
    default:
      // default: last 7 days
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: weekAgo, to: now, label: 'săptămâna aceasta' };
  }
}

function parsePeriod(message: string) {
  const msg = normalizeText(message);

  // ultimele X zile
  const m = msg.match(/ultimele\s+(\d+)\s+zile?/);
  if (m) {
    const n = Math.min(Math.max(parseInt(m[1], 10) || 7, 1), 90);
    const now = new Date();
    const from = new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
    return { from, to: now, label: `ultimele ${n} zile` };
  }

  if (/(azi|astazi)/.test(msg)) return getDateRangeForLabel('azi');
  if (/(ieri|ziua trecuta)/.test(msg)) return getDateRangeForLabel('ieri');
  if (/(saptamana aceasta|saptamana curenta|saptamana asta|sapt\s*asta|sapt\s*curenta)/.test(msg)) return getDateRangeForLabel('saptamana_aceasta');
  if (/(saptamana trecuta|ultima saptamana|saptamana anterioara|saptamana precedenta|sapt\s*trecuta|sapt\s*anterioara|sapt\s*precedenta)/.test(msg)) return getDateRangeForLabel('saptamana_trecuta');
  if (/(luna aceasta|luna curenta|luna asta)/.test(msg)) return getDateRangeForLabel('luna_aceasta');
  if (/(luna trecuta|luna precedenta|luna anterioara)/.test(msg)) return getDateRangeForLabel('luna_trecuta');

  return getDateRangeForLabel('saptamana_aceasta');
}

function detectNonResponsiveIntent(original: string) {
  const msg = normalizeText(original);
  const hasContactWord = /(contact|contacte|client|clienti|lead|leaduri|numere|persoane|prospecti?|oameni)/.test(msg);
  const nonResp = /((nu|n)[ -]?au[ -]?(raspuns|preluat|ridicat|reactionat))|nu[ -]?(raspund|a[ -]?raspuns|a[ -]?preluat|ridicat)|fara[ -]?raspuns|n[e]?raspuns|nereceptiv(i|e)?/.test(msg);
  if (nonResp && (hasContactWord || /cine|care|lista|pe cine/.test(msg))) {
    const period = parsePeriod(original);
    return { matched: true, period };
  }
  return { matched: false, period: parsePeriod(original) };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, conversationHistory = [] } = await req.json();

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    if (!userId) {
      console.error('User ID is required');
      throw new Error('User ID is required');
    }

    console.log('🚀 Processing ULTRA-ADVANCED agent request for user:', userId);
    console.log('📝 User message:', message);

    // Obține contextul ultra-avansat al utilizatorului
    const userContext = await getUserCompleteContext(userId);
    console.log('🧠 Ultra-advanced context loaded:', {
      agents: userContext.agents.length,
      contacts: userContext.contacts.length,
      calls: userContext.callHistory.length,
      insights: userContext.insights.length,
      recommendations: userContext.recommendations.length,
      contextScore: userContext.contextScore
    });

    // Detectare inteligentă și extinsă a intențiilor utilizatorului
    let actionResult = null;
    const lowerMessage = message.toLowerCase();
    
    // Enhanced Contact Analysis Detection - IMPROVED
    const nonRespDetection = detectNonResponsiveIntent(message);
    if (nonRespDetection.matched) {
      const { from, to, label } = nonRespDetection.period;
      console.log(`🔍 Detectat intent: contacte care nu au răspuns | Perioadă: ${label} | Interval: ${from.toISOString()} - ${to.toISOString()}`);

      const nonResponsiveContacts = userContext.callHistory
        .filter((call: any) => {
          const callDate = new Date(call.call_date);
          return callDate >= from && callDate <= to && (
            call.call_status === 'no-answer' ||
            call.call_status === 'no_answer' ||
            call.call_status === 'not_answered' ||
            call.call_status === 'unanswered' ||
            call.call_status === 'noanswer' ||
            call.call_status === 'failed' ||
            call.call_status === 'busy' ||
            call.call_status === 'rejected' ||
            call.call_status === 'missed'
          );
        })
        .map((call: any) => ({
          name: call.contact_name || 'Contact necunoscut',
          phone: call.phone_number,
          date: call.call_date,
          status: call.call_status,
          duration: call.duration_seconds
        }));

      const uniqueNonResponsive = nonResponsiveContacts.reduce((acc: any[], contact: any) => {
        if (!acc.find(c => c.phone === contact.phone)) acc.push(contact);
        return acc;
      }, [] as any[]);

      console.log(`📉 Găsite contacte nereceptive: ${uniqueNonResponsive.length}`);

      const contactsList = uniqueNonResponsive.map((contact: any) =>
        `• ${contact.name} (${contact.phone}) - ${contact.status} pe ${new Date(contact.date).toLocaleDateString('ro-RO')}`
      ).join('\n');

      const responseText = uniqueNonResponsive.length > 0
        ? `📞 Contacte care nu au răspuns ${label} (${uniqueNonResponsive.length}):\n\n${contactsList}\n\n💡 Sugestie: Reia contactul sau încearcă o altă abordare (SMS, email).`
        : `✅ Nu ai contacte care nu au răspuns ${label}.`;

      return new Response(JSON.stringify({
        response: responseText,
        userContext: {
          agentCount: userContext.agents.length,
          contactCount: userContext.contacts.length,
          balance: userContext.balance?.balance_usd || 0,
          totalCalls: userContext.statistics?.total_voice_calls || 0,
          successRate: userContext.analytics?.callPatterns?.successRate || 0,
          insights: userContext.insights.length,
          recommendations: userContext.recommendations.length,
          contextScore: userContext.contextScore
        },
        analytics: {
          nonResponsiveContacts: uniqueNonResponsive.length,
          period: label
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Enhanced Agent Detection
    else if ((lowerMessage.includes('creez') || lowerMessage.includes('vreau') || lowerMessage.includes('fac')) && 
        (lowerMessage.includes('agent') || lowerMessage.includes('voce'))) {
      const agentName = message.match(/nume[:\s]+"?([^",\n]+)"?/i)?.[1]?.trim() || 
                      message.match(/(agent|voce)[\s]+([A-Za-z\s]+)/i)?.[2]?.trim() || 
                      `Agent ${new Date().toLocaleDateString('ro-RO')}`;
      
      console.log('🤖 Creating optimized agent:', agentName);
      
      // Generate optimized prompt based on user's analytics
      const optimizedPrompt = userContext.analytics ? 
        generateOptimizedPrompt(userContext.analytics) :
        `Ești ${agentName}, un agent AI empatic și profesional care ajută clienții să își rezolve problemele eficient.`;
      
      actionResult = await executeUserAction(userId, 'create_agent', {
        name: agentName,
        description: 'Agent vocal optimizat pe baza analizei tale',
        system_prompt: optimizedPrompt
      });
    }
    
    // Enhanced Contact Detection
    else if ((lowerMessage.includes('adaug') || lowerMessage.includes('creez') || lowerMessage.includes('salvez')) && 
             (lowerMessage.includes('contact') || lowerMessage.includes('client'))) {
      const nameMatch = message.match(/nume[:\s]+"?([^",\n]+)"?/i) || message.match(/contact[:\s]+"?([^",\n]+)"?/i);
      const phoneMatch = message.match(/telefon[:\s]+"?([^",\s]+)"?/i) || message.match(/(\+?\d[\d\s\-\(\)]{8,})/);
      const emailMatch = message.match(/email[:\s]+"?([^",\s]+@[^",\s]+)"?/i);
      const companyMatch = message.match(/companie?[:\s]+"?([^",\n]+)"?/i);
      
      if (nameMatch && phoneMatch) {
        console.log('👤 Creating enhanced contact:', nameMatch[1]);
        actionResult = await executeUserAction(userId, 'create_contact', {
          name: nameMatch[1].trim(),
          phone: phoneMatch[1].replace(/[\s\-\(\)]/g, ''),
          email: emailMatch?.[1] || '',
          company: companyMatch?.[1] || '',
          location: '',
          notes: 'Contact adăugat prin chat avansat'
        });
      }
    }
    
    // Enhanced Campaign Detection with Smart Suggestions
    else if ((lowerMessage.includes('creez') || lowerMessage.includes('incep') || lowerMessage.includes('lansez')) && 
             (lowerMessage.includes('campanie') || lowerMessage.includes('apel'))) {
      const campaignName = message.match(/campanie[:\s]+"?([^",\n]+)"?/i)?.[1]?.trim() || 
                          `Campanie Inteligentă ${new Date().toLocaleDateString('ro-RO')}`;
      
      console.log('📞 Creating smart campaign:', campaignName);
      
      // Auto-select best performing agent if available
      const bestAgent = userContext.agents.find(a => a.is_active) || userContext.agents[0];
      
      actionResult = await executeUserAction(userId, 'create_campaign', {
        name: campaignName,
        description: 'Campanie creată cu recomandări AI',
        agent_id: bestAgent?.agent_id || null
      });
    }
    
    // Smart Follow-up Detection
    else if (lowerMessage.includes('urmăr') || lowerMessage.includes('follow') || 
             lowerMessage.includes('reactiv')) {
      if (userContext.analytics?.contactEngagement?.needsFollowUp?.length > 0) {
        console.log('🔄 Creating automated follow-up campaign');
        actionResult = await executeSmartAction(userId, 'auto_create_followup_campaign', {}, userContext);
      }
    }
    
    // Agent Optimization Detection
    else if ((lowerMessage.includes('optimiz') || lowerMessage.includes('îmbunătățesc')) && 
             lowerMessage.includes('agent')) {
      if (userContext.agents.length > 0 && userContext.analytics) {
        console.log('⚡ Optimizing agent based on performance data');
        actionResult = await executeSmartAction(userId, 'optimize_agent_based_on_performance', {}, userContext);
      }
    }
    
    // Statistics and Analytics Detection
    else if (lowerMessage.includes('statistic') || lowerMessage.includes('analiz') || 
             lowerMessage.includes('performanț')) {
      console.log('📊 Retrieving advanced statistics');
      actionResult = await executeUserAction(userId, 'get_advanced_statistics', {});
    }

    // Creează promptul ultra-avansat cu contextul utilizatorului
    const systemPrompt = createUltraAdvancedSystemPrompt(userContext);

    // Construiește mesajele pentru OpenAI cu context avansat
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map((msg: any) => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Adaugă rezultatul acțiunii și contextul extins
    if (actionResult) {
      console.log('✅ Enhanced action executed:', actionResult);
      messages.push({
        role: 'system',
        content: `REZULTAT ACȚIUNE: ${JSON.stringify(actionResult)}`
      });
    }

    // Add proactive insights to the conversation
    if (userContext.insights.length > 0) {
      const highPriorityInsights = userContext.insights.filter(i => i.impact === 'high');
      if (highPriorityInsights.length > 0) {
        messages.push({
          role: 'system',
          content: `INSIGHTS CRITICE: ${JSON.stringify(highPriorityInsights.slice(0, 2))}`
        });
      }
    }

    console.log('🧠 Calling OpenAI with ultra-advanced context:', messages.length, 'messages');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: messages,
        max_completion_tokens: 2500,
        stream: false,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ OpenAI API error:', data);
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const aiResponse = data.choices[0].message.content;
    console.log('✨ Ultra-advanced AI response generated successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      userContext: {
        agentCount: userContext.agents.length,
        contactCount: userContext.contacts.length,
        balance: userContext.balance?.balance_usd || 0,
        totalCalls: userContext.statistics?.total_voice_calls || 0,
        successRate: userContext.analytics?.callPatterns?.successRate || 0,
        insights: userContext.insights.length,
        recommendations: userContext.recommendations.length,
        contextScore: userContext.contextScore
      },
      analytics: userContext.analytics ? {
        callSuccess: userContext.analytics.callPatterns?.successRate || 0,
        avgDuration: userContext.analytics.callPatterns?.averageDuration || 0,
        needsFollowUp: userContext.analytics.contactEngagement?.needsFollowUp?.length || 0,
        topPerformers: userContext.analytics.contactEngagement?.topPerformers?.length || 0
      } : null,
      notifications: userContext.notifications || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('💥 Error in ultra-advanced agent function:', error);
    return new Response(JSON.stringify({ 
      error: 'Am întâmpinat o problemă tehnică. Te rog încearcă din nou.',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});