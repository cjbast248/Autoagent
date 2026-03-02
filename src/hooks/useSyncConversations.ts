import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncStatus {
  id: string;
  user_id: string;
  agent_id: string;
  kalina_agent_id: string | null;
  last_sync_at: string | null;
  last_sync_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  conversations_synced: number;
  conversations_total: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncResult {
  success: boolean;
  message: string;
  totalNewConversations: number;
  totalErrors: number;
  results: Array<{
    agentId: string;
    agentName: string;
    totalFetched: number;
    newConversations: number;
    skipped: number;
    errors: number;
    status: 'completed' | 'failed';
    errorMessage?: string;
  }>;
}

export const useSyncConversations = (agentId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const SYNC_STATUS_MISSING_KEY = 'agentauto_sync_status_missing';
  const [skipSyncStatus, setSkipSyncStatus] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SYNC_STATUS_MISSING_KEY) === 'true';
  });

  const markSyncStatusMissing = () => {
    if (skipSyncStatus) return;
    setSkipSyncStatus(true);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SYNC_STATUS_MISSING_KEY, 'true');
      }
    } catch {
      // Ignore storage errors
    }
  };

  // Get sync status for an agent or all agents
  const {
    data: syncStatus,
    isLoading: statusLoading,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['sync-status', user?.id, agentId],
    queryFn: async () => {
      if (!user) return null;

      let query = supabase
        .from('elevenlabs_sync_status')
        .select('*')
        .eq('user_id', user.id);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01') {
          markSyncStatusMissing();
          return [];
        }
        console.error('Error fetching sync status:', error);
        throw error;
      }
      return data as SyncStatus[];
    },
    enabled: !!user && !skipSyncStatus,
    refetchInterval: () => (skipSyncStatus ? false : 10000), // Refresh every 10 seconds when syncing
    staleTime: 5000,
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: async (targetAgentId?: string): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('sync-elevenlabs-conversations', {
        body: {
          user_id: user?.id,
          agent_id: targetAgentId || agentId
        }
      });

      if (error) {
        console.error('Sync error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.totalNewConversations > 0) {
        toast.success(`Sincronizare completă: ${data.totalNewConversations} conversații noi`);
      } else {
        toast.info('Sincronizare completă: nicio conversație nouă');
      }

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['agent-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['call-history'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-analytics'] });
    },
    onError: (error: any) => {
      console.error('Sync mutation error:', error);
      toast.error(`Eroare la sincronizare: ${error.message}`);
    }
  });

  // Get current status for a specific agent
  const getAgentSyncStatus = (targetAgentId: string): SyncStatus | undefined => {
    return syncStatus?.find(s => s.agent_id === targetAgentId);
  };

  // Check if any sync is in progress
  const isSyncInProgress = syncStatus?.some(s => s.last_sync_status === 'in_progress') || false;

  return {
    syncStatus,
    statusLoading,
    refetchStatus,
    triggerSync: syncMutation.mutate,
    triggerSyncAsync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending || isSyncInProgress,
    lastSyncResult: syncMutation.data,
    syncError: syncMutation.error,
    getAgentSyncStatus,
  };
};
