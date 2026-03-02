import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useState, useEffect } from 'react';

export const useAgentConversations = (agentId?: string) => {
  const { user } = useAuth();
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number } | null>(null);

  const query = useQuery({
    queryKey: ['agent-conversations', agentId, user?.id],
    queryFn: async () => {
      if (!user || !agentId) return [];
      
      console.log('Fetching all conversations for agent:', agentId);
      
      // First, get the total count
      const { count, error: countError } = await supabase
        .from('call_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('agent_id', agentId);

      if (countError) {
        console.error('Error fetching count:', countError);
        throw countError;
      }

      const totalCount = count || 0;
      console.log(`Total conversations to fetch: ${totalCount}`);
      
      const BATCH_SIZE = 1000;
      let allConversations: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const to = from + BATCH_SIZE - 1;
        console.log(`Fetching batch ${from}-${to}...`);

        const { data, error } = await supabase
          .from('call_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('agent_id', agentId)
          .order('call_date', { ascending: false })
          .range(from, to);

        if (error) {
          console.error('Error fetching agent conversations:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allConversations = [...allConversations, ...data];
          setLoadingProgress({ loaded: allConversations.length, total: totalCount });
          console.log(`Batch fetched: ${data.length} conversations. Total so far: ${allConversations.length}/${totalCount}`);
          
          // If we got less than BATCH_SIZE, we've reached the end
          if (data.length < BATCH_SIZE) {
            hasMore = false;
          } else {
            from += BATCH_SIZE;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ Fetched ALL ${allConversations.length} conversations for agent ${agentId}`);
      setLoadingProgress(null); // Clear progress when done
      return allConversations;
    },
    enabled: !!user && !!agentId,
  });

  // Reset progress when agent changes
  useEffect(() => {
    if (query.isFetching) {
      setLoadingProgress(null);
    }
  }, [agentId, query.isFetching]);

  return {
    ...query,
    loadingProgress,
  };
};
