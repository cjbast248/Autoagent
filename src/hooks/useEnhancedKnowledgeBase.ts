
import { useEffect, useRef } from 'react';
import { useKnowledgeDocuments } from './useKnowledgeDocuments';
import { useDocumentCreation } from './useDocumentCreation';
import { useKnowledgeBaseUpdate } from './useKnowledgeBaseUpdate';
import { AgentResponse } from '../components/AgentResponse';

interface UseEnhancedKnowledgeBaseProps {
  agentId: string;
  onAgentRefresh?: (agentData: AgentResponse) => void;
}

export const useEnhancedKnowledgeBase =
    ({ agentId, onAgentRefresh }: UseEnhancedKnowledgeBaseProps) => {
  const {
    documents,
    setDocuments,
    existingDocuments,
    selectedExistingDocuments,
    isLoadingExisting,
    processAgentKnowledgeBase,
    loadExistingDocuments,
    addExistingDocument,
    removeDocument
  } = useKnowledgeDocuments();

  const { addTextDocument, addFileDocument } = useDocumentCreation({ setDocuments });

  const { isUpdating, updateAgentKnowledgeBase } = useKnowledgeBaseUpdate({
    agentId,
    documents,
    onAgentRefresh,
    processAgentKnowledgeBase
  });

  // Auto-save knowledge base to agent when documents change
  const isInitialLoad = useRef(true);
  const prevDocCount = useRef(0);

  useEffect(() => {
    // Skip the initial load (when processAgentKnowledgeBase sets documents)
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      prevDocCount.current = documents.length;
      return;
    }

    // Only auto-save when documents actually changed
    if (documents.length !== prevDocCount.current && agentId) {
      prevDocCount.current = documents.length;
      updateAgentKnowledgeBase(false);
    }
  }, [documents, agentId, updateAgentKnowledgeBase]);

  return {
    documents,
    existingDocuments,
    selectedExistingDocuments,
    isUpdating,
    isLoadingExisting,
    loadExistingDocuments,
    addExistingDocument,
    addTextDocument,
    addFileDocument,
    removeDocument,
    updateAgentKnowledgeBase,
    processAgentKnowledgeBase
  };
};
