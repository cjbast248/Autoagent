import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from 'sonner';

// Callback Request Interface
export interface CallbackRequest {
  id: string;
  user_id: string;
  client_name: string;
  phone_number: string;
  scheduled_time: string;
  status: 'scheduled' | 'completed' | 'failed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  description?: string;
  notes?: string;
  agent_id?: string;
  created_at: string;
  updated_at: string;
}

// Fetching Callbacks
export const useCallbacks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['callbacks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch callbacks where user_id matches current user
      // Now that edge function sets user_id to agent owner, we just need to fetch by user_id
      const { data, error } = await supabase
        .from('scheduled_calls')
        .select('*')
        .eq('task_type', 'callback')
        .eq('user_id', user.id)
        .order('scheduled_datetime', { ascending: true });

      if (error) {
        console.error('Error fetching callbacks:', error);
        throw error;
      }

      // Update overdue status and map to correct field names
      const now = new Date();
      const updatedData = data?.map(callback => {
        const scheduledTime = new Date(callback.scheduled_datetime);
        const status = callback.status === 'scheduled' && scheduledTime < now ? 'overdue' : callback.status;
        
        return {
          ...callback,
          scheduled_time: callback.scheduled_datetime, // Map field name for UI compatibility
          status
        };
      }) || [];

      return updatedData;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Create Callback
export const useCreateCallback = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (callbackData: Omit<CallbackRequest, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated');

      // Debugging: Log the payload being sent
      const payload = {
        ...callbackData,
        user_id: user.id,
        task_type: 'callback',
        scheduled_datetime: callbackData.scheduled_time,
        // Remove empty agent_id to avoid constraint issues
        agent_id: callbackData.agent_id || null,
      };
      
      console.log('🚀 Creating callback with payload:', payload);
      console.log('📋 Payload validation:', {
        hasClientName: !!payload.client_name,
        hasPhoneNumber: !!payload.phone_number,
        hasScheduledTime: !!payload.scheduled_datetime,
        hasUserId: !!payload.user_id,
        isValidStatus: payload.status && ['scheduled', 'completed', 'failed', 'overdue'].includes(payload.status),
        isValidPriority: payload.priority && ['low', 'medium', 'high'].includes(payload.priority)
      });

      const { data, error } = await supabase
        .from('scheduled_calls')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error details:', error);
        throw error;
      }
      
      console.log('✅ Callback created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
      toast.success('Callback programat cu succes');
    },
    onError: (error: any) => {
      console.error('❌ Error creating callback:', error);
      
      // Display specific error messages
      let errorMessage = 'Eroare la programarea callback-ului';
      
      if (error?.message) {
        if (error.message.includes('foreign key')) {
          errorMessage = 'Agent selectat nu este valid';
        } else if (error.message.includes('check constraint')) {
          errorMessage = 'Datele introduse nu sunt valide';
        } else if (error.message.includes('not null')) {
          errorMessage = 'Lipsesc câmpuri obligatorii';
        } else {
          errorMessage = `Eroare: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    },
  });
};

// Update Callback
export const useUpdateCallback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CallbackRequest> & { id: string }) => {
      // Map field names for database
      const dbUpdates: any = { ...updates };
      if (updates.scheduled_time) {
        dbUpdates.scheduled_datetime = updates.scheduled_time;
        delete dbUpdates.scheduled_time;
      }
      
      const { data, error } = await supabase
        .from('scheduled_calls')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
      toast.success('Callback actualizat cu succes');
    },
    onError: (error) => {
      console.error('Error updating callback:', error);
      toast.error('Eroare la actualizarea callback-ului');
    },
  });
};

// Delete Callback
export const useDeleteCallback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_calls')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
      toast.success('Callback șters cu succes');
    },
    onError: (error) => {
      console.error('Error deleting callback:', error);
      toast.error('Eroare la ștergerea callback-ului');
    },
  });
};

// Execute Callback
export const useExecuteCallback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callback: CallbackRequest) => {
      // First, mark the callback as in progress
      const { error: updateError } = await supabase
        .from('scheduled_calls')
        .update({ status: 'in_progress' })
        .eq('id', callback.id);

      if (updateError) throw updateError;

      // Initiate the call using Supabase function
      const { data, error } = await supabase.functions.invoke('initiate-scheduled-call', {
        body: {
          agent_id: callback.agent_id,
          phone_number: callback.phone_number,
          contact_name: callback.client_name,
          user_id: callback.user_id,
        }
      });

      if (error) throw error;

      // Update status based on call result
      const finalStatus = data.success ? 'completed' : 'failed';
      await supabase
        .from('scheduled_calls')
        .update({ status: finalStatus })
        .eq('id', callback.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
      toast.success('Callback executat cu succes');
    },
    onError: (error) => {
      console.error('Error executing callback:', error);
      toast.error('Eroare la executarea callback-ului');
    },
  });
};

// Hook to use all callback operations
export const useCallbackOperations = () => {
  const { data: callbacks = [], isLoading, error, refetch } = useCallbacks();
  const createCallbackMutation = useCreateCallback();
  const updateCallbackMutation = useUpdateCallback();
  const deleteCallbackMutation = useDeleteCallback();
  const executeCallbackMutation = useExecuteCallback();

  // Group callbacks by status
  const groupedCallbacks = {
    overdue: callbacks.filter(cb => {
      const scheduledTime = new Date(cb.scheduled_time || cb.scheduled_datetime);
      const now = new Date();
      return cb.status === 'scheduled' && scheduledTime < now;
    }),
    upcoming: callbacks.filter(cb => {
      const scheduledTime = new Date(cb.scheduled_time || cb.scheduled_datetime);
      const now = new Date();
      return cb.status === 'scheduled' && scheduledTime >= now;
    }),
    completed: callbacks.filter(cb => cb.status === 'completed'),
    failed: callbacks.filter(cb => cb.status === 'failed'),
  };

  // Calculate statistics
  const statistics = {
    total: callbacks.length,
    overdue: groupedCallbacks.overdue.length,
    upcoming: groupedCallbacks.upcoming.length,
    completed: groupedCallbacks.completed.length,
    failed: groupedCallbacks.failed.length,
  };

  return {
    callbacks,
    groupedCallbacks,
    statistics,
    isLoading,
    error,
    refetch,
    createCallback: createCallbackMutation.mutate,
    updateCallback: updateCallbackMutation,
    deleteCallback: deleteCallbackMutation,
    executeCallback: executeCallbackMutation,
  };
};