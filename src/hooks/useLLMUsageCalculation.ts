import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LLMUsageRequest {
  prompt_length: number;
  number_of_pages?: number;
  rag_enabled?: boolean;
}

interface LLMUsageResponse {
  estimated_cost_usd: number;
  tokens_used: number;
  model: string;
  [key: string]: unknown;
}

export const useLLMUsageCalculation = () => {
  const calculateUsage = useMutation({
    mutationFn: async (request: LLMUsageRequest): Promise<LLMUsageResponse> => {
      console.log('Calculating LLM usage:', request);
      
      const { data, error } = await supabase.functions.invoke('calculate-llm-usage', {
        body: request
      });

      if (error) {
        console.error('LLM usage calculation error:', error);
        throw new Error(`Failed to calculate LLM usage: ${error.message}`);
      }

      console.log('LLM usage calculation result:', data);
      return data;
    },
    onError: (error) => {
      console.error('Error calculating LLM usage:', error);
    }
  });

  return {
    calculateUsage,
    isCalculating: calculateUsage.isPending
  };
};