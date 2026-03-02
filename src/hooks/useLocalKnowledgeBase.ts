import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

export interface LocalDocument {
  id: string;
  name: string;
  content: string;
  file_type: string;
  created_at: string;
  updated_at: string;
}

export interface LocalAgent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
}

export const useLocalKnowledgeBase = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [agents, setAgents] = useState<LocalAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Document operations
  const addTextDocument = useCallback(async (name: string, content: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Eroare",
        description: "Trebuie să fii autentificat.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'create_text_document',
          name,
          content,
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        await loadUserDocuments();
        toast({
          title: "Succes!",
          description: `Documentul "${name}" a fost creat.`,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating text document:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut crea documentul.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addFileDocument = useCallback(async (file: File): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Eroare",
        description: "Trebuie să fii autentificat.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsLoading(true);
      
      // Read file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'upload_file_document',
          name: file.name,
          content,
          fileType: file.type || 'text/plain',
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        await loadUserDocuments();
        toast({
          title: "Succes!",
          description: `Fișierul "${file.name}" a fost încărcat.`,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut încărca fișierul.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const removeDocument = useCallback(async (documentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'delete_document',
          documentId,
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        await loadUserDocuments();
        toast({
          title: "Succes!",
          description: "Documentul a fost șters.",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge documentul.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadUserDocuments = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'get_user_documents',
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Agent operations
  const createAgent = useCallback(async (name: string, description: string, systemPrompt: string): Promise<LocalAgent | null> => {
    if (!user) return null;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'create_agent',
          name,
          description,
          systemPrompt,
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        await loadUserAgents();
        toast({
          title: "Succes!",
          description: `Agentul "${name}" a fost creat.`,
        });
        return data.agent;
      }
      return null;
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut crea agentul.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateAgent = useCallback(async (agentId: string, name: string, description: string, systemPrompt: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'update_agent',
          agentId,
          name,
          description,
          systemPrompt,
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        await loadUserAgents();
        toast({
          title: "Succes!",
          description: `Agentul "${name}" a fost actualizat.`,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza agentul.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'delete_agent',
          agentId,
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        await loadUserAgents();
        toast({
          title: "Succes!",
          description: "Agentul a fost șters.",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge agentul.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadUserAgents = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'get_user_agents',
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Link/unlink documents to agents
  const linkDocumentToAgent = useCallback(async (agentId: string, documentId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'link_document_to_agent',
          agentId,
          documentId
        }
      });

      if (error) throw error;
      return data.success;
    } catch (error) {
      console.error('Error linking document to agent:', error);
      return false;
    }
  }, []);

  const unlinkDocumentFromAgent = useCallback(async (agentId: string, documentId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'unlink_document_from_agent',
          agentId,
          documentId
        }
      });

      if (error) throw error;
      return data.success;
    } catch (error) {
      console.error('Error unlinking document from agent:', error);
      return false;
    }
  }, []);

  const getAgentDocuments = useCallback(async (agentId: string): Promise<LocalDocument[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          action: 'get_agent_documents',
          agentId
        }
      });

      if (error) throw error;
      return data.success ? data.documents : [];
    } catch (error) {
      console.error('Error getting agent documents:', error);
      return [];
    }
  }, []);

  return {
    documents,
    agents,
    isLoading,
    addTextDocument,
    addFileDocument,
    removeDocument,
    loadUserDocuments,
    createAgent,
    updateAgent,
    deleteAgent,
    loadUserAgents,
    linkDocumentToAgent,
    unlinkDocumentFromAgent,
    getAgentDocuments
  };
};