import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useEffect } from 'react';

interface UserBalanceData {
  balance_usd: number;
  monthly_free_credits: number;
  monthly_credits_used: number;
  month_start_date: string;
}

export const useUserBalance = () => {
  const { user } = useAuth();

  const balanceQuery = useQuery({
    queryKey: ['user-balance', user?.id],
    queryFn: async (): Promise<UserBalanceData | null> => {
      if (!user) return null;

      // Add 5s timeout to prevent SDK from hanging
      const timeoutPromise = new Promise<{ data: null; error: { code: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { code: 'TIMEOUT' } }), 5000)
      );
      const queryPromise = supabase
        .from('user_balance')
        .select('balance_usd, monthly_free_credits, monthly_credits_used, month_start_date')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('Error fetching balance:', error);
        return null;
      }

      return data as UserBalanceData;
    },
    enabled: !!user,
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Real-time updates for user balance
  useEffect(() => {
    if (!user?.id) return;

    console.log('💰 Setting up real-time subscription for user balance');
    
    const channel = supabase
      .channel('user-balance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balance',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💰 Real-time update for user balance:', payload);
          balanceQuery.refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'balance_transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💳 New balance transaction:', payload);
          balanceQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      console.log('💰 Cleaning up balance real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, balanceQuery]);

  return balanceQuery;
};
