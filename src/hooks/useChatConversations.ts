import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/utils/sessionManager';
import { ENV } from '@/config/environment';

interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  content: string;
  is_user: boolean;
  created_at: string;
}

export const useChatConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const hasFetchedRef = useRef(false);

  // Fetch all conversations - using REST API with timeout
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      const url = `${ENV.SUPABASE_URL}/rest/v1/chat_conversations?user_id=eq.${user.id}&order=updated_at.desc&select=*`;
      const response = await fetchWithAuth(url, {
        method: 'GET',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      }, 10000); // 10s timeout

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user?.id]);

  // Fetch messages for a specific conversation - using REST API with timeout
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user?.id || !conversationId) return;

    setIsLoading(true);
    try {
      const url = `${ENV.SUPABASE_URL}/rest/v1/chat_messages?conversation_id=eq.${conversationId}&order=created_at.asc&select=*`;
      const response = await fetchWithAuth(url, {
        method: 'GET',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      }, 10000); // 10s timeout

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Eroare la încărcarea mesajelor');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Create a new conversation - using REST API with timeout
  const createConversation = useCallback(async (title: string): Promise<string | null> => {
    if (!user?.id) {
      console.error('No user ID available for creating conversation');
      return null;
    }

    try {
      const url = `${ENV.SUPABASE_URL}/rest/v1/chat_conversations`;
      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: user.id,
          title: title || `Conversație nouă - ${new Date().toLocaleDateString('ro-RO')}`
        }),
      }, 10000); // 10s timeout

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create conversation failed:', errorText);
        throw new Error('Failed to create conversation');
      }

      const [result] = await response.json();

      // Add to local state
      setConversations(prev => [result, ...prev]);
      setCurrentConversationId(result.id);
      setMessages([]);

      return result.id;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast.error('Eroare la crearea conversației');
      return null;
    }
  }, [user?.id]);

  // Add a message - using REST API with timeout
  const addMessage = useCallback(async (
    conversationId: string,
    content: string,
    isUser: boolean,
    showErrorToast: boolean = true
  ): Promise<ChatMessage | null> => {
    if (!user?.id) {
      console.error('addMessage: No user ID');
      return null;
    }

    if (!conversationId) {
      console.error('addMessage: No conversation ID');
      return null;
    }

    try {
      const url = `${ENV.SUPABASE_URL}/rest/v1/chat_messages`;
      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          content,
          is_user: isUser
        }),
      }, 15000); // 15s timeout for messages

      if (!response.ok) {
        const errorText = await response.text();
        console.error('addMessage error:', errorText);
        if (showErrorToast) {
          toast.error('Eroare la salvarea mesajului.');
        }
        return null;
      }

      const [data] = await response.json();

      // Add to local state
      setMessages(prev => [...prev, data]);

      // Update conversation timestamp (non-blocking, fire and forget)
      fetchWithAuth(
        `${ENV.SUPABASE_URL}/rest/v1/chat_conversations?id=eq.${conversationId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': ENV.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ updated_at: new Date().toISOString() }),
        },
        5000
      ).catch(() => {});

      return data;
    } catch (error: any) {
      console.error('addMessage exception:', error);
      if (showErrorToast) {
        toast.error('Eroare la salvarea mesajului.');
      }
      return null;
    }
  }, [user?.id]);

  // Delete a conversation - using REST API with timeout
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      const url = `${ENV.SUPABASE_URL}/rest/v1/chat_conversations?id=eq.${conversationId}&user_id=eq.${user.id}`;
      const response = await fetchWithAuth(url, {
        method: 'DELETE',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      }, 10000); // 10s timeout

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // If this was the current conversation, clear it
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }

      toast.success('Conversația a fost ștearsă');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Eroare la ștergerea conversației');
    }
  }, [user?.id, currentConversationId]);

  // Load a conversation
  const loadConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    fetchMessages(conversationId);
  }, [fetchMessages]);

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  // Update conversation title - using REST API with timeout
  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    if (!user?.id) return;

    try {
      const url = `${ENV.SUPABASE_URL}/rest/v1/chat_conversations?id=eq.${conversationId}&user_id=eq.${user.id}`;
      const response = await fetchWithAuth(url, {
        method: 'PATCH',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ title }),
      }, 10000); // 10s timeout

      if (!response.ok) {
        throw new Error('Failed to update title');
      }

      // Update local state
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, title } : c)
      );
    } catch (error) {
      console.error('Error updating conversation title:', error);
      toast.error('Eroare la actualizarea titlului');
    }
  }, [user?.id]);

  // Fetch conversations on mount
  useEffect(() => {
    if (user?.id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchConversations();
    }

    return () => {
      hasFetchedRef.current = false;
    };
  }, [user?.id, fetchConversations]);

  return {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    createConversation,
    addMessage,
    deleteConversation,
    loadConversation,
    startNewConversation,
    updateConversationTitle,
    fetchConversations
  };
};
