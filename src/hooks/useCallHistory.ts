
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { ENV } from '@/config/environment';
import { fetchWithAuth } from '@/utils/sessionManager';

export interface CallHistoryRecord {
  id: string;
  phone_number: string;
  caller_number?: string;
  contact_name: string;
  call_status: 'success' | 'failed' | 'busy' | 'no-answer' | 'unknown' | 'initiated' | 'done';
  summary: string;
  dialog_json: string;
  call_date: string;
  call_date_display?: string;
  cost_usd: number;
  agent_id?: string;
  agent_name?: string;
  language?: string;
  conversation_id?: string;
  elevenlabs_history_id?: string;
  duration_seconds?: number;
  analysis_conclusion?: string | null;
  analysis_processed_at?: string | null;
  analysis_agent_evaluation?: string | null;
  custom_analysis_data?: string | null;
}

export interface CallHistoryFilters {
  agentIds?: string[] | null;
  searchTerm?: string;
  status?: string;
  dateAfter?: string;
  dateBefore?: string;
  minDuration?: number;
  maxDuration?: number;
  // AI filters - search in analysis_conclusion text
  aiScoreFilters?: string[]; // array of score ranges
  aiTagsFilter?: string[]; // tags to search for
}

// Helper to build query string for filters
const buildFilterQueryString = (userId: string, filters?: CallHistoryFilters): string => {
  const params: string[] = [`user_id=eq.${userId}`];

  if (filters?.agentIds && filters.agentIds.length > 0) {
    params.push(`agent_id=in.(${filters.agentIds.join(',')})`);
  }

  if (filters?.searchTerm) {
    const term = encodeURIComponent(filters.searchTerm);
    params.push(`or=(phone_number.ilike.*${term}*,contact_name.ilike.*${term}*,summary.ilike.*${term}*,conversation_id.ilike.*${term}*)`);
  }

  if (filters?.status && filters.status !== 'all') {
    const normalized = String(filters.status).toLowerCase();
    params.push(`call_status=eq.${normalized}`);
  }

  if (filters?.dateAfter) {
    params.push(`call_date=gte.${filters.dateAfter}`);
  }

  if (filters?.dateBefore) {
    const endDate = new Date(filters.dateBefore);
    endDate.setDate(endDate.getDate() + 1);
    params.push(`call_date=lt.${endDate.toISOString().split('T')[0]}T00:00:00`);
  }

  if (filters?.minDuration !== undefined && filters?.minDuration >= 0) {
    params.push(`duration_seconds=gte.${filters.minDuration}`);
  }

  if (filters?.maxDuration !== undefined && filters?.maxDuration > 0) {
    params.push(`duration_seconds=lte.${filters.maxDuration}`);
  }

  // AI Score filters - using simple pattern matching with ILIKE
  // Note: ILIKE uses % as wildcard, not regex
  if (filters?.aiScoreFilters && filters.aiScoreFilters.length > 0) {
    const scoreConditions: string[] = [];
    for (const scoreFilter of filters.aiScoreFilters) {
      switch (scoreFilter) {
        case '80+':
          // Match scores starting with 8, 9, or 100
          scoreConditions.push(
            'analysis_conclusion.ilike.*Scor: 8%',
            'analysis_conclusion.ilike.*Scor: 9%',
            'analysis_conclusion.ilike.*Scor: 100%'
          );
          break;
        case '60-79':
          // Match scores starting with 6 or 7
          scoreConditions.push(
            'analysis_conclusion.ilike.*Scor: 6%',
            'analysis_conclusion.ilike.*Scor: 7%'
          );
          break;
        case '40-59':
          // Match scores starting with 4 or 5
          scoreConditions.push(
            'analysis_conclusion.ilike.*Scor: 4%',
            'analysis_conclusion.ilike.*Scor: 5%'
          );
          break;
        case '<40':
          // Match scores starting with 0, 1, 2, or 3
          scoreConditions.push(
            'analysis_conclusion.ilike.*Scor: 0%',
            'analysis_conclusion.ilike.*Scor: 1%',
            'analysis_conclusion.ilike.*Scor: 2%',
            'analysis_conclusion.ilike.*Scor: 3%'
          );
          break;
      }
    }
    if (scoreConditions.length > 0) {
      params.push(`or=(${scoreConditions.join(',')})`);
    }
  }

  // AI Tags filters
  if (filters?.aiTagsFilter && filters.aiTagsFilter.length > 0) {
    const tagConditions = filters.aiTagsFilter.map(tag => `analysis_conclusion.ilike.*${encodeURIComponent(tag)}*`).join(',');
    params.push(`or=(${tagConditions})`);
  }

  return params.join('&');
};

export const useCallHistory = (page: number = 1, perPage: number = 50, filters?: CallHistoryFilters) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // SEPARATE query for agents - cached longer since agents rarely change
  const agentsQuery = useQuery({
    queryKey: ['kalina-agents-map', user?.id],
    queryFn: async () => {
      if (!user) return new Map<string, string>();

      const agentsUrl = `${ENV.SUPABASE_URL}/rest/v1/kalina_agents?user_id=eq.${user.id}&select=agent_id,name`;
      const response = await fetchWithAuth(agentsUrl, {
        method: 'GET',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        }
      }, 10000);

      if (!response.ok) {
        return new Map<string, string>();
      }

      const agents = await response.json();
      return new Map(agents?.map((agent: any) => [agent.agent_id, agent.name]) || []);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - agents don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Query to get total count (all conversations) - optimized with longer staleTime
  const totalCountQuery = useQuery({
    queryKey: ['call-history-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const url = `${ENV.SUPABASE_URL}/rest/v1/call_history?user_id=eq.${user.id}&select=count`;

      try {
        const response = await fetchWithAuth(url, {
          method: 'GET',
          headers: {
            'apikey': ENV.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact',
          }
        }, 15000);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error fetching call history count:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          const match = contentRange.match(/\/(\d+|\*)/);
          if (match && match[1] !== '*') {
            return parseInt(match[1], 10);
          }
        }

        return 0;
      } catch (error: any) {
        console.error('Error fetching call history count:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Query to get filtered count (with all filters applied)
  const filteredCountQuery = useQuery({
    queryKey: ['call-history-filtered-count', user?.id, JSON.stringify(filters)],
    queryFn: async () => {
      if (!user) return 0;

      const filterQuery = buildFilterQueryString(user.id, filters);
      const url = `${ENV.SUPABASE_URL}/rest/v1/call_history?${filterQuery}&select=count`;

      try {
        const response = await fetchWithAuth(url, {
          method: 'GET',
          headers: {
            'apikey': ENV.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact',
          }
        }, 15000);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error fetching filtered call history count:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          const match = contentRange.match(/\/(\d+|\*)/);
          if (match && match[1] !== '*') {
            return parseInt(match[1], 10);
          }
        }

        return 0;
      } catch (error: any) {
        console.error('Error fetching filtered call history count:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const callHistoryQuery = useQuery({
    queryKey: ['call-history', user?.id, page, perPage, JSON.stringify(filters)],
    queryFn: async () => {
      if (!user) return [];

      // Use cached agent map from separate query (no additional fetch!)
      const agentMap = agentsQuery.data || new Map<string, string>();

      // Calculate range for pagination
      let effectivePerPage = perPage;
      if (perPage === -1) {
        // Need to get total count first
        const filterQuery = buildFilterQueryString(user.id, filters);
        const countUrl = `${ENV.SUPABASE_URL}/rest/v1/call_history?${filterQuery}&select=count`;

        try {
          const countResponse = await fetchWithAuth(countUrl, {
            method: 'GET',
            headers: {
              'apikey': ENV.SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'count=exact',
            }
          }, 15000);

          if (countResponse.ok) {
            const contentRange = countResponse.headers.get('content-range');
            if (contentRange) {
              const match = contentRange.match(/\/(\d+|\*)/);
              if (match && match[1] !== '*') {
                effectivePerPage = parseInt(match[1], 10);
              }
            }
          }
        } catch (e) {
          effectivePerPage = 1000; // fallback
        }
      }

      const start = (page - 1) * effectivePerPage;
      const end = start + effectivePerPage - 1;

      // Helper to map DB rows -> UI records
      const mapRow = (record: any) => {
        return {
          id: record.id,
          phone_number: record.phone_number || '',
          caller_number: record.caller_number || '',
          contact_name: record.contact_name || record.phone_number || 'Necunoscut',
          call_status: record.call_status || 'unknown',
          summary: record.summary || '',
          dialog_json: record.dialog_json || '',
          call_date: record.call_date ? new Date(record.call_date).toISOString() : '',
          call_date_display: record.call_date ? new Date(record.call_date).toLocaleString('ro-RO') : '',
          cost_usd: record.cost_usd ? Number(record.cost_usd) : 0,
          agent_id: record.agent_id,
          agent_name: agentMap.get(record.agent_id) || record.agent_id || 'Agent necunoscut',
          language: record.language,
          conversation_id: record.conversation_id,
          elevenlabs_history_id: record.elevenlabs_history_id,
          duration_seconds: record.duration_seconds,
          analysis_conclusion: record.analysis_conclusion,
          analysis_processed_at: record.analysis_processed_at,
          analysis_agent_evaluation: record.analysis_agent_evaluation,
          custom_analysis_data: record.custom_analysis_data,
        };
      };

      // Build query URL
      const filterQuery = buildFilterQueryString(user.id, filters);
      const url = `${ENV.SUPABASE_URL}/rest/v1/call_history?${filterQuery}&order=call_date.desc`;

      try {
        const response = await fetchWithAuth(url, {
          method: 'GET',
          headers: {
            'apikey': ENV.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Range': `${start}-${end}`,
          }
        }, 20000);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error fetching call history:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return (data || []).map(mapRow);
      } catch (error: any) {
        console.error('Error fetching call history:', error);
        throw error;
      }
    },
    enabled: !!user && !agentsQuery.isLoading, // Wait for agents to load first
    staleTime: 60 * 1000, // 1 minute (increased from 30s to reduce refetches)
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 300000, // Auto-refresh every 5 minutes
  });

  const saveCallResults = useMutation({
    mutationFn: async (callResults: any[]) => {
      if (!user) throw new Error('User not authenticated');

      const recordsToInsert = callResults.map((result) => {
        // Handle different response structures and extract conversation_id and elevenlabs_history_id
        let cleanConversations, callInfo, phoneNumbers, costInfo, status, summary, timestamps, language, conversationId, elevenLabsHistoryId;

        if (result?.clean_conversations) {
          cleanConversations = result.clean_conversations;
          callInfo = cleanConversations?.call_info ?? {};
          phoneNumbers = callInfo?.phone_numbers ?? {};
          costInfo = cleanConversations?.['']?.cost_info ?? cleanConversations?.cost_info ?? {};
          status = cleanConversations?.status ?? 'unknown';
          summary = cleanConversations?.summary ?? '';
          timestamps = cleanConversations?.timestamps ?? '';
          language = callInfo?.language ?? 'ro';
          conversationId = result.conversation_id ||
                          cleanConversations?.conversation_id ||
                          callInfo?.conversation_id ||
                          result?.metadata?.conversation_id ||
                          null;
          elevenLabsHistoryId = result.elevenlabs_history_id ||
                               cleanConversations?.elevenlabs_history_id ||
                               callInfo?.elevenlabs_history_id ||
                               result?.history_item_id ||
                               null;
        } else {
          callInfo = result?.call_info ?? {};
          phoneNumbers = callInfo?.phone_numbers ?? {};
          costInfo = result?.cost_info ?? {};
          status = result?.status ?? 'unknown';
          summary = result?.summary ?? '';
          timestamps = result?.timestamps ?? '';
          language = callInfo?.language ?? 'ro';
          conversationId = result.conversation_id ||
                          callInfo?.conversation_id ||
                          result?.metadata?.conversation_id ||
                          null;
          elevenLabsHistoryId = result.elevenlabs_history_id ||
                               callInfo?.elevenlabs_history_id ||
                               result?.history_item_id ||
                               null;
        }

        const phoneNumber = phoneNumbers?.user ?? phoneNumbers?.to ?? result?.phone_number ?? '';
        const costValue = costInfo?.total_cost ?? result?.cost ?? 0;

        const dialogJson = JSON.stringify(result, null, 2);

        let callDate = new Date().toISOString();
        if (timestamps) {
          try {
            const timestampPart = timestamps.split('-')[0];
            const parsedDate = new Date(timestampPart);
            if (!isNaN(parsedDate.getTime())) {
              callDate = parsedDate.toISOString();
            }
          } catch (timestampError) {
            // Ignore timestamp parse errors; fallback to current time.
          }
        }

        return {
          user_id: user.id,
          phone_number: phoneNumber,
          contact_name: phoneNumber || 'Necunoscut',
          call_status: status === 'done' || status === 'completed' ? 'done' : status,
          summary: summary,
          dialog_json: dialogJson,
          call_date: callDate,
          cost_usd: costValue,
          language: language,
          timestamps: timestamps,
          conversation_id: conversationId,
          elevenlabs_history_id: elevenLabsHistoryId
        };
      });

      const url = `${ENV.SUPABASE_URL}/rest/v1/call_history`;

      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(recordsToInsert)
      }, 15000);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error inserting call history:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-history', user?.id] });
    },
  });

  const deleteCallHistory = useMutation({
    mutationFn: async (callIds: string[]) => {
      if (!user) throw new Error('User not authenticated');

      const url = `${ENV.SUPABASE_URL}/rest/v1/call_history?id=in.(${callIds.join(',')})&user_id=eq.${user.id}`;

      const response = await fetchWithAuth(url, {
        method: 'DELETE',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        }
      }, 15000);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error deleting call history:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-history', user?.id] });
    },
  });

  const deleteAllCallHistory = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const url = `${ENV.SUPABASE_URL}/rest/v1/call_history?user_id=eq.${user.id}`;

      const response = await fetchWithAuth(url, {
        method: 'DELETE',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        }
      }, 30000);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error deleting all call history:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-history', user?.id] });
    },
  });

  // Track subscription to prevent duplicates
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedUserIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // REALTIME SUBSCRIPTION - pentru update instant când se termină un apel
  useEffect(() => {
    if (!user?.id) return;

    // Don't recreate if already subscribed for this user
    if (subscriptionRef.current && subscribedUserIdRef.current === user.id) {
      return;
    }

    // Clean up existing subscription and pending debounce if user changed
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    subscribedUserIdRef.current = user.id;

    const channel = supabase
      .channel(`call-history-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'call_history',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Debounce: coalesce multiple events into single refetch (500ms window)
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['call-history', user.id] });
            queryClient.invalidateQueries({ queryKey: ['call-history-count', user.id] });
            queryClient.invalidateQueries({ queryKey: ['call-history-filtered-count', user.id] });
          }, 500);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        subscribedUserIdRef.current = null;
      }
    };
  }, [user?.id, queryClient]);

  return {
    callHistory: callHistoryQuery.data || [],
    totalCount: totalCountQuery.data ?? 0,
    filteredCount: filteredCountQuery.data ?? 0,
    isLoading: callHistoryQuery.isLoading || totalCountQuery.isLoading,
    error: callHistoryQuery.error || totalCountQuery.error,
    saveCallResults,
    deleteCallHistory,
    deleteAllCallHistory,
    refetch: callHistoryQuery.refetch,
  };
};
