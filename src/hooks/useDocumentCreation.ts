
import { useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { KnowledgeBaseController } from '../controllers/KnowledgeBaseController';
import { KnowledgeDocumentLocal} from "@/types/dtos.ts";

interface UseDocumentCreationProps {
  setDocuments: React.Dispatch<React.SetStateAction<KnowledgeDocumentLocal[]>>;
}

export const useDocumentCreation = ({ setDocuments }: UseDocumentCreationProps) => {
  const addTextDocument = useCallback(async (name: string, content: string): Promise<boolean> => {
    try {
      const response = await KnowledgeBaseController.createTextDocument({ name, text: content });
      
      const newDoc: KnowledgeDocumentLocal = {
        id: response.id,
        name,
        type: 'text',
        elevenLabsId: response.id,
        content: content
      };
      
      setDocuments(prev => [...prev, newDoc]);
      
      toast({
        title: "Succes!",
        description: `Documentul text "${name}" a fost adăugat în Agentauto.`,
      });
      
      return true;
    } catch (error) {
      console.error('Error creating text document:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut crea documentul text.",
        variant: "destructive",
      });
      return false;
    }
  }, [setDocuments]);

  const addFileDocument = useCallback(async (file: File): Promise<boolean> => {
    try {
      const fileName = file.name.split('.')[0];
      const response = await KnowledgeBaseController.uploadFileDocument(fileName, file);
      
      const newDoc: KnowledgeDocumentLocal = {
        id: response.id,
        name: response.name,
        type: 'file',
        elevenLabsId: response.id
      };
      
      setDocuments(prev => [...prev, newDoc]);
      
      toast({
        title: "Succes!",
        description: `Fișierul "${file.name}" a fost încărcat în Agentauto.`,
      });
      
      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut încărca fișierul.",
        variant: "destructive",
      });
      return false;
    }
  }, [setDocuments]);

  return {
    addTextDocument,
    addFileDocument
  };
};
