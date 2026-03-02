
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

export const useConversationById = (conversationId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['elevenlabs_conversation', conversationId, user?.id],
    queryFn: async () => {
      if (!user || !conversationId) return null;
      
      console.log('Fetching ElevenLabs conversation details for ID:', conversationId);
      
      // Call our Supabase edge function to get ElevenLabs data
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-conversation', {
        body: { conversationId },
      });

      if (error) {
        console.error('Error calling ElevenLabs function:', error);
        throw new Error(error.message || 'Failed to fetch conversation details');
      }

      console.log('Successfully fetched conversation data from ElevenLabs:', data);
      return data;
    },
    enabled: !!user && !!conversationId,
    refetchInterval: 300000, // Auto-refresh every 5 minutes
  });
};
