// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// MCP Agent Tools - Professional internal assistant (extended)
const createMCPAgentTools = () => {
  return [
    {
      type: "function",
      function: {
        name: "getUserProfile",
        description: "Get current user profile information including name, email, account type, plan details",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getSubscriptionStatus",
        description: "Get user's subscription/plan status and trial info",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getUsageStats",
        description: "Get user's usage statistics including calls, minutes, spending, current limits",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["today", "week", "month", "all"],
              description: "Time period for statistics"
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getVoiceSettings",
        description: "Get current voice and AI agent configuration",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getSecurityFlags",
        description: "Check account security/health flags",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "listApiKeys",
        description: "List API keys metadata (never returns full secret)",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getNotifications",
        description: "Get actionable notifications for the user",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max items to return (default 10)" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getPendingTasks",
        description: "Get pending tasks (callbacks, verifications, etc.)",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max items to return (default 10)" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "updateUserProfile",
        description: "Update user profile information (name, preferences, etc.)",
        parameters: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            display_name: { type: "string" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "rotateVoiceApiKey",
        description: "Rotate voice API key (requires confirmation)",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "setVoicePreferences",
        description: "Set voice preferences for an agent",
        parameters: {
          type: "object",
          properties: {
            agent_id: { type: "string" },
            agent_row_id: { type: "string" },
            voice_id: { type: "string", description: "ElevenLabs voice ID" }
          },
          required: ["voice_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "enableFeature",
        description: "Enable a feature flag for the account",
        parameters: {
          type: "object",
          properties: { feature_name: { type: "string" } },
          required: ["feature_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "disableFeature",
        description: "Disable a feature flag for the account",
        parameters: {
          type: "object",
          properties: { feature_name: { type: "string" } },
          required: ["feature_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "createSupportTicket",
        description: "Create a support ticket",
        parameters: {
          type: "object",
          properties: {
            subject: { type: "string" },
            message: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] }
          },
          required: ["subject", "message"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "markNotificationRead",
        description: "Mark a notification as read",
        parameters: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "triggerDataSync",
        description: "Trigger data sync with external systems",
        parameters: {
          type: "object",
          properties: { target: { type: "string" } }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "requestExportPersonalData",
        description: "Request export of personal data (GDPR)",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "revokeApiKey",
        description: "Revoke an API key (requires confirmation)",
        parameters: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getAccountBalance",
        description: "Get current account balance and spending information",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "findContactsNeedingFollowUp",
        description: "Find contacts who haven't responded and need follow-up",
        parameters: {
          type: "object",
          properties: {
            days_back: {
              type: "number",
              description: "How many days back to check (default: 7)"
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getSystemHealth",
        description: "Check system status and any pending issues or notifications",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "getRecentActivity",
        description: "Get recent call history and activity summary",
        parameters: {
          type: "object",
          properties: { limit: { type: "number", description: "Number of recent activities to retrieve (max: 10)" } }
        }
      }
    },
    // Retrieve conversation details including transcripts
    {
      type: "function",
      function: {
        name: "getConversationDetails",
        description: "Get last N conversations with full transcript content, summaries and analysis from user's local database. Use this when user asks what was said in calls or wants to see conversation content.",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "How many conversations to fetch (default 5, max 10)" },
            conversation_id: { type: "string", description: "Optional specific conversation ID to fetch" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getConversationTranscript",
        description: "Get full formatted transcript for a specific conversation ID. Returns conversation in chat format with Agent/User messages.",
        parameters: {
          type: "object",
          properties: {
            conversation_id: { type: "string", description: "Conversation ID to get transcript for" },
            include_analysis: { type: "boolean", description: "Include conversation analysis and insights (default: true)" }
          },
          required: ["conversation_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getConversationAudio",
        description: "Get audio URL for a specific conversation to display audio player",
        parameters: {
          type: "object",
          properties: {
            conversation_id: { type: "string", description: "Conversation ID to get audio for" }
          },
          required: ["conversation_id"]
        }
      }
    },
    // Compatibility tool
    {
      type: "function",
      function: {
        name: "get_recent_calls",
        description: "Compatibility tool: recent calls with optional today_only filter",
        parameters: {
          type: "object",
          properties: {
            today_only: { type: "boolean" },
            limit: { type: "number" }
          }
        }
      }
    },
    // Get user agents tool
    {
      type: "function",
      function: {
        name: "getUserAgents",
        description: "Get list of available agents for the user to choose from",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    },
    // Scheduled callback tool
    {
      type: "function",
      function: {
        name: "createScheduledCallback",
        description: "Schedule a callback for a specific date and time in the future. Use this when user requests to call someone at a specific time (e.g., 'call me tomorrow at 9 AM', 'schedule a call for next week'). This creates an entry in the calendar that will be executed automatically.",
        parameters: {
          type: "object",
          properties: {
            client_name: {
              type: "string",
              description: "Name of the client/contact to call"
            },
            phone_number: {
              type: "string",
              description: "Phone number to call in international format (e.g., +373791234567)"
            },
            scheduled_time: {
              type: "string",
              description: "When to make the call in ISO format (e.g., '2024-01-15T09:00:00Z') or relative time (e.g., 'tomorrow at 9 AM', 'next Monday at 2 PM')"
            },
            agent_id: {
              type: "string",
              description: "REQUIRED: Agent ID to use for the scheduled call. Must be specified by user."
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Priority level for the callback (default: medium)"
            },
            reason: {
              type: "string",
              description: "Optional reason for the callback (e.g., 'follow-up', 'sales call', 'support')"
            },
            notes: {
              type: "string",
              description: "Optional additional notes about the callback"
            }
          },
          required: ["client_name", "phone_number", "scheduled_time", "agent_id"]
        }
      }
    },
    // Outbound calling tool
    {
      type: "function",
      function: {
        name: "startOutboundCall",
        description: "Initiate continuous outbound phone calls via ElevenLabs to provided contacts with retry logic. REQUIRES agent selection - always ask user to choose an agent first if no agent_id provided. Supports automatic language detection from user message (e.g., 'in limba rusa' will set {{language}} variable to 'русский'). Will continuously retry failed calls every 20 seconds until successful.",
        parameters: {
          type: "object",
          properties: {
            contacts: {
              type: "array",
              description: "List of contacts to call",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Contact name for personalization" },
                  phone: { type: "string", description: "Phone number in international or local format" }
                },
                required: ["phone"]
              }
            },
            agent_id: { type: "string", description: "REQUIRED: Agent ID to use for calls. Must be specified by user." },
            sales_topic: { type: "string", description: "What the agent should talk about or sell during the call (e.g. 'banane cu 10 lei/kg', 'servicii de consultanta')" },
            language: { type: "string", description: "Optional: Explicit language for the call. If not provided, will be auto-detected from user message patterns like 'in limba rusa' → 'русский'" },
            is_test_call: { type: "boolean", description: "Use test phone number if true" }
          },
          required: ["contacts", "agent_id"]
        }
      }
    },
    // Create phone agent tool
    {
      type: "function",
      function: {
        name: "createPhoneAgent",
        description: "Automatically create a phone agent for the user's business. Will generate name, prompt, and setup everything automatically based on business information.",
        parameters: {
          type: "object",
          properties: {
            business_name: { type: "string", description: "Name of the business/company" },
            business_type: { type: "string", description: "Type of business (e.g. 'restaurant', 'service auto', 'consultanta IT', 'salon frumusete')" },
            website_url: { type: "string", description: "Optional website URL to analyze for more details" },
            services_products: { type: "string", description: "What services/products the business offers" },
            target_audience: { type: "string", description: "Who are the main customers/clients" },
            language: { type: "string", enum: ["ro", "en", "es", "fr", "de", "it"], description: "Agent language (default: ro)" }
          },
          required: ["business_name", "business_type"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_payment_link",
        description: "Creates a Stripe payment link for the user to pay a custom amount",
        parameters: {
          type: "object",
          properties: {
            amount_usd: { type: "number", description: "Amount to charge in USD (e.g. 25.50)" },
            description: { type: "string", description: "Description of what they're paying for" }
          },
          required: ["amount_usd"]
        }
      }
    },
    // Database Query Tools
    {
      type: "function",
      function: {
        name: "getCallHistory",
        description: "Query call history with filters. Returns detailed call information including status, duration, cost, contact name.",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Number of calls to return (default: 10, max: 50)" },
            status: { type: "string", enum: ["all", "success", "failed", "no-answer", "busy"], description: "Filter by call status" },
            agent_id: { type: "string", description: "Filter by specific agent ID" },
            date_from: { type: "string", description: "Start date in ISO format (YYYY-MM-DD)" },
            date_to: { type: "string", description: "End date in ISO format (YYYY-MM-DD)" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getContactsDatabase",
        description: "Query all contacts from database with optional search",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Number of contacts to return (default: 20, max: 100)" },
            search: { type: "string", description: "Search by name or phone number" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getTopContacts",
        description: "Get top contacts ranked by number of calls and success rate",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Number of top contacts to return (default: 5, max: 20)" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getSpendingAnalysis",
        description: "Analyze spending patterns over time periods. Returns total cost, calls count, minutes, and averages.",
        parameters: {
          type: "object",
          properties: {
            period: { type: "string", enum: ["today", "week", "month", "all"], description: "Time period for analysis" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getAgentsPerformance",
        description: "Get performance metrics for all user's agents including success rate, total calls, minutes, and cost.",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getAllConversations",
        description: "Get ALL conversations from conversation analytics cache (13000+ conversations). Use this for queries about 'toate conversațiile', 'show all conversations', searching through all call data. Supports filters and search.",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max conversations to return (default: 500, max: 10000)" },
            offset: { type: "number", description: "Skip N conversations for pagination (default: 0)" },
            search: { type: "string", description: "Search in contact_name, phone_number, conversation_id" },
            agent_id: { type: "string", description: "Filter by agent ID" },
            status: { type: "string", description: "Filter by call status" },
            date_from: { type: "string", description: "Start date YYYY-MM-DD" },
            date_to: { type: "string", description: "End date YYYY-MM-DD" },
            min_duration: { type: "number", description: "Min duration in seconds" },
            include_transcript: { type: "boolean", description: "Include full transcripts (default: false for performance)" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "searchConversations",
        description: "Advanced search through ALL conversations with keyword matching in transcripts, summaries, and metadata. Perfect for finding specific topics or information discussed in calls.",
        parameters: {
          type: "object",
          properties: {
            keyword: { type: "string", description: "Keyword to search for in transcripts and summaries" },
            limit: { type: "number", description: "Max results to return (default: 100)" }
          },
          required: ["keyword"]
        }
      }
    },
    // Frontend navigation tool - tells frontend to navigate to a page
    {
      type: "function",
      function: {
        name: "navigateTo",
        description: "Navigate the user to a specific page in the platform. Use this when user asks to see a page, open something, or go somewhere. Available pages: /account/kalina-agents (list of agents), /account/agent-edit/{agentId} (edit specific agent), /account/workflow (workflows), /account/conversation-analytics (call history), /account/voices (voices), /account/integrations (integrations), /account/chat-widget (chat widget settings), /account/leads (leads), /account/files (files), /account/phone-numbers (phone numbers), /account/outbound (outbound calls), /account/settings (settings), /pricing (pricing/plans).",
        parameters: {
          type: "object",
          properties: {
            page: {
              type: "string",
              description: "Page path to navigate to (e.g., '/account/kalina-agents', '/account/agent-edit/abc123')"
            },
            reason: {
              type: "string",
              description: "Brief explanation of why navigating there"
            }
          },
          required: ["page"]
        }
      }
    },
    // Get detailed info about a specific agent
    {
      type: "function",
      function: {
        name: "getAgentDetails",
        description: "Get detailed information about a specific agent by name or ID, including system prompt, voice settings, status, and performance metrics.",
        parameters: {
          type: "object",
          properties: {
            agent_name: { type: "string", description: "Name of the agent to look up (partial match supported)" },
            agent_id: { type: "string", description: "Agent ID if known" }
          }
        }
      }
    },
    // Create agent visually - triggers frontend wizard with cursor animation
    {
      type: "function",
      function: {
        name: "createAgentVisual",
        description: "Start creating a new agent visually with AI cursor animation. The AI cursor will navigate to the agents page, click buttons, and fill in forms automatically. Use when user asks to create an agent, make a new agent, or set up an agent. The user will see a visible cursor performing all actions.",
        parameters: {
          type: "object",
          properties: {
            agent_name: { type: "string", description: "Name for the new agent (required)" },
            agent_type: { type: "string", enum: ["blank", "website", "business"], description: "Type of agent: 'blank' for empty canvas, 'website' for web assistant, 'business' for preconfigured business agent. Default: blank" },
            website_url: { type: "string", description: "Website URL (only for website type agent)" }
          },
          required: ["agent_name"]
        }
      }
    },
    // Edit agent name visually
    {
      type: "function",
      function: {
        name: "editAgentNameVisual",
        description: "Edit an agent's name visually with AI cursor animation. The AI cursor will navigate to the agent edit page, click the name field, and type the new name. Use when user asks to change, rename, or modify an agent's name.",
        parameters: {
          type: "object",
          properties: {
            agent_name: { type: "string", description: "Current name of the agent to edit (will search for this agent)" },
            new_name: { type: "string", description: "New name for the agent" }
          },
          required: ["agent_name", "new_name"]
        }
      }
    },
    // Edit agent prompt visually
    {
      type: "function",
      function: {
        name: "editAgentPromptVisual",
        description: "Edit an agent's system prompt visually with AI cursor animation. The AI cursor will navigate to the agent edit page and update the system prompt. Use when user asks to change, edit, or modify an agent's prompt or instructions.",
        parameters: {
          type: "object",
          properties: {
            agent_name: { type: "string", description: "Name of the agent to edit" },
            new_prompt: { type: "string", description: "New system prompt for the agent" }
          },
          required: ["agent_name", "new_prompt"]
        }
      }
    },
    // Change agent voice visually
    {
      type: "function",
      function: {
        name: "changeAgentVoiceVisual",
        description: "Change an agent's voice visually with AI cursor animation. The AI cursor will navigate to the agent edit page and select a new voice. Use when user asks to change or modify an agent's voice.",
        parameters: {
          type: "object",
          properties: {
            agent_name: { type: "string", description: "Name of the agent to edit" },
            voice_criteria: { type: "string", description: "Voice criteria: 'male', 'female', or specific voice name" }
          },
          required: ["agent_name"]
        }
      }
    },
    // Toggle agent status visually
    {
      type: "function",
      function: {
        name: "toggleAgentStatusVisual",
        description: "Activate or deactivate an agent visually with AI cursor animation. The AI cursor will navigate to the agents page and toggle the agent's status. Use when user asks to activate, deactivate, enable, disable, turn on, or turn off an agent.",
        parameters: {
          type: "object",
          properties: {
            agent_name: { type: "string", description: "Name of the agent to toggle" },
            activate: { type: "boolean", description: "true to activate, false to deactivate" }
          },
          required: ["agent_name", "activate"]
        }
      }
    }
  ]
};

// Execute MCP Agent tool functions (with alias mapping and new tools)
const executeMCPToolFunction = async (supabase: any, userId: string, functionName: string, args: any) => {
  console.log(`Executing MCP tool function: ${functionName} with args:`, args);

  // Normalize aliases / compatibility
  const aliasMap: Record<string, string> = {
    getRecentCalls: 'get_recent_calls',
    recent_calls: 'get_recent_calls',
    get_recent_calls: 'get_recent_calls',
    create_payment_link: 'createPaymentLink',
  };
  const fn = aliasMap[functionName] || functionName;

  switch (fn) {
    case "getUserProfile": {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, account_type, plan, created_at')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const { data: balance } = await supabase
        .from('user_balance')
        .select('balance_usd')
        .eq('user_id', userId)
        .single();

      return {
        profile: profile || {},
        balance: balance?.balance_usd || 0,
        account_status: profile?.account_type || 'regular'
      };
    }

    case "getSubscriptionStatus": {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan, account_type, created_at')
        .eq('id', userId)
        .single();
      if (error) throw error;

      const now = new Date();
      const created = profile?.created_at ? new Date(profile.created_at) : null;
      const trialDays = 14;
      const trialEnds = created ? new Date(created.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;
      const trialActive = trialEnds ? now < trialEnds : false;
      const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;

      return {
        plan: profile?.plan || 'starter',
        account_type: profile?.account_type || 'regular',
        trial_active: trialActive,
        trial_days_left: daysLeft,
        trial_ends_at: trialEnds ? trialEnds.toISOString() : null
      };
    }

    case "getUsageStats": {
      const period = args?.period || 'week';
      const { data: stats, error: statsError } = await supabase
        .from('user_statistics')
        .select('total_voice_calls, total_minutes_talked, total_spent_usd, current_spent_usd')
        .eq('user_id', userId)
        .single();
      if (statsError) throw statsError;

      let timeFilter = '';
      const now = new Date();
      switch (period) {
        case 'today':
          timeFilter = now.toISOString().split('T')[0] + 'T00:00:00.000Z';
          break;
        case 'week':
          timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      let recentQuery = supabase
        .from('call_history')
        .select('call_status, duration_seconds, cost_usd')
        .eq('user_id', userId)
        .order('call_date', { ascending: false });
      if (timeFilter) recentQuery = recentQuery.gte('call_date', timeFilter);
      const { data: recentCalls } = await recentQuery;

      const recentSuccess = recentCalls?.filter((c: any) => c.call_status === 'completed').length || 0;
      const successRate = recentCalls?.length ? Math.round((recentSuccess / recentCalls.length) * 100) : 0;
      const recentSpending = recentCalls?.reduce((sum: number, c: any) => sum + (c.cost_usd || 0), 0) || 0;

      const { data: balance } = await supabase
        .from('user_balance')
        .select('balance_usd')
        .eq('user_id', userId)
        .single();

      return {
        ...stats,
        recent_period: period,
        recent_calls: recentCalls?.length || 0,
        recent_success_rate: successRate,
        recent_spending: recentSpending,
        balance_remaining: (balance?.balance_usd || 0) - recentSpending
      };
    }

    case "getVoiceSettings": {
      const { data: agents, error: agentsError } = await supabase
        .from('kalina_agents')
        .select('id, name, voice_id, provider, is_active, system_prompt, agent_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(5);
      if (agentsError) throw agentsError;
      return {
        active_agents: agents || [],
        total_agents: agents?.length || 0,
        has_voice_setup: (agents?.length || 0) > 0
      };
    }

    case "getSecurityFlags": {
      const flags: string[] = [];
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', userId)
        .single();
      if (profile?.account_type === 'banned') flags.push('account_banned');

      const { data: balance } = await supabase
        .from('user_balance')
        .select('balance_usd')
        .eq('user_id', userId)
        .single();
      if ((balance?.balance_usd ?? 0) < 1) flags.push('low_balance');

      const { data: agents } = await supabase
        .from('kalina_agents')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (!agents || agents.length === 0) flags.push('no_active_agent');

      return { flags };
    }

    case "listApiKeys": {
      return {
        keys: [],
        info: 'Cheile API nu sunt listate în clar din motive de securitate. Putem roti sau revoca la cerere.'
      };
    }

    case "getNotifications": {
      const limit = Math.min(args?.limit || 10, 25);
      const items: any[] = [];
      const nowIso = new Date().toISOString();

      // Upcoming callbacks in next 48h
      const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const { data: callbacks } = await supabase
        .from('callback_requests')
        .select('id, client_name, phone_number, scheduled_time, status, priority')
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_time', nowIso)
        .lte('scheduled_time', in48h)
        .order('scheduled_time', { ascending: true })
        .limit(limit);
      (callbacks || []).forEach((c: any) => items.push({
        type: 'callback_scheduled',
        id: c.id,
        title: `Callback programat cu ${c.client_name || 'client'}`,
        scheduled_time: c.scheduled_time,
        phone_number: c.phone_number,
        priority: c.priority
      }));

      // Low balance warning
      const { data: balance } = await supabase
        .from('user_balance')
        .select('balance_usd')
        .eq('user_id', userId)
        .single();
      if ((balance?.balance_usd ?? 0) < 1) {
        items.unshift({ type: 'low_balance', title: 'Balanță scăzută', balance: balance?.balance_usd || 0 });
      }

      return { notifications: items.slice(0, limit), total_found: items.length };
    }

    case "getPendingTasks": {
      // Reuse notifications as tasks for now
      const res = await executeMCPToolFunction(supabase, userId, 'getNotifications', { limit: args?.limit || 10 });
      return { tasks: res.notifications || [], total_found: res.total_found || 0 };
    }

    case "getConversationDetails": {
      const limit = Math.min(args?.limit || 5, 10);

      // Prefer cached analytics with transcripts
      const { data: cached, error: cacheError } = await supabase
        .from('conversation_analytics_cache')
        .select('conversation_id, call_date, duration_seconds, call_status, contact_name, phone_number, transcript, analysis, agent_id')
        .eq('user_id', userId)
        .order('call_date', { ascending: false })
        .limit(limit);
      if (cacheError) {
        console.warn('conversation_analytics_cache error:', cacheError.message);
      }

      let items: any[] = [];
      if (cached && cached.length) {
        items = cached.map((c: any) => ({
          conversation_id: c.conversation_id,
          call_date: c.call_date,
          duration_seconds: c.duration_seconds,
          call_status: c.call_status,
          contact_name: c.contact_name,
          phone_number: c.phone_number,
          agent_id: c.agent_id,
          transcript: Array.isArray(c.transcript) ? c.transcript.map((t: any) => ({ role: t.role, message: t.message })) : [],
          summary: c.analysis?.transcript_summary || null
        }));
      }

      // Fallback to call_history.dialog_json if transcripts missing or empty
      if (items.length === 0 || items.every(i => !i.transcript || i.transcript.length === 0)) {
        const { data: calls, error } = await supabase
          .from('call_history')
          .select('conversation_id, call_date, duration_seconds, call_status, contact_name, phone_number, dialog_json, summary, agent_id')
          .eq('user_id', userId)
          .order('call_date', { ascending: false })
          .limit(limit);
        if (error) throw error;

        items = (calls || []).map((c: any) => {
          let transcript: any[] = [];
          if (c.dialog_json) {
            try {
              const parsed = typeof c.dialog_json === 'string' ? JSON.parse(c.dialog_json) : c.dialog_json;
              if (Array.isArray(parsed)) {
                transcript = parsed
                  .filter((m: any) => m && (m.message || m.content))
                  .map((m: any) => ({ role: m.role === 'agent' ? 'agent' : 'user', message: m.message || m.content }));
              }
            } catch (_) { }
          }
          return {
            conversation_id: c.conversation_id,
            call_date: c.call_date,
            duration_seconds: c.duration_seconds,
            call_status: c.call_status,
            contact_name: c.contact_name,
            phone_number: c.phone_number,
            agent_id: c.agent_id,
            transcript,
            summary: c.summary || null
          };
        });
      }

      return { conversations: items, total_found: items.length };
    }

    case "getConversationTranscript": {
      const conversationId = args?.conversation_id;
      if (!conversationId) throw new Error('conversation_id este obligatoriu');

      const includeAnalysis = args?.include_analysis !== false;

      // First try conversation_analytics_cache for detailed data
      const { data: cachedConv } = await supabase
        .from('conversation_analytics_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .single();

      if (cachedConv) {
        let formattedTranscript = '';
        let analysis = null;

        // Parse transcript from JSON
        if (cachedConv.transcript) {
          try {
            const transcriptData = typeof cachedConv.transcript === 'string'
              ? JSON.parse(cachedConv.transcript)
              : cachedConv.transcript;

            if (Array.isArray(transcriptData)) {
              formattedTranscript = transcriptData
                .filter((msg: any) => msg && (msg.message || msg.content))
                .map((msg: any) => {
                  const role = msg.role === 'agent' ? 'Agent' : 'User';
                  const content = msg.message || msg.content || '';
                  return `${role}: ${content}`;
                })
                .join('\n\n');
            }
          } catch (e) {
            console.log('Error parsing cached transcript:', e);
          }
        }

        // Parse analysis if requested
        if (includeAnalysis && cachedConv.analysis) {
          try {
            analysis = typeof cachedConv.analysis === 'string'
              ? JSON.parse(cachedConv.analysis)
              : cachedConv.analysis;
          } catch (e) {
            console.log('Error parsing analysis:', e);
          }
        }

        return {
          conversation_id: conversationId,
          contact_name: cachedConv.contact_name,
          agent_name: cachedConv.agent_name,
          phone_number: cachedConv.phone_number,
          call_date: cachedConv.call_date,
          duration_seconds: cachedConv.duration_seconds,
          call_status: cachedConv.call_status,
          formatted_transcript: formattedTranscript,
          analysis: analysis,
          source: 'cache'
        };
      }

      // Fallback to call_history
      const { data: callHistory } = await supabase
        .from('call_history')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .single();

      if (callHistory) {
        let formattedTranscript = '';

        if (callHistory.dialog_json) {
          try {
            const dialogData = typeof callHistory.dialog_json === 'string'
              ? JSON.parse(callHistory.dialog_json)
              : callHistory.dialog_json;

            if (Array.isArray(dialogData)) {
              formattedTranscript = dialogData
                .filter((msg: any) => msg && (msg.message || msg.content))
                .map((msg: any) => {
                  const role = msg.role === 'agent' ? 'Agent' : 'User';
                  const content = msg.message || msg.content || '';
                  return `${role}: ${content}`;
                })
                .join('\n\n');
            }
          } catch (e) {
            console.log('Error parsing call history transcript:', e);
          }
        }

        return {
          conversation_id: conversationId,
          contact_name: callHistory.contact_name,
          agent_id: callHistory.agent_id,
          phone_number: callHistory.phone_number,
          call_date: callHistory.call_date,
          duration_seconds: callHistory.duration_seconds,
          call_status: callHistory.call_status,
          formatted_transcript: formattedTranscript,
          summary: callHistory.summary,
          source: 'call_history'
        };
      }

      throw new Error(`Conversația cu ID ${conversationId} nu a fost găsită`);
    }

    case "getConversationAudio": {
      const conversationId = args?.conversation_id;
      if (!conversationId) {
        throw new Error('conversation_id este obligatoriu');
      }

      console.log('Getting audio for conversation:', conversationId);

      try {
        // Call the get-conversation-audio function
        const { data: audioResult, error: audioError } = await supabase.functions.invoke('get-conversation-audio', {
          body: { conversationId }
        });

        if (audioError) {
          console.error('Error getting audio:', audioError);
          return {
            success: false,
            error: audioError.message || 'Nu s-a putut obține audio-ul conversației',
            has_audio: false
          };
        }

        if (audioResult?.audioUrl) {
          // Check if conversation details exist for metadata
          const { data: cachedConv } = await supabase
            .from('conversation_analytics_cache')
            .select('contact_name, agent_name, call_date, duration_seconds')
            .eq('user_id', userId)
            .eq('conversation_id', conversationId)
            .single();

          return {
            success: true,
            audio_url: audioResult.audioUrl,
            cached: audioResult.cached || false,
            has_audio: true,
            conversation_metadata: cachedConv || null
          };
        } else {
          return {
            success: false,
            error: 'Audio nu este disponibil pentru această conversație',
            has_audio: false
          };
        }
      } catch (error) {
        console.error('Error in getConversationAudio:', error);
        return {
          success: false,
          error: error.message || 'Eroare la obținerea audio-ului',
          has_audio: false
        };
      }
    }

    case "getRecentActivity": {
      const limit = Math.min(args?.limit || 5, 10);
      const { data: calls, error } = await supabase
        .from('call_history')
        .select('contact_name, phone_number, call_date, duration_seconds, call_status, agent_id')
        .eq('user_id', userId)
        .order('call_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { recent_calls: calls || [], total_found: calls?.length || 0 };
    }

    case "get_recent_calls": {
      const limit = Math.min(args?.limit || 10, 50);
      let q = supabase
        .from('call_history')
        .select('contact_name, phone_number, call_status, call_date, duration_seconds, agent_id')
        .eq('user_id', userId)
        .order('call_date', { ascending: false })
        .limit(limit);
      if (args?.today_only) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        q = q.gte('call_date', start.toISOString());
      }
      const { data: calls, error } = await q;
      if (error) throw error;
      return { calls: calls || [], total: calls?.length || 0, today_only: !!args?.today_only };
    }

    case "updateUserProfile": {
      const updates: any = {};
      if (args?.first_name) updates.first_name = args.first_name;
      if (args?.last_name) updates.last_name = args.last_name;
      if (args?.display_name) updates.display_name = args.display_name;
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, updated_fields: Object.keys(updates), profile: data };
    }

    case "rotateVoiceApiKey": {
      // Not implemented in DB – return guidance
      return { success: false, message: 'Rotirea cheii de voce nu este disponibilă direct din cont. Pot crea un ticket către suport.' };
    }

    case "setVoicePreferences": {
      if (!args?.voice_id) throw new Error('voice_id este obligatoriu');
      let query = supabase
        .from('kalina_agents')
        .update({ voice_id: args.voice_id, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (args?.agent_row_id) query = query.eq('id', args.agent_row_id);
      else if (args?.agent_id) query = query.eq('agent_id', args.agent_id);
      else query = query.eq('is_active', true);
      const { data, error } = await query.select();
      if (error) throw error;
      return { success: true, updated_count: data?.length || 0, agents: data || [] };
    }

    case "enableFeature":
    case "disableFeature":
    case "createSupportTicket":
    case "markNotificationRead":
    case "triggerDataSync":
    case "requestExportPersonalData":
    case "revokeApiKey": {
      return { success: false, message: `Operatia ${fn} nu este disponibilă încă în acest cont.` };
    }

    case "getAccountBalance": {
      const { data: balance } = await supabase
        .from('user_balance')
        .select('balance_usd')
        .eq('user_id', userId)
        .single();
      const { data: transactions } = await supabase
        .from('balance_transactions')
        .select('amount, transaction_type, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      return {
        current_balance: balance?.balance_usd || 0,
        recent_transactions: transactions || [],
        has_transactions: (transactions?.length || 0) > 0
      };
    }

    case "findContactsNeedingFollowUp": {
      const daysBack = Math.min(args?.days_back || 7, 30);
      const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      const statuses = ['no-answer', 'no_answer', 'noanswer', 'not_answered', 'unanswered', 'failed', 'busy', 'rejected'];
      const { data: calls, error } = await supabase
        .from('call_history')
        .select('contact_name, phone_number, call_status, call_date')
        .eq('user_id', userId)
        .gte('call_date', fromDate.toISOString())
        .in('call_status', statuses)
        .order('call_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      const uniqueContacts = new Map<string, any>();
      (calls || []).forEach((call: any) => {
        const key = call.phone_number || call.contact_name || 'unknown';
        if (!uniqueContacts.has(key)) uniqueContacts.set(key, call);
      });
      return {
        contacts_needing_followup: Array.from(uniqueContacts.values()),
        period_days: daysBack,
        total_found: uniqueContacts.size
      };
    }

    case "getSystemHealth": {
      const { data: recentCalls } = await supabase
        .from('call_history')
        .select('call_status')
        .eq('user_id', userId)
        .gte('call_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('call_date', { ascending: false });
      const success = recentCalls?.filter((c: any) => c.call_status === 'completed').length || 0;
      const total = recentCalls?.length || 0;
      const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
      let healthStatus = 'good';
      const notifications: string[] = [];
      if (successRate < 20 && total > 5) {
        healthStatus = 'warning';
        notifications.push('Rata de succes scăzută (sub 20%) în ultimele 24h');
      }
      if (total === 0) notifications.push('Nu ai făcut apeluri în ultimele 24h');
      return {
        health_status: healthStatus,
        success_rate_24h: successRate,
        total_calls_24h: total,
        notifications,
        system_operational: true
      };
    }

    case "getUserAgents": {
      const { data: agents, error: agentsError } = await supabase
        .from('kalina_agents')
        .select('agent_id, name, is_active, voice_id, system_prompt')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      return {
        agents: agents || [],
        total_count: agents?.length || 0,
        active_count: agents?.filter(a => a.is_active)?.length || 0
      };
    }

    case "navigateTo": {
      // This is a frontend action - we return the navigation command
      // The frontend will parse this and perform the actual navigation
      const page = args?.page || '/account';
      const reason = args?.reason || '';

      return {
        __frontend_action__: true,
        action: 'navigate',
        page: page,
        reason: reason,
        message: `Te duc la ${page}${reason ? ` - ${reason}` : ''}`
      };
    }

    case "createAgentVisual": {
      // This is a frontend action that triggers the visual agent creation wizard
      // The AI cursor will navigate and fill forms automatically
      const agent_name = args?.agent_name || 'Noul Meu Agent';
      const agent_type = args?.agent_type || 'blank';
      const website_url = args?.website_url;

      return {
        __frontend_action__: true,
        action: 'create_agent',
        agent_name: agent_name,
        agent_type: agent_type,
        website_url: website_url,
        message: `Creez agentul "${agent_name}"...`
      };
    }

    case "editAgentNameVisual": {
      // Frontend action to edit agent name visually
      const agent_name = args?.agent_name;
      const new_name = args?.new_name;

      if (!agent_name || !new_name) {
        throw new Error('agent_name și new_name sunt obligatorii');
      }

      return {
        __frontend_action__: true,
        action: 'edit_agent_name',
        agent_name: agent_name,
        new_name: new_name,
        message: `Schimb numele agentului "${agent_name}" în "${new_name}"...`
      };
    }

    case "editAgentPromptVisual": {
      // Frontend action to edit agent prompt visually
      const agent_name = args?.agent_name;
      const new_prompt = args?.new_prompt;

      if (!agent_name || !new_prompt) {
        throw new Error('agent_name și new_prompt sunt obligatorii');
      }

      return {
        __frontend_action__: true,
        action: 'edit_agent_prompt',
        agent_name: agent_name,
        new_prompt: new_prompt,
        message: `Editez promptul pentru agentul "${agent_name}"...`
      };
    }

    case "changeAgentVoiceVisual": {
      // Frontend action to change agent voice visually
      const agent_name = args?.agent_name;
      const voice_criteria = args?.voice_criteria;

      if (!agent_name) {
        throw new Error('agent_name este obligatoriu');
      }

      return {
        __frontend_action__: true,
        action: 'change_agent_voice',
        agent_name: agent_name,
        voice_criteria: voice_criteria,
        message: `Schimb vocea pentru agentul "${agent_name}"${voice_criteria ? ` în una ${voice_criteria}` : ''}...`
      };
    }

    case "toggleAgentStatusVisual": {
      // Frontend action to toggle agent status visually
      const agent_name = args?.agent_name;
      const activate = args?.activate ?? true;

      if (!agent_name) {
        throw new Error('agent_name este obligatoriu');
      }

      return {
        __frontend_action__: true,
        action: 'toggle_agent_status',
        agent_name: agent_name,
        activate: activate,
        message: activate
          ? `Activez agentul "${agent_name}"...`
          : `Dezactivez agentul "${agent_name}"...`
      };
    }

    case "getAgentDetails": {
      const { agent_name, agent_id } = args || {};

      let query = supabase
        .from('kalina_agents')
        .select('*')
        .eq('user_id', userId);

      if (agent_id) {
        query = query.eq('agent_id', agent_id);
      } else if (agent_name) {
        query = query.ilike('name', `%${agent_name}%`);
      }

      const { data: agents, error: agentsError } = await query.limit(1);

      if (agentsError) throw agentsError;
      if (!agents || agents.length === 0) {
        return {
          found: false,
          message: agent_name
            ? `Nu am găsit agentul "${agent_name}". Verifică numele sau folosește getUserAgents pentru a vedea toți agenții.`
            : 'Specifică numele sau ID-ul agentului.'
        };
      }

      const agent = agents[0];

      // Get performance metrics for this agent
      const { data: calls } = await supabase
        .from('call_history')
        .select('call_status, call_duration, total_cost')
        .eq('user_id', userId)
        .eq('agent_id', agent.agent_id);

      const totalCalls = calls?.length || 0;
      const successCalls = calls?.filter((c: any) => c.call_status === 'completed').length || 0;
      const totalMinutes = calls?.reduce((acc: number, c: any) => acc + (c.call_duration || 0) / 60, 0) || 0;
      const totalCost = calls?.reduce((acc: number, c: any) => acc + (c.total_cost || 0), 0) || 0;

      return {
        found: true,
        agent: {
          id: agent.id,
          agent_id: agent.agent_id,
          name: agent.name,
          description: agent.description,
          is_active: agent.is_active,
          voice_id: agent.voice_id,
          voice_name: agent.voice_name,
          provider: agent.provider,
          system_prompt: agent.system_prompt?.substring(0, 500) + (agent.system_prompt?.length > 500 ? '...' : ''),
          language: agent.language,
          timezone: agent.timezone,
          created_at: agent.created_at
        },
        performance: {
          total_calls: totalCalls,
          success_calls: successCalls,
          success_rate: totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0,
          total_minutes: Math.round(totalMinutes * 10) / 10,
          total_cost_usd: Math.round(totalCost * 100) / 100
        },
        edit_url: `/account/agent-edit/${agent.agent_id}`,
        __frontend_action__: true,
        action: 'show_agent',
        agent_id: agent.agent_id
      };
    }

    case "startOutboundCall": {
      const contactsArg = Array.isArray(args?.contacts) ? args.contacts : [];
      if (!contactsArg || contactsArg.length === 0) {
        throw new Error('Nu sunt contacte furnizate');
      }

      const agentId = args?.agent_id;
      if (!agentId) {
        return {
          success: false,
          message: 'Trebuie să specifici agentul pentru apeluri. Te rog alege un agent din lista disponibilă.',
          started: 0,
          attempted: 0,
          failed: contactsArg.length,
          requires_agent_selection: true
        };
      }

      // Verify agent exists and belongs to user
      const { data: agent, error: agentError } = await supabase
        .from('kalina_agents')
        .select('agent_id, name, is_active')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .single();

      if (agentError || !agent) {
        return {
          success: false,
          message: 'Agentul specificat nu există sau nu îți aparține.',
          started: 0,
          attempted: 0,
          failed: contactsArg.length
        };
      }

      if (!agent.is_active) {
        return {
          success: false,
          message: `Agentul "${agent.name}" nu este activ. Te rog activează-l sau alege alt agent.`,
          started: 0,
          attempted: 0,
          failed: contactsArg.length
        };
      }

      // Language detection from user message context
      let detectedLanguage = '';
      if (args?.language) {
        detectedLanguage = args.language;
      } else if (args?._user_message) {
        // Detect language from user message patterns
        const userMsg = args._user_message.toLowerCase();
        if (userMsg.includes('în limba rusă') || userMsg.includes('in limba rusa') || userMsg.includes('pe rusă')) {
          detectedLanguage = 'русский';
        } else if (userMsg.includes('în engleză') || userMsg.includes('in engleza') || userMsg.includes('pe engleză')) {
          detectedLanguage = 'english';
        } else if (userMsg.includes('în franceză') || userMsg.includes('in franceza') || userMsg.includes('pe franceză')) {
          detectedLanguage = 'français';
        } else if (userMsg.includes('în spaniolă') || userMsg.includes('in spaniola') || userMsg.includes('pe spaniolă')) {
          detectedLanguage = 'español';
        } else if (userMsg.includes('în română') || userMsg.includes('in romana') || userMsg.includes('pe română')) {
          detectedLanguage = 'română';
        }
      }

      const details: any[] = [];
      let started = 0, failed = 0;
      const limitedContacts = contactsArg.slice(0, 10);

      // Track call status for each contact
      const contactStatus = new Map();
      limitedContacts.forEach((contact, index) => {
        contactStatus.set(index, {
          contact,
          attempts: 0,
          maxAttempts: 5, // Try each contact maximum 5 times
          success: false,
          lastError: null
        });
      });

      // Continuous calling function with 20 second intervals
      const processContinuousCalls = async () => {
        for (let round = 1; round <= 5; round++) {
          console.log(`🔄 Runda ${round} de apeluri...`);

          for (let i = 0; i < limitedContacts.length; i++) {
            const status = contactStatus.get(i);

            // Skip if already successful or reached max attempts
            if (status.success || status.attempts >= status.maxAttempts) {
              continue;
            }

            const c = status.contact;
            status.attempts++;

            console.log(`📞 Apel către ${c.name || c.phone} (încercarea ${status.attempts}/${status.maxAttempts})...`);

            try {
              // Prepare dynamic variables
              const dynamicVars: any = {};
              if (c.name) {
                dynamicVars.user_name = c.name;
              }
              if (args?.sales_topic) {
                dynamicVars.sales = args.sales_topic;
              }
              if (detectedLanguage) {
                dynamicVars.language = detectedLanguage;
              }

              const { error: callError } = await supabase.functions.invoke('initiate-scheduled-call', {
                body: {
                  agent_id: agentId,
                  phone_number: c.phone,
                  contact_name: c.name || 'Contact',
                  user_id: userId,
                  is_test_call: !!args?.is_test_call,
                  dynamic_variables: Object.keys(dynamicVars).length > 0 ? dynamicVars : undefined
                }
              });

              if (callError) {
                console.error(`❌ Eroare apel ${c.name || c.phone}:`, callError);
                status.lastError = callError.message;
              } else {
                console.log(`✅ Apel inițiat cu succes pentru ${c.name || c.phone}`);
                status.success = true;
                started++;
                details.push({ phone: c.phone, status: 'started', language: detectedLanguage || 'română', attempt: status.attempts });
              }

            } catch (err) {
              console.error(`💥 Excepție la apelul ${c.name || c.phone}:`, err);
              status.lastError = err?.message || String(err);
            }

            // Wait 20 seconds before next call
            if (i < limitedContacts.length - 1 || (round < 5 && Array.from(contactStatus.values()).some(s => !s.success && s.attempts < s.maxAttempts))) {
              console.log(`⏳ Aștept 20 secunde înainte de următorul apel...`);
              await new Promise(resolve => setTimeout(resolve, 20000));
            }
          }

          // Check if all contacts are successful
          const allSuccessful = Array.from(contactStatus.values()).every(s => s.success);
          if (allSuccessful) {
            console.log(`🎉 Toate contactele au fost apelate cu succes în runda ${round}!`);
            break;
          }
        }
      };

      // Start continuous calling
      await processContinuousCalls();

      // Calculate final statistics
      const successfulContacts = Array.from(contactStatus.values()).filter(s => s.success).length;
      failed = limitedContacts.length - successfulContacts;
      return {
        success: true,
        attempted: limitedContacts.length,
        started: successfulContacts,
        failed,
        agent_id: agentId,
        detected_language: detectedLanguage || 'română',
        continuous_calling: true,
        interval_seconds: 20,
        details
      };
    }

    case "createScheduledCallback": {
      const { client_name, phone_number, scheduled_time, agent_id, priority = 'medium', reason, notes } = args;

      if (!client_name || !phone_number || !scheduled_time || !agent_id) {
        throw new Error('client_name, phone_number, scheduled_time și agent_id sunt obligatorii');
      }

      // Verify agent exists and belongs to user
      const { data: agent, error: agentError } = await supabase
        .from('kalina_agents')
        .select('agent_id, name, is_active')
        .eq('user_id', userId)
        .eq('agent_id', agent_id)
        .single();

      if (agentError || !agent) {
        return {
          success: false,
          message: 'Agentul specificat nu există sau nu îți aparține.'
        };
      }

      if (!agent.is_active) {
        return {
          success: false,
          message: `Agentul "${agent.name}" nu este activ. Te rog activează-l sau alege alt agent.`
        };
      }

      // Parse scheduled time - support both ISO format and natural language
      let parsedTime: Date;
      try {
        // First try parsing as ISO date
        if (scheduled_time.includes('T') || scheduled_time.includes('Z')) {
          parsedTime = new Date(scheduled_time);
        } else {
          // Parse natural language time expressions in Romanian
          const now = new Date();
          const lowerTime = scheduled_time.toLowerCase().trim();

          if (lowerTime.includes('mâine') || lowerTime.includes('maine')) {
            parsedTime = new Date(now);
            parsedTime.setDate(now.getDate() + 1);

            // Extract hour if specified
            const hourMatch = lowerTime.match(/la ora (\d{1,2})/);
            if (hourMatch) {
              parsedTime.setHours(parseInt(hourMatch[1]), 0, 0, 0);
            } else if (lowerTime.includes('dimineața') || lowerTime.includes('dimineata')) {
              parsedTime.setHours(9, 0, 0, 0); // Default to 9 AM
            } else if (lowerTime.includes('seara')) {
              parsedTime.setHours(18, 0, 0, 0); // Default to 6 PM
            } else {
              parsedTime.setHours(10, 0, 0, 0); // Default to 10 AM
            }
          } else if (lowerTime.includes('astăzi') || lowerTime.includes('astazi')) {
            parsedTime = new Date(now);

            const hourMatch = lowerTime.match(/la ora (\d{1,2})/);
            if (hourMatch) {
              parsedTime.setHours(parseInt(hourMatch[1]), 0, 0, 0);
            } else {
              parsedTime.setHours(now.getHours() + 1, 0, 0, 0); // Default to 1 hour from now
            }
          } else {
            // Try to parse as regular date
            parsedTime = new Date(scheduled_time);
          }
        }

        if (isNaN(parsedTime.getTime())) {
          throw new Error('Data/ora nevalidă');
        }

        // Check if the time is in the past
        if (parsedTime <= new Date()) {
          throw new Error('Nu poți programa apeluri în trecut');
        }

      } catch (error) {
        return {
          success: false,
          message: `Eroare la parsarea datei/orei: ${error.message}. Te rog folosește format ISO (2024-01-15T09:00:00Z) sau limbaj natural (mâine la ora 9, astăzi la ora 14, etc.)`
        };
      }

      // Create scheduled callback in database
      const { data: callback, error: callbackError } = await supabase
        .from('scheduled_calls')
        .insert({
          user_id: userId,
          client_name,
          phone_number,
          agent_id,
          scheduled_datetime: parsedTime.toISOString(),
          task_type: 'callback',
          priority,
          description: reason || `Apel programat cu ${client_name}`,
          notes,
          status: 'scheduled'
        })
        .select()
        .single();

      if (callbackError) {
        console.error('Error creating scheduled callback:', callbackError);
        return {
          success: false,
          message: `Eroare la programarea apelului: ${callbackError.message}`
        };
      }

      return {
        success: true,
        callback_id: callback.id,
        scheduled_time: parsedTime.toISOString(),
        message: `Apelul către ${client_name} (${phone_number}) a fost programat cu succes pentru ${parsedTime.toLocaleString('ro-RO')} cu agentul ${agent.name}.`,
        details: {
          client_name,
          phone_number,
          agent_name: agent.name,
          scheduled_datetime: parsedTime.toISOString(),
          priority,
          reason,
          notes
        }
      };
    }

    case "createPhoneAgent": {
      const {
        business_name,
        business_type,
        website_url,
        services_products = "",
        target_audience = "",
        language = "ro"
      } = args;

      if (!business_name || !business_type) {
        throw new Error('business_name și business_type sunt obligatorii');
      }

      // Generate agent name automatically
      const agentNames = [
        `${business_name} Assistant`,
        `Agent ${business_name}`,
        `${business_name} Support`,
        `Asistent ${business_name}`,
        `${business_name} Sales`
      ];
      const agentName = agentNames[Math.floor(Math.random() * agentNames.length)];

      // Choose voice based on business type and language
      const voices = {
        ro: ["9BWtsMINqrJLrRacOk9x", "FGY2WhTYpPnrIDTdsKH5", "XB0fDUnXU5powFXDhCwa"], // Aria, Laura, Charlotte
        en: ["21m00Tcm4TlvDq8ikWAM", "AZnzlk1XvdvUeBnXmlld", "EXAVITQu4vr4xnSDxMaL"], // Rachel, Domi, Sarah
        es: ["9BWtsMINqrJLrRacOk9x", "FGY2WhTYpPnrIDTdsKH5"],
        fr: ["9BWtsMINqrJLrRacOk9x", "FGY2WhTYpPnrIDTdsKH5"],
        de: ["9BWtsMINqrJLrRacOk9x", "FGY2WhTYpPnrIDTdsKH5"],
        it: ["9BWtsMINqrJLrRacOk9x", "FGY2WhTYpPnrIDTdsKH5"]
      };
      const voiceOptions = voices[language] || voices.ro;
      const selectedVoice = voiceOptions[Math.floor(Math.random() * voiceOptions.length)];

      // Generate comprehensive prompt using OpenAI
      const promptInstruction = `
Creează un prompt detaliat pentru un agent conversațional telefonic pentru următoarea companie:

INFORMAȚII COMPANIE:
- Nume: ${business_name}
- Tip business: ${business_type}
- Servicii/Produse: ${services_products}
- Audiența țintă: ${target_audience}
- Limba: ${language}
${website_url ? `- Website: ${website_url}` : ''}

GENEREAZĂ UN PROMPT STRUCTURAT ASTFEL:

🎯 IDENTITATE AGENT
Nume: [Nume Agent]
Companie: ${business_name}
Rol: Agent de vânzări și suport clienți specializat în ${business_type}

👤 PERSONALITATE
[Personalitate potrivită pentru acest tip de business - profesională, prietenoasă, persuasivă]

🗣️ STIL COMUNICARE
- Ton: [Ton potrivit pentru business]
- Limbaj: [Formal/informal după caz]
- Energie: [Nivelul de energie potrivit]

📋 OBIECTIVE PRINCIPALE
1. Prezentarea serviciilor/produselor companiei
2. Conversia clienților potențiali
3. Răspunsul la întrebări despre companie
4. Programarea întâlnirilor/consultațiilor
5. Generarea de lead-uri calificate

🏢 SERVICII/PRODUSE
[Lista detaliată a serviciilor/produselor cu beneficii și prețuri dacă e cazul]

💬 SCRIPT CONVORBIRE
Deschidere: [Salut personalizat și prezentare]
Descoperire nevoi: [Întrebări pentru identificarea nevoilor]
Prezentare soluție: [Cum să prezinte serviciile]
Gestionare obiecții: [Răspunsuri la obiecții comune]
Închidere: [Cum să închidă vânzarea sau să facă follow-up]

🛠️ INSTRUCȚIUNI SPECIFICE
- Întotdeauna să fie politicos și răbdător
- Să asculte activ clientul
- Să personalizeze oferta după nevoi
- Să creeze urgență fără a fi agresiv
- Să obțină datele de contact pentru follow-up

🚫 RESTRICȚII
- Nu să promită lucruri pe care compania nu le poate livra
- Nu să negocieze prețuri fără aprobare
- Nu să dea informații confidențiale
- Să redirecționeze întrebările tehnice complexe către specialiști

IMPORTANT: Promptul să fie în română și să conțină informații specifice și realiste pentru ${business_type}.
`;

      console.log('Generating prompt for agent:', agentName);

      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Ești un expert în crearea de agenți conversaționali pentru vânzări telefonice. Creezi prompt-uri detaliate și eficiente care convertesc.'
            },
            { role: 'user', content: promptInstruction }
          ],
          max_tokens: 3000,
          temperature: 0.7
        }),
      });

      if (!openAIResponse.ok) {
        throw new Error(`Eroare la generarea prompt-ului: ${openAIResponse.status}`);
      }

      const openAIData = await openAIResponse.json();
      const generatedPrompt = openAIData.choices[0].message.content;

      console.log('Prompt generated, creating ElevenLabs agent...');

      // Create agent via ElevenLabs
      const createAgentRequest = {
        name: agentName,
        conversation_config: {
          agent: {
            language: language,
            prompt: {
              prompt: generatedPrompt,
            },
            first_message: language === 'ro'
              ? `Bună ziua! Sunt ${agentName}. Cum vă pot ajuta astăzi?`
              : `Hello! I'm ${agentName}. How can I help you today?`
          },
          tts: {
            voice_id: selectedVoice,
            model_id: "eleven_multilingual_v2"
          },
          asr: {
            quality: "high"
          }
        }
      };

      const { data: agentData, error: agentCreateError } = await supabase.functions.invoke('create-elevenlabs-agent', {
        body: createAgentRequest
      });

      if (agentCreateError) {
        console.error('Error creating ElevenLabs agent:', agentCreateError);
        throw new Error(`Eroare la crearea agentului: ${agentCreateError.message}`);
      }

      console.log('ElevenLabs agent created:', agentData.agent_id);

      // Save to database
      const { data: dbAgent, error: dbError } = await supabase
        .from('kalina_agents')
        .insert({
          agent_id: agentData.agent_id,
          user_id: userId,
          name: agentName,
          description: `Agent telefonic pentru ${business_name} - ${business_type}`,
          system_prompt: generatedPrompt,
          voice_id: selectedVoice,
          provider: 'elevenlabs',
          elevenlabs_agent_id: agentData.agent_id,
          is_active: true
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error saving agent to database:', dbError);
        throw new Error(`Eroare la salvarea agentului: ${dbError.message}`);
      }

      console.log('Agent saved to database successfully');

      return {
        success: true,
        agent: {
          id: dbAgent.id,
          agent_id: dbAgent.agent_id,
          name: agentName,
          business_name,
          business_type,
          voice_id: selectedVoice,
          language
        },
        message: `Agentul "${agentName}" a fost creat cu succes pentru ${business_name}! Poți să-l vezi în pagina Agenți și să începi să faci apeluri imediat.`
      };
    }

    case "createPaymentLink": {
      const { amount_usd, description = "Plata abonament" } = args;

      if (!amount_usd || amount_usd <= 0) {
        throw new Error('Te rog să specifici o sumă validă mai mare de 0 USD.');
      }

      try {
        // Create Stripe session with custom amount
        const { data, error } = await supabase.functions.invoke('create-custom-checkout', {
          body: {
            amount_usd: amount_usd,
            description: description,
            user_id: userId,
            origin: "https://preview--eleven-labs-echo-bot.lovable.app"
          }
        });

        if (error) {
          console.error('Payment link creation error:', error);
          // Fallback to pricing plans
          return {
            success: false,
            fallback_type: "pricing_plans",
            message: `Nu pot genera link de plată în acest moment. Poți vizita pagina cu planuri pentru a alege unul dintre abonamentele noastre disponibile:

• Plan Gratuit - Pentru început 
• Plan Pro - Pentru utilizare profesională
• Plan Business - Pentru companii
• Plan Enterprise - Soluții personalizate

Vizitează: https://preview--eleven-labs-echo-bot.lovable.app/pricing`
          };
        }

        if (data?.url) {
          return {
            success: true,
            payment_url: data.url,
            amount_usd: amount_usd,
            description: description,
            message: `✅ Link de plată generat cu succes!`,
            payment_button: {
              text: `Achită ${amount_usd}$`,
              url: data.url,
              amount: amount_usd
            }
          };
        } else {
          // Fallback to pricing plans
          return {
            success: false,
            fallback_type: "pricing_plans",
            message: `Nu pot genera link de plată în acest moment. Te îndrept către planurile noastre standard:

Vizitează pagina cu planuri: https://preview--eleven-labs-echo-bot.lovable.app/pricing

Acolo vei găsi toate opțiunile disponibile pentru abonament.`
          };
        }
      } catch (catchError) {
        console.error('Payment creation failed:', catchError);
        // Always provide fallback to pricing plans
        return {
          success: false,
          fallback_type: "pricing_plans",
          message: `Nu pot genera link de plată personalizat în acest moment. Te îndrept către planurile noastre standard:

🔹 Plan Gratuit - Pentru început
🔹 Plan Pro - Pentru utilizare profesională  
🔹 Plan Business - Pentru companii
🔹 Plan Enterprise - Soluții personalizate

Vizitează: https://preview--eleven-labs-echo-bot.lovable.app/pricing`
        };
      }
    }

    case "getCallHistory":
      return await getCallHistoryTool(supabase, userId, args);

    case "getContactsDatabase":
      return await getContactsDatabaseTool(supabase, userId, args);

    case "getTopContacts":
      return await getTopContactsTool(supabase, userId, args);

    case "getSpendingAnalysis":
      return await getSpendingAnalysisTool(supabase, userId, args);

    case "getAgentsPerformance":
      return await getAgentsPerformanceTool(supabase, userId, args);

    case "getAllConversations":
      return await getAllConversationsTool(supabase, userId, args);

    case "searchConversations":
      return await searchConversationsTool(supabase, userId, args);

    default:
      throw new Error(`Unknown MCP function: ${fn}`);
  }
};

// NEW TOOL IMPLEMENTATIONS - Database Query Tools
const getCallHistoryTool = async (supabase: any, userId: string, args: any) => {
  const limit = Math.min(args?.limit || 10, 50);
  const status = args?.status || 'all';
  const agent_id = args?.agent_id;
  const date_from = args?.date_from;
  const date_to = args?.date_to;

  let query = supabase
    .from('call_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') {
    query = query.eq('call_status', status);
  }

  if (agent_id) {
    query = query.eq('agent_id', agent_id);
  }

  if (date_from) {
    query = query.gte('call_date', date_from);
  }

  if (date_to) {
    query = query.lte('call_date', date_to);
  }

  const { data, error } = await query;

  if (error) throw error;

  return {
    success: true,
    count: data.length,
    calls: data,
    filters: { status, agent_id, date_from, date_to }
  };
};

const getContactsDatabaseTool = async (supabase: any, userId: string, args: any) => {
  const limit = Math.min(args?.limit || 20, 100);
  const search = args?.search;

  let query = supabase
    .from('contacts_database')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`nume.ilike.%${search}%,telefon.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return {
    success: true,
    count: data.length,
    contacts: data
  };
};

const getTopContactsTool = async (supabase: any, userId: string, args: any) => {
  const limit = Math.min(args?.limit || 5, 20);

  const { data: callStats, error } = await supabase
    .from('call_history')
    .select('phone_number, contact_name, call_status')
    .eq('user_id', userId);

  if (error) throw error;

  const contactMap = new Map();
  callStats.forEach((call: any) => {
    const existing = contactMap.get(call.phone_number) || {
      phone_number: call.phone_number,
      contact_name: call.contact_name || 'Necunoscut',
      total_calls: 0,
      successful_calls: 0
    };

    existing.total_calls++;
    if (call.call_status === 'success') {
      existing.successful_calls++;
    }

    contactMap.set(call.phone_number, existing);
  });

  const topContacts = Array.from(contactMap.values())
    .sort((a: any, b: any) => b.total_calls - a.total_calls)
    .slice(0, limit);

  return {
    success: true,
    count: topContacts.length,
    top_contacts: topContacts
  };
};

const getSpendingAnalysisTool = async (supabase: any, userId: string, args: any) => {
  const period = args?.period || 'month';

  let dateFilter = new Date();
  switch (period) {
    case 'today':
      dateFilter.setHours(0, 0, 0, 0);
      break;
    case 'week':
      dateFilter.setDate(dateFilter.getDate() - 7);
      break;
    case 'month':
      dateFilter.setMonth(dateFilter.getMonth() - 1);
      break;
    case 'all':
      dateFilter = new Date('2020-01-01');
      break;
  }

  const { data: calls, error } = await supabase
    .from('call_history')
    .select('cost_usd, duration_seconds, call_status, created_at')
    .eq('user_id', userId)
    .gte('created_at', dateFilter.toISOString());

  if (error) throw error;

  const totalCost = calls.reduce((sum: number, call: any) => sum + (call.cost_usd || 0), 0);
  const totalMinutes = calls.reduce((sum: number, call: any) => sum + (call.duration_seconds || 0), 0) / 60;
  const successfulCalls = calls.filter((call: any) => call.call_status === 'success').length;

  return {
    success: true,
    period,
    total_cost_usd: totalCost.toFixed(2),
    total_calls: calls.length,
    successful_calls: successfulCalls,
    success_rate: calls.length > 0 ? ((successfulCalls / calls.length) * 100).toFixed(1) : 0,
    total_minutes: totalMinutes.toFixed(2),
    average_cost_per_call: calls.length > 0 ? (totalCost / calls.length).toFixed(2) : 0,
    average_duration_seconds: calls.length > 0 ? Math.round(totalMinutes * 60 / calls.length) : 0
  };
};

const getAgentsPerformanceTool = async (supabase: any, userId: string, args: any) => {
  const { data: agents, error: agentsError } = await supabase
    .from('kalina_agents')
    .select('*')
    .eq('user_id', userId);

  if (agentsError) throw agentsError;

  const agentStats = await Promise.all(
    agents.map(async (agent: any) => {
      const { data: calls, error } = await supabase
        .from('call_history')
        .select('call_status, duration_seconds, cost_usd')
        .eq('user_id', userId)
        .eq('agent_id', agent.agent_id);

      if (error) return null;

      const totalCalls = calls.length;
      const successfulCalls = calls.filter((c: any) => c.call_status === 'success').length;
      const totalMinutes = calls.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0) / 60;
      const totalCost = calls.reduce((sum: number, c: any) => sum + (c.cost_usd || 0), 0);

      return {
        agent_name: agent.name,
        agent_id: agent.agent_id,
        is_active: agent.is_active,
        total_calls: totalCalls,
        successful_calls: successfulCalls,
        success_rate: totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(1) : 0,
        total_minutes: totalMinutes.toFixed(2),
        total_cost_usd: totalCost.toFixed(2),
        average_cost_per_call: totalCalls > 0 ? (totalCost / totalCalls).toFixed(2) : 0
      };
    })
  );

  return {
    success: true,
    agents: agentStats.filter(s => s !== null)
  };
};

const getAllConversationsTool = async (supabase: any, userId: string, args: any) => {
  const limit = Math.min(args?.limit || 500, 10000);
  const offset = args?.offset || 0;
  const search = args?.search;
  const agent_id = args?.agent_id;
  const status = args?.status;
  const date_from = args?.date_from;
  const date_to = args?.date_to;
  const min_duration = args?.min_duration;
  const include_transcript = args?.include_transcript || false;

  // Select fields based on whether transcript is needed
  const selectFields = include_transcript
    ? '*'
    : 'conversation_id, call_date, duration_seconds, cost_credits, call_status, contact_name, phone_number, agent_name, agent_id, metadata';

  let query = supabase
    .from('conversation_analytics_cache')
    .select(selectFields, { count: 'exact' })
    .eq('user_id', userId)
    .order('call_date', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (search) {
    query = query.or(`contact_name.ilike.%${search}%,phone_number.ilike.%${search}%,conversation_id.ilike.%${search}%`);
  }

  if (agent_id) {
    query = query.eq('agent_id', agent_id);
  }

  if (status) {
    query = query.eq('call_status', status);
  }

  if (date_from) {
    query = query.gte('call_date', date_from);
  }

  if (date_to) {
    query = query.lte('call_date', date_to);
  }

  if (min_duration) {
    query = query.gte('duration_seconds', min_duration);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Calculate statistics
  const totalDuration = data.reduce((sum: number, conv: any) => sum + (conv.duration_seconds || 0), 0);
  const totalCost = data.reduce((sum: number, conv: any) => sum + (conv.cost_credits || 0), 0);

  return {
    success: true,
    count: data.length,
    total_in_database: count || 0,
    conversations: data,
    statistics: {
      total_duration_minutes: (totalDuration / 60).toFixed(2),
      total_cost_credits: totalCost,
      average_duration_seconds: data.length > 0 ? Math.round(totalDuration / data.length) : 0,
      average_cost_per_conversation: data.length > 0 ? (totalCost / data.length).toFixed(2) : 0
    },
    filters_applied: { search, agent_id, status, date_from, date_to, min_duration },
    pagination: {
      offset,
      limit,
      returned: data.length,
      has_more: count ? (offset + data.length) < count : false
    }
  };
};

const searchConversationsTool = async (supabase: any, userId: string, args: any) => {
  const keyword = args?.keyword?.toLowerCase();
  const limit = Math.min(args?.limit || 100, 1000);

  if (!keyword) {
    throw new Error('Keyword este obligatoriu pentru căutare');
  }

  // Search in conversation_analytics_cache with transcript
  const { data: conversations, error } = await supabase
    .from('conversation_analytics_cache')
    .select('*')
    .eq('user_id', userId)
    .order('call_date', { ascending: false })
    .limit(limit * 10); // Get more to filter by keyword

  if (error) throw error;

  // Filter conversations that contain the keyword in transcript or analysis
  const matches: any[] = [];

  for (const conv of conversations) {
    let matchFound = false;
    let matchLocation = '';

    // Check in contact name
    if (conv.contact_name?.toLowerCase().includes(keyword)) {
      matchFound = true;
      matchLocation = 'contact_name';
    }

    // Check in transcript
    if (!matchFound && conv.transcript) {
      const transcript = typeof conv.transcript === 'string' ? JSON.parse(conv.transcript) : conv.transcript;
      if (Array.isArray(transcript)) {
        for (const msg of transcript) {
          const content = (msg.message || msg.content || '').toLowerCase();
          if (content.includes(keyword)) {
            matchFound = true;
            matchLocation = 'transcript';
            break;
          }
        }
      }
    }

    // Check in analysis
    if (!matchFound && conv.analysis) {
      const analysis = typeof conv.analysis === 'string' ? JSON.parse(conv.analysis) : conv.analysis;
      const analysisStr = JSON.stringify(analysis).toLowerCase();
      if (analysisStr.includes(keyword)) {
        matchFound = true;
        matchLocation = 'analysis';
      }
    }

    if (matchFound) {
      matches.push({
        ...conv,
        match_location: matchLocation
      });

      if (matches.length >= limit) break;
    }
  }

  return {
    success: true,
    keyword,
    matches_found: matches.length,
    conversations: matches,
    searched_total: conversations.length
  };
};

// MCP Agent System Prompt - Professional Internal Assistant
const createMCPAgentPrompt = () => {
  return `[ROLE / IDENTITATE]
Tu ești MCP Agent (Assistant Operațional Inteligent) pentru platformă.
Scop: oferă ajutor proactiv, contextual și acționabil utilizatorilor, fără a pune întrebări inutile, folosind date reale ale contului cu minim de fricțiune, respectând confidențialitatea și permisiunile.

[OBIECTIVE MAJORE]
1. Furnizezi răspunsuri utile, clare, scurte, orientate spre rezolvare.
2. Poți iniția sau executa acțiuni permise (ex: actualizare profil, generare API key, configurare voice settings), doar dacă există tool corespunzător și permisiune.
3. Nu ghicești date. Dacă lipsește ceva, explici ce poți face și cum se obține.
4. Ești context-aware: folosești datele contului încărcate prin tool-uri (nu memorezi din sesiuni anterioare fără revalidare).
5. Ești proactiv: sugerezi optimizări (ex: "Observ că nu ai setată cheia vocală – pot să te ajut să o adaugi.") dar nu spamezi.

[TON & STIL]
- Scurt, profesionist, empatic, fără jargon inutil.
- Evită întrebările care cer date deja accesibile prin tool-uri.
- Folosește contextul când explici (ex: "Planul tău actual este PRO, expiră la 12 feb 2026").
- Evită "Ca un model AI…". Vorbești ca un asistent intern.
- Răspunzi întotdeauna în română.

[DATE UTILIZATOR / CONT]
Poți accesa date despre utilizator și activitatea sa prin următoarele tool-uri:
- getUserProfile - informații profil și cont
- getUsageStats - statistici generale de utilizare
- getVoiceSettings - setări agenți vocali
- getRecentActivity - activitate recentă
- getAccountBalance - balanță cont
- findContactsNeedingFollowUp - contacte pentru follow-up
- getSystemHealth - starea sistemului

TOOL-URI NOI PENTRU ANALIZĂ DATE:
- getCallHistory - query istoric apeluri cu filtre (status, agent_id, date) - max 50 apeluri
  Exemple: "Arată-mi ultimele 20 apeluri", "Apelurile eșuate de azi"
  
- getContactsDatabase - query contacte cu căutare - max 100 contacte
  Exemple: "Caută contactul Ion", "Lista cu toate contactele"
  
- getTopContacts - top contacte după număr de apeluri
  Exemple: "Cei mai contactați clienți", "Top 10 contacte"
  
- getSpendingAnalysis - analiză cheltuieli pe perioade
  Exemple: "Cât am cheltuit luna asta?", "Analiza cheltuielilor săptămâna asta"
  
- getAgentsPerformance - performanță agenți (success rate, costuri, minute)
  Exemple: "Cum performează agenții mei?", "Care agent are cel mai bun success rate?"

- getAllConversations - ⭐ TOOL PRINCIPAL pentru conversații - accesează TOATE cele 13000+ conversații din conversation_analytics_cache
  Parametri: limit (default 500, max 10000), offset (paginare), search (nume/telefon), agent_id, status, date_from, date_to, min_duration, include_transcript
  Exemple: "Arată-mi toate conversațiile", "Conversațiile cu peste 10 secunde", "Toate apelurile de luna asta"
  ⚠️ FOLOSEȘTE ACEST TOOL când user cere "toate conversațiile" sau vrea să vadă mai mult de 50 apeluri
  
- searchConversations - căutare avansată prin transcripturi și analize
  Parametri: keyword (obligatoriu), limit (default 100, max 1000)
  Exemple: "Caută conversații despre 'preț'", "Găsește apelurile unde s-a vorbit despre 'contract'"
  Caută prin: nume contact, transcripturi complete, analize AI

IMPORTANT: Când user cere "toate conversațiile" sau "show all conversations" sau "13000 conversații", folosește getAllConversations, NU getCallHistory!

Nu expui:
- Chei API în clar
- Date sensibile (parole, token brute, hash-uri, identificatori interni sensibili)
Dacă un tool returnează astfel de date, redacționezi (ex: "sk_live_****1234").

[MODIFICĂRI PERMISE]
Poți executa operații doar prin tool-uri explicite:
- updateUserProfile(fields)
- createPaymentLink(amount_usd, description) - pentru plăți personalizate
Dacă utilizatorul cere ceva în afara scope-ului: explică limită și oferă alternativă.

[PLĂȚI ȘI ABONAMENTE]
Când utilizatorul întreabă despre plată/abonament/reîncărcare:
1. Întreabă suma dorită în USD (ex: "Câți dolari vrei să plătești?")
2. Folosește createPaymentLink(amount_usd, description) pentru a genera linkul Stripe
3. Prezintă linkul clar: "✅ Link de plată generat pentru [sumă] USD: [link]"
4. Explică că suma se va adăuga în cont după plată

[SECURITATE & CONSIMȚĂMÂNT]
- Înainte de acțiuni destructive (ștergere, revocare, regenerare cheie), confirmă explicit: "Confirmi că vrei să revoci cheia X? Această acțiune e ireversibilă."
- Dacă utilizatorul cere date care nu ar trebui afișate: refuz politicos și explici de ce.

[FOLOSIRE TOOL-URI]
Strategie:
1. Clarifică intenția (intern, nu întrebi userul dacă nu e necesar).
2. Verifică ce date ai deja în contextul curent.
3. Apelează tool doar dacă lipsește ceva sau datele pot fi stale.
4. Nu apela aceeași funcție repetat fără motiv (ex: caching scurt pe durată sesiunii).
5. Dacă un tool e indisponibil: oferă fallback ("Momentan nu pot accesa setările vocal. Încerc din nou sau te pot ghida manual.")

[EVITĂ]
- Halucinații despre politici, planuri, limite
- Promisiuni viitoare ("va fi implementat") fără sursă
- Execuții implicite fără confirmare unde riscul > minor
- Expunere date altui utilizator

[PROACTIVITATE CONTROLATĂ]
Oferă sugestii doar dacă:
- O lipsă critică (ex: nu există API key, dar user folosește funcții voice)
- Anomalie (ex: consum aproape de limită)
- O oportunitate clară (ex: trial aproape de final -> upgrade)
Maxim 1 sugestie suplimentară per răspuns dacă relevantă.

[REGULI SPECIFICE PENTRU NAVIGARE - FOARTE IMPORTANT!!!]
⚠️ Când utilizatorul cere să deschidă o pagină, să vadă ceva, să meargă undeva:
1. FOLOSEȘTE ÎNTOTDEAUNA tool-ul navigateTo() cu RUTA EXACTĂ din lista de mai jos!
2. NU INVENTA RUTE! Folosește DOAR rutele din această listă:

RUTE DISPONIBILE (folosește EXACT aceste căi):
- /account/kalina-agents → agenți, agenții mei, lista de agenți
- /account/agent-edit/{agentId} → editare agent (înlocuiește {agentId} cu ID-ul real)
- /account/workflow → workflow, workflow-uri, automatizări
- /account/conversation-analytics → ISTORIC, istoricul, istoric apeluri, conversații, analytics, analiză
- /account/transcript → transcrieri, transcripturi
- /account/voices → voci, clonare voce
- /account/integrations → integrări, conectări
- /account/chat-widget → chat widget, widget
- /account/leads → leads, potențiali clienți
- /account/files → fișiere, documente
- /account/phone-numbers → numere de telefon, telefon
- /account/outbound → apeluri outbound, apeluri ieșire
- /account/settings → setări, configurare, profil
- /account/contacts → contacte
- /account/webhooks → webhooks
- /account/calendar → calendar
- /pricing → prețuri, planuri, upgrade
- /help → ajutor

3. NU SCRIE NICIODATĂ linkuri markdown [text](url) - DOAR folosește navigateTo()!
4. După navigateTo(), răspunde SCURT: "Gata." sau "Te duc acolo." - navigarea e automată.

EXEMPLE NAVIGARE (urmează-le EXACT):
User: "deschide istoricul" / "arată-mi apelurile" / "istoric apeluri" / "conversațiile mele"
→ navigateTo(page: "/account/conversation-analytics") și răspuns: "Gata."

User: "Deschide setările" / "du-mă la setări"
→ navigateTo(page: "/account/settings") și răspuns: "Gata."

User: "Arată-mi agenții" / "vreau să văd agenții"
→ navigateTo(page: "/account/kalina-agents") și răspuns: "Gata."

User: "Deschide integrările"
→ navigateTo(page: "/account/integrations") și răspuns: "Gata."

User: "workflow-uri" / "automatizări"
→ navigateTo(page: "/account/workflow") și răspuns: "Gata."

[REGULI SPECIFICE PENTRU DETALII AGENT]
Când utilizatorul întreabă despre un agent specific (ex: "ce e cu agentul Test?", "detalii despre agentul X"):
1. FOLOSEȘTE getAgentDetails(agent_name: "nume") pentru a obține informații
2. Tool-ul va returna informații și va permite navigarea la pagina de editare
3. Prezintă informațiile într-un format clar: nume, status, performanță

[REGULI SPECIFICE PENTRU APELURI]
Când utilizatorul cere să sune/telefoneze pe cineva:
1. ÎNTOTDEAUNA întreabă cu ce agent să telefonezi ÎNAINTE să inițiezi apelul
2. Folosește getUserAgents() pentru a afișa lista de agenți disponibili
3. Prezintă agenții într-un format clar: "Agent: [nume] (ID: [agent_id]) - [activ/inactiv]"
4. Nu iniția apeluri fără să ai agent_id specificat explicit de utilizator
5. Exemplu răspuns: "Pentru a iniția apelul, trebuie să alegi agentul. Iată agenții tăi disponibili: [listă]. Cu care agent vrei să telefonez?"

[FORMAT RĂSPUNS]
Ordine (dacă se aplică):
1. Răspuns principal clar
2. Acțiuni efectuate / rezultate
3. Următor pas sugerat (opțional)
4. Întrebare unică de clarificare (numai dacă blocat)

[EXEMPLE SPECIFICE - URMEAZĂ-LE EXACT]
User: "Câte apeluri au fost săptămâna asta?" / "cate apeluri sau facut saptamana asta?"
→ Apelezi getUsageStats(period="week") și răspunzi concis: "Săptămâna asta: [număr] apeluri, rata de succes [%], cheltuiți [sumă]$."

User: "Apelurile de azi"
→ Apelezi getUsageStats(period="today") și prezinti rezultatul numeric clar.

User: "Ajută-mă cu vocea."
→ Verifici: voice settings, cheia API voice, starea funcției.
Răspuns: "Funcționalitatea vocală e activă, dar nu există cheie API configurată. Pot genera sau poți introduce una existentă. Vrei să continui?"

User: "Schimbă-mi numele afisat în Marius Dev."
→ Apelezi updateUserProfile({display_name: "Marius Dev"}), confirmi rezultat.

User: "Dă-mi cheia API."
→ Răspuns: "Nu pot afișa valoarea completă a cheii pentru securitate. Pot rota cheia sau pot crea una nouă. Cum preferi?"

User: "Vreau să plătesc 40 de dolari" / "poti sami dai un cont de plata pentru 40 de dolari" / "vreau sa achit abonamentul"
→ Apelezi createPaymentLink(amount_usd: 40, description: "Plata abonament") și prezinti linkul generat clar.

User: "Cum pot să plătesc?" / "vreau să reîncarc contul"
→ Întrebi suma dorită și apoi folosești createPaymentLink cu suma specificată.

[CONVERSAȚII ȘI TRANSCRIPTURI]
User: "Ce s-a vorbit în ultima conversație?" / "arată-mi transcriptul"
→ Folosești getConversationDetails pentru lista conversațiilor sau getConversationTranscript pentru transcript complet.

User: "Clientul părea mulțumit?" (când există context de conversație activă)
→ Analizezi transcriptul disponibil și răspunzi bazat pe tone-ul și mesajele clientului.

User: "Ce soluții s-au propus?" (în contextul unei conversații)
→ Extragi din transcript propunerile agentului și răspunsurile clientului.

User: "Sunt necesare acțiuni de urmărire?"
→ Analizezi finalul conversației și statusul pentru a determina dacă este nevoie de follow-up.

[CREARE AGENT VIZUAL - FOARTE IMPORTANT!!!]
⚠️ Când utilizatorul cere să creeze un agent nou, să facă un agent, să configureze un agent:
1. FOLOSEȘTE ÎNTOTDEAUNA tool-ul createAgentVisual()!
2. Acest tool activează un CURSOR AI VIZIBIL care:
   - Navighează la pagina cu agenți
   - Dă click pe "New Agent"
   - Selectează tipul de agent
   - Completează formularul cu efecte de scriere (typewriter)
   - Utilizatorul VEDE toate acțiunile în timp real!

EXEMPLE CREARE AGENT:
User: "Creează un agent nou" / "Fă-mi un agent" / "Vreau un agent"
→ createAgentVisual(agent_name: "Noul Meu Agent", agent_type: "blank")

User: "Creează un agent pentru site-ul meu example.com"
→ createAgentVisual(agent_name: "Agent Site", agent_type: "website", website_url: "https://example.com")

User: "Fă-mi un agent de business pentru suport clienți"
→ createAgentVisual(agent_name: "Agent Suport", agent_type: "business")

IMPORTANT: După createAgentVisual(), răspunde SCURT: "Creez agentul..." sau "Gata, urmărește cursorul." - acțiunea e automată și vizuală!

[MAPPING TEMPORAL]
- "azi" / "astăzi" → period: "today"
- "săptămâna asta" / "saptamana asta" → period: "week"  
- "luna asta" → period: "month"
- "în total" → period: "all"

[ERORI]
Dacă un tool eșuează:
"Actualizarea preferințelor vocale a eșuat (Timeout). Încerc din nou?"
Nu inventa motivul dacă nu este clar.

[LOGICĂ DECIZIONALĂ REZUMAT]
1. Identifică intenție
2. Verifică context local
3. Apelează minim set de tool-uri necesare
4. Normalizează / redactează
5. Construiește răspuns scurt, acționabil
6. Oferă opțiune clară pentru următor pas

[CE SĂ NU FACI]
- Nu întrebi "Cu ce te pot ajuta?" dacă deja există o solicitare explicită
- Nu ceri date personale ce pot fi extrase din profil (ex: "care e planul tău?")
- Nu faci presupuneri despre identitatea legală a utilizatorului
- NU rămâi mut după folosirea tool-urilor - oferă întotdeauna un răspuns concret

[FINAL PRINCIPIU]
Optimizezi pentru: Siguranță, Claritate, Eficiență, Consimțământ, Minimizarea fricțiunii.
IMPORTANT: Răspunde întotdeauna cu informații concrete după tool-uri, nu rămâne tăcut.`;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, userId, conversationHistory = [] } = await req.json();

    if (!message || !userId) {
      throw new Error('Message and userId are required');
    }

    console.log(`Natural agent chat for user: ${userId}`);
    console.log(`User message: ${message}`);
    console.log(`Conversation history: ${conversationHistory.length} messages`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Cost per question
    const COST_PER_QUESTION = 0.08;

    // Check and deduct balance FIRST
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balance')
      .select('balance_usd')
      .eq('user_id', userId)
      .single();

    if (balanceError) {
      console.error('Error fetching balance:', balanceError);
      return new Response(JSON.stringify({
        error: 'balance_error',
        response: 'Nu am putut verifica soldul tău. Te rog să încerci din nou.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentBalance = balanceData?.balance_usd || 0;

    if (currentBalance < COST_PER_QUESTION) {
      return new Response(JSON.stringify({
        error: 'insufficient_balance',
        response: `Sold insuficient! Ai nevoie de $${COST_PER_QUESTION} pentru a pune o întrebare. Soldul tău curent: $${currentBalance.toFixed(2)}. Te rog să îți reîncarci contul.`,
        currentBalance: currentBalance
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct cost from balance
    const newBalance = currentBalance - COST_PER_QUESTION;
    const { error: deductError } = await supabase
      .from('user_balance')
      .update({ balance_usd: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (deductError) {
      console.error('Error deducting balance:', deductError);
      return new Response(JSON.stringify({
        error: 'deduction_error',
        response: 'Eroare la procesarea plății. Te rog să încerci din nou.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Deducted $${COST_PER_QUESTION} from user ${userId}. New balance: $${newBalance.toFixed(2)}`);

    // Enhanced conversation analysis: detect specific conversation requests
    const conversationPatterns = {
      recentList: /(ce\s+s[aă]\s*vorbit|ultim(?:ele|ile)?\s+\d*\s*conversa[țt]ii|ce\s+a\s+discutat|despre\s+ce\s+s[aă]\s*vorbit)/i,
      specificConversation: /(ultima\s+conversa[țt]ie|conversa[țt]ia\s+de\s+(azi|ieri|cu\s+[\w\s]+)|transcript(?:ul)?\s+(pentru|de\s+la|cu))/i,
      fullTranscript: /(transcript(?:ul)?\s+complet|toat[aă]\s+conversa[țt]ia|ce\s+exact\s+s[aă]\s*vorbit|în\s+detaliu)/i,
      audioRequest: /(vreau\s+s[aă]\s+aud|audio(?:ul)?|asculta|player|redare|play)/i
    };

    // Check for audio requests first
    if (conversationPatterns.audioRequest.test(message)) {
      // Check if there's conversation context from previous messages
      let conversationId = null;
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msg = conversationHistory[i];
        if (msg.role === 'assistant' && typeof msg.content === 'string') {
          const contextMatch = msg.content.match(/🆔 ID: ([a-zA-Z0-9-_]+)/);
          if (contextMatch) {
            conversationId = contextMatch[1];
            break;
          }
        }
      }

      // Also allow ID provided directly in the message
      if (!conversationId) {
        const idMatch = message.match(/\b(conv_[a-zA-Z0-9_\-]+)/);
        if (idMatch) {
          conversationId = idMatch[1];
        }
      }

      if (conversationId) {
        try {
          const audioResult: any = await executeMCPToolFunction(supabase, userId, 'getConversationAudio', {
            conversation_id: conversationId
          });

          if (audioResult.success && audioResult.audio_url) {
            const metadata = audioResult.conversation_metadata;
            let response = `🎵 **Audio-ul conversației este disponibil!**\n\n`;

            if (metadata) {
              response += `**Conversația cu ${metadata.contact_name || 'Contact necunoscut'}**\n`;
              if (metadata.call_date) {
                response += `📅 Data: ${new Date(metadata.call_date).toLocaleString('ro-RO')}\n`;
              }
              if (metadata.duration_seconds) {
                response += `⏱️ Durată: ${Math.floor(metadata.duration_seconds / 60)}m ${metadata.duration_seconds % 60}s\n`;
              }
              response += `\n`;
            }

            response += `<div class="conversation-audio-player" data-conversation-id="${conversationId}" data-audio-url="${audioResult.audio_url}">`;
            response += `<audio controls preload="metadata" style="width: 100%; margin: 10px 0;">`;
            response += `<source src="${audioResult.audio_url}" type="audio/mpeg">`;
            response += `Browser-ul tău nu suportă redarea audio.`;
            response += `</audio>`;
            response += `</div>\n\n`;

            response += `🎧 **Playerul audio este gata!** Poți:\n`;
            response += `• Asculta conversația completă\n`;
            response += `• Controla redarea (play/pause/volum)\n`;
            response += `• Îmi poți pune întrebări în timp ce asculți\n\n`;
            response += `💬 Întreabă-mă orice despre această conversație!`;

            return new Response(JSON.stringify({
              response,
              agent_type: 'natural_conversational',
              tools_used: ['getConversationAudio'],
              audio_data: {
                conversation_id: conversationId,
                audio_url: audioResult.audio_url,
                cached: audioResult.cached
              },
              costDeducted: COST_PER_QUESTION,
              remainingBalance: newBalance.toFixed(2)
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            const response = `😔 **Nu am putut obține audio-ul pentru această conversație.**\n\n`;
            const errorMsg = audioResult.error || 'Audio-ul nu este disponibil.';

            return new Response(JSON.stringify({
              response: response + `Motiv: ${errorMsg}\n\nPoți continua să discuți despre transcriptul conversației.`,
              agent_type: 'natural_conversational',
              tools_used: ['getConversationAudio'],
              costDeducted: COST_PER_QUESTION,
              remainingBalance: newBalance.toFixed(2)
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (error) {
          console.error('Error getting audio:', error);
          return new Response(JSON.stringify({
            response: `❌ **Eroare la obținerea audio-ului:** ${error.message}\n\nPoți continua să discuți despre transcriptul conversației.`,
            agent_type: 'natural_conversational',
            tools_used: ['getConversationAudio'],
            costDeducted: COST_PER_QUESTION,
            remainingBalance: newBalance.toFixed(2)
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        return new Response(JSON.stringify({
          response: `🔍 **Nu am găsit conversația pentru care să obțin audio-ul.**\n\nPentru a asculta audio-ul unei conversații, întâi arată-mi transcriptul conversației pe care vrei să o asculți (ex: "Arată-mi ultima conversație"), apoi cere audio-ul.`,
          agent_type: 'natural_conversational',
          tools_used: [],
          costDeducted: COST_PER_QUESTION,
          remainingBalance: newBalance.toFixed(2)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (conversationPatterns.recentList.test(message) || conversationPatterns.specificConversation.test(message) || conversationPatterns.fullTranscript.test(message)) {
      const countMatch = message.match(/ultim(?:ele|ile)?\s+(\d+)/i);
      const limit = Math.min(countMatch ? parseInt(countMatch[1]) : (conversationPatterns.specificConversation.test(message) ? 1 : 5), 10);

      try {
        const details: any = await executeMCPToolFunction(supabase, userId, 'getConversationDetails', { limit });
        const conversations = details?.conversations || [];

        if (conversations.length === 0) {
          const notFound = 'Nu am găsit conversații în baza ta de date locală. Asigură-te că ai făcut apeluri recent și că au fost salvate în sistem.';
          return new Response(JSON.stringify({ response: notFound, agent_type: 'natural_conversational', tools_used: ['getConversationDetails'], costDeducted: COST_PER_QUESTION, remainingBalance: newBalance.toFixed(2) }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // If requesting full transcript or specific conversation, show detailed view
        if (conversationPatterns.fullTranscript.test(message) || conversationPatterns.specificConversation.test(message)) {
          const conv = conversations[0]; // Get the most recent one

          // Get full transcript for this conversation
          const transcriptData: any = await executeMCPToolFunction(supabase, userId, 'getConversationTranscript', {
            conversation_id: conv.conversation_id,
            include_analysis: true
          });

          const date = conv.call_date ? new Date(conv.call_date).toLocaleString('ro-RO') : 'necunoscut';
          let response = `📞 **Conversația cu ${conv.contact_name || 'Contact necunoscut'}**\n`;
          response += `📅 Data: ${date}\n`;
          response += `⏱️ Durată: ${Math.floor((conv.duration_seconds || 0) / 60)}m ${(conv.duration_seconds || 0) % 60}s\n`;
          response += `📊 Status: ${conv.call_status}\n`;
          response += `🆔 ID: ${conv.conversation_id}\n\n`;

          if (transcriptData?.formatted_transcript) {
            response += `**📝 TRANSCRIPT COMPLET:**\n\n${transcriptData.formatted_transcript}\n\n`;
          } else if (conv.transcript && conv.transcript.length > 0) {
            response += `**📝 TRANSCRIPT:**\n\n`;
            conv.transcript.forEach((msg: any) => {
              const role = msg.role === 'agent' ? '🤖 Agent' : '👤 Client';
              response += `${role}: ${msg.message}\n\n`;
            });
          } else {
            response += `❌ Nu am putut găsi transcriptul pentru această conversație.\n\n`;
          }

          if (transcriptData?.analysis) {
            response += `**📊 ANALIZĂ:**\n`;
            if (transcriptData.analysis.summary) response += `📋 Rezumat: ${transcriptData.analysis.summary}\n`;
            if (transcriptData.analysis.sentiment) response += `😊 Sentiment: ${transcriptData.analysis.sentiment}\n`;
            if (transcriptData.analysis.outcome) response += `🎯 Rezultat: ${transcriptData.analysis.outcome}\n`;
          } else if (conv.summary) {
            response += `**📋 Rezumat:** ${conv.summary}\n\n`;
          }

          response += `\n🎵 **Dorești să asculți și audio-ul acestei conversații?** Spune "Vreau să aud audio-ul" pentru a obține playerul audio.\n\n`;
          response += `💬 **Poți să-mi pui întrebări despre această conversație!** De exemplu:\n`;
          response += `• "Care a fost principala problemă discutată?"\n`;
          response += `• "Clientul părea mulțumit?"\n`;
          response += `• "Ce soluții s-au propus?"\n`;
          response += `• "Sunt necesare acțiuni de urmărire?"\n`;
          response += `• "Vreau să aud audio-ul"`;

          return new Response(JSON.stringify({
            response,
            agent_type: 'natural_conversational',
            tools_used: ['getConversationDetails', 'getConversationTranscript'],
            conversation_context: {
              active_conversation_id: conv.conversation_id,
              contact_name: conv.contact_name,
              call_date: conv.call_date
            },
            costDeducted: COST_PER_QUESTION,
            remainingBalance: newBalance.toFixed(2)
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Otherwise show conversation list with previews
        let response = `📋 **Ultimele ${conversations.length} conversații din contul tău:**\n\n`;
        conversations.forEach((conv: any, idx: number) => {
          const date = conv.call_date ? new Date(conv.call_date).toLocaleString('ro-RO') : 'necunoscut';
          const duration = Math.floor((conv.duration_seconds || 0) / 60);
          const status = conv.call_status === 'completed' ? '✅' : conv.call_status === 'failed' ? '❌' : '⏸️';

          response += `**${idx + 1}. ${conv.contact_name || 'Contact necunoscut'}** ${status}\n`;
          response += `📅 ${date} | ⏱️ ${duration}m | 🆔 ${conv.conversation_id}\n`;

          // Add conversation preview
          if (conv.transcript && conv.transcript.length > 0) {
            const preview = conv.transcript
              .slice(0, 2)
              .map((msg: any) => `${msg.role === 'agent' ? '🤖' : '👤'}: ${(msg.message || '').substring(0, 80)}...`)
              .join('\n');
            response += `💬 ${preview}\n`;
          } else if (conv.summary) {
            response += `📝 ${conv.summary.substring(0, 100)}...\n`;
          }
          response += '\n';
        });

        response += `💡 **Pentru a vedea o conversație în detaliu, întreabă:**\n`;
        response += `• "Arată-mi transcriptul complet pentru ultima conversație"\n`;
        response += `• "Vreau să văd în detaliu conversația cu [nume client]"\n`;
        response += `• "Ce exact s-a vorbit în conversația [conversation_id]"`;

        return new Response(JSON.stringify({
          response,
          agent_type: 'natural_conversational',
          tools_used: ['getConversationDetails'],
          costDeducted: COST_PER_QUESTION,
          remainingBalance: newBalance.toFixed(2)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.warn('Conversation quick-path failed, falling back to LLM:', e);
      }
    }

    // Build conversation messages with MCP system prompt
    const messages = [
      { role: 'system', content: createMCPAgentPrompt() }
    ];

    // Add conversation history (last 8 messages for context)
    const recentHistory = conversationHistory.slice(-8);
    messages.push(...recentHistory);

    // Check if there's conversation context from previous messages
    let conversationContext = null;
    for (let i = recentHistory.length - 1; i >= 0; i--) {
      const msg = recentHistory[i];
      if (msg.role === 'assistant' && typeof msg.content === 'string') {
        const contextMatch = msg.content.match(/🆔 ID: ([a-zA-Z0-9-]+)/);
        if (contextMatch) {
          const conversationId = contextMatch[1];
          // Extract conversation details from the message
          const contactMatch = msg.content.match(/\*\*Conversația cu (.+?)\*\*/);
          const contactName = contactMatch ? contactMatch[1] : null;

          conversationContext = {
            conversation_id: conversationId,
            contact_name: contactName
          };
          break;
        }
      }
    }

    // If the user is asking questions about "conversația", "clientul", "agentul" etc., 
    // and we have context, inject conversation data
    const contextualQuestions = /(clientul|agentul|conversa[țt]ia|ce\s+(exact\s+)?s[aă]\s*zis|problemă|solu[țt]ie|r[aă]spuns|mulțumit|suparat|follow.?up|urm[aă]rire)/i;
    if (conversationContext && contextualQuestions.test(message)) {
      try {
        console.log(`Injecting conversation context for ID: ${conversationContext.conversation_id}`);
        const transcriptData: any = await executeMCPToolFunction(supabase, userId, 'getConversationTranscript', {
          conversation_id: conversationContext.conversation_id,
          include_analysis: true
        });

        if (transcriptData?.formatted_transcript) {
          // Inject conversation context into the system message
          const contextualPrompt = `\n\n[CONTEXT CONVERSAȚIE ACTIVĂ]
Contact: ${transcriptData.contact_name || 'Necunoscut'}
Conversation ID: ${conversationContext.conversation_id}
Status: ${transcriptData.call_status}
Durată: ${transcriptData.duration_seconds}s

TRANSCRIPT COMPLET:
${transcriptData.formatted_transcript}

${transcriptData.analysis ? `ANALIZĂ:
${JSON.stringify(transcriptData.analysis, null, 2)}` : ''}

Utilizatorul întreabă despre această conversație. Răspunde bazat pe transcriptul de mai sus.`;

          messages[0].content += contextualPrompt;
        }
      } catch (e) {
        console.warn('Failed to inject conversation context:', e);
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    console.log(`Starting robust tool-calling loop with ${messages.length} messages`);

    // Robust tool-calling loop (up to 3 iterations)
    let currentMessages = [...messages];
    let finalResponse = '';
    let toolResults: any[] = [];
    const MAX_ITERATIONS = 3;

    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
      console.log(`--- Tool-calling iteration ${iteration}/${MAX_ITERATIONS} ---`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: currentMessages,
          tools: createMCPAgentTools(),
          tool_choice: "auto",
          max_completion_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        throw new Error(errorData.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      const choice = data?.choices?.[0];

      if (!choice) {
        throw new Error('No response from OpenAI');
      }

      const message_obj = choice.message;

      // Add assistant's message to conversation
      currentMessages.push(message_obj);

      // Check for tool calls
      if (message_obj.tool_calls && message_obj.tool_calls.length > 0) {
        console.log(`Iteration ${iteration}: Agent wants to use ${message_obj.tool_calls.length} tools`);

        // Execute each tool call
        for (const toolCall of message_obj.tool_calls) {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            // Add original user message context for language detection
            if (functionName === 'startOutboundCall') {
              functionArgs._user_message = message;
            }

            console.log(`Executing MCP tool function: ${functionName} with args:`, functionArgs);
            const toolResult = await executeMCPToolFunction(supabase, userId, functionName, functionArgs);

            // Store tool results for fallback
            toolResults.push({ functionName, result: toolResult });

            // Add tool result to conversation
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          } catch (toolError) {
            console.error(`Tool execution error for ${toolCall.function.name}:`, toolError);
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: toolError.message })
            });
          }
        }

        // Continue loop to get response after tool execution
        continue;
      } else {
        // Got a text response from the model
        finalResponse = message_obj.content || '';
        console.log(`Iteration ${iteration}: Got final response: ${finalResponse.substring(0, 100)}...`);
        break;
      }
    }

    // Intelligent server-side fallback if no content after tool execution
    if (!finalResponse.trim() && toolResults.length > 0) {
      console.log('No response from AI after tool execution, generating intelligent fallback');

      const lastTool = toolResults[toolResults.length - 1];
      if (lastTool) {
        switch (lastTool.functionName) {
          case 'getUsageStats':
          case 'get_recent_calls':
            const stats = lastTool.result;
            if (stats.recent_calls !== undefined) {
              finalResponse = `Au fost ${stats.recent_calls} apeluri în perioada selectată.`;
              if (stats.recent_success_rate !== undefined) {
                finalResponse += ` Rata de succes: ${stats.recent_success_rate}%.`;
              }
              if (stats.recent_spending !== undefined && stats.recent_spending > 0) {
                finalResponse += ` Cheltuieli: $${stats.recent_spending.toFixed(2)}.`;
              }
            } else if (stats.calls && stats.calls.length !== undefined) {
              finalResponse = `Au fost ${stats.calls.length} apeluri în perioada selectată.`;
            } else {
              finalResponse = 'Nu am găsit apeluri în perioada selectată.';
            }
            break;

          case 'getRecentActivity':
            const activity = lastTool.result;
            if (activity.recent_calls && activity.recent_calls.length > 0) {
              finalResponse = `Ultimele ${activity.recent_calls.length} apeluri: ${activity.recent_calls.map((call: any) =>
                `${call.contact_name || 'Necunoscut'} (${call.call_status})`).join(', ')}.`;
            } else {
              finalResponse = 'Nu am găsit activitate recentă.';
            }
            break;

          case 'getUserProfile':
            const profile = lastTool.result;
            finalResponse = `Profilul tău: ${profile.profile?.first_name || 'Nume necunoscut'}, plan: ${profile.profile?.plan || 'starter'}, balanță: $${profile.balance || 0}.`;
            break;

          case 'getAccountBalance':
            const balance = lastTool.result;
            finalResponse = `Balanța curentă: $${balance.current_balance || 0}.`;
            break;

          case 'navigateTo':
            // Include frontend action JSON in response for navigation
            if (lastTool.result?.__frontend_action__) {
              finalResponse = `${lastTool.result.message || 'Gata.'} ${JSON.stringify(lastTool.result)}`;
            } else {
              finalResponse = 'Gata.';
            }
            break;

          case 'createAgentVisual':
            // Include frontend action JSON in response for agent creation
            if (lastTool.result?.__frontend_action__) {
              finalResponse = `${lastTool.result.message || 'Creez agentul...'} ${JSON.stringify(lastTool.result)}`;
            } else {
              finalResponse = 'Creez agentul...';
            }
            break;

          default:
            // Check if any tool returned a frontend action
            if (lastTool.result?.__frontend_action__) {
              finalResponse = `${lastTool.result.message || 'Gata.'} ${JSON.stringify(lastTool.result)}`;
            } else {
              finalResponse = 'Am executat acțiunea solicitată cu succes.';
            }
        }
      }
    }

    // Final fallback
    if (!finalResponse.trim()) {
      finalResponse = 'Îmi pare rău, am o mică problemă tehnică. Poți să reformulezi întrebarea?';
      console.log('Using ultimate fallback response');
    }

    // Ensure frontend actions are included in response even if AI forgot to include them
    const frontendActionTool = toolResults.find(t => t.result?.__frontend_action__);
    if (frontendActionTool && !finalResponse.includes('__frontend_action__')) {
      console.log('Appending frontend action to response:', frontendActionTool.functionName);
      finalResponse = `${finalResponse} ${JSON.stringify(frontendActionTool.result)}`;
    }

    console.log(`Final natural response: ${finalResponse}`);

    return new Response(JSON.stringify({
      response: finalResponse,
      agent_type: 'natural_conversational',
      tools_used: toolResults.map(t => t.functionName),
      costDeducted: COST_PER_QUESTION,
      remainingBalance: newBalance.toFixed(2)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in natural agent chat:', error);
    return new Response(JSON.stringify({
      error: error.message,
      response: 'Îmi pare rău, am întâmpinat o problemă. Poți să încerci din nou într-un minut?'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});