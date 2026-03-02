import { useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { MESSAGES } from '../constants/constants';

export const useClipboard = () => {
  const copyToClipboard = useCallback(async (text: string, showSuccessMessage = true) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      if (showSuccessMessage) {
        toast({
          title: "Copiat!",
          description: MESSAGES.SUCCESS.CLIPBOARD_COPIED,
        });
      }
    } catch (error) {
      console.error('Clipboard copy error:', error);
      toast({
        title: "Eroare",
        description: MESSAGES.ERRORS.CLIPBOARD_COPY_FAILED,
        variant: "destructive",
      });
    }
  }, []);

  return { copyToClipboard };
};

