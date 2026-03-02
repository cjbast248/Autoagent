import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { MESSAGES } from '../constants/constants';
import { PromptGenerationController } from '../controllers/PromptGenerationController';
import { PromptGenerationRequest } from '../types/dtos';

interface UsePromptGenerationProps {
  websiteUrl: string;
  agentRole: string;
  additionalPrompt: string;
}

export const usePromptGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePrompt = useCallback(async ({ websiteUrl, agentRole, additionalPrompt }: UsePromptGenerationProps): Promise<string | null> => {
    // Simple URL validation - just check if it's not empty
    if (!websiteUrl || !websiteUrl.trim()) {
      toast({
        title: "Eroare",
        description: MESSAGES.ERRORS.INVALID_URL,
        variant: "destructive",
      });
      return null;
    }

    setIsGenerating(true);
    try {
      const request: PromptGenerationRequest = {
        websiteUrl: websiteUrl.trim(),
        agentRole: agentRole.trim(),
        additionalPrompt: additionalPrompt.trim(),
      };
      
      console.log('Generating prompt with request:', request);
      const response = await PromptGenerationController.generatePrompt(request);

      if (!response || !response.response) {
        throw new Error('Invalid response from prompt generation');
      }

      toast({
        title: "Succes!",
        description: MESSAGES.SUCCESS.PROMPT_GENERATED,
      });

      return response.response;
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast({
        title: "Eroare",
        description: MESSAGES.ERRORS.PROMPT_GENERATION_FAILED,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generatePrompt,
    isGenerating,
  };
};
