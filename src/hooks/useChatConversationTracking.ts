
import { useEffect, useRef } from 'react';
import { useConversationTracking } from './useConversationTracking';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface UseChatConversationTrackingProps {
  messages: ChatMessage[];
  agentId: string;
  agentName: string;
  isActive: boolean;
}

export const useChatConversationTracking = ({
  messages,
  agentId,
  agentName,
  isActive
}: UseChatConversationTrackingProps) => {
  const { saveConversation } = useConversationTracking();
  const conversationStartRef = useRef<Date | null>(null);
  const lastMessageCountRef = useRef(0);

  // Track conversation start
  useEffect(() => {
    if (isActive && messages.length > 0 && !conversationStartRef.current) {
      conversationStartRef.current = new Date();
    }
  }, [isActive, messages.length]);

  // Auto-save conversation when it gets longer or when it ends
  useEffect(() => {
    const shouldSave = 
      messages.length > 0 && 
      messages.length !== lastMessageCountRef.current &&
      conversationStartRef.current &&
      (messages.length % 5 === 0 || !isActive); // Save every 5 messages or when conversation ends

    if (shouldSave) {
      const duration = conversationStartRef.current 
        ? Math.floor((Date.now() - conversationStartRef.current.getTime()) / 1000)
        : 0;

      const transcript = messages.map(msg => ({
        speaker: msg.sender === 'user' ? 'user' : 'agent',
        message: msg.text,
        timestamp: msg.timestamp.toISOString()
      }));

      const conversationData = {
        agent_id: agentId,
        agent_name: agentName,
        phone_number: 'Text Chat',
        contact_name: `Chat cu ${agentName}`,
        summary: `Conversație text cu ${agentName} - ${messages.length} mesaje`,
        duration_seconds: duration,
        cost_usd: 0.01 * messages.length, // Estimate cost per message
        transcript,
        status: 'success' as const
      };

      saveConversation.mutate(conversationData);
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, isActive, agentId, agentName, saveConversation]);

  // Reset when conversation truly ends
  useEffect(() => {
    if (!isActive && messages.length === 0) {
      conversationStartRef.current = null;
      lastMessageCountRef.current = 0;
    }
  }, [isActive, messages.length]);
};
