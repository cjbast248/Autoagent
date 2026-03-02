import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConclusionCellProps {
  conclusion: string | null;
  conversationId: string;
  callStatus: string;
  isProcessing: boolean;
  onAnalyze: (conversationId: string) => void;
  durationSeconds?: number;
}

export const ConclusionCell = ({ 
  conclusion, 
  conversationId, 
  callStatus, 
  isProcessing,
  onAnalyze,
  durationSeconds 
}: ConclusionCellProps) => {
  const isVeryShort = durationSeconds !== undefined && durationSeconds < 5;
  const hasTriggeredAutoGenerate = useRef(false);

  // Auto-generate conclusion when conversation is done
  useEffect(() => {
    // Only auto-generate if:
    // 1. Status is 'done'
    // 2. No conclusion exists yet
    // 3. Not currently processing
    // 4. Has a valid conversation ID
    // 5. Haven't already triggered auto-generation for this conversation
    if (
      callStatus === 'done' && 
      !conclusion && 
      !isProcessing && 
      conversationId && 
      !hasTriggeredAutoGenerate.current
    ) {
      hasTriggeredAutoGenerate.current = true;
      console.log('🤖 Auto-generating conclusion for conversation:', conversationId);
      onAnalyze(conversationId);
    }
  }, [callStatus, conclusion, conversationId, isProcessing, onAnalyze]);

  // Reset flag when conversation changes
  useEffect(() => {
    hasTriggeredAutoGenerate.current = false;
  }, [conversationId]);

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Se generează...</span>
      </div>
    );
  }

  if (conclusion) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              <p className="text-sm text-foreground/80 line-clamp-2 hover:text-foreground transition-colors">
                {conclusion}
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="max-w-md p-4 bg-white border border-gray-200 shadow-lg rounded-lg"
            sideOffset={5}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Concluzie Conversație
                </span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {conclusion}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (callStatus === 'done' && conversationId) {
    const button = (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onAnalyze(conversationId)}
        className="h-7 text-xs"
        disabled={isVeryShort && isProcessing}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Generează
      </Button>
    );

    if (isVeryShort) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Conversație foarte scurtă - transcriptul poate fi limitat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  }

  return <span className="text-xs text-muted-foreground">-</span>;
};
