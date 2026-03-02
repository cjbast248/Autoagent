import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

interface CallSessionData {
  session_id: string;
  agent_id: string;
  phone_number?: string;
  contact_name?: string;
  session_type: 'voice_test' | 'phone_call';
}

export const useCallSessionTracking = () => {
  const { user } = useAuth();

  const saveCallSession = useMutation({
    mutationFn: async (sessionData: CallSessionData) => {
      if (!user) {
        throw new Error('User must be authenticated to save call sessions');
      }

      console.log('🔄 Salvez sesiunea de apel cu agent ID corect:', sessionData.agent_id);

      // Find the agent owner
      const { data: agentData, error: agentError } = await supabase
        .from('kalina_agents')
        .select('user_id, name')
        .eq('elevenlabs_agent_id', sessionData.agent_id)
        .maybeSingle();

      if (agentError) {
        console.error('❌ Eroare la căutarea agentului:', agentError);
        throw agentError;
      }

      if (!agentData) {
        console.warn('⚠️ Agentul nu a fost găsit prin elevenlabs_agent_id, încerc prin agent_id...');
        
        const { data: fallbackAgent, error: fallbackError } = await supabase
          .from('kalina_agents')
          .select('user_id, name')
          .eq('agent_id', sessionData.agent_id)
          .maybeSingle();

        if (fallbackError || !fallbackAgent) {
          console.error('❌ Nu pot găsi proprietarul agentului:', sessionData.agent_id);
          throw new Error(`Agent ${sessionData.agent_id} not found`);
        }

        agentData.user_id = fallbackAgent.user_id;
      }

      console.log('✅ Proprietar agent găsit:', agentData.user_id);

      const callSessionRecord = {
        session_id: sessionData.session_id,
        agent_id: sessionData.agent_id,
        agent_owner_user_id: agentData.user_id, // Salvez ID-ul proprietarului agentului
        phone_number: sessionData.phone_number,
        contact_name: sessionData.contact_name,
        session_type: sessionData.session_type
      };

      const { data, error } = await supabase
        .from('call_sessions')
        .insert([callSessionRecord])
        .select()
        .single();

      if (error) {
        console.error('❌ Eroare la salvarea sesiunii:', error);
        throw error;
      }

      console.log('✅ Sesiune salvată cu succes:', data);
      return data;
    },
  });

  return {
    saveCallSession
  };
};