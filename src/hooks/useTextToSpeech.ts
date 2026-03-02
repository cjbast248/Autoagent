import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseTextToSpeechProps {
  autoPlay?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

export const useTextToSpeech = ({ 
  autoPlay = true,
  onStart,
  onEnd 
}: UseTextToSpeechProps = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    audioQueueRef.current = [];
    isProcessingRef.current = false;
    setIsSpeaking(false);
    onEnd?.();
  }, [onEnd]);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const text = audioQueueRef.current.shift();

    if (!text) {
      isProcessingRef.current = false;
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (error) throw error;

      // Create audio element
      const audioBlob = new Blob([data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audioRef.current = audio;
      setIsLoading(false);
      setIsSpeaking(true);
      onStart?.();

      // Play audio
      await audio.play();

      // Wait for audio to finish
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
      });

      setIsSpeaking(false);
      
      // Process next in queue
      isProcessingRef.current = false;
      if (audioQueueRef.current.length > 0) {
        processQueue();
      } else {
        onEnd?.();
      }

    } catch (error) {
      console.error('TTS Error:', error);
      toast.error('Eroare la generarea audio');
      setIsLoading(false);
      setIsSpeaking(false);
      isProcessingRef.current = false;
      onEnd?.();
    }
  }, [onStart, onEnd]);

  const speak = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) return;

    // Clean text of markdown and URLs
    const cleanedText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/[*_`#]/g, '') // Remove markdown formatting
      .trim();

    if (cleanedText.length === 0) return;

    // Add to queue
    audioQueueRef.current.push(cleanedText);

    // Start processing if not already processing
    if (autoPlay && !isProcessingRef.current) {
      processQueue();
    }
  }, [autoPlay, processQueue]);

  return {
    speak,
    isSpeaking,
    isLoading,
    stopSpeaking,
  };
};
