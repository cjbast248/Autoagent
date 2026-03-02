import { PromptGenerationRequest, PromptGenerationResponse } from '../types/dtos';
import { supabase } from '@/integrations/supabase/client';

export class PromptGenerationController {
  static async generatePrompt(request: PromptGenerationRequest): Promise<PromptGenerationResponse> {
    const { data, error } = await supabase.functions.invoke('prompt-generation', {
      body: request
    });

    if (error) {
      console.error('Prompt generation error:', error);
      throw new Error(`Prompt generation failed: ${error.message}`);
    }

    if (!data || !data.response) {
      throw new Error('Invalid response from prompt generation');
    }

    return data;
  }
}