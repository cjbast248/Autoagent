import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

interface ConversationMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationState {
  status: 'idle' | 'calling' | 'active' | 'completed' | 'failed';
  messages: ConversationMessage[];
  duration?: number;
  cost?: number;
}

export const useRealtimeConversation = (conversationId?: string) => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationState>({
    status: 'idle',
    messages: []
  });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Polling pentru conversația activă
  const pollConversationDetails = async () => {
    if (!conversationId || !user) return;

    console.log('Polling conversation details for:', conversationId);

    try {
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-conversation', {
        body: { conversationId },
      });

      if (error) {
        console.error('Error fetching conversation:', error);
        return;
      }

      console.log('Received conversation data:', data);

      if (data) {
        // Parse transcript pentru mesaje
        const messages: ConversationMessage[] = [];
        
        if (data.transcript && Array.isArray(data.transcript)) {
          data.transcript.forEach((item: any) => {
            if (item.role && item.message) {
              messages.push({
                type: item.role === 'agent' ? 'assistant' : 'user',
                content: item.message,
                timestamp: new Date().toISOString()
              });
            }
          });
        }

        const newStatus = data.status === 'completed' ? 'completed' : 
                         data.status === 'failed' ? 'failed' :
                         data.transcript ? 'active' : 'calling';

        setConversation({
          status: newStatus,
          messages,
          duration: data.duration_seconds,
          cost: data.cost_usd
        });

        // Stop polling dacă conversația s-a terminat
        if (newStatus === 'completed' || newStatus === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Error in polling conversation:', error);
    }
  };

  // Start real-time tracking când avem conversationId
  useEffect(() => {
    if (!conversationId || !user) {
      console.log('No conversationId or user, setting idle state. ConversationId:', conversationId, 'User:', !!user);
      setConversation({ status: 'idle', messages: [] });
      return;
    }

    console.log('Starting real-time tracking for conversation:', conversationId);
    
    // Set status la calling
    setConversation({ status: 'calling', messages: [] });

    // Start polling imediat
    pollConversationDetails();

    // Setup polling interval
    pollingIntervalRef.current = setInterval(pollConversationDetails, 3000);

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [conversationId, user]);

  // Note: Cleanup is handled in the main useEffect above
  // No separate unmount cleanup needed - the dependency-based cleanup handles all cases

  return {
    conversation,
    isActive: conversation.status === 'calling' || conversation.status === 'active'
  };
};