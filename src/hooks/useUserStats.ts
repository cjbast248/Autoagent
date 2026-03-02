
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useEffect, useRef } from 'react';

export const useUserStats = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Track if subscription is already set up to prevent duplicates
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const statsQuery = useQuery({
    queryKey: ['user-statistics', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user statistics:', error);
        // Return default values if no statistics found
        return {
          total_conversations: 0,
          total_messages: 0,
          total_voice_calls: 0,
          total_minutes_talked: 0,
          agents_used: 0,
          total_spent_usd: 0,
          current_spent_usd: 0
        };
      }

      return data;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes before considering stale
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false, // Disabled - realtime handles updates
    refetchOnReconnect: true,
  });

  // Real-time updates for user statistics - use queryClient.invalidateQueries instead of statsQuery.refetch
  useEffect(() => {
    if (!user?.id) return;

    // Don't set up if already subscribed
    if (subscriptionRef.current) {
      return;
    }

    console.log('📊 Setting up real-time subscription for user statistics');

    const channel = supabase
      .channel(`user-statistics-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_statistics',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-statistics', user.id] });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      console.log('📊 Cleaning up user statistics real-time subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user?.id, queryClient]);

  return statsQuery;
};
