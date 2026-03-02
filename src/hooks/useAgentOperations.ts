
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/AuthContext';
import { VoiceController } from '@/controllers/VoiceController';

interface DeleteAgentFromElevenLabsParams {
  agentId: string;
}

interface UpdateAgentStatusParams {
  id: string;
  isActive: boolean;
}

interface DuplicateAgentParams {
  agent: any;
}

export const useAgentOperations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Delete agent from ElevenLabs using Supabase Edge Function
  const deleteAgentFromElevenLabs = async ({ agentId }: DeleteAgentFromElevenLabsParams) => {
    console.log('Deleting agent from ElevenLabs via Supabase Edge Function:', agentId);
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-elevenlabs-agent', {
        body: { agentId }
      });

      if (error) {
        // If agent is not found (404), we consider it already deleted
        if (error.message.includes('404') || error.message.includes('not found')) {
          console.log(`Agent ${agentId} not found in ElevenLabs, considering it already deleted`);
          return { success: true, alreadyDeleted: true };
        }
        throw error;
      }

      console.log('Agent deleted successfully from ElevenLabs');
      return data;
    } catch (error) {
      console.error('Error deleting agent from ElevenLabs:', error);
      throw error;
    }
  };

  const updateAgentStatus = async ({ id, isActive }: UpdateAgentStatusParams) => {
    const { data, error } = await supabase
      .from('kalina_agents')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  const deleteAgentFromDatabase = async (id: string) => {
    const { error } = await supabase
      .from('kalina_agents')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  };

  const duplicateAgentInElevenLabs = async (originalAgent: any) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Get the original agent data from Voice Service
      const originalAgentData = await VoiceController.getAgent(originalAgent.agent_id);
      
      // Create new agent with modified name
      const duplicatedName = `${originalAgent.name} (Copie)`;
      
      const createAgentRequest = {
        name: duplicatedName,
        conversation_config: originalAgentData.conversation_config
      };

      console.log('Creating duplicated agent:', createAgentRequest);
      const newAgentResponse = await VoiceController.createAgent(createAgentRequest);

      // Save the duplicated agent to database
      const { data: newAgentRecord, error: dbError } = await supabase
        .from('kalina_agents')
        .insert({
          agent_id: newAgentResponse.agent_id,
          user_id: user.id,
          name: duplicatedName,
          description: originalAgent.description ? `${originalAgent.description} (Copie)` : null,
          system_prompt: originalAgent.system_prompt,
          voice_id: originalAgent.voice_id,
          provider: originalAgent.provider,
          elevenlabs_agent_id: newAgentResponse.agent_id,
          is_active: true
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error saving duplicated agent to database:', dbError);
        throw dbError;
      }

      return newAgentRecord;
    } catch (error) {
      console.error('Error duplicating agent:', error);
      throw error;
    }
  };

  const deactivateAgentMutation = useMutation({
    mutationFn: updateAgentStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-agents'] });
      toast({
        title: "Agent dezactivat",
        description: "Agentul a fost dezactivat cu succes",
      });
    },
    onError: (error) => {
      console.error('Error deactivating agent:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut dezactiva agentul",
        variant: "destructive",
      });
    },
  });

  const activateAgentMutation = useMutation({
    mutationFn: updateAgentStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-agents'] });
      toast({
        title: "Agent activat",
        description: "Agentul a fost activat cu succes",
      });
    },
    onError: (error) => {
      console.error('Error activating agent:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut activa agentul",
        variant: "destructive",
      });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (agent: { id: string; agent_id: string }) => {
      // Try to delete from ElevenLabs first, but don't fail if agent doesn't exist (404)
      try {
        await deleteAgentFromElevenLabs({ agentId: agent.agent_id });
      } catch (error: any) {
        const errorMessage = error?.message || '';
        const is404 = errorMessage.includes('404') || errorMessage.includes('not found');
        if (is404) {
          console.warn('Agent not found in ElevenLabs (404), continuing with database deletion:', error);
        } else {
          throw error;
        }
      }
      
      // Always delete from database
      await deleteAgentFromDatabase(agent.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-agents'] });
      toast({
        title: "Agent șters",
        description: "Agentul a fost șters cu succes",
      });
    },
    onError: (error) => {
      console.error('Error deleting agent:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge agentul complet. Verifică lista pentru a vedea dacă a fost șters din baza de date.",
        variant: "destructive",
      });
    },
  });

  const duplicateAgentMutation = useMutation({
    mutationFn: duplicateAgentInElevenLabs,
    onSuccess: (newAgent) => {
      queryClient.invalidateQueries({ queryKey: ['user-agents'] });
      toast({
        title: "Agent duplicat",
        description: `Agentul "${newAgent.name}" a fost creat cu succes`,
      });
    },
    onError: (error) => {
      console.error('Error duplicating agent:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut duplica agentul",
        variant: "destructive",
      });
    },
  });

  return {
    deactivateAgent: deactivateAgentMutation.mutate,
    activateAgent: activateAgentMutation.mutate,
    deleteAgent: deleteAgentMutation.mutate,
    duplicateAgent: duplicateAgentMutation.mutate,
    isDeactivating: deactivateAgentMutation.isPending,
    isActivating: activateAgentMutation.isPending,
    isDeleting: deleteAgentMutation.isPending,
    isDuplicating: duplicateAgentMutation.isPending,
  };
};
