import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthContext';
import { useState, useCallback } from 'react';
import { ENV } from '@/config/environment';
import { getAccessTokenSync } from '@/utils/sessionManager';

// Helper pentru REST API fetch cu timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
};

// Helper pentru Edge Function calls cu timeout
const invokeEdgeFunction = async (functionName: string, body: any, timeoutMs = 30000): Promise<{ data?: any; error?: any }> => {
  const accessToken = getAccessTokenSync();
  if (!accessToken) {
    return { error: { message: 'No access token available' } };
  }

  const url = `${ENV.SUPABASE_URL}/functions/v1/${functionName}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'apikey': ENV.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return { error: { message: `HTTP ${response.status}: ${errorText}` } };
    }

    const data = await response.json();
    return { data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { error: { message: `Edge function ${functionName} timed out after ${timeoutMs}ms` } };
    }
    return { error: { message: err.message } };
  }
};

interface CachedConversation {
  id: string;
  conversation_id: string;
  user_id: string;
  agent_id?: string;
  agent_name?: string;
  phone_number?: string;
  contact_name?: string;
  call_status?: string;
  call_date?: string;
  duration_seconds?: number;
  cost_credits?: number;
  transcript?: any;
  analysis?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface AudioExtractionItem {
  id: string;
  contactName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
}

export const useConversationAnalyticsCache = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [extractionProgress, setExtractionProgress] = useState<AudioExtractionItem[]>([]);

  // Fetch cached conversations with better performance
  const cachedConversationsQuery = useQuery({
    queryKey: ['conversation-analytics-cache', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const accessToken = getAccessTokenSync();
      if (!accessToken) {
        return [];
      }

      const url = `${ENV.SUPABASE_URL}/rest/v1/conversation_analytics_cache?user_id=eq.${user.id}&order=call_date.desc&limit=1000`;

      try {
        const response = await fetchWithTimeout(url, {
          method: 'GET',
          headers: {
            'apikey': ENV.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }, 15000);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data || [];
      } catch (error: any) {
        console.error('Error fetching cached conversations:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });


  // Save or update conversation in cache
  const saveToCache = useMutation({
    mutationFn: async (conversationData: {
      conversation_id: string;
      agent_id?: string;
      agent_name?: string;
      phone_number?: string;
      contact_name?: string;
      call_status?: string;
      call_date?: string;
      duration_seconds?: number;
      cost_credits?: number;
      transcript?: any;
      analysis?: any;
      metadata?: any;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const accessToken = getAccessTokenSync();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const upsertData = {
        conversation_id: conversationData.conversation_id,
        user_id: user.id,
        agent_id: conversationData.agent_id,
        agent_name: conversationData.agent_name,
        phone_number: conversationData.phone_number,
        contact_name: conversationData.contact_name,
        call_status: conversationData.call_status,
        call_date: conversationData.call_date,
        duration_seconds: conversationData.duration_seconds,
        cost_credits: conversationData.cost_credits,
        transcript: conversationData.transcript,
        analysis: conversationData.analysis,
        metadata: conversationData.metadata,
        updated_at: new Date().toISOString()
      };

      const url = `${ENV.SUPABASE_URL}/rest/v1/conversation_analytics_cache?on_conflict=conversation_id,user_id`;

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(upsertData)
      }, 15000);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-analytics-cache', user?.id] });
    },
  });

  // Refresh conversation data from ElevenLabs and update cache
  const refreshConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('User not authenticated');

      const accessToken = getAccessTokenSync();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      try {
        const { data: elevenLabsData, error } = await invokeEdgeFunction('get-elevenlabs-conversation', { conversationId });

        if (error) {
          throw new Error(error.message);
        }

        if (!elevenLabsData) {
          return null;
        }

        // Extract data from ElevenLabs response
        const metadata = elevenLabsData.metadata || {};
        const duration = Math.round(metadata.call_duration_secs || 0);

        // Get call history info if available - using REST API
        let callHistoryData: any = null;
        try {
          const callHistoryUrl = `${ENV.SUPABASE_URL}/rest/v1/call_history?conversation_id=eq.${conversationId}&user_id=eq.${user.id}&limit=1`;
          const callHistoryResponse = await fetchWithTimeout(callHistoryUrl, {
            method: 'GET',
            headers: {
              'apikey': ENV.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          }, 10000);

          if (callHistoryResponse.ok) {
            const callHistoryArr = await callHistoryResponse.json();
            callHistoryData = callHistoryArr?.[0] || null;
          }
        } catch (e) {
          // Ignore call history lookup failures; refresh can proceed without it.
        }

        // Get agent name from kalina_agents table - using REST API
        let agentName = 'Unknown Agent';
        if (callHistoryData?.agent_id) {
          try {
            const agentUrl = `${ENV.SUPABASE_URL}/rest/v1/kalina_agents?agent_id=eq.${callHistoryData.agent_id}&select=name&limit=1`;
            const agentResponse = await fetchWithTimeout(agentUrl, {
              method: 'GET',
              headers: {
                'apikey': ENV.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              }
            }, 10000);

            if (agentResponse.ok) {
              const agentArr = await agentResponse.json();
              agentName = agentArr?.[0]?.name || 'Unknown Agent';
            }
          } catch (e) {
            // Ignore agent lookup failures; refresh can proceed without it.
          }
        }

        // Use call_history.cost_usd as the source of truth (already deducted from balance)
        // Convert USD to credits: 1 USD = 100 credits
        const costCredits = callHistoryData?.cost_usd 
          ? Math.round(callHistoryData.cost_usd * 100) 
          : Math.round(metadata.cost || 0);

        const conversationData = {
          conversation_id: conversationId,
          agent_id: callHistoryData?.agent_id,
          agent_name: agentName,
          phone_number: callHistoryData?.phone_number || metadata.phone_number,
          contact_name: callHistoryData?.contact_name || 'Unknown Contact',
          call_status: callHistoryData?.call_status || 'completed',
          call_date: callHistoryData?.call_date || new Date().toISOString(),
          duration_seconds: duration,
          cost_credits: costCredits,
          transcript: elevenLabsData.transcript,
          analysis: {
            sentiment_data: elevenLabsData.sentiment_data,
            emotions: elevenLabsData.emotions,
            keywords: elevenLabsData.keywords,
            topics: elevenLabsData.topics,
            metrics: elevenLabsData.metrics
          },
          metadata: metadata
        };

        // Save to cache
        await saveToCache.mutateAsync(conversationData);

        return conversationData;
      } catch (error) {
        throw error;
      }
    },
  });

  // Auto-refresh logic for recent conversations - refreshes ALL recent conversations without complete data
  // Wrapped in useCallback to maintain stable identity and prevent unnecessary re-renders in consumers
  const autoRefreshRecentConversations = useCallback(async (callHistory: any[]) => {
    if (!user || !callHistory.length) return;

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Find ALL recent conversations (within last 10 minutes) that need refresh
    const recentConversations = callHistory
      .filter(call => {
        if (!call.conversation_id || !call.call_date) return false;
        const conversationDate = new Date(call.call_date);
        return conversationDate > tenMinutesAgo;
      })
      .sort((a, b) => new Date(b.call_date).getTime() - new Date(a.call_date).getTime());

    if (!recentConversations.length) return;

    // Refresh each conversation that doesn't have complete data in cache
    for (const conversation of recentConversations) {
      const cached = cachedConversationsQuery.data?.find(
        c => c.conversation_id === conversation.conversation_id
      );

      // Refresh if not cached OR if cached but no cost/duration data
      const needsRefresh = !cached ||
        !cached.cost_credits ||
        cached.cost_credits === 0 ||
        !cached.duration_seconds ||
        new Date(cached.updated_at) < new Date(conversation.call_date);

      if (needsRefresh) {
        try {
          await refreshConversation.mutateAsync(conversation.conversation_id);
        } catch (error) {
        }
      }
    }
  }, [user, cachedConversationsQuery.data, refreshConversation]);

  // Get conversation data (from cache or fresh)
  const getConversationData = (conversationId: string) => {
    const cached = cachedConversationsQuery.data?.find(
      c => c.conversation_id === conversationId
    );

    if (cached) {
      // Extract message count from transcript - handle multiple ElevenLabs formats
      let messageCount = 0;
      if (cached.transcript) {
        const transcript: any = cached.transcript;

        // ElevenLabs transcript can be:
        // 1. Direct array of turns: [{ role: "agent", message: "..." }, ...]
        // 2. Object with turns property: { turns: [...] }
        // 3. Object with transcript property: { transcript: [...] }
        // 4. Object with messages property: { messages: [...] }

        let turns: any[] | null = null;

        if (Array.isArray(transcript)) {
          turns = transcript;
        } else if (transcript?.turns && Array.isArray(transcript.turns)) {
          turns = transcript.turns;
        } else if (transcript?.transcript && Array.isArray(transcript.transcript)) {
          turns = transcript.transcript;
        } else if (transcript?.messages && Array.isArray(transcript.messages)) {
          turns = transcript.messages;
        } else if (transcript?.dialog && Array.isArray(transcript.dialog)) {
          turns = transcript.dialog;
        }

        if (turns) {
          messageCount = turns.length;
        }
      }

      return {
        duration: cached.duration_seconds || 0,
        cost: cached.cost_credits || 0,
        messageCount,
        isCached: true,
        lastUpdated: cached.updated_at
      };
    }

    return {
      duration: 0,
      cost: 0,
      messageCount: 0,
      isCached: false,
      lastUpdated: null
    };
  };

  // Manual refresh all conversations
  const refreshAllConversations = useMutation({
    mutationFn: async (callHistory: any[]) => {
      if (!user) throw new Error('User not authenticated');

      const conversationsToRefresh = callHistory.filter(call => call.conversation_id);
      // Initialize progress tracking
      const progressItems: AudioExtractionItem[] = conversationsToRefresh.map(call => ({
        id: call.conversation_id,
        contactName: call.contact_name || 'Necunoscut',
        status: 'pending'
      }));
      setExtractionProgress(progressItems);

      const results = [];
      for (let i = 0; i < conversationsToRefresh.length; i++) {
        const call = conversationsToRefresh[i];
        
        // Update status to processing
        setExtractionProgress(prev => 
          prev.map(p => p.id === call.conversation_id 
            ? { ...p, status: 'processing', progress: 0 }
            : p
          )
        );

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setExtractionProgress(prev =>
            prev.map(p => p.id === call.conversation_id && p.progress !== undefined
              ? { ...p, progress: Math.min((p.progress || 0) + 10, 90) }
              : p
            )
          );
        }, 200);

        try {
          const result = await refreshConversation.mutateAsync(call.conversation_id);

          // Update to completed
          setExtractionProgress(prev =>
            prev.map(p => p.id === call.conversation_id
              ? { ...p, status: 'completed', progress: 100 }
              : p
            )
          );

          results.push({ id: call.conversation_id, success: true, data: result });
        } catch (error) {
          // Update to error
          setExtractionProgress(prev =>
            prev.map(p => p.id === call.conversation_id
              ? { ...p, status: 'error' }
              : p
            )
          );

          results.push({ id: call.conversation_id, success: false, error });
        } finally {
          clearInterval(progressInterval);
        }
      }

      const successCount = results.filter(r => r.success).length;
      // Don't auto-dismiss - let user dismiss manually when all are complete
      
      return { successCount, totalCount: conversationsToRefresh.length };
    },
  });

  const dismissExtractionProgress = () => {
    setExtractionProgress([]);
  };


  return {
    cachedConversations: cachedConversationsQuery.data || [],
    isLoading: cachedConversationsQuery.isLoading,
    error: cachedConversationsQuery.error,
    saveToCache,
    refreshConversation,
    refreshAllConversations,
    autoRefreshRecentConversations,
    getConversationData,
    refetch: cachedConversationsQuery.refetch,
    extractionProgress,
    setExtractionProgress,
    dismissExtractionProgress,
  };
};
