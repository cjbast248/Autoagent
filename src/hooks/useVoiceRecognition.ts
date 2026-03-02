import { useState, useEffect, useRef, useCallback } from 'react';
import '../types/speech.d.ts';

interface VoiceRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export const useVoiceRecognition = (options: VoiceRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Check if speech recognition is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      
      // Configure recognition
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = options.interimResults ?? true;
      recognition.lang = options.language ?? 'ro-RO';
      
      // Event handlers
      recognition.onstart = () => {
        console.log('Voice recognition started');
        setIsListening(true);
        setError(null);
        options.onStart?.();
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);
        options.onResult?.(fullTranscript, !!finalTranscript);
      };
      
      recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        setError(event.error);
        setIsListening(false);
        options.onError?.(event.error);
        
        // Auto-restart on certain errors
        if (event.error === 'network' || event.error === 'audio-capture') {
          restartTimeoutRef.current = setTimeout(() => {
            if (isListening) {
              recognition.start();
            }
          }, 1000);
        }
      };
      
      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);
        options.onEnd?.();
        
        // Auto-restart if continuous mode is enabled
        if (options.continuous && isListening) {
          restartTimeoutRef.current = setTimeout(() => {
            recognition.start();
          }, 100);
        }
      };
    } else {
      setIsSupported(false);
      setError('Speech recognition not supported in this browser');
    }
    
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [options.continuous, options.interimResults, options.language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      recognitionRef.current.start();
      setError(null);
    } catch (err) {
      console.error('Error starting voice recognition:', err);
      setError('Failed to start voice recognition');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    
    try {
      recognitionRef.current.stop();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    } catch (err) {
      console.error('Error stopping voice recognition:', err);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  };
};