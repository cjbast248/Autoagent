import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const useConclusionAnalyzer = () => {
  const [processingConclusions, setProcessingConclusions] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const analyzeConclusion = useCallback(async (conversationId: string) => {
    if (!conversationId || processingConclusions.has(conversationId)) {
      return;
    }

    setProcessingConclusions(prev => new Set(prev).add(conversationId));

    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversation-conclusion', {
        body: { conversationId }
      });

      if (error) throw error;

      // Handle both new analysis and existing conclusion
      if (data?.success || data?.alreadyProcessed) {
        // Refresh the call history to get the new/existing conclusion
        queryClient.invalidateQueries({ queryKey: ['call-history'] });
        return data.conclusion;
      }
      
      // Handle specific error codes
      if (data?.error_code === 'audio_too_small') {
        throw new Error('AUDIO_TOO_SMALL');
      }
      
      throw new Error('Failed to analyze conclusion');
    } catch (error: any) {
      console.error('Error analyzing conclusion:', error);
      
      // Provide specific error messages
      let errorMessage = 'Nu s-a putut genera concluzia';
      if (error.message === 'AUDIO_TOO_SMALL') {
        errorMessage = 'Audio prea scurt sau transcript indisponibil pentru această conversație';
      }
      
      toast({
        title: 'Eroare',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setProcessingConclusions(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    }
  }, [processingConclusions, queryClient, toast]);

  return {
    analyzeConclusion,
    processingConclusions,
    isProcessing: (conversationId: string) => processingConclusions.has(conversationId)
  };
};
