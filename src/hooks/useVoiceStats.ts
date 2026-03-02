import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ElevenLabsStats {
  totalSpend: number;
  monthlyData: Array<{ month: string; amount: number }>;
  dailyData: Array<{ date: string; amount: number }>;
}

export const useVoiceStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ElevenLabsStats>({
    totalSpend: 0,
    monthlyData: [],
    dailyData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Get conversations for spending calculation
        const { data: conversations } = await supabase
          .from('conversations')
          .select('cost_usd, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Get call history for additional spending data
        const { data: callHistory } = await supabase
          .from('call_history')
          .select('cost_usd, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const calculateSpend = () => {
          try {
            // Calculate total spend from conversations and call history
            const conversationCosts = conversations?.reduce((total, conv) => {
              return total + (conv.cost_usd || 0);
            }, 0) || 0;

            const callHistoryCosts = callHistory?.reduce((total, call) => {
              return total + (call.cost_usd || 0);
            }, 0) || 0;

            const totalSpend = conversationCosts + callHistoryCosts;

            const monthlyData: Record<string, number> = {};
            const dailyData: Record<string, number> = {};

            // Process conversations for chart data
            conversations?.forEach(conv => {
              if (conv.created_at && conv.cost_usd) {
                const date = new Date(conv.created_at);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const dayKey = date.toISOString().split('T')[0];
                
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + conv.cost_usd;
                dailyData[dayKey] = (dailyData[dayKey] || 0) + conv.cost_usd;
              }
            });

            // Process call history for chart data
            callHistory?.forEach(call => {
              if (call.created_at && call.cost_usd) {
                const date = new Date(call.created_at);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const dayKey = date.toISOString().split('T')[0];
                
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + call.cost_usd;
                dailyData[dayKey] = (dailyData[dayKey] || 0) + call.cost_usd;
              }
            });

            return {
              totalSpend,
              monthlyData: Object.entries(monthlyData).map(([month, amount]) => ({
                month,
                amount
              })),
              dailyData: Object.entries(dailyData).map(([date, amount]) => ({
                date,
                amount
              }))
            };
          } catch (error) {
            console.error('Error calculating spend:', error);
            return {
              totalSpend: 0,
              monthlyData: [],
              dailyData: []
            };
          }
        };

        const newStats = calculateSpend();
        setStats(newStats);
      } catch (error) {
        console.error('Error fetching ElevenLabs stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, loading };
};