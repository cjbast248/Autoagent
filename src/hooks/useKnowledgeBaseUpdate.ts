
import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { VoiceController } from "@/controllers/VoiceController";
import {
    AgentResponse,
    AgentUpdateRequest,
    KnowledgeBaseDocumentUpdate,
    KnowledgeDocumentLocal
} from "@/types/dtos.ts";

interface UseKnowledgeBaseUpdateProps {
  agentId: string;
  documents: KnowledgeDocumentLocal[];
  onAgentRefresh?: (agentData: AgentResponse) => void;
  processAgentKnowledgeBase: (agentData: AgentResponse) => void;
}

export const useKnowledgeBaseUpdate = ({ 
  agentId, 
  documents, 
  onAgentRefresh, 
  processAgentKnowledgeBase 
}: UseKnowledgeBaseUpdateProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateAgentKnowledgeBase = useCallback(async (shouldReload = false): Promise<boolean> => {
    if (!agentId.trim()) {
      toast({
        title: "Eroare",
        description: "Te rog introdu ID-ul agentului pentru editare.",
        variant: "destructive",
      });
      return false;
    }

    setIsUpdating(true);

    try {
      const knowledgeBase: KnowledgeBaseDocumentUpdate[] = documents
        .filter(doc => doc.elevenLabsId)
        .map(doc => ({
          type: doc.type === 'existing' ? 'file' : doc.type as 'text' | 'file',
          name: doc.name,
          id: doc.elevenLabsId!,
          usage_mode: 'auto' as const
        }));

      console.log('Updating agent knowledge base with:', knowledgeBase);

      const agentUpdateRequest: AgentUpdateRequest = {
          conversation_config: {
              agent: {
                  prompt: {
                      knowledge_base: knowledgeBase
                  }
              }
          }
      }
      console.log(JSON.stringify(agentUpdateRequest))
      const response = await VoiceController.updateAgent(agentId, agentUpdateRequest);
      console.log("response=" + JSON.stringify(response))
      // Toast removed - main save function shows success toast

      if (shouldReload && onAgentRefresh) {
        try {
          const refreshedAgent = await VoiceController.getAgent(agentId);
          onAgentRefresh(refreshedAgent);
          processAgentKnowledgeBase(refreshedAgent);
        } catch (error) {
          console.error('Error refreshing agent data:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating agent knowledge base:', error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la actualizarea Knowledge Base-ului agentului.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [agentId, documents, onAgentRefresh, processAgentKnowledgeBase]);

  return {
    isUpdating,
    updateAgentKnowledgeBase
  };
};
