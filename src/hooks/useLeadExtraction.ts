import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from 'sonner';

interface ExtractionProgress {
  total: number;
  processed: number;
  leadsFound: number;
  currentConversation?: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

interface ExtractionResult {
  total: number;
  processed: number;
  leadsFound: number;
  leads: Array<{
    name?: string;
    phone: string;
    confidence: number;
    interestLevel: string;
  }>;
  errors: Array<{
    conversationId: string;
    error: string;
  }>;
}

export const useLeadExtraction = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ExtractionProgress>({
    total: 0,
    processed: 0,
    leadsFound: 0,
    status: 'idle'
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const startExtraction = async (agentId: string, extractionPrompt: string, conversationIds?: string[]) => {
    if (!user) {
      toast.error('Trebuie să fii autentificat');
      return;
    }

    setIsExtracting(true);
    setProgress({
      total: Array.isArray(conversationIds) ? conversationIds.length : 0,
      processed: 0,
      leadsFound: 0,
      status: 'running'
    });
    setResult(null);

    try {
      console.log('🚀 Starting lead extraction...');
      console.log('Agent ID:', agentId);
      console.log('Extraction prompt:', extractionPrompt);
      console.log('Total conversations to process:', conversationIds?.length ?? '(server default)');

      // To avoid Edge Function timeout, process in small chunks client-side
      const CHUNK_SIZE = 12; // keep each call under the 60s limit
      const ids = Array.isArray(conversationIds) ? conversationIds : [];

      let aggregate = {
        total: ids.length,
        processed: 0,
        leadsFound: 0,
        leads: [] as ExtractionResult['leads'],
        errors: [] as ExtractionResult['errors'],
      };

      if (ids.length === 0) {
        // Fallback: let the server pick recent conversations (up to 500)
        const { data, error } = await supabase.functions.invoke('extract-leads-from-conversations', {
          body: { agentId, extractionPrompt, userId: user.id },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Extracția a eșuat');
        const extractionResult = data.results as ExtractionResult;
        setProgress({
          total: extractionResult.total,
          processed: extractionResult.processed,
          leadsFound: extractionResult.leadsFound,
          status: 'completed',
        });
        setResult(extractionResult);
        if (extractionResult.leadsFound > 0) {
          toast.success(`Extracție completă! ${extractionResult.leadsFound} lead-uri noi găsite din ${extractionResult.total} conversații.`);
        } else {
          toast.info(`Extracție completă! Nu au fost găsite lead-uri noi în ${extractionResult.total} conversații.`);
        }
        return extractionResult;
      }

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        console.log(`🧩 Processing chunk ${i / CHUNK_SIZE + 1} with ${chunk.length} ids`);

        const { data, error } = await supabase.functions.invoke('extract-leads-from-conversations', {
          body: { agentId, extractionPrompt, userId: user.id, conversationIds: chunk },
        });
        if (error) {
          console.error('❌ Edge function error:', error);
          // Keep going but record error at chunk level
          aggregate.errors.push({ conversationId: `chunk_${i / CHUNK_SIZE + 1}`, error: error.message });
        } else if (data?.success) {
          const r = data.results as ExtractionResult;
          aggregate.processed += r.processed;
          aggregate.leadsFound += r.leadsFound;
          aggregate.leads.push(...(r.leads || []));
          aggregate.errors.push(...(r.errors || []));
        } else {
          aggregate.errors.push({ conversationId: `chunk_${i / CHUNK_SIZE + 1}`, error: data?.error || 'Unknown error' });
        }

        setProgress(prev => ({
          total: aggregate.total,
          processed: aggregate.processed,
          leadsFound: aggregate.leadsFound,
          status: 'running',
        }));
      }

      const finalResult: ExtractionResult = {
        total: aggregate.total,
        processed: aggregate.processed,
        leadsFound: aggregate.leadsFound,
        leads: aggregate.leads,
        errors: aggregate.errors,
      };

      setProgress({
        total: finalResult.total,
        processed: finalResult.processed,
        leadsFound: finalResult.leadsFound,
        status: 'completed',
      });
      setResult(finalResult);

      if (finalResult.leadsFound > 0) {
        toast.success(`Extracție completă! ${finalResult.leadsFound} lead-uri noi găsite din ${finalResult.total} conversații.`);
      } else {
        toast.info(`Extracție completă! Nu au fost găsite lead-uri noi în ${finalResult.total} conversații.`);
      }

      return finalResult;

    } catch (error) {
      console.error('❌ Error in lead extraction:', error as any);
      setProgress(prev => ({ ...prev, status: 'error' }));
      const msg = (error as any)?.message || 'Unknown error';
      toast.error(`Eroare: ${msg}`);
      throw error;
    } finally {
      setIsExtracting(false);
    }
  };

  const reset = () => {
    setProgress({
      total: 0,
      processed: 0,
      leadsFound: 0,
      status: 'idle'
    });
    setResult(null);
    setIsExtracting(false);
  };

  return {
    progress,
    isExtracting,
    result,
    startExtraction,
    reset
  };
};